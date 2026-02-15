# Tricky Store Enhancer Extreme
提升TrickyStore的使用體驗，同時極致隱藏由解鎖引導載入程式產生的相關檢測點。

> [!TIP]
> 「[English](README.md)」「[简体中文](README.md)」

> [!IMPORTANT]  
> 本模組**專精**偽裝引導載入程式狀態，**而非**通過PlayIntegrity。

## 條件
- 已安裝 [TrickyStore](https://github.com/5ec1cff/TrickyStore)，或 [TrickyStoreOSS](https://github.com/beakthoven/TrickyStoreOSS) 或它的分支 [TEESimulator](https://github.com/JingMatrix/TEESimulator) 模組
- 掛載系統不是 OverlayFS

## 安裝
1. 刷入模組並重新啟動裝置。
2. 手動配置(可選)。
3. 完成！

## 功能
### 主要
- 對衝突模組添加移除標籤/強制刪除；偵測到衝突軟體時直接卸載；即時監控
- 接管TrickyStore模組target.txt，優先級高於任何類似模組；即時監控
- 啟動時全自動修正異常VerifiedBootHash屬性
- 啟動時將安全性修補程式等級同步至屬性
- 啟動時偽裝引導載入程式狀態為鎖定
- 提供Google硬體認證根憑證簽章的keybox<sup>已撤銷(即將從安裝過程移到WebUI內部)</sup>

### 其他
- 在模組描述顯示運行環境和啟動結果
- 根據系統語言分別顯示zh-Hans或en-US: 執行狀態/安裝過程
- 安裝時備份Keybox，於卸載時恢復備份。路徑：`/data/adb/tricky_store/keybox_backup/keybox.xml`

### TSEE-CLI
- 調用
  - 於終端以Root身份執行`PATH="/data/adb/modules/ts_enhancer_extreme/bin:$PATH"`
    - 竊取Google硬體認證根憑證簽章的keybox: `tseed --stealkeybox` `[-a|-b|-c]`<sup>「[Tricky-Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)」「[Integrity-Box](https://github.com/MeowDump/Integrity-Box)」「[YuriKey-Manager](https://github.com/YurikeyDev/yurikey)」</sup>
    - 連線拉取Pixel更新公告的最新安全性修補程式等級: `tseed --securitypatchdatefetch`
    - TrickyStore後台服務狀態檢測/停止進程/啟動服務: `tseed --tsctl` `[-stop|-start|-state]`
    - TSEnhancerExtreme後台服務狀態檢測/停止進程/啟動服務: `tseed --tseectl` `[-stop|-start|-state]`
- 配置
  - 配置目錄路徑: `/data/adb/ts_enhancer_extreme`
  - 日誌檔案路徑`/data/adb/ts_enhancer_extreme/log`，若遇到問題，請建立 issue 並附上日誌。

### WebUI
- 導出日誌
- 目標列表管理
- 自訂安全性修補程式等級
- 從內部儲存空間導入keybox
- 調用tseed-竊取Google硬體認證根憑證簽章的keybox
- 調用tseed-連線抓取Pixel更新公告的最新安全性修補程式等級
- 調用tseed-TrickyStore後台服務狀態檢測/停止進程/啟動服務
- 調用tseed-TSEnhancerExtreme後台服務狀態檢測/停止進程/啟動服務

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