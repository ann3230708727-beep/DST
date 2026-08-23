#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{sync::atomic::{AtomicU64, Ordering}, thread, time::Duration};
use tauri::{Manager, PhysicalPosition, WebviewWindow};

const VISIBLE_EDGE_PX: i32 = 16;
const ANIMATION_MS: u64 = 190;
const ANIMATION_FRAMES: u64 = 14;
static ANIMATION_GENERATION: AtomicU64 = AtomicU64::new(0);

fn eased(t: f64) -> f64 {
    // Smoothstep: starts and ends at zero velocity, closer to native window motion.
    t * t * (3.0 - 2.0 * t)
}

#[tauri::command]
async fn animate_edge(window: WebviewWindow, collapsed: bool) -> Result<(), String> {
    let generation = ANIMATION_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let monitor = window.current_monitor().map_err(|e| e.to_string())?
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
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn toggle_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    let next = !window.is_always_on_top().map_err(|e| e.to_string())?;
    window.set_always_on_top(next).map_err(|e| e.to_string())?;
    Ok(next)
}

#[tauri::command]
fn always_on_top_state(window: WebviewWindow) -> Result<bool, String> {
    window.is_always_on_top().map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            animate_edge,
            toggle_always_on_top,
            always_on_top_state
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(false);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running 做点儿啥 Windows shell");
}
