# Tricky Store Enhancer Extreme
提升TrickyStore的使用体验，同时极致隐藏由解锁引导加载程序产生的相关检测点。

> [!TIP]
> 「[English](README4en-US.md)」「[繁體中文](README4zh-Hant.md)」

> [!IMPORTANT]  
> 本模块**专精**伪装引导加载程序状态，**而非**通过PlayIntegrity。

## 条件
- 已安装 [TrickyStore](https://github.com/5ec1cff/TrickyStore) 或 [TrickyStoreOSS](https://github.com/beakthoven/TrickyStoreOSS) 模块
- 挂载系统不是 OverlayFS

## 安装
1. 刷写模块并重新启动设备。
2. 手动配置(可选)。
3. 完成！

## 功能
### 主要
- 对冲突模块添加移除标签/强制删除；检测到冲突软件时直接卸载；实时监控
- 接管TrickyStore模块target.txt，优先级高于任何类似模块；实时监控
- 启动时全自动修正异常VerifiedBootHash属性
- 启动时伪装引导加载程序状态为锁定
- 启动时将安全补丁级别同步到属性
- 提供谷歌硬件认证根证书签名的keybox<sup>已吊销(即将从安装过程移到WebUI内部)</sup>

### 其他
- 在模块描述显示运行环境和启动结果
- 根据系统语言分别显示zh-Hans或en-US: 运行状态/安装过程
- 安装时备份Keybox，于卸载时恢复备份。路径: `/data/adb/tricky_store/keybox_backup/keybox.xml`

### TSEE-CLI
- 调用
  - 于终端以Root身份执行`PATH="/data/adb/modules/ts_enhancer_extreme/bin:$PATH"`
    - 窃取谷歌硬件认证根证书签名的keybox: `tseed --stealkeybox` `[Basic |-a|-b|-c| ]`<sup>「[Tricky-Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)」「[Integrity-Box](https://github.com/MeowDump/Integrity-Box)」「[YuriKey-Manager](https://github.com/YurikeyDev/yurikey)」</sup>
    - 联网拉取Pixel更新公告的最新安全补丁级别: `tseed --securitypatchdatefetch`
    - TrickyStore后台服务停止进程/启动服务/状态检测: `tseed --tsctl` `[Basic |-stop|-start|-state| ]`
    - TSEnhancerExtreme后台服务停止进程/启动服务/状态检测: `tseed --tseectl` `[Basic |-stop|-start|-state| ]`
- 配置
  - 配置目录路径: `/data/adb/ts_enhancer_extreme`
  - 日志文件路径: `/data/adb/ts_enhancer_extreme/log/log.log`，若遇到问题，请创建 issue 并附上日志。

### WebUI
- 导出日志
- 目标列表管理
- 自定义安全补丁级别
- 从内部存储导入keybox
- 调用tseed-窃取谷歌硬件认证根证书签名的keybox
- 调用tseed-联网拉取Pixel更新公告的最新安全补丁级别
- 调用tseed-TrickyStore后台服务停止进程/启动服务/状态检测
- 调用tseed-TSEnhancerExtreme后台服务停止进程/启动服务/状态检测

> [!NOTE]
> ### WebUI支持
>   - **KernelSU 或 APatch**
>     - 原生支持
>   - **Magisk**
>     - 提供跳转到 [WebUI X Portable](https://github.com/MMRLApp/WebUI-X-Portable) 或 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone) 的操作按钮
>       - 在未安装任何 WebUI 独立软件时自动安装 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone)

## 致谢
- [5ec1cff/cmd-wrapper](https://gist.github.com/5ec1cff/4b3a3ef329094e1427e2397cfa2435ff)
- [vvb2060/KeyAttestation](https://github.com/vvb2060/KeyAttestation)