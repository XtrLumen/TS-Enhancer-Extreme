# Tricky Store Enhancer Extreme
Enhances the TrickyStore experience, while providing comprehensive hiding of bootloader unlock detection points.

> [!TIP]
> 「[简体中文](README2zh-Hans.md)」「[繁體中文](README2zh-Hant.md)」

> [!IMPORTANT]
> This module **specializes** in disguising the bootloader status, **rather than** passed Play Integrity.

## Requirements
- [TrickyStore](https://github.com/5ec1cff/TrickyStore) or [TrickyStoreOSS](https://github.com/beakthoven/TrickyStoreOSS) module installed

## Install
1. Flash this module and reboot.
2. Manual configuration (optional).
3. Enjoy!

## Feature
### Main
- [x] Takes over TrickyStore module target file management with real-time updates and higher priority than similar modules.
- [x] Automatically tags conflicting modules for removal or deletes them directly; removes conflicting apps in real-time.
- [x] Corrects abnormal VerifiedBootHash property automatically
- [x] Synchronizes the security patch level to the attributes
- [x] Spoofs bootloader status as locked
- [x] Provides Google Hardware Attestation Root Certificate signing keybox<sup>Revoked</sup>
- [ ] Adds action button to TrickyStore module card for updating TrickyStore module target files<sup>About to change</sup>.

### Other
- [x] Monitors and displays operating status
- [x] Displays prompts in zh-Hans or en-US based on system language for runtime status and installation processes
- [x] Backs up the TrickyStore module configuration directory during installation and restores the backup during uninstallation. Path: `/data/adb/tricky_store/config_backup`

### TSEE-CLI
**With the WebUI still under development, it can only be configured manually for now**
- Invoke function
  - Execute in the terminal as root: `PATH="/data/adb/modules/ts_enhancer_extreme/binaries:$PATH"`
    - Steal Google Hardware Attestation Root Certificate signing keybox: `tseed --stealkeybox` `[Basic |-a|-b|-c| ]`<sup>「[Tricky-Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)」「[Integrity-Box](https://github.com/MeowDump/Integrity-Box)」「[YuriKey-Manager](https://github.com/YurikeyDev/yurikey)」</sup>
    - Fetch the latest security patch level for Pixel update announcements online: `tseed --securitypatchdatefetch`
    - TrickyStore service status reading/control: `tseed --tsctl` `[Basic |-stop|-start|-state| ]`
    - TSEnhancerExtreme service status reading/control: `tseed --tseectl` `[Basic |-stop|-start|-state| ]`
- Configuration Module
  - Configuration directory path: `/data/adb/ts_enhancer_extreme`
    - Add system app package names to sys.txt for inclusion in TrickyStore module target file.
    - Add user app package names to usr.txt for exclusion from TrickyStore module target file.
    - The logs are located at `/data/adb/ts_enhancer_extreme/log`. If you encounter any issues, please include the logs when creating an issue for feedback.

### WebUI
- [ ] Log Monitoring Window
- [ ] Quickly select user apps
- [ ] Quickly select system apps
- [ ] Import keybox from internal storage
- [ ] Invoke TrickyStore service status reading/control
- [ ] Invoke TSEnhancerExtreme service status reading/control
- [ ] Invoke steal Google Hardware Attestation Root Certificate signing keybox
- [ ] Quickly customize security patch levels / Invoke fetch the latest security patch level for Pixel update announcements online

> [!NOTE]
> ### WebUI supports
>   - **KernelSU or APatch**
>     - Native support
>   - **Magisk** 
>     - Provide action button to navigate to [WebUI X Portable](https://github.com/MMRLApp/WebUI-X-Portable) or [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone)
>       - Automatically install [KSUWebUIStandalone](https://github.com/5ec1cff/KsuWebUIStandalone) when no WebUI standalone software is installed

## Acknowledgement
- [5ec1cff/cmd-wrapper](https://gist.github.com/5ec1cff/4b3a3ef329094e1427e2397cfa2435ff)
- [vvb2060/KeyAttestation](https://github.com/vvb2060/KeyAttestation)