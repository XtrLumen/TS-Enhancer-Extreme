/*
 * This file is part of TS-Enhancer-Extreme.
 *
 * TS-Enhancer-Extreme is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * TS-Enhancer-Extreme is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with TS-Enhancer-Extreme.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Copyright (C) 2025 TheGeniusClub (Organization)
 * Copyright (C) 2025 XtrLumen (Developer)
 */

use std::fs::File;
use std::io::Read;
use std::path::Path;
use ed25519_compact::{PublicKey, Signature};

fn verify() -> bool {
    let pwd = Path::new("/data/adb/modules/ts_enhancer_extreme");
    
    //创建文件列表
    let action = if pwd.join(".action.sh").exists() {
        ".action.sh"
    } else {
        "action.sh"
    };
    let lists = [
        "bin/cmd",
        "bin/tseed",
        "bin/tsees",
        "lib/libverify.so",
        "script/state.sh",
        "script/util_functions.sh",
        "banner.png",
        "post-fs-data.sh",
        "service.apk",
        "service.sh",
        "uninstall.sh",
        "webui.apk",
        action
    ];

    //计算哈希拼接
    let mut blake3hash = String::new();
    for file in lists.iter() {
        let path = pwd.join(file);

        let mut hasher = blake3::Hasher::new();
        let mut file = match File::open(&path) {
            Ok(f) => f,
            Err(_) => return false,
        };
        let mut buffer = [0u8; 4096];

        loop {
            let size = match file.read(&mut buffer) {
                Ok(s) => s,
                Err(_) => return false,
            };
            if size == 0 {
                break;
            }
            hasher.update(&buffer[..size]);
        }

        blake3hash.push_str(&hex::encode(hasher.finalize().as_bytes()));
    }

    //读取集合文件
    let ml_bytes = match std::fs::read(pwd.join("mistylake")) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    //拼接签名
    let mut sg_bytes = [0u8; 64];
    sg_bytes[0..16].copy_from_slice(&ml_bytes[0..16]);
    sg_bytes[16..48].copy_from_slice(&ml_bytes[32..64]);
    sg_bytes[48..64].copy_from_slice(&ml_bytes[80..96]);

    //拼接公钥
    let mut pb_bytes = [0u8; 32];
    pb_bytes[0..16].copy_from_slice(&ml_bytes[16..32]);
    pb_bytes[16..32].copy_from_slice(&ml_bytes[64..80]);

    //使用签名和公钥验证与拼接哈希是否匹配
    PublicKey::new(pb_bytes).verify(&blake3hash, &Signature::new(sg_bytes)).is_ok()
}

#[unsafe(no_mangle)]
pub fn invoke_bridge() -> bool {
    verify()
}