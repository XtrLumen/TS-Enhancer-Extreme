/**
 * AMMF WebUI CSS加载器
 * 提供动态加载CSS文件的功能
 */

const CSSLoader = {
    // 默认CSS路径
    defaultCSSPath: 'css/style.css',
    
    // 自定义CSS路径
    customCSSPath: 'css/CustomCss/main.css',
    
    // 模块CSS路径
    moduleCSSPath: 'css/module/',
    
    // 当前加载的CSS类型
    currentCSSType: 'default',
    
    // 已加载的CSS链接元素
    loadedCSSLink: null,
    
    // 已加载的模块CSS文件列表
    loadedModules: [],
    
    // 自动刷新模块CSS的间隔(毫秒)
    autoRefreshInterval: 10000,
    
    // 自动刷新定时器
    autoRefreshTimer: null,
    
    // 初始化CSS加载器
    init() {
        // 从本地存储获取上次使用的CSS类型和色调值
        const savedCSSType = localStorage.getItem('ammf_css_type') || 'default';
        const savedHue = localStorage.getItem('ammf_color_hue') || '300';
        
        // 移除index.html中直接引用的CSS
        this.removeDirectCSSLinks();
        
        // 加载保存的CSS类型
        this.loadCSS(savedCSSType);
        
        // 加载模块CSS
        this.loadModuleCSS();
        
        // 应用保存的色调值
        document.documentElement.style.setProperty('--hue', savedHue);
        
        // 监听主题变更事件，确保CSS与主题兼容
        document.addEventListener('themeChanged', () => {
        });
        
        // 监听颜色变化事件
        document.addEventListener('colorChanged', (e) => {
            const hue = e.detail.hue;
            document.documentElement.style.setProperty('--hue', hue);
            localStorage.setItem('ammf_color_hue', hue);
        });
        
        console.log('CSS加载器初始化完成，当前CSS类型:', savedCSSType, '当前色调:', savedHue);
        
        // 启动自动刷新
        this.startAutoRefresh();
    },
    
    // 加载模块CSS文件
    async loadModuleCSS() {
        try {
            // 获取模块目录下所有文件
            const response = await fetch(this.moduleCSSPath + '?list=true');
            if (!response.ok) {
                // 如果模块目录不存在，静默处理不报错
                if (response.status === 404) {
                    console.log('模块CSS目录不存在，跳过加载');
                    return;
                }
                throw new Error('无法获取模块CSS文件列表');
            }
            
            const files = await response.json();
            console.log('发现模块CSS文件:', files);
            
            const newModules = [];
            
            // 加载每个CSS文件
            for (const file of files) {
                if (file.endsWith('.css')) {
                    try {
                        // 检查是否已加载该模块
                        const existingModule = document.querySelector(`style[data-module-css="${file}"]`);
                        if (!existingModule) {
                            const cssContent = await this._fetchWithImports(this.moduleCSSPath + file);
                            const style = document.createElement('style');
                            style.setAttribute('data-module-css', file);
                            style.textContent = cssContent;
                            document.head.appendChild(style);
                            console.log(`已加载模块CSS: ${file}`);
                        }
                        newModules.push(file);
                    } catch (err) {
                        console.error(`加载模块CSS文件 ${file} 失败:`, err);
                    }
                }
            }
            
            // 更新已加载模块列表
            this.loadedModules = newModules;
            
            // 触发模块CSS加载完成事件
            document.dispatchEvent(new CustomEvent('moduleCssLoaded'));
        } catch (error) {
            // 如果是网络错误或目录不存在，静默处理
            if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
                console.log('模块CSS目录不可访问，跳过加载');
                return;
            }
            console.error('模块CSS加载失败:', error);
        }
    },
    
    // 处理CSS中的@import规则
    async _fetchWithImports(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`获取CSS文件失败: ${url}`);
            }
            
            let css = await response.text();
            
            // 解析并处理@import规则
            const importRegex = /@import\s+['"](.*?)['"];/g;
            const imports = [...css.matchAll(importRegex)];
            
            for (const match of imports) {
                const importRule = match[0];
                const importPath = match[1];
                
                // 构建绝对URL
                const absoluteUrl = new URL(importPath, new URL(url, window.location.href)).href;
                
                try {
                    // 递归处理导入的CSS
                    const importedCss = await this._fetchWithImports(absoluteUrl);
                    css = css.replace(importRule, importedCss);
                } catch (err) {
                    console.error(`处理导入的CSS失败 ${importPath}:`, err);
                    // 保留原始导入规则
                }
            }
            
            return css;
        } catch (error) {
            console.error(`获取CSS文件失败 ${url}:`, error);
            throw error;
        }
    },
    
    // 移除直接在HTML中引用的CSS链接
    removeDirectCSSLinks() {
        const styleLink = document.querySelector('link[href="style.css"]');
        if (styleLink) {
            styleLink.remove();
            console.log('已移除直接引用的style.css');
        }
    },
    
    // 加载指定类型的CSS
    loadCSS(cssType) {
        // 保存CSS类型
        this.currentCSSType = cssType;
        localStorage.setItem('ammf_css_type', cssType);
        
        // 确定要加载的CSS路径
        const cssPath = cssType === 'custom' ? this.customCSSPath : this.defaultCSSPath;
        
        // 如果已有加载的CSS，先移除
        if (this.loadedCSSLink) {
            this.loadedCSSLink.remove();
        }
        
        // 创建新的链接元素
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        
        // 添加到文档头部
        document.head.appendChild(link);
        this.loadedCSSLink = link;
        
        console.log(`已加载${cssType === 'custom' ? '自定义' : '默认'}CSS: ${cssPath}`);
        
        // 触发CSS加载事件
        document.dispatchEvent(new CustomEvent('cssLoaded', { 
            detail: { type: cssType, path: cssPath }
        }));
        
        return true;
    },
    
    // 切换CSS类型
    toggleCSS() {
        const newType = this.currentCSSType === 'custom' ? 'default' : 'custom';
        return this.loadCSS(newType);
    },
    
    // 获取当前CSS类型
    getCurrentCSSType() {
        return this.currentCSSType;
    },
    
    // 刷新模块CSS
    refreshModuleCSS() {
        // 移除所有已加载的模块CSS
        const moduleStyles = document.querySelectorAll('style[data-module-css]');
        moduleStyles.forEach(style => style.remove());
        
        // 重新加载模块CSS
        this.loadModuleCSS();
        
        console.log('已刷新模块CSS');
        return true;
    },
    
    // 获取已加载的模块CSS列表
    getLoadedModuleCSS() {
        const moduleStyles = document.querySelectorAll('style[data-module-css]');
        return Array.from(moduleStyles).map(style => style.getAttribute('data-module-css'));
    },
    
    // 启动自动刷新模块CSS
    startAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
        
        this.autoRefreshTimer = setInterval(() => {
            this.checkForNewModuleCSS();
        }, this.autoRefreshInterval);
        
        console.log(`已启动自动刷新模块CSS，间隔: ${this.autoRefreshInterval/1000}秒`);
    },
    
    // 停止自动刷新
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('已停止自动刷新模块CSS');
        }
    },
    
    // 检查是否有新的模块CSS文件
    async checkForNewModuleCSS() {
        try {
            const response = await fetch(this.moduleCSSPath + '?list=true');
            if (!response.ok) {
                // 如果模块目录不存在，静默处理不报错
                if (response.status === 404) {
                    return;
                }
                throw new Error('无法获取模块CSS文件列表');
            }
            
            const files = await response.json();
            const cssFiles = files.filter(file => file.endsWith('.css'));
            
            // 检查是否有新文件
            const newFiles = cssFiles.filter(file => !this.loadedModules.includes(file));
            
            // 检查是否有文件被删除
            const removedFiles = this.loadedModules.filter(file => !cssFiles.includes(file));
            
            // 如果有变化，刷新模块CSS
            if (newFiles.length > 0 || removedFiles.length > 0) {
                console.log('检测到模块CSS变化，正在刷新...');
                if (newFiles.length > 0) console.log('新增文件:', newFiles);
                if (removedFiles.length > 0) console.log('删除文件:', removedFiles);
                
                this.refreshModuleCSS();
            }
        } catch (error) {
            // 如果是网络错误或目录不存在，静默处理
            if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
                return;
            }
            console.error('检查模块CSS更新失败:', error);
        }
    },
    
    // 设置自动刷新间隔
    setAutoRefreshInterval(interval) {
        if (typeof interval !== 'number' || interval < 1000) {
            console.error('刷新间隔必须是大于1000的数字');
            return false;
        }
        
        this.autoRefreshInterval = interval;
        
        // 重启自动刷新
        if (this.autoRefreshTimer) {
            this.stopAutoRefresh();
            this.startAutoRefresh();
        }
        
        console.log(`已设置自动刷新间隔为: ${interval/1000}秒`);
        return true;
    }
};

// 导出CSS加载器
window.CSSLoader = CSSLoader;