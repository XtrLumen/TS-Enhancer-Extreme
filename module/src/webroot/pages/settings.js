/**
 * TSEE WebUI 应用管理页面模块
 * 管理包名黑白名单配置
 */

const SettingsPage = {
    appList: [],
    systemAppList: [],
    targetList: [],
    thirdPartyApps: [],
    systemApps: [],
    isLoading: false,
    isCancelled: false,
    loadingState: 'idle',
    showSystemApps: false,
    isInitialized: false,
    iconCache: new Map(),
    searchQuery: '',
    useBlacklistMode: false,
    showSettingsMenu: false,
    autoSaveTimer: null,
    autoSaveDelay: 1000,
    lastSaveTime: 0,
    lastScrollTop: 0,
    scrollDirection: 'down',
    isScrolling: false,
    scrollTimeout: null,

    async preloadData() {
        try {
            const usrPath = '/data/adb/ts_enhancer_extreme/usr.txt';
            const sysPath = '/data/adb/ts_enhancer_extreme/sys.txt';
            const blacklistPath = '/data/adb/ts_enhancer_extreme/blacklist';
            
            try {
                const blacklistCheck = await Core.execCommand(`if [ -f "${blacklistPath}" ]; then echo "exists"; else echo "not exists"; fi`);
                console.log('黑名单检测原始输出:', blacklistCheck);
                
                this.useBlacklistMode = blacklistCheck && blacklistCheck.trim() === 'exists';
                console.log('使用黑名单模式:', this.useBlacklistMode);
            } catch (e) {
                console.log('检测blacklist文件时出错:', e);
                this.useBlacklistMode = false;
            }
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('命令执行超时')), 5000);
            });
            
            try {
                const usrRaw = await Promise.race([
                    Core.execCommand(`cat "${usrPath}"`),
                    timeoutPromise
                ]);
                if (typeof usrRaw === 'object' && usrRaw.stdout) {
                    this.thirdPartyApps = (usrRaw.stdout || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                } else {
                    this.thirdPartyApps = (usrRaw || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                }
            } catch (e) {
                this.thirdPartyApps = [];
            }
            
            try {
                const sysRaw = await Promise.race([
                    Core.execCommand(`cat "${sysPath}"`),
                    timeoutPromise
                ]);
                if (typeof sysRaw === 'object' && sysRaw.stdout) {
                    this.systemApps = (sysRaw.stdout || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                } else {
                    this.systemApps = (sysRaw || '').split('\n').map(pkg => pkg.trim()).filter(pkg => pkg);
                }
            } catch (e) {
                this.systemApps = [];
            }
        } catch (e) {
            console.error('预加载数据出错:', e);
        }
        
        return true;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    updateProgress(percent, text) {
        const progressFill = document.getElementById('settings-loading-progress-fill');
        const progressText = document.getElementById('settings-loading-progress-text');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = text;
        }
    },

    async fetchAppList() {
        this.setLoadingState('loading');
        
        try {
            this.updateProgress(10, I18n.translate('INITIALIZING', '正在初始化...'));
            await this.delay(100);
            
            const hasKernelSU = typeof ksu !== 'undefined';
            const hasPackageManager = typeof $packageManager !== 'undefined';
            
            if (hasKernelSU || hasPackageManager) {
                await this.fetchAppListWithKernelSU();
            } else {
                await this.fetchAppListWithPM();
            }
            
        } catch (e) {
            this.appList = [];
            this.systemAppList = [];
            this.updateProgress(0, '加载失败');
            await this.delay(500);
            this.setLoadingState('error');
            
            if (document.getElementById('settings-container')) {
                this.renderAppList();
            }
        }
    },

    async fetchAppListWithKernelSU() {
        try {
            this.updateProgress(20, I18n.translate('FETCHING_APP_LIST', '正在获取应用列表...'));
            
            let userPackages = [];
            let systemPackages = [];
            
            if (typeof ksu !== 'undefined') {
                try {
                    const userPkgs = JSON.parse(ksu.listUserPackages() || '[]');
                    userPackages = userPkgs;
                    
                    this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
                    
                    const systemPkgs = JSON.parse(ksu.listSystemPackages() || '[]');
                    systemPackages = systemPkgs;
                    
                } catch (e) {
                    await this.fetchAppListWithPM();
                    return;
                }
            } else if (typeof $packageManager !== 'undefined') {
                try {
                    userPackages = await this.getPackagesWithPackageManager(false);
                    this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
                    systemPackages = await this.getPackagesWithPackageManager(true);
                } catch (e) {
                    await this.fetchAppListWithPM();
                    return;
                }
            }
            
            this.updateProgress(60, I18n.translate('PROCESSING_APP_INFO', '正在处理应用信息...'));
            
            const userEntries = await this.processPackagesWithInfo(userPackages, false);
            this.appList = userEntries;
            
            this.updateProgress(80, I18n.translate('PROCESSING_SYSTEM_APPS', '正在处理系统应用...'));
            
            const systemEntries = await this.processPackagesWithInfo(systemPackages, true);
            this.systemAppList = systemEntries;
            
            this.updateProgress(95, I18n.translate('FINISHING_LOADING', '正在完成加载...'));
            await this.delay(200);
            
            this.updateProgress(100, I18n.translate('LOADING_COMPLETE', '加载完成'));
            await this.delay(300);
            
            this.setLoadingState('success');
            
            if (document.getElementById('settings-container')) {
                this.renderAppList();
            }
            
        } catch (e) {
            throw e;
        }
    },

    async getPackagesWithPackageManager(isSystem) {
        return new Promise((resolve) => {
            const packages = [];
            try {
                if (typeof $packageManager !== 'undefined') {
                    const flags = isSystem ? 0x00000001 : 0x00000002;
                    const installedApps = $packageManager.getInstalledApplications(flags);
                    for (let i = 0; i < installedApps.size(); i++) {
                        packages.push(installedApps.get(i).packageName);
                    }
                }
                resolve(packages);
            } catch (e) {
                resolve([]);
            }
        });
    },

    async fetchAppListWithPM() {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('获取应用列表超时')), 8000);
        });
        
        this.updateProgress(20, I18n.translate('FETCHING_APP_LIST', '正在获取应用列表...'));
        const thirdPartyOutput = await Promise.race([
            Core.execCommand('pm list packages -3'),
            timeoutPromise
        ]);
        
        this.updateProgress(40, I18n.translate('FETCHING_SYSTEM_APPS', '正在获取系统应用...'));
        const systemOutput = await Promise.race([
            Core.execCommand('pm list packages -s'),
            timeoutPromise
        ]);
        
        this.updateProgress(60, I18n.translate('PROCESSING_APP_INFO', '正在处理应用信息...'));
        
        let thirdPartyPkgs = (thirdPartyOutput.stdout || thirdPartyOutput).split('\n').map(l => l.replace('package:', '').trim()).filter(Boolean);
        const thirdPartyEntries = await this.processPackagesWithInfo(thirdPartyPkgs, false);
        this.appList = thirdPartyEntries;
        
        this.updateProgress(80, I18n.translate('PROCESSING_SYSTEM_APPS', '正在处理系统应用...'));
        
        let systemPkgs = (systemOutput.stdout || systemOutput).split('\n').map(l => l.replace('package:', '').trim()).filter(Boolean);
        const systemEntries = await this.processPackagesWithInfo(systemPkgs, true);
        this.systemAppList = systemEntries;
        
        this.updateProgress(95, I18n.translate('FINISHING_LOADING', '正在完成加载...'));
        await this.delay(200);
        
        this.updateProgress(100, I18n.translate('LOADING_COMPLETE', '加载完成'));
        await this.delay(300);
        
        this.setLoadingState('success');
        
        if (document.getElementById('settings-container')) {
            this.renderAppList();
        }
    },

    async processPackagesWithInfo(packages, isSystemApp) {
        const entries = [];
        const batchSize = 10;
        
        for (let i = 0; i < packages.length; i += batchSize) {
            const batch = packages.slice(i, i + batchSize);
            const batchPromises = batch.map(pkg => this.getAppInfo(pkg));
            const batchResults = await Promise.all(batchPromises);
            
            for (const result of batchResults) {
                entries.push({
                    appName: result.appName,
                    packageName: result.packageName,
                    isSystemApp: isSystemApp
                });
            }
            
            const progress = 60 + Math.floor((i / packages.length) * 35);
            const appType = isSystemApp ? I18n.translate('SYSTEM', '系统') : I18n.translate('THIRD_PARTY', '第三方');
            this.updateProgress(progress, I18n.translate('PROCESSING_APPS_PROGRESS', '处理{type}应用中... ({current}/{total})', {
                type: appType,
                current: Math.min(i + batchSize, packages.length),
                total: packages.length
            }));
            await this.delay(10);
        }
        
        return entries;
    },

    async getAppInfo(packageName) {
        let appName = packageName;
        
        try {
            if (typeof ksu !== 'undefined' && typeof ksu.getPackagesInfo === 'function') {
                const info = JSON.parse(ksu.getPackagesInfo(`["${packageName}"]`));
                if (info && info[0] && info[0].appLabel) {
                    appName = info[0].appLabel;
                }
            } 
            else if (typeof $packageManager !== 'undefined') {
                const info = $packageManager.getApplicationInfo(packageName, 0, 0);
                if (info && info.getLabel) {
                    appName = info.getLabel();
                }
            }
        } catch (e) {
        }
        
        return { 
            appName: appName ? appName.trim() : packageName, 
            packageName: packageName.trim() 
        };
    },

    async loadAppIcon(packageName, imgElement, loaderElement) {
        if (this.iconCache.has(packageName)) {
            imgElement.src = this.iconCache.get(packageName);
            if (loaderElement) loaderElement.style.display = 'none';
            imgElement.style.opacity = '1';
            return;
        }

        try {
            if (typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function') {
                const iconInfo = JSON.parse(ksu.getPackagesIcons(`["${packageName}"]`, 48));
                if (iconInfo && iconInfo[0] && iconInfo[0].icon) {
                    this.iconCache.set(packageName, iconInfo[0].icon);
                    imgElement.src = iconInfo[0].icon;
                    if (loaderElement) loaderElement.style.display = 'none';
                    imgElement.style.opacity = '1';
                    return;
                }
            }
            else if (typeof $packageManager !== 'undefined') {
                try {
                    const icon = $packageManager.getApplicationIcon(packageName, 0, 0);
                } catch (e) {
                }
            }
        } catch (e) {
        }

        if (loaderElement) loaderElement.style.display = 'none';
    },

    setupIconLazyLoad() {
        if (typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const packageName = container.getAttribute('data-package');
                    const imgElement = container.querySelector('.app-icon-img');
                    const loaderElement = container.querySelector('.app-icon-loader');
                    
                    if (packageName && imgElement) {
                        this.loadAppIcon(packageName, imgElement, loaderElement);
                        observer.unobserve(container);
                    }
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        const iconContainers = document.querySelectorAll('.app-icon-container');
        iconContainers.forEach(container => {
            observer.observe(container);
        });
    },
    
    sortAppList(appList) {
        return appList.sort((a, b) => {
            const aIsSystem = a.isSystemApp;
            const bIsSystem = b.isSystemApp;
            
            // 系统应用始终排在第三方应用后面
            if (aIsSystem !== bIsSystem) {
                return aIsSystem ? 1 : -1;
            }
            
            // 如果是第三方应用
            if (!aIsSystem && !bIsSystem) {
                const aChecked = this.getAppCheckedState(a);
                const bChecked = this.getAppCheckedState(b);
                
                if (this.useBlacklistMode) {
                    // 黑名单模式：先显示开启的第三方应用
                    if (aChecked !== bChecked) {
                        return aChecked ? -1 : 1;
                    }
                } else {
                    // 白名单模式：先显示关闭的第三方应用
                    if (aChecked !== bChecked) {
                        return aChecked ? 1 : -1;
                    }
                }
            } else {
                // 系统应用：按选中状态排序（选中的在前）
                const aChecked = this.getAppCheckedState(a);
                const bChecked = this.getAppCheckedState(b);
                if (aChecked !== bChecked) {
                    return aChecked ? -1 : 1;
                }
            }
            
            // 最后按应用名称排序
            return (a.appName || a.packageName || '').localeCompare(b.appName || b.packageName || '');
        });
    },

    async init() {
        this.isCancelled = false;
        I18n.registerLanguageChangeHandler(this.onLanguageChanged.bind(this));
        
        await this.preloadData();
        
        this.isInitialized = true;
    },

    onLanguageChanged() {
        if (this.isInitialized) {
            this.renderAppList();
            this.renderSettingsMenu();
        }
    },

    setLoadingState(state) {
        this.loadingState = state;
        this.updateLoadingAnimation();
    },

    updateLoadingAnimation() {
        const loadingOverlay = document.getElementById('settings-loading');
        const loadingText = document.getElementById('settings-loading-text');
        const progressContainer = document.getElementById('settings-loading-progress-container');
        
        if (!loadingOverlay) return;
        
        switch (this.loadingState) {
            case 'loading':
                loadingOverlay.style.display = 'flex';
                if (loadingText) loadingText.textContent = I18n.translate('LOADING_SETTINGS', '正在加载应用列表...');
                if (progressContainer) progressContainer.style.display = 'block';
                break;
            case 'success':
            case 'error':
            case 'idle':
                loadingOverlay.style.display = 'none';
                break;
        }
    },

    registerActions() {
        UI.registerPageActions('settings', [
            {
                id: 'search',
                icon: 'search',
                label: I18n.translate('SEARCH', '搜索'),
                onClick: () => this.toggleSearchBox()
            },
            {
                id: 'settings',
                icon: 'more_vert',
                label: I18n.translate('SETTINGS', '设置'),
                onClick: () => this.toggleSettingsMenu()
            }
        ]);
    },
    
    toggleSearchBox() {
        const searchContainer = document.querySelector('.search-container');
        const searchInput = document.getElementById('app-search-input');
        
        if (searchContainer) {
            if (searchContainer.style.display === 'none' || searchContainer.style.display === '') {
                searchContainer.style.display = 'block';
                if (searchInput) {
                    searchInput.focus();
                }
            } else {
                searchContainer.style.display = 'none';
                this.searchQuery = '';
                if (searchInput) {
                    searchInput.value = '';
                }
                this.renderAppList();
            }
        }
    },

    toggleSettingsMenu() {
        this.showSettingsMenu = !this.showSettingsMenu;
        this.renderSettingsMenu();
    },

    renderSettingsMenu() {
        const existingMenu = document.getElementById('settings-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        if (!this.showSettingsMenu) {
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'settings-menu';
        menu.className = 'settings-menu';

        const title = document.createElement('div');
        title.className = 'settings-menu-title';
        title.textContent = I18n.translate('SETTINGS', '设置');

        const systemAppsItem = document.createElement('div');
        systemAppsItem.className = 'settings-menu-item';

        const systemAppsLabel = document.createElement('div');
        systemAppsLabel.className = 'settings-menu-item-label';
        systemAppsLabel.innerHTML = `
            <div class="settings-menu-item-title">${I18n.translate('SHOW_SYSTEM_APPS', '显示系统应用')}</div>
            <div class="settings-menu-item-desc">${I18n.translate('SHOW_SYSTEM_APPS_DESC', '开启后将显示系统应用列表')}</div>
        `;

        const systemAppsSwitch = document.createElement('label');
        systemAppsSwitch.className = 'switch';
        systemAppsSwitch.innerHTML = `
            <input type="checkbox" id="show-system-apps-toggle-menu" ${this.showSystemApps ? 'checked' : ''}>
            <span class="slider"></span>
        `;

        systemAppsItem.appendChild(systemAppsLabel);
        systemAppsItem.appendChild(systemAppsSwitch);

        const blacklistItem = document.createElement('div');
        blacklistItem.className = 'settings-menu-item';

        const blacklistLabel = document.createElement('div');
        blacklistLabel.className = 'settings-menu-item-label';
        blacklistLabel.innerHTML = `
            <div class="settings-menu-item-title">${I18n.translate('BLACKLIST_MODE', '黑名单模式')}</div>
            <div class="settings-menu-item-desc">${I18n.translate('BLACKLIST_MODE_DESC', '开启后选中的应用将被排除（默认：白名单模式）')}</div>
        `;

        const blacklistSwitch = document.createElement('label');
        blacklistSwitch.className = 'switch';
        blacklistSwitch.innerHTML = `
            <input type="checkbox" id="blacklist-mode-toggle-menu" ${this.useBlacklistMode ? 'checked' : ''}>
            <span class="slider"></span>
        `;

        blacklistItem.appendChild(blacklistLabel);
        blacklistItem.appendChild(blacklistSwitch);

        menu.appendChild(title);
        menu.appendChild(systemAppsItem);
        menu.appendChild(blacklistItem);

        document.body.appendChild(menu);

        const systemAppsToggleMenu = document.getElementById('show-system-apps-toggle-menu');
        if (systemAppsToggleMenu) {
            systemAppsToggleMenu.addEventListener('change', (e) => {
                this.showSystemApps = e.target.checked;
                this.renderAppList();
            });
        }

        const blacklistModeToggleMenu = document.getElementById('blacklist-mode-toggle-menu');
        if (blacklistModeToggleMenu) {
            blacklistModeToggleMenu.addEventListener('change', async (e) => {
                const enableBlacklist = e.target.checked;
                const blacklistPath = '/data/adb/ts_enhancer_extreme/blacklist';
                
                try {
                    if (enableBlacklist) {
                        await Core.execCommand(`touch "${blacklistPath}"`);
                        console.log('已创建黑名单文件');
                    } else {
                        await Core.execCommand(`rm -f "${blacklistPath}"`);
                        console.log('已删除黑名单文件');
                    }
                    
                    await this.preloadData();
                    this.renderAppList();
                    
                    const modeText = enableBlacklist ? 
                        I18n.translate('BLACKLIST_MODE_ENABLED', '黑名单模式已启用') :
                        I18n.translate('WHITELIST_MODE_ENABLED', '白名单模式已启用');
                    Core.showToast(modeText, 'success');
                    
                } catch (error) {
                    console.error('切换黑名单模式时出错:', error);
                    Core.showToast(I18n.translate('SWITCH_FAILED', '切换失败'), 'error');
                    
                    e.target.checked = !enableBlacklist;
                    this.useBlacklistMode = !enableBlacklist;
                }
            });
        }

        setTimeout(() => {
            const closeMenuHandler = (e) => {
                if (!menu.contains(e.target) && !e.target.closest('[data-action-id="settings"]')) {
                    this.showSettingsMenu = false;
                    this.renderSettingsMenu();
                    document.removeEventListener('click', closeMenuHandler);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenuHandler);
            }, 10);
        }, 10);
    },

    render() {
        return `
            <div class="settings-content">
                <div id="settings-container">
                    <div class="loading-placeholder">
                        ${I18n.translate('LOADING_SETTINGS', '正在加载应用列表...')}
                    </div>
                </div>
                
                <div id="settings-loading" class="settings-loading-overlay">
                    <div class="settings-loading-content">
                        <div id="settings-loading-text" class="settings-loading-text">
                            ${I18n.translate('LOADING_SETTINGS', '正在加载应用列表...')}
                        </div>
                        <div id="settings-loading-progress-container" class="settings-loading-progress-container">
                            <div class="settings-loading-progress">
                                <div id="settings-loading-progress-fill" class="settings-loading-progress-fill"></div>
                            </div>
                            <div id="settings-loading-progress-text" class="settings-loading-progress-text">准备中...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderAppList() {
        const container = document.getElementById('settings-container');
        if (!container) {
            return;
        }

        const hasIconSupport = typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function';

        let html = `
            <div class="search-container" style="display:none;">
                <div class="search-input-wrapper">
                    <input type="text" id="app-search-input" class="search-input" 
                           placeholder="${I18n.translate('SEARCH_APPS', '搜索应用名称或包名...')}" 
                           value="${this.searchQuery}">
                    <span class="material-symbols-rounded search-icon">search</span>
                </div>
            </div>

            <div class="app-list-container">
        `;

        let combinedList = [...this.appList];
        if (this.showSystemApps) {
            combinedList = [...combinedList, ...this.systemAppList];
        }

        const filteredList = this.filterAppList(combinedList, this.searchQuery);

        if (filteredList.length === 0) {
            html += `
                <div class="empty-state">
                    <span class="material-symbols-rounded">apps</span>
                    <div>${I18n.translate('NO_APPS_FOUND', '未找到应用')}</div>
                    <div>${this.searchQuery ? I18n.translate('NO_SEARCH_RESULTS', '没有找到匹配的应用') : (this.showSystemApps ? I18n.translate('NO_APPS_DESC', '请确保设备已安装应用') : I18n.translate('ENABLE_SYSTEM_APPS', '尝试开启系统应用显示'))}</div>
                </div>
            `;
        } else {
            html += `<div class="app-list compact">`;
            
            const sortedList = this.sortAppList(filteredList);
            
for (const { appName, packageName, isSystemApp } of sortedList) {
    const checked = this.getAppCheckedState({ packageName, isSystemApp });
    
    const badgeHtml = isSystemApp 
        ? `<span class="app-badge badge-system">系统</span>` 
        : `<span class="app-badge badge-user">用户</span>`;

    const iconHtml = hasIconSupport ? 
        `<div class="app-icon-container" data-package="${packageName}">
            <div class="app-icon-loader">
                <span class="material-symbols-rounded" style="font-size: 32px;">${isSystemApp ? 'settings_applications' : 'android'}</span>
            </div>
            <img class="app-icon-img" data-package="${packageName}" loading="lazy" />
        </div>` :
        `<span class="material-symbols-rounded app-list-icon" style="font-size: 32px; margin-right: 16px;">${isSystemApp ? 'settings_applications' : 'android'}</span>`;

    const appListItemHtml = `
    <div class="app-list-item" data-package="${packageName}" data-is-system="${isSystemApp}">
        ${iconHtml}
        
        <div class="app-list-content">
            <div class="app-list-title">${appName}</div>
            <div class="app-list-subtitle">${packageName}</div>
            <div class="app-list-badges">
                ${badgeHtml}
            </div>
        </div>

        <div class="app-list-switch">
            <label class="switch">
                <input type="checkbox" class="app-toggle" data-package="${packageName}" data-is-system="${isSystemApp}" ${checked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    </div>`;

    html += appListItemHtml;
}
            html += `</div>`;
        }

        html += `</div>`;

        container.innerHTML = html;

        this.replaceIcons();
        this.bindEvents();

        if (hasIconSupport) {
            this.setupIconLazyLoad();
        }
    },

    replaceIcons() {
        const iconElements = document.querySelectorAll('.material-symbols-rounded');
        iconElements.forEach(async (iconElement) => {
            const iconName = iconElement.textContent.trim();
            if (iconName && iconElement.innerHTML === iconName) {
                try {
                    const svg = await svgIcons.loadIcon(iconName);
                    iconElement.innerHTML = svg;
                } catch (error) {
                    console.error(`Failed to load icon: ${iconName}`, error);
                }
            }
        });
    },

    getAppCheckedState(app) {
        const { packageName, isSystemApp } = app;
        
        if (isSystemApp) {
            const inSystemList = this.systemApps.includes(packageName);
            return this.useBlacklistMode ? !inSystemList : inSystemList;
        } else {
            const inThirdPartyList = this.thirdPartyApps.includes(packageName);
            return this.useBlacklistMode ? inThirdPartyList : !inThirdPartyList;
        }
    },

    filterAppList(appList, query) {
        if (!query || query.trim() === '') {
            return appList;
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return appList.filter(app => {
            const appName = app.appName ? app.appName.toLowerCase() : '';
            const packageName = app.packageName ? app.packageName.toLowerCase() : '';
            
            const appNameMatch = appName.includes(searchTerm);
            const packageNameMatch = packageName.includes(searchTerm);
            
            return appNameMatch || packageNameMatch;
        });
    },

    bindEvents() {
        const searchInput = document.getElementById('app-search-input');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = value;
                    this.renderAppListOnly();
                }, 300);
            });
            
            this.currentSearchInput = searchInput;
        }
        
        document.querySelectorAll('.app-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const pkg = e.target.getAttribute('data-package');
                const isSystemApp = e.target.getAttribute('data-is-system') === 'true';
                const checked = e.target.checked;
                
                if (isSystemApp) {
                    if (this.useBlacklistMode) {
                        if (!checked) {
                            if (!this.systemApps.includes(pkg)) {
                                this.systemApps.push(pkg);
                            }
                        } else {
                            this.systemApps = this.systemApps.filter(p => p !== pkg);
                        }
                    } else {
                        if (checked) {
                            if (!this.systemApps.includes(pkg)) {
                                this.systemApps.push(pkg);
                            }
                        } else {
                            this.systemApps = this.systemApps.filter(p => p !== pkg);
                        }
                    }
                } else {
                    if (this.useBlacklistMode) {
                        if (checked) {
                            if (!this.thirdPartyApps.includes(pkg)) {
                                this.thirdPartyApps.push(pkg);
                            }
                        } else {
                            this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                        }
                    } else {
                        if (!checked) {
                            if (!this.thirdPartyApps.includes(pkg)) {
                                this.thirdPartyApps.push(pkg);
                            }
                        } else {
                            this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                        }
                    }
                }
                
                // 触发自动保存
                this.scheduleAutoSave();
            });
        });
    },

    // 新增：安排自动保存
    scheduleAutoSave() {
        // 清除之前的定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // 设置新的定时器
        this.autoSaveTimer = setTimeout(() => {
            this.autoSaveSettings();
        }, this.autoSaveDelay);
    },

    // 新增：自动保存设置
    async autoSaveSettings() {
        const now = Date.now();
        
        // 防止过于频繁的保存（至少间隔500ms）
        if (now - this.lastSaveTime < 500) {
            // 如果距离上次保存太近，重新安排
            this.scheduleAutoSave();
            return;
        }
        
        try {
            const usrContent = this.thirdPartyApps.join('\n');
            const sysContent = this.systemApps.join('\n');
            
            const usrPath = '/data/adb/ts_enhancer_extreme/usr.txt';
            const sysPath = '/data/adb/ts_enhancer_extreme/sys.txt';
            
            await Core.execCommand(`echo '${usrContent.replace(/'/g, "'\\''")}' > "${usrPath}"`, 5000);
            await Core.execCommand(`echo '${sysContent.replace(/'/g, "'\\''")}' > "${sysPath}"`, 5000);

            try {
                // 修改：使用正确的路径执行命令
                await Core.execCommand('/data/adb/modules/ts_enhancer_extreme/bin/tseed --packagelistupdate &', 3000);
            } catch (timeoutError) {
                // 忽略超时错误
            }

            this.lastSaveTime = Date.now();
            
            // 删除：不再显示保存成功的提示
            // Core.showToast('设置已保存', 'success', 1000);
            
        } catch (e) {
            console.error('自动保存失败:', e);
            Core.showToast('保存失败，请检查权限', 'error', 2000);
        }
    },

    renderAppListOnly() {
        const appListContainer = document.querySelector('.app-list-container');
        if (!appListContainer) {
            return;
        }
        
        const hasIconSupport = typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function';

        let html = `
            <div class="search-container" style="display:none;">
                <div class="search-input-wrapper">
                    <input type="text" id="app-search-input" class="search-input" 
                           placeholder="${I18n.translate('SEARCH_APPS', '搜索应用名称或包名...')}" 
                           value="${this.searchQuery}">
                    <span class="material-symbols-rounded search-icon">search</span>
                </div>
            </div>
        `;
        
        let combinedList = [...this.appList];
        if (this.showSystemApps) {
            combinedList = [...combinedList, ...this.systemAppList];
        }
        
        const filteredList = this.filterAppList(combinedList, this.searchQuery);
        
        if (filteredList.length === 0) {
            html += `
                <div class="empty-state">
                    <span class="material-symbols-rounded">apps</span>
                    <div>${I18n.translate('NO_APPS_FOUND', '未找到应用')}</div>
                    <div>${this.searchQuery ? I18n.translate('NO_SEARCH_RESULTS', '没有找到匹配的应用') : (this.showSystemApps ? I18n.translate('NO_APPS_DESC', '请确保设备已安装应用') : I18n.translate('ENABLE_SYSTEM_APPS', '尝试开启系统应用显示'))}</div>
                </div>
            `;
        } else {
            html += `<div class="app-list compact">`;
            
            const sortedList = this.sortAppList(filteredList);
            
for (const { appName, packageName, isSystemApp } of sortedList) {
    const checked = this.getAppCheckedState({ packageName, isSystemApp });
    
    const badgeHtml = isSystemApp 
        ? `<span class="app-badge badge-system">系统</span>` 
        : `<span class="app-badge badge-user">用户</span>`;

    const iconHtml = hasIconSupport ? 
        `<div class="app-icon-container" data-package="${packageName}">
            <div class="app-icon-loader">
                <span class="material-symbols-rounded" style="font-size: 32px;">${isSystemApp ? 'settings_applications' : 'android'}</span>
            </div>
            <img class="app-icon-img" data-package="${packageName}" loading="lazy" />
        </div>` :
        `<span class="material-symbols-rounded app-list-icon" style="font-size: 32px; margin-right: 16px;">${isSystemApp ? 'settings_applications' : 'android'}</span>`;

    const appListItemHtml = `
    <div class="app-list-item" data-package="${packageName}" data-is-system="${isSystemApp}">
        ${iconHtml}
        
        <div class="app-list-content">
            <div class="app-list-title">${appName}</div>
            <div class="app-list-subtitle">${packageName}</div>
            <div class="app-list-badges">
                ${badgeHtml}
            </div>
        </div>

        <div class="app-list-switch">
            <label class="switch">
                <input type="checkbox" class="app-toggle" data-package="${packageName}" data-is-system="${isSystemApp}" ${checked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    </div>`;

    html += appListItemHtml;
}
            html += `</div>`;
        }
        
        appListContainer.innerHTML = html;
        
        this.replaceIcons();
        
        const searchInput = document.getElementById('app-search-input');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = value;
                    this.renderAppListOnly();
                }, 300);
            });
            
            this.currentSearchInput = searchInput;
        }
        
        document.querySelectorAll('.app-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const pkg = e.target.getAttribute('data-package');
                const isSystemApp = e.target.getAttribute('data-is-system') === 'true';
                const checked = e.target.checked;
                
                if (isSystemApp) {
                    if (this.useBlacklistMode) {
                        if (!checked) {
                            if (!this.systemApps.includes(pkg)) {
                                this.systemApps.push(pkg);
                            }
                        } else {
                            this.systemApps = this.systemApps.filter(p => p !== pkg);
                        }
                    } else {
                        if (checked) {
                            if (!this.systemApps.includes(pkg)) {
                                this.systemApps.push(pkg);
                            }
                        } else {
                            this.systemApps = this.systemApps.filter(p => p !== pkg);
                        }
                    }
                } else {
                    if (this.useBlacklistMode) {
                        if (checked) {
                            if (!this.thirdPartyApps.includes(pkg)) {
                                this.thirdPartyApps.push(pkg);
                            }
                        } else {
                            this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                        }
                    } else {
                        if (!checked) {
                            if (!this.thirdPartyApps.includes(pkg)) {
                                this.thirdPartyApps.push(pkg);
                            }
                        } else {
                            this.thirdPartyApps = this.thirdPartyApps.filter(p => p !== pkg);
                        }
                    }
                }
                
                // 触发自动保存
                this.scheduleAutoSave();
            });
        });
        
        if (typeof ksu !== 'undefined' && typeof ksu.getPackagesIcons === 'function') {
            this.setupIconLazyLoad();
        }
    },

    async onActivate() {
        this.isCancelled = false;
        
        if (!this.isInitialized) {
            await this.init();
        }
        
        this.registerActions();
        
        // 添加页面激活标记，防止页面整体滚动
        document.body.classList.add('settings-page-active');
        
        // 新增：绑定滚动事件，阻止导航栏消失
        this.bindScrollEvents();
        
        this.setLoadingState('loading');
        await this.fetchAppList();
    },

    async afterRender() {
        const settingsContainer = document.querySelector('#settings-container');
        if (settingsContainer) {
            const dynamicIcons = settingsContainer.querySelectorAll('.material-symbols-rounded');
            for (const iconElement of dynamicIcons) {
                const iconName = iconElement.textContent.trim();
                if (iconName && iconElement.innerHTML === iconName) {
                    try {
                        const svg = await svgIcons.loadIcon(iconName);
                        iconElement.innerHTML = svg;
                    } catch (error) {
                        console.error(`Failed to load dynamic icon in settings: ${iconName}`, error);
                    }
                }
            }
        }
    },

    bindScrollEvents() {
        const appListContainer = document.querySelector('.app-list-container');
        if (appListContainer) {
            // 清除之前的滚动监听
            appListContainer.removeEventListener('scroll', this.handleScroll.bind(this));
            
            // 添加新的滚动监听
            appListContainer.addEventListener('scroll', this.handleScroll.bind(this));
        }
        
        // 确保导航栏始终显示
        this.ensureNavVisible();
    },

    // 新增：处理滚动事件
    handleScroll(event) {
        const container = event.target;
        const scrollTop = container.scrollTop;
        
        // 计算滚动方向
        if (scrollTop > this.lastScrollTop) {
            this.scrollDirection = 'down';
        } else if (scrollTop < this.lastScrollTop) {
            this.scrollDirection = 'up';
        }
        
        this.lastScrollTop = scrollTop;
        
        // 确保导航栏始终可见
        this.ensureNavVisible();
        
        // 防抖处理
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 150);
    },

    // 新增：确保导航栏可见
    ensureNavVisible() {
        const nav = document.querySelector('.app-nav');
        const header = document.querySelector('.app-header');
        
        if (nav) {
            // 在settings页面中，始终显示导航栏
            nav.classList.remove('hidden');
            nav.classList.add('visible');
            
            // 确保有正确的样式
            nav.style.opacity = '1';
            nav.style.pointerEvents = 'auto';
            nav.classList.remove('navigation-disabled');
        }
        
        if (header) {
            // 确保顶栏有背景色
            header.classList.add('header-solid');
        }
    },

    onDeactivate() {
        I18n.unregisterLanguageChangeHandler(this.onLanguageChanged.bind(this));
        UI.clearPageActions();
        this.isCancelled = true;

        // 清除自动保存定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // 移除页面激活标记
        document.body.classList.remove('settings-page-active');
        
        // 新增：移除滚动事件绑定
        const appListContainer = document.querySelector('.app-list-container');
        if (appListContainer) {
            appListContainer.removeEventListener('scroll', this.handleScroll.bind(this));
        }
        
        this.currentSearchInput = null;

        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) {
            settingsMenu.remove();
        }

        const explanationModal = document.getElementById('settings-explanation-modal');
        if (explanationModal) {
            explanationModal.remove();
        }

        const actionsContainer = document.getElementById('settings-page-actions');
        if (actionsContainer) {
            actionsContainer.remove();
        }

        const settingsHeader = document.getElementById('settings-page-/header');
        if (settingsHeader) {
            settingsHeader.remove();
        }
    }
};

window.SettingsPage = SettingsPage;