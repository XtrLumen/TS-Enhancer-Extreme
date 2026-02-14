/**
 * AMMF WebUI 主应用程序
 * 负责页面路由、UI管理和应用状态
 */

// 应用程序主类
class App {
    constructor() {
        this.state = {
            isLoading: true,
            currentPage: null,
            themeChanging: false,
            headerTransparent: true,
            pagesConfig: null,
            isStatusPageReady: false // 新增：状态页面是否就绪
        };
    }

    
    // 渲染SVG图标
    async renderIcon(iconName) {
        try {
            const svg = await svgIcons.loadIcon(iconName);
            return svg;
        } catch (error) {
            console.error(`Failed to render icon: ${iconName}`, error);
            return `<span class="material-symbols-rounded">${iconName}</span>`;
        }
    }
    
    // 替换静态图标为SVG图标
    async replaceStaticIcons() {
        const staticIcons = document.querySelectorAll('.material-symbols-rounded');
        
        for (const iconElement of staticIcons) {
            const iconName = iconElement.textContent.trim();
            if (iconName && iconElement.innerHTML === iconName) {
                try {
                    const iconHtml = await this.renderIcon(iconName);
                    iconElement.outerHTML = iconHtml;
                } catch (error) {
                    console.error(`Failed to replace static icon: ${iconName}`, error);
                }
            }
        }
    }
    
    // 初始化应用
    async init() {
        await I18n.init();
        ThemeManager.init();
        
        // 加载页面配置
        await this.loadPagesConfig();
        
        // Initialize CSS loader
        if (window.CSSLoader) {
            CSSLoader.init();
        }

        // 检测是否为MMRL环境并初始化
        const isMMRLEnvironment = !!window.MMRL;
        if (isMMRLEnvironment) {
            MMRL.init();
            // 降低顶栏高度以适应手机状态栏
            document.body.classList.add('mmrl-environment');
        }

        // 添加应用加载完成标记
        requestAnimationFrame(() => document.body.classList.add('app-loaded'));

        // 初始化语言选择器
        if (window.I18n?.initLanguageSelector) {
            I18n.initLanguageSelector();
        } else {
            document.addEventListener('i18nReady', () => I18n.initLanguageSelector());
        }
        
        // 替换静态图标为SVG图标
        this.replaceStaticIcons();

        // 初始化底栏导航
        await this.initNavigation();
        
        // 初始时禁用导航栏，等待状态页面加载完成
        this.setNavigationEnabled(false);
        
        // 加载页面模块JS文件
        await this.loadPageModules();

        // 加载初始页面并等待完成
        const initialPage = Router.getCurrentPage();
        // 确保在初始化时也调用 onActivate
        await Router.navigate(initialPage, false, true);

        // 使用 Promise.resolve().then 确保在下一个微任务中执行预加载
        Promise.resolve().then(() => {
            // 预加载其他页面，只执行一次
            if (!this._pagesPreloaded) {
                Router.preloadPages();
                this._pagesPreloaded = true;
            }
        });

        // 更新加载状态
        this.state.isLoading = false;

        // 移除加载指示器
        const loadingContainer = document.querySelector('#main-content .loading-container');
        if (loadingContainer) {
            loadingContainer.style.opacity = '0';
            setTimeout(() => loadingContainer.remove(), 300);
        }
    }
    
    /**
     * 设置导航栏启用状态
     * @param {boolean} enabled - 是否启用导航栏
     */
    setNavigationEnabled(enabled) {
        const navElement = document.getElementById('app-nav');
        if (navElement) {
            if (enabled) {
                navElement.style.pointerEvents = '';
                navElement.style.opacity = '';
                navElement.classList.remove('navigation-disabled');
            } else {
                navElement.style.pointerEvents = 'none';
                navElement.style.opacity = '0.6';
                navElement.classList.add('navigation-disabled');
            }
        }
    }
    
    /**
     * 加载页面配置
     */
    async loadPagesConfig() {
        try {
            const response = await fetch('pages.json');
            if (!response.ok) throw new Error(`加载页面配置失败: ${response.status}`);
            
            this.state.pagesConfig = await response.json();
            
            // 初始化Router模块映射
            Router.initModules(this.state.pagesConfig);
            
            return this.state.pagesConfig;
        } catch (error) {
            console.error('加载页面配置失败:', error);
            
            // 使用默认配置
            this.state.pagesConfig = {
                pages: [
                    {
                        id: "status",
                        name: "状态",
                        icon: "dashboard",
                        module: "StatusPage",
                        file: "pages/status.js"
                    }
                ],
                defaultPage: "status"
            };
            
            Router.initModules(this.state.pagesConfig);
            return this.state.pagesConfig;
        }
    }
    
    /**
     * 初始化底栏导航
     */
    async initNavigation() {
        if (!this.state.pagesConfig) return;
        
        const navElement = document.getElementById('app-nav');
        if (!navElement) return;
        
        const navContent = document.createElement('div');
        navContent.className = 'nav-content';
        
        // 创建导航项
        for (const page of this.state.pagesConfig.pages) {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.dataset.page = page.id;
            
            if (page.id === this.state.pagesConfig.defaultPage) {
                navItem.classList.add('active');
            }
            
            const iconHtml = await this.renderIcon(page.icon);
            navItem.innerHTML = `
                ${iconHtml}
                <span class="nav-label" data-i18n="${page.i18n_key}">${page.name}</span>
            `;
            
            // 绑定点击事件
            navItem.addEventListener('click', () => {
                Router.navigate(page.id);
            });
            
            navContent.appendChild(navItem);
        }
        
        navElement.appendChild(navContent);
    }
    
    /**
     * 加载页面模块JS文件
     */
    async loadPageModules() {
        if (!this.state.pagesConfig || !this.state.pagesConfig.pages) return;
        
        const loadPromises = this.state.pagesConfig.pages.map(page => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = page.file;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`加载页面模块失败: ${page.file}`));
                document.body.appendChild(script);
            });
        });
        
        try {
            await Promise.allSettled(loadPromises);
        } catch (error) {
            console.error('加载页面模块出错:', error);
        }
    }

    // 执行命令
    async execCommand(command) {
        return await Core.execCommand(command);
    }

    /**
     * 渲染界面内容API
     * 支持模板字符串和数据绑定，动态渲染内容到指定容器
     * @param {string|HTMLElement} container - 容器选择器或DOM元素
     * @param {string} template - 模板字符串
     * @param {Object} data - 绑定数据
     * @param {Object} options - 渲染选项
     * @returns {HTMLElement} 渲染后的容器元素
     */
    renderUI(container, template, data = {}, options = {}) {
        // 获取容器元素
        const containerElement = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!containerElement) {
            console.error('渲染UI失败: 容器不存在', container);
            return null;
        }

        // 默认选项
        const defaultOptions = {
            append: false,        // 是否追加内容
            animate: true,        // 是否使用动画
            processEvents: true,  // 是否处理事件绑定
            clearFirst: !options.append // 如果不是追加模式，默认先清空容器
        };

        const renderOptions = { ...defaultOptions, ...options };

        // 处理模板中的数据绑定 (简单的模板引擎)
        let processedTemplate = template;
        if (data && typeof template === 'string') {
            // 替换 ${key} 形式的变量
            processedTemplate = template.replace(/\${([^}]+)}/g, (match, key) => {
                // 支持简单的表达式计算
                try {
                    // 创建一个带有数据对象属性的上下文
                    const context = Object.assign({}, data, {
                        I18n: window.I18n || { translate: (key, fallback) => fallback }
                    });

                    // 使用Function构造函数创建一个可以访问上下文的函数
                    const keys = Object.keys(context);
                    const values = Object.values(context);
                    const func = new Function(...keys, `return ${key};`);

                    // 执行函数获取结果
                    return func(...values) ?? '';
                } catch (error) {
                    console.warn(`模板表达式解析错误: ${key}`, error);
                    return '';
                }
            });
        }

        // 清空容器或准备追加
        if (renderOptions.clearFirst) {
            containerElement.innerHTML = '';
        }

        // 创建临时容器解析HTML
        const temp = document.createElement('div');
        temp.innerHTML = processedTemplate;

        // 优化动画应用逻辑
        if (renderOptions.animate) {
            const children = Array.from(temp.children);
            // 使用 IntersectionObserver 监测元素可见性，只对可见元素应用动画
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        element.classList.add('fade-in');
                        // 使用 CSS变量控制延迟，避免JavaScript计算
                        element.style.setProperty('--animation-delay',
                            `${(Array.from(element.parentNode.children).indexOf(element) * 0.05)}s`);
                        observer.unobserve(element);
                    }
                });
            }, { threshold: 0.1 });

            children.forEach(child => observer.observe(child));
        }

        // 添加到容器
        if (renderOptions.append) {
            // 逐个添加子节点以保留事件绑定
            while (temp.firstChild) {
                containerElement.appendChild(temp.firstChild);
            }
        } else {
            containerElement.innerHTML = temp.innerHTML;
        }

        // 处理事件绑定
        if (renderOptions.processEvents) {
            this.processEventBindings(containerElement, data);
        }

        return containerElement;
    }

    /**
     * 处理元素中的事件绑定属性
     * 支持 data-on-click="methodName" 形式的声明式事件绑定
     * @param {HTMLElement} element - 要处理的元素
     * @param {Object} context - 事件处理上下文
     */
    processEventBindings(element, context = {}) {
        // 查找所有带有data-on-*属性的元素
        const eventElements = element.querySelectorAll('[data-on-click], [data-on-change], [data-on-input], [data-on-submit]');

        eventElements.forEach(el => {
            // 处理点击事件
            if (el.hasAttribute('data-on-click')) {
                const methodName = el.getAttribute('data-on-click');
                el.addEventListener('click', (event) => {
                    // 查找方法 - 先在上下文中查找，再在当前页面模块中查找
                    const method = context[methodName] ||
                        (window[Router.modules[app.state.currentPage]] &&
                            window[Router.modules[app.state.currentPage]][methodName]);

                    if (typeof method === 'function') {
                        method.call(context, event, el);
                    } else {
                        console.warn(`点击事件处理方法未找到: ${methodName}`);
                    }
                });
            }

            // 处理变更事件
            if (el.hasAttribute('data-on-change')) {
                const methodName = el.getAttribute('data-on-change');
                el.addEventListener('change', (event) => {
                    const method = context[methodName] ||
                        (window[Router.modules[app.state.currentPage]] &&
                            window[Router.modules[app.state.currentPage]][methodName]);

                    if (typeof method === 'function') {
                        method.call(context, event, el);
                    }
                });
            }

            // 处理输入事件
            if (el.hasAttribute('data-on-input')) {
                const methodName = el.getAttribute('data-on-input');
                el.addEventListener('input', (event) => {
                    const method = context[methodName] ||
                        (window[Router.modules[app.state.currentPage]] &&
                            window[Router.modules[app.state.currentPage]][methodName]);

                    if (typeof method === 'function') {
                        method.call(context, event, el);
                    }
                });
            }

            // 处理表单提交事件
            if (el.hasAttribute('data-on-submit')) {
                const methodName = el.getAttribute('data-on-submit');
                el.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const method = context[methodName] ||
                        (window[Router.modules[app.state.currentPage]] &&
                            window[Router.modules[app.state.currentPage]][methodName]);

                    if (typeof method === 'function') {
                        method.call(context, event, el);
                    }
                });
            }
        });
    }


    OpenUrl(url) {
        Core.execCommand(`am start -a android.intent.action.VIEW -d "${url}"`);
    }
}
class PreloadManager {
    static dataCache = new Map();
    static loadingPromises = new Map();

    /**
     * 注册页面数据预加载
     * @param {string} pageName - 页面名称
     * @param {Function} loader - 数据加载函数
     */
    static registerDataLoader(pageName, loader) {
        if (typeof loader !== 'function') return;
        this.loadingPromises.set(pageName, loader);
    }

    /**
     * 预加载页面数据
     * @param {string} pageName - 页面名称
     * @returns {Promise} 加载结果
     */
    static async preloadData(pageName) {
        if (this.dataCache.has(pageName)) return this.dataCache.get(pageName);

        const loader = this.loadingPromises.get(pageName);
        if (!loader) return null;

        try {
            const data = await loader();
            this.dataCache.set(pageName, data);
            return data;
        } catch (error) {
            console.warn(`预加载数据失败: ${pageName}`, error);
            return null;
        }
    }

    /**
     * 获取预加载的数据
     * @param {string} pageName - 页面名称
     * @returns {any} 缓存的数据
     */
    static getData(pageName) {
        return this.dataCache.get(pageName);
    }

    /**
     * 清除页面数据缓存
     * @param {string} pageName - 页面名称
     */
    static clearCache(pageName) {
        this.dataCache.delete(pageName);
    }
}
// 路由管理器
class Router {
    // 页面模块映射
    static modules = {};

    // 页面缓存
    static cache = new Map();
    
    /**
     * 初始化模块映射
     * @param {Object} config - 页面配置对象
     */
    static initModules(config) {
        if (!config || !config.pages) return;
        
        // 清空现有模块映射
        this.modules = {};
        
        // 更新模块映射
        config.pages.forEach(page => {
            this.modules[page.id] = page.module;
        });
    }

    // 获取当前页面
    static getCurrentPage() {
        const hash = window.location.hash.slice(1);
        return this.modules[hash] ? hash : (app.state.pagesConfig?.defaultPage || 'status');
    }
    
    static preloadConfig = {
        batchSize: 2,
        timeout: 2000,
        preloadData: true
    };

    /**
     * 预加载单个页面
     * @param {string} pageName - 页面名称
     */
    static async preloadPage(pageName) {
        if (this.cache.has(pageName)) return;

        const pageModule = window[this.modules[pageName]];
        if (!pageModule) return;

        const tasks = [];

        // 初始化页面模块
        if (pageModule.init && !pageModule._initializing) {
            pageModule._initializing = true;
            tasks.push((async () => {
                try {
                    await pageModule.init();
                    this.cache.set(pageName, pageModule);
                } finally {
                    delete pageModule._initializing;
                }
            })());
        }

        // 预加载页面数据
        if (this.preloadConfig.preloadData && pageModule.preloadData) {
            tasks.push(PreloadManager.preloadData(pageName));
        }

        await Promise.allSettled(tasks);
    }

    static preloadPages() {
        if (!app.state.pagesConfig || !app.state.pagesConfig.pages) return;
        
        const { batchSize, timeout } = this.preloadConfig;
        const currentPage = app.state.currentPage;

        // 获取要加载的页面
        const pagesToLoad = app.state.pagesConfig.pages
            .map(page => page.id)
            .filter(pageId => pageId !== currentPage);

        const preloadBatch = async (startIndex) => {
            const batch = pagesToLoad.slice(startIndex, startIndex + batchSize);
            if (batch.length === 0) return;

            await Promise.allSettled(
                batch.map(page => this.preloadPage(page))
            );

            if (startIndex + batchSize < pagesToLoad.length) {
                requestIdleCallback(
                    () => preloadBatch(startIndex + batchSize),
                    { timeout }
                );
            }
        };

        requestIdleCallback(() => preloadBatch(0), { timeout });
    }

    /**
     * 导航到指定页面
     * @param {string} pageName - 页面名称
     * @param {boolean} updateHistory - 是否更新历史记录
     * @param {boolean} isInitialLoad - 是否是首次加载
     */
    // app.js - 修改 Router.navigate 方法中的检查逻辑

    static async navigate(pageName, updateHistory = true, isInitialLoad = false) {
        try {
            // 检查状态页面就绪状态，阻止非状态页面的导航（但允许初始加载）
            if (!app.state.isStatusPageReady && pageName !== 'status' && !isInitialLoad) {
                console.log('状态页面未就绪，阻止导航到其他页面');
                Core.showToast('请等待状态页面加载完成', 'warning');
                return;
            }
            
            // 如果是初始加载状态页面，立即标记为就绪
            if (isInitialLoad && pageName === 'status') {
                app.state.isStatusPageReady = true;
            }
            
            if (app.state.currentPage === pageName && !isInitialLoad) return;

            // 禁用导航栏
            app.setNavigationEnabled(false);

            // 获取当前UI元素
            const headerTitle = document.querySelector('.header-title');
            const pageActions = document.querySelector('.page-actions');
            const oldContainer = document.querySelector('.page-container');

            // 创建新容器
            const newContainer = document.createElement('div');
            newContainer.className = 'page-container';
            newContainer.style.opacity = '0';

            // 添加淡出动画，但不等待它完成
            if (headerTitle) {
                headerTitle.classList.remove('fade-in');
                headerTitle.classList.add('fade-out');
            }
            if (pageActions) {
                pageActions.classList.remove('fade-in');
                pageActions.classList.add('fade-out');
            }

            // 立即更新UI状态，不阻塞
            UI.updateNavigation(pageName);
            UI.updatePageTitle(pageName);

            // 处理旧页面的deactivate - 强制关闭所有模态窗口和弹窗
            if (app.state.currentPage) {
                const currentPageModule = this.cache.get(app.state.currentPage) ||
                    window[this.modules[app.state.currentPage]];
                    
                // 强制关闭任何打开的模态窗口
                this.forceCloseModals();
                
                if (currentPageModule?.onDeactivate) {
                    // 等待页面清理完成
                    await currentPageModule.onDeactivate();
                }
            }

            // 加载新页面模块
            let pageModule;
            if (this.cache.has(pageName) && this.cache.get(pageName)) {
                pageModule = this.cache.get(pageName);
            } else {
                pageModule = window[this.modules[pageName]];
                if (!pageModule) throw new Error(`页面模块 ${pageName} 未找到`);

                // 添加初始化锁定
                if (!pageModule._initializing && typeof pageModule.init === 'function') {
                    pageModule._initializing = true;
                    try {
                        const initResult = await pageModule.init();
                        if (initResult === false) {
                            throw new Error(`页面 ${pageName} 初始化失败`);
                        }
                        this.cache.set(pageName, pageModule);
                    } finally {
                        delete pageModule._initializing;
                    }
                }
            }

            // 渲染页面内容
            newContainer.innerHTML = pageModule.render();

            // 直接移除旧容器
            if (oldContainer) {
                oldContainer.remove();
            }

            // 添加新容器
            document.getElementById('main-content').appendChild(newContainer);

            // 执行渲染后回调
            if (pageModule.afterRender) {
                await pageModule.afterRender();
            }

            // 显示新容器并添加滑入动画
            newContainer.style.opacity = '';
            requestAnimationFrame(() => {
                newContainer.classList.add('slide-in');
            });

            // 执行激活方法
            if (pageModule.onActivate) {
                await pageModule.onActivate();
            }

            // 更新页面操作按钮
            UI.updatePageActions(pageName);

            // 获取新的UI元素并添加淡入动画
            const newHeaderTitle = document.querySelector('.header-title');
            const newPageActions = document.querySelector('.page-actions');

            // 使用 requestAnimationFrame 确保在下一帧添加动画
            requestAnimationFrame(() => {
                if (newHeaderTitle) {
                    newHeaderTitle.classList.remove('fade-out');
                    newHeaderTitle.classList.add('fade-in');
                }
                if (newPageActions) {
                    newPageActions.classList.remove('fade-out');
                    newPageActions.classList.add('fade-in');
                }
                // 显示新容器
                newContainer.style.opacity = '';
                requestAnimationFrame(() => {
                    newContainer.classList.add('slide-in');
                });
            });

            // 更新历史记录
            if (updateHistory) {
                window.history.pushState(null, '', `#${pageName}`);
            }

            app.state.currentPage = pageName;

        } catch (error) {
            console.error('页面导航错误:', error);
            UI.showError('页面加载失败', error.message);
        } finally {
            // 重新启用导航栏（如果是状态页面或者状态页面已就绪）
            if (app.state.isStatusPageReady || pageName === 'status') {
                app.setNavigationEnabled(true);
            }
            
            // 控制语言和主题切换按钮的显示/隐藏
            const themeToggle = document.getElementById('theme-toggle');
            const languageButton = document.getElementById('language-button');
            if (pageName === 'status') {
                // 主页面显示按钮
                if (themeToggle) themeToggle.style.display = '';
                if (languageButton) languageButton.style.display = '';
            } else {
                // 非主页面隐藏按钮
                if (themeToggle) themeToggle.style.display = 'none';
                if (languageButton) languageButton.style.display = 'none';
            }
        }
    }
    
    /**
     * 强制关闭所有模态窗口
     * 用于在页面切换时确保所有模态窗口都被关闭
     */
    static forceCloseModals() {
        // 关闭所有玻璃窗口覆盖层
        const overlays = document.querySelectorAll('.glass-overlay');
        overlays.forEach(overlay => {
            overlay.style.display = 'none';
        });
        
        // 关闭所有玻璃窗口
        const glassWindows = document.querySelectorAll('.glass-window');
        glassWindows.forEach(window => {
            window.style.display = 'none';
        });
        
        // 关闭文件选择器
        const filePickers = document.querySelectorAll('.file-selector');
        filePickers.forEach(picker => {
            picker.style.display = 'none';
        });
        
        // 关闭确认对话框
        const confirmDialogs = document.querySelectorAll('.confirm-dialog');
        confirmDialogs.forEach(dialog => {
            dialog.style.display = 'none';
        });
        
        // 关闭日历
        const calendars = document.querySelectorAll('.calendar-popup');
        calendars.forEach(calendar => {
            calendar.style.display = 'none';
        });
    }

}


// UI管理器
class UI {
    // UI元素引用
    static elements = {
        app: document.getElementById('app'),
        header: document.querySelector('.app-header'),
        mainContent: document.getElementById('main-content'),
        navContent: document.querySelector('.nav-content'),
        pageTitle: document.getElementById('page-title'),
        pageActions: document.getElementById('page-actions'),
        themeToggle: document.getElementById('theme-toggle'),
        languageButton: document.getElementById('language-button'),
        toastContainer: document.getElementById('toast-container'),
        appNav: document.getElementById('app-nav')
    };

    // 更新页面标题
    static updatePageTitle(pageName) {
        if (!app.state.pagesConfig || !app.state.pagesConfig.pages) return;
        
        // 查找页面配置
        const pageConfig = app.state.pagesConfig.pages.find(p => p.id === pageName);
        if (!pageConfig) return;
        
        const title = pageConfig.i18n_key 
            ? I18n.translate(pageConfig.i18n_key, pageConfig.name)
            : pageConfig.name;

        this.elements.pageTitle.textContent = title || 'AMMF WebUI';
    }
    
    // 渲染SVG图标
    static async renderIcon(iconName) {
        try {
            const svg = await svgIcons.loadIcon(iconName);
            return svg;
        } catch (error) {
            console.error(`Failed to render icon: ${iconName}`, error);
            return `<span class="material-symbols-rounded">${iconName}</span>`;
        }
    }
    
    static pageActions = new Map();
    static activeActions = new Set();

    /**
     * 注册页面操作按钮
     * @param {string} pageName - 页面名称
     * @param {Array<Object>} actions - 操作按钮配置数组
     */
    static registerPageActions(pageName, actions) {
        // 验证按钮配置
        const validActions = actions.filter(action => {
            if (!action.id || !action.icon) {
                console.warn(`操作按钮配置无效: ${JSON.stringify(action)}`);
                return false;
            }
            return true;
        });

        this.pageActions.set(pageName, validActions);

        // 如果是当前页面，立即更新按钮
        if (app.state.currentPage === pageName) {
            this.updatePageActions(pageName);
        }
    }

    /**
     * 更新页面操作按钮
     * @param {string} pageName - 页面名称
     */
    static async updatePageActions(pageName) {
        const actionsContainer = this.elements.pageActions;
        if (!actionsContainer) return;

        // 清理之前的事件监听器
        this.activeActions.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.replaceWith(button.cloneNode(true));
            }
        });
        this.activeActions.clear();

        const actions = this.pageActions.get(pageName) || [];
        const actionElements = [];
        
        for (const action of actions) {
            const button = document.createElement('button');
            button.id = action.id;
            button.className = `icon-button ${action.disabled?.() ? 'disabled' : ''}`;
            button.title = action.title;
            
            try {
                const iconHtml = await this.renderIcon(action.icon);
                button.innerHTML = iconHtml;
            } catch (error) {
                console.error(`Failed to render action icon: ${action.icon}`, error);
                button.innerHTML = `<span class="material-symbols-rounded">${action.icon}</span>`;
            }
            
            actionElements.push(button);
        }
        
        actionsContainer.innerHTML = '';
        actionElements.forEach(button => actionsContainer.appendChild(button));

        // 绑定事件
        actions.forEach(action => {
            const button = document.getElementById(action.id);
            if (button && action.onClick) {
                this.activeActions.add(action.id);
                button.addEventListener('click', () => {
                    if (!action.disabled?.()) {
                        action.onClick();
                    }
                });

                // 如果有禁用状态检查函数，添加定期检查
                if (action.disabled) {
                    const updateDisabled = () => {
                        const isDisabled = action.disabled();
                        button.classList.toggle('disabled', isDisabled);
                    };
                    updateDisabled(); // 初始检查
                    // 添加到更新队列
                    if (this.buttonStateInterval) {
                        clearInterval(this.buttonStateInterval);
                    }
                    this.buttonStateInterval = setInterval(updateDisabled, 1000);
                }
            }
        });
    }

    /**
     * 显示浮层
     * @param {HTMLElement} element - 要显示的浮层元素
     */
    static showOverlay(element) {
        if (!element) return;
        element.classList.add('active');
    }
    
    /**
     * 隐藏浮层
     * @param {HTMLElement} element - 要隐藏的浮层元素
     */
    static hideOverlay(element) {
        if (!element) return;
        element.classList.remove('active');
    }

    /**
     * 清理页面操作按钮
     * @param {string} [pageName] - 页面名称，可选。如果不提供，则只清理当前活动的按钮
     */
    static clearPageActions(pageName) {
        // 清理事件监听器
        this.activeActions.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.replaceWith(button.cloneNode(true));
            }
        });
        this.activeActions.clear();

        // 清理状态更新定时器
        if (this.buttonStateInterval) {
            clearInterval(this.buttonStateInterval);
            this.buttonStateInterval = null;
        }

        // 清空按钮容器
        const actionsContainer = this.elements.pageActions;
        if (actionsContainer) {
            actionsContainer.innerHTML = '';
        }

        // 移除页面按钮配置
        if (pageName) {
            this.pageActions.delete(pageName);
        }
    }

    // 显示错误信息
    static showError(title, message) {
        this.elements.mainContent.innerHTML = `
            <div class="page-container">
                <div class="error-container">
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    // 更新导航状态
    static updateNavigation(pageName) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            // 移除之前的动画类
            item.classList.remove('nav-entering', 'nav-exiting');

            if (item.dataset.page === pageName) {
                // 如果之前未激活,添加进入动画
                if (!item.classList.contains('active')) {
                    item.classList.add('nav-entering');
                }
                item.classList.add('active');
            } else {
                // 如果之前已激活,添加退出动画
                if (item.classList.contains('active')) {
                    item.classList.add('nav-exiting');
                }
                item.classList.remove('active');
            }
        });
    }

    static updateLayout() {
        const isLandscape = window.innerWidth >= 768;
        const header = this.elements.header;
        const pageActions = this.elements.pageActions;
        const themeToggle = this.elements.themeToggle;
        const languageButton = this.elements.languageButton;
        const appNav = this.elements.appNav;

        if (isLandscape) {
            // 横屏模式：移动按钮到侧栏
            if (appNav) {
                const navContent = appNav.querySelector('.nav-content');
                if (navContent) {
                    // 确保存在或创建操作按钮容器
                    let pageActionsContainer = navContent.querySelector('.page-actions');
                    if (!pageActionsContainer) {
                        pageActionsContainer = document.createElement('div');
                        pageActionsContainer.className = 'page-actions';
                        navContent.appendChild(pageActionsContainer);
                    }

                    // 确保存在或创建系统按钮容器
                    let systemActionsContainer = navContent.querySelector('.system-actions');
                    if (!systemActionsContainer) {
                        systemActionsContainer = document.createElement('div');
                        systemActionsContainer.className = 'system-actions';
                        navContent.appendChild(systemActionsContainer);
                    }

                    // 移动操作按钮
                    if (pageActions && !pageActionsContainer.contains(pageActions)) {
                        pageActionsContainer.appendChild(pageActions);
                    }

                    // 移动系统按钮
                    if (languageButton && !systemActionsContainer.contains(languageButton)) {
                        systemActionsContainer.appendChild(languageButton);
                    }
                    if (themeToggle && !systemActionsContainer.contains(themeToggle)) {
                        systemActionsContainer.appendChild(themeToggle);
                    }
                }
            }
        } else {
            // 竖屏模式：恢复按钮到顶栏
            const headerActions = header?.querySelector('.header-actions');
            if (headerActions) {
                if (pageActions && !headerActions.contains(pageActions)) {
                    headerActions.insertBefore(pageActions, headerActions.firstChild);
                }
                if (languageButton && !headerActions.contains(languageButton)) {
                    headerActions.appendChild(languageButton);
                }
                if (themeToggle && !headerActions.contains(themeToggle)) {
                    headerActions.appendChild(themeToggle);
                }
            }
        }
    }

    static updateHeaderTransparency() {
        const header = this.elements.header;
        const mainContent = this.elements.mainContent;
        const nav = document.querySelector('.app-nav');
        if (!header || !mainContent || !nav) return;

        const isLandscape = window.innerWidth >= 768;
        const scrollTop = mainContent.scrollTop;
        const headerHeight = header.offsetHeight;
        const contentHeight = mainContent.scrollHeight;
        const viewportHeight = mainContent.clientHeight;

        // 跟踪上次滚动位置
        if (!this.lastScrollPosition) {
            this.lastScrollPosition = scrollTop;
        }

        // 计算滚动方向 (1=向下, -1=向上)
        const scrollDirection = scrollTop > this.lastScrollPosition ? 1 : -1;
        this.lastScrollPosition = scrollTop;

        // 当滚动超过顶栏高度时显示背景
        if (scrollTop > headerHeight) {
            header.classList.add('header-solid');

            // 竖屏模式下根据滚动方向显示/隐藏底栏
            if (!isLandscape) {
                // 向下滚动时显示底栏
                if (scrollDirection === -1) {
                    nav.classList.remove('hidden');
                    nav.classList.add('visible');
                }
                // 向上滚动时隐藏底栏
                else if (scrollDirection === 1 && scrollTop > headerHeight * 1.5) {
                    nav.classList.remove('visible');
                    nav.classList.add('hidden');
                }
            }
        } else {
            header.classList.remove('header-solid');
            // 顶部区域总是显示底栏
            nav.classList.remove('hidden');
            nav.classList.add('visible');
        }
    }
}
// 初始化应用
const app = new App();

// 绑定事件监听器
window.addEventListener('DOMContentLoaded', () => {
    // 绑定主题切换按钮点击事件
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (window.ThemeManager?.toggleTheme) {
                window.ThemeManager.toggleTheme();
            }
        });
    }

    // 绑定语言切换按钮点击事件
    const languageButton = document.getElementById('language-button');
    if (languageButton) {
        languageButton.addEventListener('click', () => {
            const languageSelector = document.querySelector('.language-selector');
            if (languageSelector) {
                UI.showOverlay(languageSelector);
            }
        });
    }

    // 绑定取消语言选择按钮点击事件
    const cancelLanguage = document.getElementById('cancel-language');
    if (cancelLanguage) {
        cancelLanguage.addEventListener('click', () => {
            const languageSelector = document.querySelector('.language-selector');
            if (languageSelector) {
                UI.hideOverlay(languageSelector);
            }
        });
    }
    
    // 添加滚动监听
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            UI.updateHeaderTransparency();
        });
    }

    // 初始化顶栏状态
    UI.updateHeaderTransparency();

    // 绑定窗口大小变化事件
    window.addEventListener('resize', () => {
        UI.updateLayout();
    });

    // 绑定历史记录变化事件
    window.addEventListener('popstate', () => {
        const pageName = Router.getCurrentPage();
        Router.navigate(pageName, false);
    });

    // 初始化布局
    UI.updateLayout();

    // 初始化应用
    app.init().catch(error => {
        console.error('应用初始化失败:', error);
        UI.showError('应用初始化失败', error.message);
    });
});

// 导出全局API
window.app = {
    init: () => app.init(),
    execCommand: (command) => app.execCommand(command),
    loadPage: (pageName) => Router.navigate(pageName),
    o: (command) => app.execCommand(command),
    
    // 添加新页面注册API
    registerPage: (pageConfig) => {
        if (!app.state.pagesConfig) return false;
        
        // 检查参数完整性
        if (!pageConfig.id || !pageConfig.name || !pageConfig.module || !pageConfig.file) {
            console.error('注册页面失败: 配置不完整', pageConfig);
            return false;
        }
        
        // 添加到配置
        app.state.pagesConfig.pages.push(pageConfig);
        
        // 更新Router模块映射
        Router.initModules(app.state.pagesConfig);
        
        // 若底栏已加载，需要更新导航
        app.initNavigation();
        
        // 加载页面模块JS
        const script = document.createElement('script');
        script.src = pageConfig.file;
        document.body.appendChild(script);
        
        return true;
    }
};