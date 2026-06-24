use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, PhysicalSize, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

/// Round the window's corners natively on Windows 11 (avoids the
/// "rounded-over-square" artifact from CSS-only rounding on transparent windows).
#[cfg(target_os = "windows")]
fn round_corners(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::Graphics::Dwm::DwmSetWindowAttribute;
    const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
    const DWMWCP_ROUND: i32 = 2;
    if let Ok(h) = window.hwnd() {
        let hwnd = h.0 as isize as *mut core::ffi::c_void;
        let pref: i32 = DWMWCP_ROUND;
        unsafe {
            DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &pref as *const i32 as *const core::ffi::c_void,
                core::mem::size_of::<i32>() as u32,
            );
        }
    }
}

/// Apply the chosen native backdrop to the panel window.
#[tauri::command]
fn apply_backdrop(window: tauri::WebviewWindow, kind: String, dark: bool) {
    #[cfg(target_os = "windows")]
    {
        match kind.as_str() {
            "acrylic" => {
                let tint = if dark { (24, 26, 34, 140) } else { (245, 246, 250, 150) };
                let _ = apply_acrylic(&window, Some(tint));
            }
            "solid" => { /* CSS provides the solid background */ }
            _ => {
                let _ = apply_mica(&window, Some(dark));
            }
        }
        round_corners(&window);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, kind, dark);
    }
}

fn show_panel_near(app: &AppHandle, anchor: PhysicalPosition<f64>) {
    let Some(panel) = app.get_webview_window("panel") else {
        return;
    };
    let size = panel
        .outer_size()
        .unwrap_or(PhysicalSize { width: 360, height: 540 });
    let win_w = size.width as f64;
    let win_h = size.height as f64;
    let margin = 10.0;

    let monitor = panel
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| panel.primary_monitor().ok().flatten());

    let (mx, my, mw, mh) = if let Some(m) = &monitor {
        let p = m.position();
        let s = m.size();
        (p.x as f64, p.y as f64, s.width as f64, s.height as f64)
    } else {
        (0.0, 0.0, 1920.0, 1080.0)
    };

    let mut x = anchor.x - win_w / 2.0;
    let mut y = anchor.y - win_h - margin;

    let min_x = mx + margin;
    let max_x = mx + mw - win_w - margin;
    if x < min_x {
        x = min_x;
    }
    if x > max_x {
        x = max_x;
    }
    let min_y = my + margin;
    let max_y = my + mh - win_h - margin;
    if y < min_y {
        y = min_y;
    }
    if y > max_y {
        y = max_y;
    }

    let _ = panel.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    let _ = panel.show();
    let _ = panel.set_focus();
}

fn show_panel(app: &AppHandle) {
    let anchor = app
        .get_webview_window("panel")
        .and_then(|p| {
            p.current_monitor()
                .ok()
                .flatten()
                .or_else(|| p.primary_monitor().ok().flatten())
        })
        .map(|m| {
            let p = m.position();
            let s = m.size();
            PhysicalPosition::new(
                p.x as f64 + s.width as f64 - 24.0,
                p.y as f64 + s.height as f64 - 8.0,
            )
        })
        .unwrap_or(PhysicalPosition::new(1900.0, 1070.0));
    show_panel_near(app, anchor);
}

fn toggle_panel(app: &AppHandle) {
    if let Some(panel) = app.get_webview_window("panel") {
        if panel.is_visible().unwrap_or(false) {
            let _ = panel.hide();
        } else {
            show_panel(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .on_window_event(|window, event| {
            if window.label() == "panel" {
                if let WindowEvent::Focused(false) = event {
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            // Default native backdrop + rounded corners on the panel.
            #[cfg(target_os = "windows")]
            if let Some(panel) = app.get_webview_window("panel") {
                if apply_mica(&panel, Some(true)).is_err() {
                    let _ = apply_acrylic(&panel, Some((24, 26, 34, 140)));
                }
                round_corners(&panel);
            }

            let toggle = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyH);
            app.global_shortcut().register(toggle)?;

            let open_item = MenuItem::with_id(app, "open", "Показать панель", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("HA Companion")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "open" => show_panel(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    let app = tray.app_handle();
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        position,
                        ..
                    } = event
                    {
                        show_panel_near(app, position);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![apply_backdrop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
