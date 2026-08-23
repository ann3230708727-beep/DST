use std::{fs, path::Path};

fn ensure_windows_icon() {
    let path = Path::new("icons/icon.ico");
    if path.exists() {
        return;
    }

    fs::create_dir_all("icons").expect("failed to create Tauri icons directory");

    const W: u32 = 16;
    const H: u32 = 16;
    const PIXELS: u32 = W * H * 4;
    const MASK_ROW: u32 = ((W + 31) / 32) * 4;
    const MASK: u32 = MASK_ROW * H;
    const IMAGE_BYTES: u32 = 40 + PIXELS + MASK;

    let mut ico = Vec::with_capacity((22 + IMAGE_BYTES) as usize);

    // ICONDIR
    ico.extend_from_slice(&0u16.to_le_bytes());
    ico.extend_from_slice(&1u16.to_le_bytes());
    ico.extend_from_slice(&1u16.to_le_bytes());

    // ICONDIRENTRY
    ico.push(W as u8);
    ico.push(H as u8);
    ico.push(0);
    ico.push(0);
    ico.extend_from_slice(&1u16.to_le_bytes());
    ico.extend_from_slice(&32u16.to_le_bytes());
    ico.extend_from_slice(&IMAGE_BYTES.to_le_bytes());
    ico.extend_from_slice(&22u32.to_le_bytes());

    // BITMAPINFOHEADER. ICO stores height doubled to include the AND mask.
    ico.extend_from_slice(&40u32.to_le_bytes());
    ico.extend_from_slice(&(W as i32).to_le_bytes());
    ico.extend_from_slice(&((H * 2) as i32).to_le_bytes());
    ico.extend_from_slice(&1u16.to_le_bytes());
    ico.extend_from_slice(&32u16.to_le_bytes());
    ico.extend_from_slice(&0u32.to_le_bytes());
    ico.extend_from_slice(&(PIXELS + MASK).to_le_bytes());
    ico.extend_from_slice(&0i32.to_le_bytes());
    ico.extend_from_slice(&0i32.to_le_bytes());
    ico.extend_from_slice(&0u32.to_le_bytes());
    ico.extend_from_slice(&0u32.to_le_bytes());

    // 16x16 opaque sage placeholder icon (BGRA).
    for _ in 0..(W * H) {
        ico.extend_from_slice(&[0x78, 0x88, 0x6f, 0xff]);
    }

    // Fully opaque AND mask.
    ico.resize((22 + IMAGE_BYTES) as usize, 0);

    fs::write(path, ico).expect("failed to write Tauri Windows icon");
}

fn main() {
    ensure_windows_icon();
    tauri_build::build()
}
