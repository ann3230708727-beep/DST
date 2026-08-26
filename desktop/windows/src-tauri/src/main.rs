#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, PhysicalPosition, WebviewWindow};

const APP_ICON: tauri::image::Image<'static> = tauri::include_image!("./icons/icon.ico");
const VISIBLE_EDGE_PX: i32 = 16;
const EDGE_TRIGGER_PX: i32 = 32;
const EDGE_Y_TOLERANCE_PX: i32 = 16;
const COLLAPSE_DELAY_MS: u64 = 120;
const POINTER_POLL_MS: u64 = 16;
const ANIMATION_MS: u64 = 140;
const ANIMATION_FRAMES: u64 = 12;

static ANIMATION_GENERATION: AtomicU64 = AtomicU64::new(0);
static COLLAPSED_STATE: AtomicBool = AtomicBool::new(false);
static PINNED_STATE: AtomicBool = AtomicBool::new(false);
static EDGE_TOPMOST_STATE: AtomicBool = AtomicBool::new(false);
static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);

fn eased(t: f64) -> f64 {
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

fn raise_for_edge_reveal(window: &WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window
        .set_always_on_top(true)
        .map_err(|e| format!("temporary edge topmost failed: {e}"))?;
    EDGE_TOPMOST_STATE.store(true, Ordering::SeqCst);
    Ok(())
}

fn clear_edge_topmost(window: &WebviewWindow) -> Result<(), String> {
    if PINNED_STATE.load(Ordering::SeqCst) {
        EDGE_TOPMOST_STATE.store(false, Ordering::SeqCst);
        return Ok(());
    }

    window
        .set_always_on_top(false)
        .map_err(|e| format!("clear temporary edge topmost failed: {e}"))?;
    EDGE_TOPMOST_STATE.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn toggle_pinned(window: WebviewWindow) -> Result<bool, String> {
    let next = !PINNED_STATE.load(Ordering::SeqCst);
    PINNED_STATE.store(next, Ordering::SeqCst);

    if next {
        window
            .set_always_on_top(true)
            .map_err(|e| format!("set_always_on_top failed: {e}"))?;
        EDGE_TOPMOST_STATE.store(false, Ordering::SeqCst);

        if COLLAPSED_STATE.load(Ordering::SeqCst) {
            let expand_window = window.clone();
            tauri::async_runtime::spawn_blocking(move || animate_window(expand_window, false))
                .await
                .map_err(|e| e.to_string())??;
        }
    } else if COLLAPSED_STATE.load(Ordering::SeqCst) {
        window
            .set_always_on_top(false)
            .map_err(|e| format!("clear always_on_top failed: {e}"))?;
        EDGE_TOPMOST_STATE.store(false, Ordering::SeqCst);
    } else {
        // Keep the currently exposed edge panel above other windows until the
        // pointer leaves and it collapses. Pin and edge-reveal remain separate.
        EDGE_TOPMOST_STATE.store(true, Ordering::SeqCst);
    }

    let _ = window.emit("windows-pin-state", next);
    Ok(next)
}

#[tauri::command]
fn pinned_state() -> bool {
    PINNED_STATE.load(Ordering::SeqCst)
}

#[cfg(windows)]
fn native_pointer_and_rect(window: &WebviewWindow) -> Option<((i32, i32), (i32, i32, i32, i32))> {
    use windows_sys::Win32::{
        Foundation::{POINT, RECT},
        UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect},
    };

    let hwnd = window.hwnd().ok()?;
    let mut point = POINT { x: 0, y: 0 };
    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };

    let cursor_ok = unsafe { GetCursorPos(&mut point) };
    let rect_ok = unsafe { GetWindowRect(hwnd.0, &mut rect) };
    if cursor_ok == 0 || rect_ok == 0 {
        return None;
    }

    Some(((point.x, point.y), (rect.left, rect.top, rect.right, rect.bottom)))
}

#[cfg(not(windows))]
fn native_pointer_and_rect(_window: &WebviewWindow) -> Option<((i32, i32), (i32, i32, i32, i32))> {
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

            let Some(((cursor_x, cursor_y), (left, top, right_edge, bottom))) =
                native_pointer_and_rect(&window)
            else {
                continue;
            };

            if COLLAPSED_STATE.load(Ordering::SeqCst) {
                outside_since = None;
                let visible_left = left;
                let in_trigger = cursor_x >= visible_left - EDGE_TRIGGER_PX
                    && cursor_x <= right_edge + 1
                    && cursor_y >= top - EDGE_Y_TOLERANCE_PX
                    && cursor_y <= bottom + EDGE_Y_TOLERANCE_PX;
                if in_trigger {
                    // A normal (unpinned) window may be behind the currently
                    // active app. Raise it temporarily without stealing focus,
                    // then slide it into view.
                    if raise_for_edge_reveal(&window).is_ok() {
                        let _ = animate_window(window.clone(), false);
                    }
                }
                continue;
            }

            let inside = cursor_x >= left
                && cursor_x <= right_edge
                && cursor_y >= top
                && cursor_y <= bottom;

            if inside {
                outside_since = None;
                continue;
            }

            match outside_since {
                None => outside_since = Some(Instant::now()),
                Some(started)
                    if started.elapsed() >= Duration::from_millis(COLLAPSE_DELAY_MS) =>
                {
                    outside_since = None;
                    if animate_window(window.clone(), true).is_ok()
                        && EDGE_TOPMOST_STATE.load(Ordering::SeqCst)
                    {
                        let _ = clear_edge_topmost(&window);
                    }
                }
                _ => {}
            }
        }
    });
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![toggle_pinned, pinned_state])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_icon(APP_ICON.clone());
                let _ = window.set_always_on_top(false);
                PINNED_STATE.store(false, Ordering::SeqCst);
                EDGE_TOPMOST_STATE.store(false, Ordering::SeqCst);
                COLLAPSED_STATE.store(false, Ordering::SeqCst);
                let _ = window.emit("windows-pin-state", false);
                start_native_edge_watcher(window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Do Stuff Windows shell");
}
