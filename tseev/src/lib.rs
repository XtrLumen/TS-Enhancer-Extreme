use std::fs::File;
use std::io::Read;
use std::path::Path;
use ed25519_compact::{PublicKey, Signature};

fn array(path: &Path) -> Option<String> {
    let mut hasher = blake3::Hasher::new();
    let mut file = File::open(path).ok()?;
    let mut buffer = [0u8; 4096];

    loop {
        let size = file.read(&mut buffer).ok()?;
        if size == 0 {
            break;
        }
        hasher.update(&buffer[..size]);
    }

    Some(hex::encode(hasher.finalize().as_bytes()))
}

fn list(pwd: &Path) -> Option<String> {
    let action = if pwd.join(".action.sh").exists() {
        ".action.sh"
    } else {
        "action.sh"
    };

    let lists = [
        "bin/cmd",
        "bin/tseed",
        "lib/action.sh",
        "lib/libverify.so",
        "lib/state.sh",
        "lib/util_functions.sh",
        "banner.png",
        "post-fs-data.sh",
        "service.apk",
        "service.sh",
        "service",
        "uninstall.sh",
        "webui.apk",
        action
    ];

    let mut blake3hash = String::new();

    for file in lists.iter() {
        blake3hash.push_str(&array(&pwd.join(file))?);
    }

    Some(blake3hash)
}

fn verify(pwd: &Path, message: &str) -> bool {
    let ml_bytes = match std::fs::read(pwd.join("mistylake")) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let mut sg_bytes = [0u8; 64];
    sg_bytes[0..16].copy_from_slice(&ml_bytes[0..16]);
    sg_bytes[16..48].copy_from_slice(&ml_bytes[32..64]);
    sg_bytes[48..64].copy_from_slice(&ml_bytes[80..96]);

    let mut pb_bytes = [0u8; 32];
    pb_bytes[0..16].copy_from_slice(&ml_bytes[16..32]);
    pb_bytes[16..32].copy_from_slice(&ml_bytes[64..80]);

    let sg_array: [u8; 64] = sg_bytes;
    let pb_array: [u8; 32] = pb_bytes;

    PublicKey::new(pb_array)
        .verify(message, &Signature::new(sg_array))
        .is_ok()
}

#[no_mangle]
pub fn sealer() -> bool {
    let pwd = Path::new("/data/adb/modules/ts_enhancer_extreme");

    let Some(hex) = list(pwd) else {
        return false;
    };

    verify(pwd, &hex)
}