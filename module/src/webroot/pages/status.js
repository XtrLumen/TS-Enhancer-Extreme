/**
 * TSEE WebUI 主页页面模块
 * 显示模块运行状态和基本信息
 */

const StatusPage = {
    moduleStatus: 'UNKNOWN',
    refreshTimer: null,
    deviceInfo: {},    
    testMode: {
        enabled: false,
        mockVersion: null
    },
    moduleInfo: {},
    version: null,

    async preloadData() {
        try {
            const tasks = [
                this.loadModuleInfo(),
                this.loadDeviceInfo()
            ];

            const [moduleInfo, deviceInfo] = await Promise.allSettled(tasks);

            return {
                moduleInfo: moduleInfo.value || {},
                deviceInfo: deviceInfo.value || {}
            };
        } catch (error) {
            console.warn('预加载数据失败:', error);
            return null;
        }
    },

async init() {
    try {
        this.registerActions();

        I18n.registerLanguageChangeHandler(this.onLanguageChanged.bind(this));

        const preloadedData = PreloadManager.getData('status');
        if (preloadedData) {
            this.moduleInfo = preloadedData.moduleInfo;
            this.deviceInfo = preloadedData.deviceInfo;
            this.version = this.moduleInfo.version || 'Unknown';
        } else {
            // 如果没有预加载数据，则正常加载
            await this.loadModuleInfo();
            await this.loadDeviceInfo();
        }

        await this.loadModuleStatus(); // 实时状态始终需要加载
        
        // 初始化完成后标记为就绪
        if (window.app && window.app.state) {
            window.app.state.isStatusPageReady = true;
        }
        
        this.startAutoRefresh();
        return true;
    } catch (error) {
        console.error('初始化状态页面失败:', error);
        // 即使初始化失败也标记为就绪，避免阻塞整个应用
        if (window.app && window.app.state) {
            window.app.state.isStatusPageReady = true;
        }
        return false;
    }
},

    async loadModuleInfo() {
        try {
            this.moduleInfo = await Core.loadModuleInfo();
            this.version = this.moduleInfo.version || 'Unknown';
        } catch (error) {
            console.error('加载模块信息失败:', error);
            this.moduleInfo = {};
            this.version = 'Unknown';
        }
    },
    
    registerActions() {
        UI.registerPageActions('status', [
            {
                id: 'refresh-status',
                icon: 'refresh',
                title: I18n.translate('REFRESH', '刷新'),
                onClick: 'refreshStatus'
            }
        ]);
    },

    render() {
        return `
        <div class="status-page">
            <!-- 模块状态卡片 -->
            <div class="status-card module-status-card ${this.getStatusClass()}">
                <div class="status-card-content">
                    <div class="status-icon-container">
                            <span class="material-symbols-rounded">${this.getStatusIcon()}</span>
                    </div>
                    <div class="status-info-container">
                        <div class="status-title-row">
                            <span class="status-value" data-i18n="${this.getStatusI18nKey()}">${this.getStatusText()}</span>
                        </div>
                        <div class="status-details">
                            <div class="status-detail-row">${I18n.translate('VERSION', '版本')}: ${this.version}</div>
                            <div class="status-detail-row">${I18n.translate('UPDATE_TIME', '最后更新时间')}: ${new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 设备信息卡片 -->
            <div class="status-card device-info-card">
                <div class="device-info-grid">
                    ${this.renderDeviceInfo()}
                </div>
            </div>
        </div>
    `;
    },

    async refreshStatus(showToast = false) {
        try {
            const oldStatus = this.moduleStatus;
            const oldDeviceInfo = JSON.stringify(this.deviceInfo);

            await this.loadModuleStatus();
            await this.loadDeviceInfo();

            // 只在状态发生变化时更新UI
            const newDeviceInfo = JSON.stringify(this.deviceInfo);
            if (oldStatus !== this.moduleStatus || oldDeviceInfo !== newDeviceInfo) {
                // 更新UI
                const statusPage = document.querySelector('.status-page');
                if (statusPage) {
                    statusPage.innerHTML = this.render();
                    this.afterRender();
                }
            }

            if (showToast) {
                Core.showToast(I18n.translate('STATUS_REFRESHED', '状态已刷新'));
            }
        } catch (error) {
            console.error('刷新状态失败:', error);
            if (showToast) {
                Core.showToast(I18n.translate('STATUS_REFRESH_ERROR', '刷新状态失败'), 'error');
            }
        }
    },

    // 渲染后的回调
    async afterRender() {
        // 确保只绑定一次事件
        const refreshBtn = document.getElementById('refresh-status');

        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.addEventListener('click', () => {
                this.refreshStatus(true);
            });
            refreshBtn.dataset.bound = 'true';
        }
        
        // 替换动态生成的图标
        const statusPage = document.querySelector('.status-page');
        if (statusPage) {
            const dynamicIcons = statusPage.querySelectorAll('.material-symbols-rounded');
            for (const iconElement of dynamicIcons) {
                const iconName = iconElement.textContent.trim();
                if (iconName && iconElement.innerHTML === iconName) {
                    try {
                        const svg = await svgIcons.loadIcon(iconName);
                        iconElement.innerHTML = svg;
                    } catch (error) {
                        console.error(`Failed to load dynamic icon: ${iconName}`, error);
                    }
                }
            }
        }
    },

    async loadModuleStatus() {
        try {
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            
            if (!configOutput) {
                console.error('无法读取module.prop文件');
                this.moduleStatus = 'UNKNOWN';
                return;
            }

            const lines = configOutput.split('\n');
            const config = {};
            
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    config[key] = value;
                }
            });

            const description = config.description || '';
            
            if (description.includes('✅服务运行中')) {
                this.moduleStatus = 'RUNNING';
            } else if (description.includes('❌服务未运行')) {
                this.moduleStatus = 'STOPPED';
            } else {
                this.moduleStatus = 'UNKNOWN';
            }
        } catch (error) {
            console.error('获取模块状态失败:', error);
            this.moduleStatus = 'ERROR';
        }
    },

    async loadDeviceInfo() {
        try {
            // 获取设备信息
            this.deviceInfo = {
                model: await this.getDeviceModel(),
                android: await this.getAndroidVersion(),
                kernel: await this.getKernelVersion(),
                root: await this.getRootImplementation(),
                device_abi: await this.getDeviceABI()
            };

            console.log('设备信息加载完成:', this.deviceInfo);
        } catch (error) {
            console.error('加载设备信息失败:', error);
        }
    },

    async getSystemProperty(command, description) {
        try {
            const result = await Core.execCommand(command);
            return result.trim() || 'Unknown';
        } catch (error) {
            console.error(`${description}失败:`, error);
            return 'Unknown';
        }
    },

    async getDeviceModel() {
        return await this.getSystemProperty('getprop ro.product.model', '获取设备型号');
    },

    async getAndroidVersion() {
        return await this.getSystemProperty('getprop ro.build.version.release', '获取Android版本');
    },

    async getDeviceABI() {
        return await this.getSystemProperty('getprop ro.product.cpu.abi', '获取设备架构');
    },

    async getKernelVersion() {
        return await this.getSystemProperty('uname -r', '获取内核版本');
    },

    async getRootImplementation() {
        try {
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            
            if (!configOutput) {
                console.error('无法读取module.prop文件');
                return 'Unknown';
            }

            const lines = configOutput.split('\n');
            const config = {};
            
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    config[key] = value;
                }
            });

            const description = config.description || '';
            const rootMatch = description.match(/Root#([^()]+)/);
            
            if (rootMatch && rootMatch[1]) {
                return rootMatch[1].trim();
            }
            
            return 'Unknown';
        } catch (error) {
            console.error('获取ROOT实现失败:', error);
            return 'Unknown';
        }
    },

    getStatusI18nKey() {
        switch (this.moduleStatus) {
            case 'RUNNING':
                return 'RUNNING';
            case 'STOPPED':
                return 'STOPPED';
            case 'ERROR':
                return 'ERROR';
            default:
                return 'UNKNOWN';
        }
    },

    // 渲染设备信息
    renderDeviceInfo() {
        if (!this.deviceInfo || Object.keys(this.deviceInfo).length === 0) {
            return `<div class="no-info" data-i18n="NO_DEVICE_INFO">无设备信息</div>`;
        }

        // 设备信息项映射
        const infoItems = [
            { key: 'model', label: 'DEVICE_MODEL', icon: 'mobile' },
            { key: 'android', label: 'ANDROID_VERSION', icon: 'android' },
            { key: 'device_abi', label: 'DEVICE_ABI', icon: 'architecture' },
            { key: 'kernel', label: 'KERNEL_VERSION', icon: 'terminal' },
            { key: 'root', label: 'ROOT_IMPLEMENTATION', icon: 'security' }
        ];

        let html = '';

        infoItems.forEach(item => {
            if (this.deviceInfo[item.key]) {
                html += `
                    <div class="device-info-item">
                        <div class="device-info-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="device-info-content">
                            <div class="device-info-label" data-i18n="${item.label}">${I18n.translate(item.label, item.key)}</div>
                            <div class="device-info-value">${this.deviceInfo[item.key]}</div>
                        </div>
                    </div>
                `;
            }
        });

        return html || `<div class="no-info" data-i18n="NO_DEVICE_INFO">无设备信息</div>`;
    },

    // 启动自动刷新
    startAutoRefresh() {
        // 每60秒刷新一次
        this.refreshTimer = setInterval(() => {
            this.refreshStatus();
        }, 60000);
    },

    // 停止自动刷新
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    // 获取状态类名
    getStatusClass() {
        switch (this.moduleStatus) {
            case 'RUNNING': return 'status-running';
            case 'STOPPED': return 'status-stopped';
            case 'ERROR': return 'status-error';
            default: return 'status-unknown';
        }
    },

    // 获取状态图标
    getStatusIcon() {
        switch (this.moduleStatus) {
            case 'RUNNING': return 'check_circle';
            case 'STOPPED': return 'cancel';
            case 'ERROR': return 'error';
            default: return 'help';
        }
    },

    // 获取状态文本
    getStatusText() {
        switch (this.moduleStatus) {
            case 'RUNNING': return I18n.translate('RUNNING', '运行中');
            case 'STOPPED': return I18n.translate('STOPPED', '已停止');
            case 'ERROR': return I18n.translate('ERROR', '错误');
            default: return I18n.translate('UNKNOWN', '未知');
        }
    },
    
    // 添加语言切换处理方法
    onLanguageChanged() {
        const statusPage = document.querySelector('.status-page');
        if (statusPage) {
            statusPage.innerHTML = this.render();
            this.afterRender();
        }
    },

    onDeactivate() {
        // 注销语言切换处理器
        I18n.unregisterLanguageChangeHandler(this.onLanguageChanged.bind(this));
        // 停止自动刷新
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.stopAutoRefresh();
        // 清理页面操作按钮
        UI.clearPageActions();
    },

onActivate() {
    console.log('状态页面已激活');
    
    // 立即标记状态页面就绪，允许导航到其他页面
    if (window.app && window.app.state) {
        window.app.state.isStatusPageReady = true;
        window.app.setNavigationEnabled(true);
    }
    
    // 如果没有状态数据，则进行刷新
    if (!this.moduleStatus || !this.deviceInfo || Object.keys(this.deviceInfo).length === 0) {
        this.refreshStatus();
    }
    
    // 启动自动刷新
    this.startAutoRefresh();
},

async afterRender() {
    // 替换动态生成的图标
    const statusPage = document.querySelector('.status-page');
    if (statusPage) {
        const dynamicIcons = statusPage.querySelectorAll('.material-symbols-rounded');
        for (const iconElement of dynamicIcons) {
            const iconName = iconElement.textContent.trim();
            if (iconName && iconElement.innerHTML === iconName) {
                try {
                    const svg = await svgIcons.loadIcon(iconName);
                    iconElement.innerHTML = svg;
                } catch (error) {
                    console.error(`Failed to load dynamic icon: ${iconName}`, error);
                }
            }
        }
    }
},
};

// 导出状态页面模块
window.StatusPage = StatusPage;