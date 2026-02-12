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

use std::thread;
use std::process;
use std::io::Write;
use std::path::Path;
use std::ffi::CString;
use std::fs::OpenOptions;
use libloading::{Library, Symbol};

fn logout(level: char, msg: &str) {
    let (timestamp, pid, tid) = unsafe {
        //创建时间结构体
        let mut ts: libc::timespec = std::mem::zeroed();
        let mut tm: libc::tm = std::mem::zeroed();
        //赋值时间结构体
        libc::clock_gettime(libc::CLOCK_REALTIME, &mut ts);
        //时间格式转换
        libc::localtime_r(&ts.tv_sec, &mut tm);
        //时间格式分割
        let finaltime = format!("{:02}-{:02} {:02}:{:02}:{:02}.{:03}", tm.tm_mon + 1, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec, ts.tv_nsec / 1_000_000);
        //表达式结束
        (finaltime, libc::getpid(), libc::gettid())
    };
    OpenOptions::new().create(true).append(true).open("/data/adb/ts_enhancer_extreme/log/log.log").and_then(|mut f|
        f.write_all(
            format!("{}  {}  {} {} System.out: [TSEE]<Daemon>{}\n", timestamp, pid, tid, level, msg).as_bytes()
        )
    ).ok();
}
fn log(msg: &str) {
    logout('I', msg)
}
fn logw(msg: &str) {
    logout('W', msg)
}
fn loge(msg: &str) {
    logout('E', msg)
}
#[allow(unused)]
fn logd(msg: &str) {
    logout('D', msg)
}

fn watch(path: &str, args: Vec<&str>, events: u32, tx: std::sync::mpsc::Sender<bool>) {
    if !Path::new(path).exists() {
        loge(&format!("目录{}不存在,结束线程", path));
        //发送状态
        tx.send(false).ok();
        return;
    }
    //创建实例
    let instance = unsafe {libc::inotify_init()};
    if instance < 0 {
        loge("实例创建失败");
        //发送状态
        tx.send(false).ok();
        return;
    }
    //添加监听
    let watch = unsafe {
        let cstring = CString::new(path).unwrap();
        libc::inotify_add_watch(instance, cstring.as_ptr(), events)
    };
    if watch < 0 {
        loge("监听添加失败");
        //发送状态
        tx.send(false).ok();
        unsafe { libc::close(instance); }
        return;
    }
    log("线程就绪");
    //发送状态
    tx.send(true).ok();
    //创建缓冲区
    let mut buffer = [0u8; 1024];
    //日志速度限制
    let mut last = std::time::Instant::now();
    let speed = std::time::Duration::from_millis(1000);
    //循环开始等待
    loop {
        //阻塞
        unsafe {libc::read(
            instance, buffer.as_mut_ptr() as *mut libc::c_void, buffer.len()
        )};
        if last.elapsed() >= speed {
            log(&format!("触发执行tseed {}", args.join(" ")));
            last = std::time::Instant::now();
        }
        //执行
        process::Command::new("/data/adb/modules/ts_enhancer_extreme/bin/tseed").args(&args).status().ok();
    }
}

fn verify() -> Result<bool, &'static str> {
    let libpath = match unsafe {Library::new("/data/adb/modules/ts_enhancer_extreme/lib/libverify.so")} {
        Ok(lib) => lib,
        Err(_) => return Err("验证失败:libverify.so不存在")
    };
    let invoke_bridge: Symbol<unsafe fn() -> bool> = match unsafe {libpath.get(b"invoke_bridge")} {
        Ok(func) => func,
        Err(_) => return Err("验证失败:libverify.so不存在验证函数")
    };
    if unsafe {invoke_bridge()} {
        Ok(true)
    } else {
        Ok(false)
    }
}

fn main() {
    //验证
    match verify() {
        Ok(true) => log("开始启动线程"),
        Ok(false) => {
            loge("拒绝启动:模块文件被篡改!");
            unsafe {*(0xDEADBEEF as *mut u8) = 0}
        }
        Err(e) => {
            loge(e);
            process::abort();
        }
    }
    //创建通道
    let (tx1, rx1) = std::sync::mpsc::channel();
    let (tx2, rx2) = std::sync::mpsc::channel();
    //启动线程
    thread::spawn(move || {
        watch(
            "/data/adb/modules_update",
            vec!["--conflictmodcheck", "-s"],
            libc::IN_CREATE | libc::IN_ISDIR,
            tx1
        );
    });
    thread::spawn(move || {
        watch(
            "/data/app",
            vec!["--conflictappcheck", "--packagelistupdate"],
            libc::IN_CREATE | libc::IN_DELETE,
            tx2
        );
    });
    //捕获状态
    let res1 = rx1.recv().unwrap();
    let res2 = rx2.recv().unwrap();
    if res1 && res2 {
        log("成功启动服务");
    } else if res1 || res2 {
        logw("线程部分就绪");
    } else {
        loge("服务启动失败");
        process::abort();
    }
    //挂起
    thread::park();
}