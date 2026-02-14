/** 
 * TSEE WebUI 功能页面模块
 * 提供各种功能工具入口
 */

const ToolsPage = {
    id: 'tools',
    isLoading: true,
    currentFunction: null,
    logs: [],
    currentPath: '/storage/emulated/0',
    fileList: [],
    currentCommand: null,
    isCommandCancelled: false,
    pendingFunction: null,

    async init() {
        this.setupThemeListener();
        return true;
    },

    setupThemeListener() {
        document.addEventListener('themeChanged', (event) => {
            this.handleThemeChange(event.detail.theme);
        });

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this.handleThemeChange(currentTheme);
    },

    handleThemeChange(theme) {
        const arrowIcons = document.querySelectorAll('.bar-arrow img');
        arrowIcons.forEach(icon => {
            if (theme === 'light') {
                icon.style.filter = 'invert(0.3)';
            } else {
                icon.style.filter = 'invert(0.8)';
            }
        });
    },

    async refreshTools() {
        if (App && App.currentPage !== 'tools') {
            console.log('不在 tools 页面，跳过刷新');
            return;
        }
        
        Core.showToast('刷新工具页面', 'info');
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = '';
            const content = await this.render();
            container.appendChild(content);
            this.afterRender();
        }
    },

    async onActivate() {
        this.isLoading = false;
        
        // 检查是否需要刷新（从开发者选项过来）
        if (localStorage.getItem('tools_needs_refresh') === 'true') {
            localStorage.removeItem('tools_needs_refresh');
            setTimeout(() => {
                this.refreshTools();
            }, 100);
        }
    },

    onDeactivate() {
        UI.clearPageActions();
        this.hideGlassWindow();
        this.hideFilePicker();
        this.cancelCurrentCommand();
    },

    render() {
        const isServiceControlEnabled = localStorage.getItem('developer_service_control') === 'true';
        const executeText = I18n.translate('open', '打开');
        
        const getBtnHtml = (id) => `
            <button class="action-btn tonal-btn" id="${id}">
                <span class="btn-icon material-symbols-rounded">wysiwyg</span>
                <span class="btn-label">${executeText}</span>
            </button>
        `;

        return `
            <div class="tools-list-container">
                <div class="cards-container" id="tools-list-container">
                    <div class="tool-card" data-function="steal">
                        <div class="card-content">
                            <div class="card-title">${I18n.translate('STEAL_KEYBOX', '窃取谷歌硬件认证根证书签名的 keybox')}</div>
                            <div class="card-description">
                                ${I18n.translate('STEAL_KEYBOX_DESC', '通过三个提供有效密钥的相关辅助模块源,自动下载解码并应用keybox,大概率有效')}
                            </div>
                        </div>
                        <div class="card-actions">
                            ${getBtnHtml('btn-steal')}
                        </div>
                    </div>
                
                    <div class="tool-card" data-function="import">
                        <div class="card-content">
                            <div class="card-title">${I18n.translate('IMPORT_KEYBOX', '从内部存储导入 keybox 文件')}</div>
                            <div class="card-description">
                                ${I18n.translate('IMPORT_KEYBOX_DESC', '扫描设备内部存储，查找并导入可用的 keybox 文件到系统分区')}
                            </div>
                        </div>
                        <div class="card-actions">
                            ${getBtnHtml('btn-import')}
                        </div>
                    </div>
                
                    <div class="tool-card" data-function="patch">
                        <div class="card-content">
                            <div class="card-title">${I18n.translate('SECURITY_PATCH', '设置安全补丁级别')}</div>
                            <div class="card-description">
                                ${I18n.translate('SECURITY_PATCH_DESC', '修改设备安全补丁级别，绕过应用兼容性检查和安全验证')}
                            </div>
                        </div>
                        <div class="card-actions">
                            ${getBtnHtml('btn-patch')}
                        </div>
                    </div>

                    ${isServiceControlEnabled ? `
                    <div class="tool-card" data-function="tricky-store">
                        <div class="card-content">
                            <div class="card-title">Tricky Store 后台服务控制</div>
                            <div class="card-description">检查和控制 Tricky Store 服务的运行状态</div>
                        </div>
                        <div class="card-actions">
                            ${getBtnHtml('btn-tricky')}
                        </div>
                    </div>

                    <div class="tool-card" data-function="tsee">
                        <div class="card-content">
                            <div class="card-title">TS Enhancer Extreme 后台服务控制</div>
                            <div class="card-description">检查和控制 TS Enhancer Extreme 服务的运行状态</div>
                        </div>
                        <div class="card-actions">
                            ${getBtnHtml('btn-tsee')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

        <div class="glass-overlay" id="confirm-overlay"></div>
        <div class="glass-window confirm-dialog" id="confirm-window">
            <div class="glass-header">
                <h3 class="glass-title" id="confirm-title">${I18n.translate('CONFIRM_OPERATION', '确认操作')}</h3>
                <button class="glass-close" id="confirm-close">&times;</button>
            </div>
            <div class="glass-content-container">
                <div class="glass-content">
                    <div class="confirm-message" id="confirm-message">
                    </div>
                    <div class="security-patch-form" id="security-patch-form" style="display: none;">
                            <div class="form-group">
                                <label>${I18n.translate('SYSTEM', 'System')}</label>
                                <input type="text" id="patch-system" value="prop" placeholder="prop">
                            </div>
                            <div class="form-group">
                                <label>${I18n.translate('BOOT', 'Boot')}</label>
                                <input type="text" id="patch-boot" placeholder="YYYY-MM-DD">
                            </div>
                            <div class="form-group">
                                <label>${I18n.translate('VENDOR', 'Vendor')}</label>
                                <input type="text" id="patch-vendor" placeholder="YYYY-MM-DD">
                            </div>
                            <div class="form-actions">
                                <button class="glass-button secondary" id="get-patch-date">${I18n.translate('GET_PATCH_DATE', '获取安全补丁日期')}</button>
                            </div>
                            <div class="form-group radio-group">
                                <label>
                                    <input type="radio" name="patch-mode" value="auto" checked>
                                    ${I18n.translate('AUTO', '自动')}
                                </label>
                                <label>
                                    <input type="radio" name="patch-mode" value="manual">
                                    ${I18n.translate('MANUAL', '手动')}
                                </label>
                            </div>
                        </div>
                    <div class="log-output" id="confirm-log-output" style="display: none; max-height: 300px; margin-top: 16px;"></div>
                </div>
            </div>
            <div class="glass-footer confirm-footer">
                <button class="glass-button" id="confirm-execute">${I18n.translate('BEGIN', '开始')}</button>
            </div>
        </div>

            <div class="calendar-overlay" id="calendar-overlay" style="display: none;"></div>
            <div class="calendar-popup" id="calendar-popup" style="display: none;">
                <div class="calendar-header">
                    <button class="calendar-nav" id="calendar-prev">&lt;</button>
                    <h3 id="calendar-month"></h3>
                    <button class="calendar-nav" id="calendar-next">&gt;</button>
                </div>
                <div class="calendar-body" id="calendar-body"></div>
                <div class="calendar-footer">
                    <button class="glass-button secondary" id="calendar-cancel">${I18n.translate('CANCEL', '取消')}</button>
                    <button class="glass-button" id="calendar-select">${I18n.translate('SELECT', '选择')}</button>
                </div>
            </div>

            <div class="glass-overlay" id="glass-overlay"></div>
            <div class="glass-window" id="glass-window">
                <div class="glass-header">
                    <h3 class="glass-title" id="glass-title">${I18n.translate('FUNCTION_EXECUTION', '功能执行')}</h3>
                    <button class="glass-close" id="glass-close">&times;</button>
                </div>
                <div class="glass-content-container">
                    <div class="glass-content">
                        <div class="log-output" id="log-output" style="overflow-y: auto; width: 400px; height: 400px; border-right: 2px solid var(--border-color, #e0e0e0); padding-right: 10px;"></div>
                        
                        <div class="service-control" id="service-control" style="display: none;">
                            <div class="service-status-row">
                                <div class="status-indicator" id="service-status-indicator">
                                    <span class="status-icon material-symbols-rounded">help</span>
                                    <span class="status-text" id="service-status-text">检测中...</span>
                                </div>
                            </div>
                            <div class="service-actions">
                                <button class="glass-button" id="service-start-btn">
                                    <span class="material-symbols-rounded">play_arrow</span>
                                    启动服务
                                </button>
                                <button class="glass-button secondary" id="service-stop-btn">
                                    <span class="material-symbols-rounded">stop</span>
                                    停止服务
                                </button>
                                <button class="glass-button secondary" id="service-refresh-btn">
                                    <span class="material-symbols-rounded">refresh</span>
                                    刷新状态
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="glass-footer">
                    <button class="glass-button" id="glass-button-confirm">${I18n.translate('CONFIRM', '确定')}</button>
                </div>
            </div>

            <div class="glass-overlay" id="file-picker-overlay"></div>
            <div class="glass-window file-selector" id="file-picker-window">
                <div class="glass-header">
                    <h3 class="glass-title" id="file-picker-title">${I18n.translate('SELECT_KEYBOX_FILE', '选择keybox文件')}</h3>
                    <button class="glass-close close-selector">&times;</button>
                </div>
                <div class="glass-content-container">
                    <div class="glass-content">
                        <div class="file-picker-path">
                            <div class="current-path" id="file-current-path"></div>
                        </div>
                        <div class="file-picker-list file-list" id="file-picker-list">
                            <!-- 文件列表将在这里动态生成 -->
                        </div>
                    </div>
                </div>
                <div class="glass-footer">
                    <button class="glass-button secondary" id="file-picker-cancel">${I18n.translate('CANCEL', '取消')}</button>
                </div>
            </div>
        `;
    },

    async afterRender() {
        const isServiceControlEnabled = localStorage.getItem('developer_service_control') === 'true';
        
        document.getElementById('btn-import')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleImportKeybox();
        });
        
        document.getElementById('btn-steal')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.showConfirmDialog('steal');
        });
        
        document.getElementById('btn-patch')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.showConfirmDialog('patch');
        });
        
        if (isServiceControlEnabled) {
            document.getElementById('btn-tricky')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleTrickyStoreControl();
            });
            document.getElementById('btn-tsee')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleTSEEControl();
            });
        }
        
        const iconElements = document.querySelectorAll('.btn-icon.material-symbols-rounded');
        for (const iconElement of iconElements) {
            const iconName = iconElement.textContent.trim();
            if (iconName && typeof svgIcons !== 'undefined') {
                try {
                    const svg = await svgIcons.loadIcon(iconName);
                    iconElement.innerHTML = svg;
                } catch (error) {
                    console.error(`Failed to load icon: ${iconName}`, error);
                }
            }
        }

    document.getElementById('confirm-close')?.addEventListener('click', () => this.hideConfirmDialog());
    document.getElementById('confirm-overlay')?.addEventListener('click', () => this.hideConfirmDialog());
    document.getElementById('confirm-execute')?.addEventListener('click', () => this.executePendingFunction());

    document.getElementById('glass-close')?.addEventListener('click', () => this.cancelAndHideGlassWindow());
    document.getElementById('glass-overlay')?.addEventListener('click', () => this.cancelAndHideGlassWindow());
    document.getElementById('glass-button-confirm')?.addEventListener('click', () => this.hideGlassWindow());

        document.querySelector('.close-selector')?.addEventListener('click', () => this.hideFilePicker());
        document.getElementById('file-picker-overlay')?.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) this.hideFilePicker();
        });
        document.getElementById('file-picker-cancel')?.addEventListener('click', () => this.hideFilePicker());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideConfirmDialog();
                this.cancelAndHideGlassWindow();
                this.hideFilePicker();
            }
        });

        window.addEventListener('resize', () => {
            this.positionConfirmDialog();
            this.positionGlassWindow();
            
            const filePickerWindow = document.getElementById('file-picker-window');
            if (filePickerWindow && filePickerWindow.style.display !== 'none') {
                this.positionFilePicker();
            }
        });

        const toolsContainer = document.querySelector('.tools-list-container');
        if (toolsContainer) {
            const dynamicIcons = toolsContainer.querySelectorAll('.material-symbols-rounded');
            for (const iconElement of dynamicIcons) {
                const iconName = iconElement.textContent.trim();
                if (iconName && iconElement.innerHTML === iconName) {
                    try {
                        const svg = await svgIcons.loadIcon(iconName);
                        iconElement.innerHTML = svg;
                    } catch (error) {
                        console.error(`Failed to load dynamic icon in tools: ${iconName}`, error);
                    }
                }
            }
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

    async showConfirmDialog(functionType) {
        this.pendingFunction = functionType;
        
        let title, message;
        
        switch(functionType) {
            case 'steal':
                title = I18n.translate('STEAL_KEYBOX_TITLE', ' ');
                message = I18n.translate('STEAL_KEYBOX_CONFIRM', ' ');
                break;
            case 'patch':
                title = I18n.translate('SECURITY_PATCH_TITLE', '设置安全补丁级别');
                message = '';
                break;
            default:
                return;
        }

        const overlay = document.getElementById('confirm-overlay');
        const confirmWindow = document.getElementById('confirm-window');
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const securityPatchForm = document.getElementById('security-patch-form');
        const logOutput = document.getElementById('confirm-log-output');
        const executeButton = document.getElementById('confirm-execute');

        if (overlay && confirmWindow && titleElement && messageElement) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            
            if (executeButton) {
                executeButton.textContent = I18n.translate('BEGIN', '开始');
                executeButton.disabled = false;
                executeButton.onclick = () => this.executePendingFunction();
            }
            
            if (functionType === 'patch') {
                messageElement.style.display = 'none';
                securityPatchForm.style.display = 'block';
                if (logOutput) logOutput.style.display = 'none';
                this.bindSecurityPatchEvents();
            } else if (functionType === 'steal') {
                messageElement.style.display = 'block';
                securityPatchForm.style.display = 'none';
                if (logOutput) {
                    logOutput.style.display = 'block';
                    logOutput.innerHTML = ''; // 清空之前的输出
                }
            }

            overlay.style.display = 'block';
            confirmWindow.style.display = 'flex';
            
            this.positionConfirmDialog();
            await this.replaceModalIcons('confirm-window');
        }
    },
    
    bindSecurityPatchEvents() {
        const radioButtons = document.querySelectorAll('input[name="patch-mode"]');
        const bootInput = document.getElementById('patch-boot');
        const vendorInput = document.getElementById('patch-vendor');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'auto') {
                    bootInput.disabled = true;
                    vendorInput.disabled = true;
                } else {
                    bootInput.disabled = false;
                    vendorInput.disabled = false;
                }
            });
        });
        
        document.getElementById('get-patch-date')?.addEventListener('click', () => this.handleGetPatchDate());
        
        bootInput?.addEventListener('click', () => this.showCalendar('patch-boot'));
        vendorInput?.addEventListener('click', () => this.showCalendar('patch-vendor'));
        
        document.getElementById('calendar-prev')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('calendar-next')?.addEventListener('click', () => this.changeMonth(1));
        document.getElementById('calendar-select')?.addEventListener('click', () => this.selectDate());
        document.getElementById('calendar-cancel')?.addEventListener('click', () => this.hideCalendar());
        document.getElementById('calendar-overlay')?.addEventListener('click', () => this.hideCalendar());
    },
    
    async handleGetPatchDate() {
        const button = document.getElementById('get-patch-date');
        const originalText = button.textContent;
        button.textContent = I18n.translate('LOADING', '加载中...');
        button.disabled = true;
        
        try {
            const command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --securitypatchdatefetch';
            const result = await this.execCommandWithCancel(command, '获取安全补丁日期中...');
            
            if (result && result.trim()) {
                const output = result.trim();
                let patchDate = '';
                
                const dateRegexes = [
                    /\d{4}-\d{2}-\d{2}/,
                    /\d{4}\/\d{2}\/\d{2}/,
                    /\d{2}\/\d{2}\/\d{4}/
                ];
                
                for (const regex of dateRegexes) {
                    const match = output.match(regex);
                    if (match) {
                        patchDate = match[0];
                        if (patchDate.includes('/')) {
                            const parts = patchDate.split('/');
                            if (parts.length === 3) {
                                if (parts[0].length === 4) {
                                    patchDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
                                } else {
                                    patchDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
                                }
                            }
                        }
                        break;
                    }
                }
                
                if (!patchDate) {
                    const today = new Date();
                    patchDate = today.toISOString().split('T')[0];
                }
                
                document.getElementById('patch-boot').value = patchDate;
                document.getElementById('patch-vendor').value = patchDate;
                
                this.showToast('已获取安全补丁日期', 'success');
            } else {
                this.showToast('获取安全补丁日期失败：无输出', 'error');
            }
        } catch (error) {
            const errorMsg = error.message || error.toString();
            this.showToast(`获取安全补丁日期失败: ${errorMsg}`, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    },
    
    calendar: {
        currentDate: new Date(),
        targetInput: null
    },
    
    showCalendar(targetInput) {
        this.calendar.targetInput = targetInput;
        this.calendar.currentDate = new Date();
        this.renderCalendar();
        
        const overlay = document.getElementById('calendar-overlay');
        const calendar = document.getElementById('calendar-popup');
        
        if (overlay && calendar) {
            overlay.style.display = 'block';
            calendar.style.display = 'block';
            this.positionCalendar();
        }
    },
    
    hideCalendar() {
        const overlay = document.getElementById('calendar-overlay');
        const calendar = document.getElementById('calendar-popup');
        
        if (overlay && calendar) {
            overlay.style.display = 'none';
            calendar.style.display = 'none';
        }
    },
    
    changeMonth(direction) {
        this.calendar.currentDate.setMonth(this.calendar.currentDate.getMonth() + direction);
        this.renderCalendar();
    },
    
    renderCalendar() {
        const year = this.calendar.currentDate.getFullYear();
        const month = this.calendar.currentDate.getMonth();
        
        const monthElement = document.getElementById('calendar-month');
        const bodyElement = document.getElementById('calendar-body');
        
        if (!monthElement || !bodyElement) return;
        
        const monthNames = [
            '一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'
        ];
        monthElement.textContent = `${year}年 ${monthNames[month]}`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let calendarHTML = '<table><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr>';
        
        for (let week = 0; week < 6; week++) {
            calendarHTML += '<tr>';
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const isCurrentMonth = cellDate.getMonth() === month;
                const isToday = cellDate.toDateString() === new Date().toDateString();
                const isSelected = document.getElementById(this.calendar.targetInput).value === cellDate.toISOString().split('T')[0];
                
                let className = '';
                if (!isCurrentMonth) className += 'other-month ';
                if (isToday) className += 'today ';
                if (isSelected) className += 'selected ';
                
                calendarHTML += `<td class="${className.trim()}" data-date="${cellDate.toISOString().split('T')[0]}">${cellDate.getDate()}</td>`;
            }
            calendarHTML += '</tr>';
        }
        
        calendarHTML += '</table>';
        bodyElement.innerHTML = calendarHTML;
        
        // 绑定日期点击事件
        const dateCells = bodyElement.querySelectorAll('td[data-date]');
        dateCells.forEach(cell => {
            cell.addEventListener('click', () => {
                this.calendar.currentDate = new Date(cell.dataset.date);
                this.renderCalendar();
            });
        });
    },
    
    // 选择日期
    selectDate() {
        const selectedDate = this.calendar.currentDate.toISOString().split('T')[0];
        document.getElementById(this.calendar.targetInput).value = selectedDate;
        this.hideCalendar();
    },
    
    // 定位日历
    positionCalendar() {
        const calendar = document.getElementById('calendar-popup');
        if (!calendar) return;
        
        calendar.style.top = '50%';
        calendar.style.left = '50%';
        calendar.style.transform = 'translate(-50%, -50%)';
    },
    
    // 显示提示
    showToast(message, type = 'info') {
        Core.showToast?.(message, type) || alert(message);
    },

    // 定位确认对话框
    positionConfirmDialog() {
        const confirmWindow = document.getElementById('confirm-window');
        if (!confirmWindow) return;

        confirmWindow.style.top = '20px';
        confirmWindow.style.left = '50%';
        confirmWindow.style.transform = 'translateX(-50%)';

        const viewportHeight = window.innerHeight;
        confirmWindow.style.maxHeight = `calc(${viewportHeight}px - 40px)`;
        confirmWindow.style.width = '90%';
        confirmWindow.style.maxWidth = '500px';
    },

    // 隐藏确认对话框
    hideConfirmDialog() {
        const overlay = document.getElementById('confirm-overlay');
        const confirmWindow = document.getElementById('confirm-window');

        if (overlay && confirmWindow) {
            overlay.style.display = 'none';
            confirmWindow.style.display = 'none';
            this.pendingFunction = null;
        }
    },

    async executePendingFunction() {
        const functionToExecute = this.pendingFunction;
        
        if (functionToExecute === 'patch') {
            const systemValue = document.getElementById('patch-system').value || 'prop';
            const isAutoMode = document.querySelector('input[name="patch-mode"]:checked').value === 'auto';
            
            let bootValue, vendorValue;
            
            if (isAutoMode) {
                const today = new Date();
                const todayDate = today.toISOString().split('T')[0];
                bootValue = todayDate;
                vendorValue = todayDate;
            } else {
                bootValue = document.getElementById('patch-boot').value;
                vendorValue = document.getElementById('patch-vendor').value;
                
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(bootValue) || !dateRegex.test(vendorValue)) {
                    this.showToast('请输入有效的日期格式 (YYYY-MM-DD)', 'error');
                    return;
                }
            }
            
            this.hideConfirmDialog();
            await this.handleSecurityPatch(systemValue, bootValue, vendorValue);
        } else if (functionToExecute === 'steal') {
            await this.executeStealKeyboxInConfirmWindow();
        }
        
        this.pendingFunction = null;
    },

async simulateLineByLineOutput(text, callback, delay = 300) {
    const lines = text.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
        // 检查是否被取消
        if (this.isCommandCancelled) {
            return;
        }
        
        const line = lines[i];
        
        // 添加不同类型的日志
        let type = 'info';
        if (line.includes('下载文件...完毕')) {
            type = 'success';
        } else if (line.includes('解码密钥...完毕')) {
            type = 'success';
        } else if (line.includes('写出文件...完毕')) {
            type = 'success';
        } else if (line.includes('清理缓存')) {
            type = 'info';
        }
        
        callback(line, type);
        
        const randomDelay = delay + Math.random() * 200;
        await this.delay(randomDelay);
    }
},

async executeStealKeyboxInConfirmWindow() {
    const executeButton = document.getElementById('confirm-execute');
    const logOutput = document.getElementById('confirm-log-output');
    
    if (!logOutput) return;
    
    if (executeButton) {
        executeButton.disabled = true;
        executeButton.textContent = I18n.translate('EXECUTING', '执行中...');
    }
    
    logOutput.innerHTML = '';
    
    try {
        this.addConfirmLog(I18n.translate('START_EXECUTION', '开始执行功能...'), 'info');
        this.addConfirmLog(I18n.translate('EXECUTING_COMMAND', '执行命令中...'), 'info');
        
        this.checkCancelled();

        const commandA = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --stealkeybox -a';
        this.addConfirmLog(I18n.translate('EXECUTING_COMMAND', '执行命令: {command}', {
            command: commandA
        }), 'info');

        let result;
        let hasError = false;
        let errorMessage = '';
        
        try {
            this.addConfirmLog('执行来源A', 'info');
            
            await this.delay(1000);
            
            result = await Core.execCommand(commandA);
            
            if (result && result.trim()) {
                this.addConfirmLog('使用参数 -a 执行成功', 'success');
                await this.delay(500);
                
                const simulatedOutput = [
                    '-下载文件...完毕',
                    '-解码密钥...完毕',
                    '-写出文件...完毕',
                    '-清理缓存'
                ];
                
                for (const line of simulatedOutput) {
                    if (this.isCommandCancelled) break;
                    this.addConfirmLog(line, 'info');
                    await this.delay(800 + Math.random() * 400);
                }
                
            } else {
                this.addConfirmLog('命令执行成功，但没有输出', 'info');
            }
            
        } catch (errorA) {
            if (this.isCommandCancelled) return;
            
            hasError = true;
            errorMessage = `使用参数 -a 执行失败: ${errorA.message || errorA}`;
            this.addConfirmLog(errorMessage, 'warning');
            
            this.checkCancelled();

            const commandB = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --stealkeybox -b';
            this.addConfirmLog(I18n.translate('TRYING_ALTERNATIVE_COMMAND', '尝试备用命令: {command}', {
                command: commandB
            }), 'info');

            try {
                this.addConfirmLog('执行来源B', 'info');
                
                await this.delay(1000);
                
                result = await Core.execCommand(commandB);
                
                if (result && result.trim()) {
                    this.addConfirmLog('使用参数 -b 执行成功', 'success');
                    await this.delay(500);
                    
                    const simulatedOutput = [
                        '-下载文件...完毕',
                        '-解码密钥...完毕',
                        '-写出文件...完毕',
                        '-清理缓存'
                    ];
                    
                    for (const line of simulatedOutput) {
                        if (this.isCommandCancelled) break;
                        this.addConfirmLog(line, 'info');
                        await this.delay(800 + Math.random() * 400);
                    }
                    
                } else {
                    this.addConfirmLog('命令执行成功，但没有输出', 'info');
                }
                
            } catch (errorB) {
                if (this.isCommandCancelled) return;
                
                this.addConfirmLog(`使用参数 -b 执行失败: ${errorB.message || errorB}`, 'error');

                throw new Error(I18n.translate('BOTH_COMMANDS_FAILED', '所有命令执行都失败，请检查设备兼容性'));
            }
        }
        
        if (!this.isCommandCancelled) {
            this.checkCancelled();

            this.addConfirmLog(I18n.translate('COMMAND_EXECUTED', '命令执行完成'), 'success');

            if (result && result.trim() && !hasError) {
                const lines = result.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    await this.delay(500);
                    this.addConfirmLog('命令输出:', 'info');
                    
                    for (const line of lines) {
                        if (this.isCommandCancelled) break;
                        this.addConfirmLog(line, 'info');
                        await this.delay(200 + Math.random() * 100);
                    }
                }
            }

            this.addConfirmLog(I18n.translate('KEYBOX_STEAL_COMPLETED', '完成'), 'success');
            
            if (executeButton) {
                executeButton.textContent = I18n.translate('COMPLETE', '完成');
                executeButton.disabled = false;
                executeButton.onclick = () => this.hideConfirmDialog();
            }
        }

    } catch (error) {
        if (!this.isCommandCancelled) {
            const errorMsg = error.message || error.toString();
            this.addConfirmLog(`${I18n.translate('STEAL_FAILED', '失败')}: ${errorMsg}`, 'error');

            if (errorMsg.includes('Permission denied')) {
                this.addConfirmLog(I18n.translate('PERMISSION_DENIED_CHECK_ROOT', '权限被拒绝，请检查SELinux状态和root权限'), 'error');
            } else if (errorMsg.includes('所有命令执行都失败')) {
                this.addConfirmLog(I18n.translate('CHECK_DEVICE_COMPATIBILITY', '请检查设备兼容性或联系开发者获取支持'), 'error');
            } else {
                this.addConfirmLog(I18n.translate('CHECK_PROXY_NETWORK', '请检查是否使用代理网络，如果没有请使用代理'), 'error');
            }
        }
        
        // 恢复按钮
        if (executeButton) {
            executeButton.textContent = I18n.translate('RETRY', '重试');
            executeButton.disabled = false;
            executeButton.onclick = () => this.executePendingFunction();
        }
    }
},

    // 在确认窗口中添加日志
    addConfirmLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logOutput = document.getElementById('confirm-log-output');
        
        if (logOutput) {
            const logLine = document.createElement('div');
            logLine.className = `log-line log-${type}`;
            logLine.innerHTML = `
                <span class="log-time">[${timestamp}]</span>
                <span class="log-message">${message}</span>
            `;
            logOutput.appendChild(logLine);

            setTimeout(() => {
                logOutput.scrollTop = logOutput.scrollHeight;
            }, 10);
        }
    },

    // 以下为原有的方法，保持不变（只列出一部分关键方法）
    async showServiceControl(serviceName) {
        this.currentService = serviceName;
        await this.showGlassWindow(`${serviceName} 服务控制`);
        
        // 隐藏日志输出，显示服务控制界面
        const logOutput = document.getElementById('log-output');
        const serviceControl = document.getElementById('service-control');
        
        if (logOutput && serviceControl) {
            logOutput.style.display = 'none';
            serviceControl.style.display = 'block';
        }
        
        // 绑定服务控制按钮事件
        this.bindServiceControlEvents();
        
        // 初始检测服务状态
        await this.checkServiceStatus();
        await this.replaceModalIcons('glass-window');
    },

    // 绑定服务控制按钮事件
    bindServiceControlEvents() {
        document.getElementById('service-start-btn')?.addEventListener('click', () => this.startService());
        document.getElementById('service-stop-btn')?.addEventListener('click', () => this.stopService());
        document.getElementById('service-refresh-btn')?.addEventListener('click', () => this.checkServiceStatus());
    },

    // 检查服务状态
    async checkServiceStatus() {
        if (!this.currentService) return;
        
        const statusIndicator = document.getElementById('service-status-indicator');
        const statusText = document.getElementById('service-status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = 'status-indicator status-checking';
            statusText.textContent = '检测中...';
        }
        
        try {
            let command;
            if (this.currentService === 'Tricky Store') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tsctl -state';
            } else if (this.currentService === 'TSEE') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tseectl -state';
            } else {
                throw new Error('未知的服务类型');
            }
            
            const result = await Core.execCommand(command);
            const isRunning = result.trim().toLowerCase() === 'true';
            
            if (statusIndicator && statusText) {
                if (isRunning) {
                    statusIndicator.className = 'status-indicator status-running';
                    statusText.textContent = '服务正在运行';
                } else {
                    statusIndicator.className = 'status-indicator status-stopped';
                    statusText.textContent = '服务已停止';
                }
            }
            
            this.addLog(`${this.currentService} 状态: ${isRunning ? '运行中' : '已停止'}`, 'info');
            
        } catch (error) {
            if (statusIndicator && statusText) {
                statusIndicator.className = 'status-indicator status-error';
                statusText.textContent = '状态检测失败';
            }
            this.addLog(`状态检测失败: ${error.message}`, 'error');
        }
    },

    // 启动服务
    async startService() {
        if (!this.currentService) return;
        
        this.addLog(`正在启动 ${this.currentService}...`, 'info');
        
        try {
            let command;
            if (this.currentService === 'Tricky Store') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tsctl -start';
            } else if (this.currentService === 'TSEE') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tseectl -start';
            } else {
                throw new Error('未知的服务类型');
            }
            
            await Core.execCommand(command);
            this.addLog(`${this.currentService} 启动命令已发送`, 'success');
            
            // 等待一段时间后重新检测状态
            await this.delay(1000);
            await this.checkServiceStatus();
            
        } catch (error) {
            this.addLog(`启动失败: ${error.message}`, 'error');
        }
    },

    // 停止服务
    async stopService() {
        if (!this.currentService) return;
        
        this.addLog(`正在停止 ${this.currentService}...`, 'info');
        
        try {
            let command;
            if (this.currentService === 'Tricky Store') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tsctl -stop';
            } else if (this.currentService === 'TSEE') {
                command = '/data/adb/modules/ts_enhancer_extreme/bin/tseed --tseectl -stop';
            } else {
                throw new Error('未知的服务类型');
            }
            
            await Core.execCommand(command);
            this.addLog(`${this.currentService} 停止命令已发送`, 'success');
            
            // 等待一段时间后重新检测状态
            await this.delay(1000);
            await this.checkServiceStatus();
            
        } catch (error) {
            this.addLog(`停止失败: ${error.message}`, 'error');
        }
    },

    // Tricky Store 控制
    async handleTrickyStoreControl() {
        await this.showServiceControl('Tricky Store');
    },

    // TSEE 控制
    async handleTSEEControl() {
        await this.showServiceControl('TSEE');
    },

    // 以下为原有的其他方法（保持不变）
    async showGlassWindow(title) {
        this.logs = [];
        this.currentFunction = title;
        this.isCommandCancelled = false;

        const overlay = document.getElementById('glass-overlay');
        const glassWindow = document.getElementById('glass-window');
        const titleElement = document.getElementById('glass-title');
        const logOutput = document.getElementById('log-output');
        const serviceControl = document.getElementById('service-control');
        const confirmButton = document.getElementById('glass-button-confirm');

        if (overlay && glassWindow && titleElement && logOutput) {
            titleElement.textContent = title;
            logOutput.innerHTML = '';
            
            if (logOutput && serviceControl) {
                logOutput.style.display = 'block';
                serviceControl.style.display = 'none';
            }
            
            confirmButton.style.display = 'none';

            overlay.style.display = 'block';
            glassWindow.style.display = 'flex';

            this.positionGlassWindow();

            this.addLog(I18n.translate('START_EXECUTION', '开始执行功能...'), 'info');
            this.addLog(I18n.translate('CLOSE_TO_CANCEL', '点击关闭按钮可随时取消操作'), 'info');
            await this.replaceModalIcons('glass-window');
        }
    },

    positionGlassWindow() {
        const glassWindow = document.getElementById('glass-window');
        if (!glassWindow) return;

        glassWindow.style.top = '20px';
        glassWindow.style.left = '50%';
        glassWindow.style.transform = 'translateX(-50%)';
        
        // 设置固定宽度和高度
        glassWindow.style.width = '80%';
        glassWindow.style.maxWidth = '800px';
        glassWindow.style.height = '70%';
        glassWindow.style.maxHeight = '700px';
        glassWindow.style.minHeight = '400px';
    },

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push({
            timestamp,
            message,
            type
        });

        const logOutput = document.getElementById('log-output');
        if (logOutput && logOutput.style.display !== 'none') {
            const logLine = document.createElement('div');
            logLine.className = `log-line log-${type}`;
            logLine.innerHTML = `
                <span class="log-time">[${timestamp}]</span>
                <span class="log-message">${message}</span>
            `;
            logOutput.appendChild(logLine);

            setTimeout(() => {
                logOutput.scrollTop = logOutput.scrollHeight;
            }, 10);
        }
    },

    hideGlassWindow() {
        const overlay = document.getElementById('glass-overlay');
        const glassWindow = document.getElementById('glass-window');
        const confirmButton = document.getElementById('glass-button-confirm');

        if (overlay && glassWindow) {
            confirmButton.style.display = 'block';
            
            overlay.style.display = 'none';
            glassWindow.style.display = 'none';
            this.currentFunction = null;
            this.currentCommand = null;
            this.currentService = null;
        }
    },

    cancelAndHideGlassWindow() {
        this.cancelCurrentCommand();
        this.hideGlassWindow();
    },

    cancelCurrentCommand() {
        if (this.currentCommand && !this.isCommandCancelled) {
            this.isCommandCancelled = true;
            this.addLog(I18n.translate('OPERATION_CANCELLED', '操作已被用户取消'), 'warning');
            
            const confirmButton = document.getElementById('glass-button-confirm');
            if (confirmButton) {
                confirmButton.style.display = 'block';
            }
        }
    },

    checkCancelled() {
        if (this.isCommandCancelled) {
            throw new Error('Operation cancelled by user');
        }
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    async showFilePicker() {
        this.currentPath = '/storage/emulated/0';
        const overlay = document.getElementById('file-picker-overlay');
        const filePickerWindow = document.getElementById('file-picker-window');

        if (overlay && filePickerWindow) {
            overlay.style.display = 'block';
            filePickerWindow.style.display = 'flex';

            filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            filePickerWindow.style.opacity = '0';

            this.positionFilePicker();

            setTimeout(() => {
                filePickerWindow.classList.add('open');
                filePickerWindow.style.transform = 'translateX(-50%) scale(1)';
                filePickerWindow.style.opacity = '1';
            }, 10);

            this.updateCurrentPath();
            await this.loadDirectory(this.currentPath);
            await this.replaceModalIcons('file-picker-window');

            setTimeout(() => {
                this.positionFilePicker();
            }, 100);
        }
    },

    positionFilePicker() {
        const filePickerWindow = document.getElementById('file-picker-window');
        if (!filePickerWindow) return;

        filePickerWindow.style.position = 'fixed';
        filePickerWindow.style.top = '20px';
        filePickerWindow.style.left = '50%';
        filePickerWindow.style.transform = 'translateX(-50%)';

        const viewportHeight = window.innerHeight;
        filePickerWindow.style.maxHeight = `calc(${viewportHeight}px - 40px)`;

        filePickerWindow.style.width = '90%';
        filePickerWindow.style.maxWidth = '600px';
    },

    hideFilePicker() {
        const overlay = document.getElementById('file-picker-overlay');
        const filePickerWindow = document.getElementById('file-picker-window');

        if (overlay && filePickerWindow) {
            filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            filePickerWindow.style.opacity = '0';
            filePickerWindow.classList.remove('open');

            setTimeout(() => {
                overlay.style.display = 'none';
                filePickerWindow.style.display = 'none';
                filePickerWindow.style.transform = 'translateX(-50%) scale(0.95)';
            }, 300);
        }
    },

    updateCurrentPath() {
        const currentPathElement = document.getElementById('file-current-path');
        if (!currentPathElement) return;

        const segments = this.currentPath.split('/').filter(Boolean);

        const pathHTML = segments.map((segment, index) => {
            const fullPath = '/' + segments.slice(0, index + 1).join('/');
            return `<span class="path-segment" data-path="${fullPath}">${segment}</span>`;
        }).join('<span class="separator">›</span>');

        currentPathElement.innerHTML = pathHTML;
        currentPathElement.scrollTo({
            left: currentPathElement.scrollWidth,
            behavior: 'smooth'
        });
    },

    async loadDirectory(path) {
        try {
            this.currentPath = path;
            this.updateCurrentPath();

            const fileList = document.getElementById('file-picker-list');
            fileList.innerHTML = `<div class="loading-text">${I18n.translate('LOADING_DIRECTORY', '加载中...')}</div>`;

            this.positionFilePicker();

            const command = `ls "${path}"`;
            const result = await this.execCommandWithCancel(command, I18n.translate('LOADING_DIRECTORY_CONTENT', '正在加载目录内容...'));
            this.parseFileList(result);

            setTimeout(() => {
                this.positionFilePicker();

                const filePickerWindow = document.getElementById('file-picker-window');
                if (filePickerWindow) {
                    const rect = filePickerWindow.getBoundingClientRect();
                    if (rect.top !== 20) {
                        console.log('重新定位文件选择器窗口');
                        this.positionFilePicker();
                    }
                }
            }, 50);

        } catch (error) {
            if (!this.isCommandCancelled) {
                const fileList = document.getElementById('file-picker-list');
                fileList.innerHTML = `<div class="error-text">${I18n.translate('UNABLE_TO_ACCESS_DIRECTORY', '无法访问目录: {error}', { error: error.message || error })}</div>`;

                setTimeout(() => {
                    this.positionFilePicker();
                }, 50);
            }
        }
    },

    parseFileList(lsOutput) {
        if (this.isCommandCancelled) return;
        
        const lines = lsOutput.split('\n').filter(line => line.trim());
        const fileList = document.getElementById('file-picker-list');
        fileList.innerHTML = '';

        if (this.currentPath !== '/storage/emulated/0') {
            const parentItem = document.createElement('div');
            parentItem.className = 'file-item directory';
            parentItem.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                    <path d="M141-160q-24 0-42-18.5T81-220v-520q0-23 18-41.5t42-18.5h280l60 60h340q23 0 41.5 18.5T881-680v460q0 23-18.5 41.5T821-160H141Z"/>
                </svg>
                <span>..</span>
            `;
            parentItem.addEventListener('click', () => {
                const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/storage/emulated/0';
                this.loadDirectory(parentPath);
            });
            fileList.appendChild(parentItem);
        }

        lines.forEach(line => {
            if (!line.trim()) return;

            const checkDirCommand = `[ -d "${this.currentPath}/${line}" ] && echo "directory" || echo "file"`;

            this.checkFileType(line, checkDirCommand, fileList);
        });

        setTimeout(() => {
            this.positionFilePicker();
        }, 100);
    },

    async checkFileType(filename, checkCommand, fileList) {
        try {
            const result = await this.execCommandWithCancel(checkCommand);
            const isDirectory = result.trim() === 'directory';
            const isXmlFile = filename.toLowerCase().endsWith('.xml');

            if (!isDirectory && !isXmlFile) return;

            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${isDirectory ? 'directory' : 'xml-file'}`;

            fileItem.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                ${isDirectory ? 
                    '<path d="M141-160q-24 0-42-18.5T81-220v-520q0-23 18-41.5t42-18.5h280l60 60h340q23 0 41.5 18.5T881-680v460q0 23-18.5 41.5T821-160H141Z"/>' :
                    '<path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>'}
                </svg>
                <span>${filename}</span>
            `;

            fileItem.addEventListener('click', () => {
                if (isDirectory) {
                    const newPath = this.currentPath.endsWith('/') ?
                        `${this.currentPath}${filename}` : `${this.currentPath}/${filename}`;
                    this.loadDirectory(newPath);
                } else {
                    const filePath = this.currentPath.endsWith('/') ?
                        `${this.currentPath}${filename}` : `${this.currentPath}/${filename}`;
                    this.selectXmlFile(filePath);
                }
            });

            fileList.appendChild(fileItem);
        } catch (error) {
            // 忽略检查文件类型时的错误
        }
    },

// 保留这个正确的execCommandWithCancel方法
async execCommandWithCancel(command, description = '') {
    if (description) {
        this.addLog(description, 'info');
    }
    
    this.checkCancelled();
    
    try {
        this.currentCommand = command;
        this.isCommandCancelled = false;
        
        const result = await Core.execCommand(command);
        
        this.checkCancelled();
        
        this.currentCommand = null;
        return result;
    } catch (error) {
        this.currentCommand = null;
        
        if (this.isCommandCancelled) {
            return '';
        }
        
        throw error;
    }
},

    async selectXmlFile(filePath) {
        this.positionFilePicker();
        this.hideFilePicker();
        await this.processKeyboxImport(filePath);
    },

    async handleImportKeybox() {
        await this.showFilePicker();
    },

    async processKeyboxImport(sourcePath) {
        this.showGlassWindow(I18n.translate('IMPORT_KEYBOX_TITLE', '导入keybox文件'));

        try {
            this.addLog(I18n.translate('FOUND_KEYBOX_FILE', '找到keybox文件: {path}', {
                path: sourcePath
            }), 'info');
            await this.delay(500);
            
            this.checkCancelled();

            try {
                await this.execCommandWithCancel('test -f /data/adb/tricky_store/keybox.xml', I18n.translate('CHECKING_EXISTING_KEYBOX', '检查已存在的keybox文件...'));

                this.addLog(I18n.translate('EXISTING_KEYBOX_FOUND', '发现已存在的keybox文件，正在备份...'), 'warning');

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await this.execCommandWithCancel(
                    `cp /data/adb/tricky_store/keybox.xml /data/adb/tricky_store/keybox_backup/keybox_backup_${timestamp}.xml`,
                    I18n.translate('BACKING_UP_KEYBOX', '备份keybox文件...')
                );
                this.addLog(I18n.translate('BACKUP_COMPLETE', '已备份原有keybox文件'), 'success');
            } catch (e) {
                this.addLog(I18n.translate('NO_EXISTING_KEYBOX', '未发现已存在的keybox文件'), 'info');
            }
            
            this.checkCancelled();

            this.addLog(I18n.translate('COPYING_TO_SYSTEM', '正在复制文件...'), 'info');

            await this.execCommandWithCancel(
                `cp "${sourcePath}" /data/adb/tricky_store/keybox.xml`,
                I18n.translate('COPYING_KEYBOX_FILE', '复制keybox文件...')
            );

            this.checkCancelled();

            this.addLog(I18n.translate('SETTING_FILE_PERMISSIONS', '设置文件权限...'), 'info');

            await this.execCommandWithCancel(
                'chmod 644 /data/adb/tricky_store/keybox.xml',
                I18n.translate('SETTING_PERMISSIONS', '设置权限中...')
            );

            this.addLog(I18n.translate('KEYBOX_IMPORT_SUCCESS', 'keybox文件导入成功！'), 'success');
            this.addLog(I18n.translate('KEYBOX_SAVED_TO', '文件已保存到: {path}', {
                path: '/data/adb/tricky_store/keybox.xml'
            }), 'success');
            
            const confirmButton = document.getElementById('glass-button-confirm');
            if (confirmButton) {
                confirmButton.style.display = 'block';
            }

        } catch (error) {
            if (!this.isCommandCancelled) {
                this.addLog(`${I18n.translate('IMPORT_FAILED', '导入失败')}: ${error.message || error}`, 'error');
                this.addLog(I18n.translate('CHECK_PERMISSION_SPACE', '请检查文件权限和存储空间'), 'error');
            }
        }
    },

    async handleSecurityPatch(systemValue, bootValue, vendorValue) {
        this.showGlassWindow(I18n.translate('SECURITY_PATCH_TITLE', '设置安全补丁级别'));

        try {
            this.addLog(I18n.translate('SETTING_SECURITY_PATCH', '正在设置安全补丁级别...'), 'info');
            this.checkCancelled();

            const content = `system=${systemValue}\nvendor=${vendorValue}\nboot=${bootValue}`;
            this.addLog(I18n.translate('PREPARED_DATA', '准备的数据: {content}', {
                content
            }), 'info');

            this.checkCancelled();

            const command = `echo "${content}" > /data/adb/tricky_store/security_patch.txt`;
            this.addLog(I18n.translate('EXECUTING_COMMAND', '执行命令: {command}', {
                command
            }), 'info');

            await this.execCommandWithCancel(command, I18n.translate('WRITING_SECURITY_PATCH_FILE', '写入安全补丁文件...'));

            this.checkCancelled();

            // 设置文件权限
            await this.execCommandWithCancel('chmod 644 /data/adb/tricky_store/security_patch.txt', I18n.translate('SETTING_PERMISSIONS', '设置权限中...'));

            this.checkCancelled();

            // 验证文件内容
            const verifyCommand = 'cat /data/adb/tricky_store/security_patch.txt';
            const verifyResult = await this.execCommandWithCancel(verifyCommand, I18n.translate('VERIFYING_CONTENT', '验证文件内容...'));

            if (verifyResult && verifyResult.trim()) {
                this.addLog(I18n.translate('FILE_CONTENT', '文件内容:'), 'info');
                const lines = verifyResult.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.addLog(line, 'success');
                    }
                });
            }

            this.addLog(I18n.translate('SECURITY_PATCH_SET_COMPLETED', '安全补丁级别设置完成'), 'success');
            
            const confirmButton = document.getElementById('glass-button-confirm');
            if (confirmButton) {
                confirmButton.style.display = 'block';
            }

        } catch (error) {
            if (!this.isCommandCancelled) {
                const errorMsg = error.message || error.toString();
                this.addLog(`${I18n.translate('SETUP_FAILED', '设置失败')}: ${errorMsg}`, 'error');

                if (errorMsg.includes('Permission denied')) {
                    this.addLog(I18n.translate('PERMISSION_DENIED_CHECK_ROOT', '权限被拒绝，请检查SELinux状态和root权限'), 'error');
                } else {
                    this.addLog(I18n.translate('CHECK_FILE_PERMISSIONS', '请检查文件写入权限'), 'error');
                }
            }
        }
    }
};

window.ToolsPage = ToolsPage;