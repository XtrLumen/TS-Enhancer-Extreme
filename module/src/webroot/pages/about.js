/**
 * TSEE WebUI 设置页面模块
 * 提供管理 WebUI 的选项
 */

const AboutPage = {
    moduleInfo: {},
    version: '0.8.3-RC1',
    config: {
        showThemeToggle: false
    },
    
    activeItem: '',
    
    settingsItems: [
        {
            id: 'interface',
            title: 'INTERFACE_SETTINGS',
            description: 'INTERFACE_SETTINGS_DESC',
            icon: 'palette',
            content: 'interfaceContent',
            isModal: true
        },
        {
            id: 'export-log',
            title: 'EXPORT_LOG',
            description: 'EXPORT_LOG_DESC',
            icon: 'download',
            content: 'exportLogContent',
            isModal: true
        },
        {
            id: 'about',
            title: 'ABOUT',
            description: 'ABOUT_DESC',
            icon: 'contact_page',
            content: 'aboutContent',
            isModal: true
        },
        {
            id: 'developer',
            title: 'DEVELOPER_OPTIONS',
            description: 'DEVELOPER_OPTIONS_DESC',
            icon: 'mobile_code',
            content: 'developerContent',
            isModal: true
        }
    ],
    
    async preloadData() {
        try {
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                return JSON.parse(cachedInfo);
            }
            
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            if (configOutput) {
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
                
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                return config;
            }
            return {};
        } catch (error) {
            console.warn('预加载模块信息失败:', error);
            return {};
        }
    },
    
    async init() {
        try {
            const preloadedData = PreloadManager.getData('about') || await this.preloadData();
            this.moduleInfo = preloadedData;
            
            I18n.registerLanguageChangeHandler(this.onLanguageChanged.bind(this));
            
            return true;
        } catch (error) {
            console.error('初始化关于页面失败:', error);
            return false;
        }
    },

    onLanguageChanged() {
        const aboutContent = document.querySelector('.about-container');
        if (aboutContent) {
            aboutContent.outerHTML = this.render().trim();
            this.afterRender();
        }
    },

    onDeactivate() {
        I18n.unregisterLanguageChangeHandler(this.onLanguageChanged.bind(this));
        UI.clearPageActions();
    },
    
    render() {
        return `
        <div class="about-container">
            <!-- 设置列表 -->
            <div class="settings-list">
                ${this.settingsItems.map(item => `
                    <div class="setting-item ${this.activeItem === item.id ? 'active' : ''}" 
                         data-item="${item.id}" data-modal="${item.isModal || false}">
                        <div class="setting-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="setting-content">
                            <h3 class="setting-title" data-i18n="${item.title}">
                                ${I18n.translate(item.title, item.id)}
                            </h3>
                            <p class="setting-description" data-i18n="${item.description}">
                                ${I18n.translate(item.description, `${item.id} description`)}
                            </p>
                        </div>
                        <span class="material-symbols-rounded setting-arrow">chevron_right</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    },

    renderDeveloperOptionsModal() {
    const isServiceControlEnabled = localStorage.getItem('developer_service_control') === 'true';
    
    return `
    <div class="about-modal-overlay" id="developer-options-modal-overlay">
        <div class="about-modal" style="max-width: 450px; max-height: 360px;">
            <div class="about-modal-header">
                <h2 class="about-modal-title">${I18n.translate('DEVELOPER_OPTIONS', '开发者选项')}</h2>
                <button class="about-modal-close" id="developer-options-modal-close">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="about-modal-content" style="padding: 20px;">
                <div class="developer-options-content">
                    <div class="developer-option-item">
                        <div class="option-info">
                            <h4 class="option-title">${I18n.translate('SERVICE_CONTROL', '服务控制功能')}</h4>
                            <p class="option-description">
                                ${I18n.translate('SERVICE_CONTROL_DESC', '在功能页面显示Tricky Store和TSEE服务控制功能')}
                            </p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="service-control-toggle" ${isServiceControlEnabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="developer-note" style="margin-top: 20px;">
                        <span class="material-symbols-rounded">info</span>
                        <p>${I18n.translate('DEVELOPER_NOTE', '这些选项仅供高级用户使用，请谨慎操作')}</p>
                    </div>
                </div>
                
                <div class="dialog-buttons" style="margin-top: 10px; padding-top: 16px;">
                    <button class="dialog-button" id="cancel-developer">${I18n.translate('CANCEL', '取消')}</button>
                    <button class="dialog-button filled" id="apply-developer">${I18n.translate('APPLY', '应用')}</button>
                </div>
            </div>
        </div>
    </div>
    `;
},

    renderInterfaceSettingsModal() {
    const presetHues = [
        { value: 0, name: 'color' },
        { value: 37, name: 'color' },
        { value: 66, name: 'color' },
        { value: 97, name: 'color' },
        { value: 124, name: 'color' },
        { value: 148, name: 'color' },
        { value: 176, name: 'color' },
        { value: 212, name: 'color' },
        { value: 255, name: 'color' },
        { value: 300, name: 'color' },
        { value: 325, name: 'color' }
    ];

    return `
    <div class="about-modal-overlay" id="interface-settings-modal-overlay">
        <div class="about-modal">
            <div class="about-modal-header">
                <h2 class="about-modal-title">${I18n.translate('INTERFACE_SETTINGS', '界面设置')}</h2>
                <button class="about-modal-close" id="interface-settings-modal-close">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="about-modal-content">
                <div style="height: 25px;"></div>
                
                <h3 class="section-title">
                    <span class="material-symbols-rounded">palette</span>
                    ${I18n.translate('COLOR_PICKER', '颜色选择器')}
                </h3>
                
                <div class="color-picker-content" style="margin-top: 15px;">
                    <div class="preset-colors">
                        ${presetHues.map(hue => `
                            <div class="preset-color" data-hue="${hue.value}" title="${hue.name}">
                                <div class="color-preview" style="--preview-hue: ${hue.value}"></div>
                            </div>
                        `).join('')}
                    </div>
                    <label style="margin-top: 20px;">
                        <span>${I18n.translate('HUE_VALUE', '色调值')}</span>
                        <input type="range" id="hue-slider" min="0" max="360" value="${this.getCurrentHue()}">
                        <output id="hue-value">${this.getCurrentHue()}</output>
                    </label>
                </div>
                
                <div class="dialog-buttons" style="margin-top: var(--spacing-l); padding-bottom: 10px;">
                    <button class="dialog-button" id="cancel-color">${I18n.translate('CANCEL', '取消')}</button>
                    <button class="dialog-button filled" id="apply-color">${I18n.translate('APPLY', '应用')}</button>
                </div>
            </div>
        </div>
    </div>
    `;
},

    renderExportLogModal() {
    return `
    <div class="about-modal-overlay" id="export-log-modal-overlay">
        <div class="about-modal" style="max-width: 450px; max-height: 550px;">
            <div class="about-modal-header">
                <h2 class="about-modal-title">${I18n.translate('EXPORT_LOG', '导出日志')}</h2>
                <button class="about-modal-close" id="export-log-modal-close">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="about-modal-content" style="display: flex; flex-direction: column;">
                <div class="export-log-content" style="flex: 0.8; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <div class="export-log-icon">
                        <span class="material-symbols-rounded" style="font-size: 48px; color: var(--primary);">bug_report</span>
                    </div>
                    <h3 class="export-log-title" style="margin: 16px 0 8px; font-size: 18px; font-weight: 600;">
                        ${I18n.translate('EXPORT_LOG_DESC', '导出TSEE模块的日志文件')}
                    </h3>
                    <p class="export-log-description" style="font-size: 16px; line-height: 1.4; color: var(--on-surface-variant); margin: 0;">
                        ${I18n.translate('EXPORT_LOG_INFO', '日志文件将导出到内部存储根目录')}
                    </p>
                </div>
                
                <div class="dialog-buttons" style="margin-top: auto; padding-top: 30px;">
                    <button class="dialog-button filled" id="confirm-export-log" style="flex: 1;">
                        <span class="material-symbols-rounded" style="margin-right: 8px;">download</span>
                        ${I18n.translate('EXPORT_LOG', '导出日志')}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
},

    renderAboutModal() {
        return `
        <div class="about-modal-overlay" id="about-modal-overlay">
            <div class="about-modal">
                <div class="about-modal-header">
                    <h2 class="about-modal-title">${I18n.translate('ABOUT', '关于')}</h2>
                    <button class="about-modal-close" id="about-modal-close">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="about-modal-content">
                    <div class="about-header">
                        <div class="app-logo">
                            <span class="material-symbols-rounded">dashboard_customize</span>
                        </div>
                        <div class="about-header-content">
                            <h2>TSEE WebUI</h2>
                            <div class="version-badge">
                                ${I18n.translate('VERSION', '版本')} ${this.version}
                            </div>
                            <p class="about-description">${I18n.translate('ABOUT_DESCRIPTION', 'TSEE模块管理界面')}</p>
                        </div>
                    </div>
                
                    <div class="about-card">
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">info</span>
                                ${I18n.translate('MODULE_INFO', '模块信息')}
                            </h3>
                            <div class="info-list">
                                ${this.renderModuleInfo()}
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">person</span>
                                ${I18n.translate('MODULE_DEVELOPER', '模块开发者')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    ${this.moduleInfo.author}
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="modal-module-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    
                        <div class="about-section">
                            <h3 class="section-title">
                                <span class="material-symbols-rounded">deployed_code_account</span>
                                ${I18n.translate('WEBUI_DEVELOPER', 'WebUI 开发者')}
                            </h3>
                            <div class="developer-info">
                                <div class="developer-name">
                                    yu13140
                                </div>
                                <div class="developer-links">
                                    <a href="#" class="social-link" id="modal-webui-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>GitHub</span>
                                    </a>
                                    <a href="#" class="social-link" id="modal-framework-github-link">
                                        <span class="material-symbols-rounded">code</span>
                                        <span>原框架</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                
                    <div class="about-footer">
                        <p>${I18n.translate('WEBUI_FROM', `本WebUI基于 AMMF2框架 进行修改`)}</p>
                        <p>${I18n.translate('COPYRIGHT_INFO', `© ${new Date().getFullYear()} Aurora星空. All rights reserved.`)}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    async showDeveloperOptionsModal() {
        const modalHTML = this.renderDeveloperOptionsModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('developer-options-modal-close');
        const overlay = document.getElementById('developer-options-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.attachDeveloperOptionsEvents();
        await this.replaceModalIcons('developer-options-modal');
    },

    async showInterfaceSettingsModal() {
        const modalHTML = this.renderInterfaceSettingsModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('interface-settings-modal-close');
        const overlay = document.getElementById('interface-settings-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.attachColorPickerEvents();
        await this.replaceModalIcons('interface-settings-modal');
    },

    async showExportLogModal() {
        const modalHTML = this.renderExportLogModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('export-log-modal-close');
        const confirmBtn = document.getElementById('confirm-export-log');
        const overlay = document.getElementById('export-log-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.exportLogFile();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        await this.replaceModalIcons('export-log-modal');
    },

    async showAboutModal() {
        const modalHTML = this.renderAboutModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const closeBtn = document.getElementById('about-modal-close');
        const overlay = document.getElementById('about-modal-overlay');
        
        const closeModal = () => {
            if (overlay) {
                overlay.remove();
            }
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            });
            
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
        }
        
        this.attachModalEvents();
        await this.replaceModalIcons('about-modal');
    },

    attachDeveloperOptionsEvents() {
    const toggle = document.getElementById('service-control-toggle');
    const cancelBtn = document.getElementById('cancel-developer');
    const applyBtn = document.getElementById('apply-developer');
    
    if (!toggle || !cancelBtn || !applyBtn) return;
    
    let currentValue = toggle.checked;
    
    toggle.addEventListener('change', () => {
        currentValue = toggle.checked;
    });
    
    cancelBtn.addEventListener('click', () => {
        document.getElementById('developer-options-modal-overlay').remove();
    });
    
    applyBtn.addEventListener('click', () => {
        localStorage.setItem('developer_service_control', currentValue.toString());
        document.getElementById('developer-options-modal-overlay').remove();
        
        Core.showToast(
            currentValue ? 
            I18n.translate('SERVICE_CONTROL_ENABLED', '服务控制功能已启用') :
            I18n.translate('SERVICE_CONTROL_DISABLED', '服务控制功能已禁用')
        );
        
        // 只在当前页面是 tools 时才刷新 tools 页面
        // 避免影响 about 页面
        if (App && App.currentPage === 'tools') {
            if (window.ToolsPage && typeof window.ToolsPage.refreshTools === 'function') {
                setTimeout(() => {
                    window.ToolsPage.refreshTools();
                }, 500);
            }
        } else {
            // 如果当前不是 tools 页面，设置一个标记，等切换到 tools 页面时再刷新
            localStorage.setItem('tools_needs_refresh', 'true');
        }
    });
},

    attachColorPickerEvents() {
        const slider = document.getElementById('hue-slider');
        const output = document.getElementById('hue-value');
        
        if (!slider || !output) return;
        
        document.querySelectorAll('.preset-color').forEach(preset => {
            preset.addEventListener('click', () => {
                const hue = preset.dataset.hue;
                slider.value = hue;
                output.textContent = hue + '°';
                document.documentElement.style.setProperty('--hue', hue);
            });
        });
        
        slider.addEventListener('input', () => {
            const value = slider.value;
            output.textContent = value + '°';
            document.documentElement.style.setProperty('--hue', value);
        });
    
        const originalHue = this.getCurrentHue();
    
        document.getElementById('cancel-color').addEventListener('click', () => {
            this.setHueValue(originalHue);
            document.getElementById('interface-settings-modal-overlay').remove();
        });
        
        document.getElementById('apply-color').addEventListener('click', () => {
            this.setHueValue(slider.value);
            document.getElementById('interface-settings-modal-overlay').remove();
            Core.showToast(I18n.translate('COLOR_CHANGED', '颜色已更新'));
        });
    },

    attachModalEvents() {
        const githubLink = document.getElementById('modal-module-github-link');
        if (githubLink) {
            githubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openGitHubLink();
            });
        }
    
        const webuiGithubLink = document.getElementById('modal-webui-github-link');
        if (webuiGithubLink) {
            webuiGithubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openWebuiGitHubLink();
            });
        }
    
        const frameworkGitHubLink = document.getElementById('modal-framework-github-link');
        if (frameworkGitHubLink) {
            frameworkGitHubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.frameworkGitHubLink();
            });
        }
    },

    async replaceModalIcons(modalId) {
        const modalElement = document.getElementById(modalId) || document.querySelector(`#${modalId}-overlay`);
        if (!modalElement) return;
        
        const dynamicIcons = modalElement.querySelectorAll('.material-symbols-rounded');
        for (const iconElement of dynamicIcons) {
            const iconName = iconElement.textContent.trim();
            if (iconName && iconElement.innerHTML === iconName) {
                try {
                    const svg = await svgIcons.loadIcon(iconName);
                    iconElement.innerHTML = svg;
                } catch (error) {
                    console.error(`Failed to load modal icon: ${iconName}`, error);
                }
            }
        }
    },

    switchItem(itemId) {
        const item = this.settingsItems.find(i => i.id === itemId);
        
        if (item && item.isModal) {
            switch(itemId) {
                case 'developer':
                    this.showDeveloperOptionsModal();
                    break;
                case 'interface':
                    this.showInterfaceSettingsModal();
                    break;
                case 'export-log':
                    this.showExportLogModal();
                    break;
                case 'about':
                    this.showAboutModal();
                    break;
            }
        }
    },
    
    getCurrentHue() {
        const root = document.documentElement;
        const hue = getComputedStyle(root).getPropertyValue('--hue').trim();
        return hue || '300';
    },
    
    setHueValue(hue) {
        const root = document.documentElement;
        root.style.setProperty('--hue', hue);
        localStorage.setItem('ammf_color_hue', hue);
        document.dispatchEvent(new CustomEvent('colorChanged', {
            detail: { hue: hue }
        }));
    },

    renderModuleInfo() {
        const infoItems = [
            { key: 'module_name', label: 'MODULE_NAME', icon: 'tag' },
            { key: 'version', label: 'MODULE_VERSION', icon: 'verified' },
            { key: 'versionCode', label: 'VERSION_DATE', icon: 'update' }
        ];
        
        let html = '';
        
        infoItems.forEach(item => {
            if (this.moduleInfo[item.key]) {
                html += `
                    <div class="info-item">
                        <div class="info-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="info-content">
                            <div class="info-label" data-i18n="${item.label}">${I18n.translate(item.label, item.key)}</div>
                            <div class="info-value">${this.moduleInfo[item.key]}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        return html || `<div class="empty-state" data-i18n="NO_INFO">${I18n.translate('NO_INFO', '无可用信息')}</div>`;
    },
    
    async loadModuleInfo() {
        try {
            this.moduleInfo = await Core.loadModuleInfo();
            console.log('模块信息加载成功:', this.moduleInfo);
        } catch (error) {
            console.error('加载模块信息失败:', error);
            this.moduleInfo = {};
        }
    },
    
    async refreshModuleInfo() {
        try {
            sessionStorage.removeItem('moduleInfo');
            await this.loadModuleInfo();
            
            const aboutContent = document.querySelector('.about-container');
            if (aboutContent) {
                aboutContent.outerHTML = this.render().trim();
                this.afterRender();
                Core.showToast(I18n.translate('MODULE_INFO_REFRESHED', '模块信息已刷新'));
            } else {
                App.loadPage('about');
            }
        } catch (error) {
            console.error('刷新模块信息失败:', error);
            Core.showToast(I18n.translate('MODULE_INFO_REFRESH_ERROR', '刷新模块信息失败'), 'error');
        }
    },
    
    async afterRender() {
        document.querySelectorAll('.setting-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = item.getAttribute('data-item');
                this.switchItem(itemId);
            });
        });
        
        const refreshButton = document.getElementById('refresh-about');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshModuleInfo();
            });
        }
        
        const toggleCssButton = document.getElementById('toggle-css');
        if (toggleCssButton) {
            this.updateCssButtonStatus(toggleCssButton);
            toggleCssButton.addEventListener('click', () => {
                if (window.CSSLoader && typeof window.CSSLoader.toggleCSS === 'function') {
                    window.CSSLoader.toggleCSS();
                    this.updateCssButtonStatus(toggleCssButton);
                    const cssType = window.CSSLoader.getCurrentCSSType();
                    const message = cssType === 'custom' ? '已切换到自定义样式' : '已切换到默认样式';
                    Core.showToast(I18n.translate('CSS_SWITCHED', message));
                } else {
                    console.error('CSS加载器不可用');
                    Core.showToast(I18n.translate('CSS_LOADER_ERROR', 'CSS加载器不可用'), 'error');
                }
            });
        }
        
        // 替换动态生成的图标
        const aboutContainer = document.querySelector('.about-container');
        if (aboutContainer) {
            const dynamicIcons = aboutContainer.querySelectorAll('.material-symbols-rounded');
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
    
    async openGitHubLink(url = null, description = 'GitHub链接') {
        try {
            let githubUrl = url;

            if (!githubUrl) {
                githubUrl = this.moduleInfo.github || "https://github.com/XtrLumen";
            }
            
            app.OpenUrl(githubUrl);
            console.log(`已打开${description}:`, githubUrl);
        } catch (error) {
            console.error(`打开${description}失败:`, error);
            Core.showToast(`打开${description}失败`, 'error');
        }
    },
    
    async openWebuiGitHubLink() {
        await this.openGitHubLink("https://github.com/yu13140", 'WebUI开发者GitHub链接');
    },
    
    async frameworkGitHubLink() {
        await this.openGitHubLink("https://github.com/Aurora-Nasa-1/AM" + "MF2", '框架开发者GitHub链接');
    },
    
    updateCssButtonStatus(button) {
        if (!button || !window.CSSLoader) return;
        
        const cssType = window.CSSLoader.getCurrentCSSType();
        const title = cssType === 'custom' ? 
            I18n.translate('TOGGLE_CSS_DEFAULT', '切换到默认样式') : 
            I18n.translate('TOGGLE_CSS_CUSTOM', '切换到自定义样式');
        
        button.setAttribute('title', title);
    },

    async exportLogFile() {
        const exportBtn = document.getElementById('confirm-export-log');
    
        const originalHTML = exportBtn.innerHTML;
        const originalBackgroundColor = exportBtn.style.backgroundColor;
    
        try {
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.classList.add('disabled');
                exportBtn.style.backgroundColor = 'var(--surface-container-high)';
                exportBtn.innerHTML = `
                    <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">pending</span>
                    ${I18n.translate('EXPORTING', '导出中...')}
                `;
            
                exportBtn.blur();
            }
        
            await Core.execCommand('mkdir -p /storage/emulated/0/');
        
            const fileExists = await Core.execCommand('[ -f /data/adb/ts_enhancer_extreme/log/log.log ] && echo "exists" || echo "not exists"');
        
            if (!fileExists || fileExists.includes('not exists')) {
                throw new Error('日志文件不存在');
            }
        
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const destPath = `/storage/emulated/0/tsee_log_${timestamp}.log`;
        
            await Core.execCommand(`cp /data/adb/ts_enhancer_extreme/log/log.log "${destPath}"`);
        
            await Core.execCommand(`chmod 644 "${destPath}"`);
        
            Core.showToast(I18n.translate('LOG_EXPORT_SUCCESS', `日志已成功导出到 ${destPath}`), 'success');

            const overlay = document.getElementById('export-log-modal-overlay');
            if (overlay) {
                overlay.remove();
            }
        
        } catch (error) {
            console.error('导出日志文件失败:', error);
            let errorMessage = I18n.translate('LOG_EXPORT_ERROR', '导出日志失败');
        
            if (error.message.includes('不存在')) {
                errorMessage = I18n.translate('LOG_FILE_NOT_FOUND', '日志文件不存在');
            } else if (error.message.includes('权限')) {
                errorMessage = I18n.translate('LOG_EXPORT_PERMISSION_DENIED', '权限不足，无法导出日志');
            }
        
            Core.showToast(errorMessage, 'error');
        } finally {
            setTimeout(() => {
                const currentExportBtn = document.getElementById('confirm-export-log');
                if (currentExportBtn) {
                    currentExportBtn.disabled = false;
                    currentExportBtn.classList.remove('disabled');
                    currentExportBtn.style.backgroundColor = originalBackgroundColor || '';
                
                    currentExportBtn.innerHTML = originalHTML || `
                        <span class="material-symbols-rounded" style="margin-right: var(--spacing-s);">download</span>
                        ${I18n.translate('EXPORT_LOG', '导出日志')}
                    `;
                
                    currentExportBtn.blur();
                }
            }, 100);
        }
    }
};

window.AboutPage = AboutPage;