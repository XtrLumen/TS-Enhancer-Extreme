# Tricky Store Enhancer Extreme
提升TrickyStore的使用體驗,同時極致隱藏由解鎖引導載入程式產生的相關檢測點。

> [!TIP]
> 「[English](README.md)」「[简体中文](README2zh-Hans.md)」

> [!IMPORTANT]  
> 本模組**專精**偽裝引導載入程式狀態,**而非**通過PlayIntegrity.

## 條件
- 已安裝 [TrickyStore](https://github.com/5ec1cff/TrickyStore) 或 [TrickyStoreOSS](https://github.com/beakthoven/TrickyStoreOSS) 模組

## 安裝
1. 刷入模組並重新啟動裝置.
2. 手動配置(可選).
3. 完成!

## 功能
### 主要
- [x] 偵測到衝突模組時對其添加移除標籤/直接刪除;偵測到衝突軟體時直接刪除,實時監控.
- [x] 接管TrickyStore模組目標檔案,即時更新,優先級高於任何類似模組.
- [x] 全自動修正異常VerifiedBootHash屬性
- [x] 將安全性修補程式等級同步至屬性
- [x] 偽裝引導載入程式狀態為鎖定
- [x] 提供Google硬體認證根憑證簽章的keybox<sup>已撤銷</sup>
- [ ] 在TrickyStore模組卡片上添加操作按鈕，用於更新TrickyStore模組目標檔案<sup>即將更改</sup>.

### 其他
- [x] 監控並顯示運行狀態
- [x] 根據系統語言分別提供zh-Hans/en-US提示: 執行狀態/安裝過程
- [x] 安裝時備份TrickyStore模組配置目錄,於卸載時恢復備份.路徑：`/data/adb/tricky_store/config_backup`

### TSEE-CLI
**WebUI仍在開發中,目前只能手動配置**
- 調用功能
  - 於終端以Root身份執行`PATH="/data/adb/modules/ts_enhancer_extreme/binaries:$PATH"`
    - 竊取Google硬體認證根憑證簽章的keybox: `tseed --stealkeybox` `[Basic |-a|-b|-c| ]`<sup>「[Tricky-Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)」「[Integrity-Box](https://github.com/MeowDump/Integrity-Box)」「[YuriKey-Manager](https://github.com/YurikeyDev/yurikey)」</sup>
    - 連線拉取Pixel更新公告的最新安全性修補程式等級: `tseed --securitypatchdatefetch`
    - TrickyStore服務狀態讀取/控制: `tseed --tsctl` `[Basic |-stop|-start|-state| ]`
    - TSEnhancerExtreme服務狀態讀取/控制: `tseed --tseectl` `[Basic |-stop|-start|-state| ]`
- 配置模組
  - 配置目錄路徑: `/data/adb/ts_enhancer_extreme`
    - 在sys.txt中填入想添加到TrickyStore模組目標檔案的系統程式的套件名稱
    - 在usr.txt中填入想從TrickyStore模組目標檔案去除的使用者程式的套件名稱
    - 日誌位於`/data/adb/ts_enhancer_extreme/log`,若遇到問題請附上日誌並建立 issue 回報。

### WebUI
- [ ] 日誌監控視窗
- [ ] 快捷勾選系統程式
- [ ] 快捷去除使用者程式
- [ ] 從內部儲存空間導入keybox
- [ ] 調用TrickyStore服務狀態讀取/控制
- [ ] 調用竊取Google硬體認證根憑證簽章的keybox
- [ ] 調用TSEnhancerExtreme服務狀態讀取/控制
- [ ] 快捷自訂安全性修補程式等級/調用連線抓取Pixel更新公告的最新安全性修補程式等級

> [!NOTE]
> ### WebUI支援
>   - **KernelSU 或 APatch**
>     - 原生支援
>   - **Magisk**
>     - 提供跳轉至 [WebUI X Portable](https://github.com/MMRLApp/WebUI-X-Portable) 或 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone) 的操作按鈕
>       - 在未安裝任何 WebUI 獨立軟體時自動安裝 [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone)

## 致謝
- [5ec1cff/cmd-wrapper](https://gist.github.com/5ec1cff/4b3a3ef329094e1427e2397cfa2435ff)
- [vvb2060/KeyAttestation](https://github.com/vvb2060/KeyAttestation)