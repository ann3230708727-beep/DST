#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, PhysicalPosition, WebviewWindow};

const VISIBLE_EDGE_PX: i32 = 16;
const EDGE_TRIGGER_PX: i32 = 32;
const EDGE_Y_TOLERANCE_PX: i32 = 16;
const COLLAPSE_DELAY_MS: u64 = 170;
const POINTER_POLL_MS: u64 = 20;
const ANIMATION_MS: u64 = 150;
const ANIMATION_FRAMES: u64 = 12;

static ANIMATION_GENERATION: AtomicU64 = AtomicU64::new(0);
static COLLAPSED_STATE: AtomicBool = AtomicBool::new(false);
static PINNED_STATE: AtomicBool = AtomicBool::new(false);
static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);

fn eased(t: f64) -> f64 {
    // Smoothstep: quick but without abrupt starts/stops.
    t * t * (3.0 - 2.0 * t)
}

fn animate_window(window: WebviewWindow, collapsed: bool) -> Result<(), String> {
    let generation = ANIMATION_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No current monitor".to_string())?;
    let work = monitor.work_area();
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let start = window.outer_position().map_err(|e| e.to_string())?;
    let right = work.position.x + work.size.width as i32;
    let target_x = if collapsed {
        right - VISIBLE_EDGE_PX
    } else {
        right - size.width as i32
    };
    let max_y = work.position.y + work.size.height as i32 - size.height as i32;
    let target_y = start.y.clamp(work.position.y, max_y.max(work.position.y));
    let frame_sleep = Duration::from_millis((ANIMATION_MS / ANIMATION_FRAMES).max(1));

    for frame in 1..=ANIMATION_FRAMES {
        if ANIMATION_GENERATION.load(Ordering::SeqCst) != generation {
            return Ok(());
        }
        let t = eased(frame as f64 / ANIMATION_FRAMES as f64);
        let x = start.x as f64 + (target_x - start.x) as f64 * t;
        let y = start.y as f64 + (target_y - start.y) as f64 * t;
        window
            .set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32))
            .map_err(|e| e.to_string())?;
        thread::sleep(frame_sleep);
    }

    COLLAPSED_STATE.store(collapsed, Ordering::SeqCst);
    let _ = window.emit("windows-edge-state", collapsed);
    Ok(())
}

#[tauri::command]
async fn animate_edge(window: WebviewWindow, collapsed: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || animate_window(window, collapsed))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(windows)]
fn set_native_topmost(window: &WebviewWindow, topmost: bool) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };

    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let insert_after = if topmost { HWND_TOPMOST } else { HWND_NOTOPMOST };
    let ok = unsafe {
        SetWindowPos(
            hwnd.0,
            insert_after,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        )
    };
    if ok == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_native_topmost(window: &WebviewWindow, topmost: bool) -> Result<(), String> {
    window.set_always_on_top(topmost).map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_pinned(window: WebviewWindow) -> Result<bool, String> {
    let next = !PINNED_STATE.load(Ordering::SeqCst);

    // Keep Tauri's state in sync, then enforce the Windows z-order directly.
    window.set_always_on_top(next).map_err(|e| e.to_string())?;
    set_native_topmost(&window, next)?;
    PINNED_STATE.store(next, Ordering::SeqCst);

    if next && COLLAPSED_STATE.load(Ordering::SeqCst) {
        let expand_window = window.clone();
        tauri::async_runtime::spawn_blocking(move || animate_window(expand_window, false))
            .await
            .map_err(|e| e.to_string())??;
    }

    Ok(next)
}

#[tauri::command]
fn pinned_state() -> bool {
    PINNED_STATE.load(Ordering::SeqCst)
}

#[cfg(windows)]
fn cursor_position() -> Option<(i32, i32)> {
    use windows_sys::Win32::{Foundation::POINT, UI::WindowsAndMessaging::GetCursorPos};
    let mut point = POINT { x: 0, y: 0 };
    let ok = unsafe { GetCursorPos(&mut point) };
    if ok == 0 { None } else { Some((point.x, point.y)) }
}

#[cfg(not(windows))]
fn cursor_position() -> Option<(i32, i32)> {
    None
}

fn start_native_edge_watcher(window: WebviewWindow) {
    if WATCHER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    thread::spawn(move || {
        let mut outside_since: Option<Instant> = None;

        loop {
            thread::sleep(Duration::from_millis(POINTER_POLL_MS));

            if PINNED_STATE.load(Ordering::SeqCst) {
                outside_since = None;
                if COLLAPSED_STATE.load(Ordering::SeqCst) {
                    let _ = animate_window(window.clone(), false);
                }
                continue;
            }

            let Some((cursor_x, cursor_y)) = cursor_position() else {
                continue;
            };
            let Ok(pos) = window.outer_position() else {
                continue;
            };
            let Ok(size) = window.outer_size() else {
                continue;
            };
            let Ok(Some(monitor)) = window.current_monitor() else {
                continue;
            };

            let work = monitor.work_area();
            let right = work.position.x + work.size.width as i32;
            let top = pos.y - EDGE_Y_TOLERANCE_PX;
            let bottom = pos.y + size.height as i32 + EDGE_Y_TOLERANCE_PX;
            let within_y = cursor_y >= top && cursor_y <= bottom;

            if COLLAPSED_STATE.load(Ordering::SeqCst) {
                outside_since = None;
                let in_trigger = cursor_x >= right - EDGE_TRIGGER_PX
                    && cursor_x <= right + 1
                    && within_y;
                if in_trigger {
                    let _ = animate_window(window.clone(), false);
                }
                continue;
            }

            let within_x = cursor_x >= pos.x && cursor_x <= pos.x + size.width as i32;
            let within_window_y = cursor_y >= pos.y && cursor_y <= pos.y + size.height as i32;
            if within_x && within_window_y {
                outside_since = None;
                continue;
            }

            match outside_since {
                None => outside_since = Some(Instant::now()),
                Some(started)
                    if started.elapsed() >= Duration::from_millis(COLLAPSE_DELAY_MS) =>
                {
                    outside_since = None;
                    let _ = animate_window(window.clone(), true);
                }
                _ => {}
            }
        }
    });
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            animate_edge,
            toggle_pinned,
            pinned_state
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(false);
                let _ = set_native_topmost(&window, false);
                PINNED_STATE.store(false, Ordering::SeqCst);
                COLLAPSED_STATE.store(false, Ordering::SeqCst);
                start_native_edge_watcher(window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running 做点儿啥 Windows shell");
}
