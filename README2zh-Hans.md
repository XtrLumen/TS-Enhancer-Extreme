# Tricky Store Enhancer Extreme
提升TrickyStore的使用体验,同时极致隐藏由解锁引导加载程序产生的相关检测点.

> [!TIP]
> 「[English](README.md)」「[繁體中文](README2zh-Hant.md)」

> [!IMPORTANT]  
> 本模块**专精**伪装引导加载程序状态,**而非**通过PlayIntegrity.

## 条件
- 已安装 [TrickyStore](https://github.com/5ec1cff/TrickyStore) 或 [TrickyStoreOSS](https://github.com/beakthoven/TrickyStoreOSS) 模块

## 安装
1. 刷写模块并重新启动设备.
2. 手动配置(可选).
3. 完成!

## 功能
### 主要
- [x] 检测到冲突模块时对其添加移除标签/直接删除;检测到冲突软件时直接删除,实时监控.
- [x] 接管TrickyStore模块目标文件,实时更新,优先级高于任何类似模块.
- [x] 全自动修正异常VerifiedBootHash属性
- [x] 伪装引导加载程序状态为锁定
- [x] 将安全补丁级别同步至属性
- [x] 提供谷歌硬件认证根证书签名的keybox<sup>已吊销</sup>
- [ ] 在TrickyStore模块卡片上添加操作按钮,用于更新TrickyStore模块目标文件<sup>即将更改</sup>.

### 其他
- [x] 监控并显示运行状态
- [x] 根据系统语言分别提供zh-Hans/en-US提示: 运行状态/安装过程
- [x] 安装时备份TrickyStore模块配置目录,于卸载时恢复备份.路径: `/data/adb/tricky_store/config_backup`

### TSEE-CLI
**WebUI仍在开发中,目前只能手动配置**
- 调用功能
  - 于终端以Root身份执行`PATH="/data/adb/modules/ts_enhancer_extreme/binaries:$PATH"`
    - 窃取谷歌硬件认证根证书签名的keybox: `tseed --stealkeybox` `[Basic |-a|-b|-c| ]`<sup>「[Tricky-Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)」「[Integrity-Box](https://github.com/MeowDump/Integrity-Box)」「[YuriKey-Manager](https://github.com/YurikeyDev/yurikey)」</sup>
    - 联网拉取Pixel更新公告的最新安全补丁级别: `tseed --securitypatchdatefetch`
    - TrickyStore服务状态读取/控制: `tseed --tsctl` `[Basic |-stop|-start|-state| ]`
    - TSEnhancerExtreme服务状态读取/控制: `tseed --tseectl` `[Basic |-stop|-start|-state| ]`
- 配置模块
  - 配置目录路径: `/data/adb/ts_enhancer_extreme`
    - 在sys.txt中填入想添加到TrickyStore模块目标文件的系统程序的包名
    - 在usr.txt中填入想从TrickyStore模块目标文件去除的用户程序的包名
    - 日志位于`/data/adb/ts_enhancer_extreme/log`,若遇到问题请附上日志并创建 issue 反馈.

### WebUI
- [ ] 日志监控窗口
- [ ] 快捷去除用户程序
- [ ] 快捷勾选系统程序
- [ ] 从内部存储导入keybox
- [ ] 调用TrickyStore服务状态读取/控制
- [ ] 调用窃取谷歌硬件认证根证书签名的keybox
- [ ] 调用TSEnhancerExtreme服务状态读取/控制
- [ ] 快捷自定义安全补丁级别/调用联网抓取Pixel更新公告的最新安全补丁级别

> [!NOTE]
> ### WebUI支持
>   - **KernelSU 或 APatch**
>     - 原生支持
>   - **Magisk**
>     - 提供跳转至 [WebUI X Portable](https://github.com/MMRLApp/WebUI-X-Portable) 或 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone) 的操作按钮
>       - 在未安装任何 WebUI 独立软件时自动安装 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone)

## 致谢
- [5ec1cff/cmd-wrapper](https://gist.github.com/5ec1cff/4b3a3ef329094e1427e2397cfa2435ff)
- [vvb2060/KeyAttestation](https://github.com/vvb2060/KeyAttestation)