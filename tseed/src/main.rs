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

use libloading::{Library, Symbol};

unsafe fn verify() -> Result<bool, &'static str> {
    let libpath = match Library::new("/data/adb/modules/ts_enhancer_extreme/lib/libverify.so") {
        Ok(lib) => lib,
        Err(_) => return Err("验证失败,libverify.so不存在")
    };
    let invoke_bridge: Symbol<unsafe fn() -> bool> = match libpath.get(b"invoke_bridge") {
        Ok(func) => func,
        Err(_) => return Err("验证失败,libverify.so不存在验证函数")
    };
    if invoke_bridge() {
        Ok(true)
    } else {
        Ok(false)
    }
}

fn main() {
    //验证
    unsafe {
        match verify() {
            Ok(true) => {},
            Ok(false) => {
                println!("拒绝执行:模块文件被篡改!");
                *(0xDEADBEEF as *mut u8) = 0
            }
            Err(e) => {
                println!("{}", e);
                *(0xDEADBEEF as *mut u8) = 0
            }
        }
    }
    println!("Pass!");
}