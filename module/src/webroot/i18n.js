/**
 * AMMF WebUI 国际化模块
 * 提供多语言支持功能
 */

const I18n = {
    currentLang: 'zh',
    supportedLangs: ['zh', 'en', 'ru'],
    translations: {
        zh: {},
        en: {},
        ru: {}
    },
    // 模块扩展翻译
    moduleTranslations: {
        zh: {},
        en: {},
        ru: {}
    },
    // 添加语言切换处理器集合
    languageChangeHandlers: new Set(),

    async init() {
        try {
            console.log('开始初始化语言模块...');
            await this.loadTranslations();
            // 加载模块翻译文件
            await this.loadModuleTranslations();
            await this.determineInitialLanguage();
            this.applyTranslations();
            this.initLanguageSelector();
            this.observeDOMChanges();
            console.log(`语言模块初始化完成: ${this.currentLang}`);
            return true;
        } catch (error) {
            console.error('初始化语言模块失败:', error);
            this.currentLang = 'zh';
            return false;
        }
    },

    // 从App类移植的方法：注册语言切换处理器
    registerLanguageChangeHandler(handler) {
        if (typeof handler === 'function') {
            this.languageChangeHandlers.add(handler);
        }
    },

    // 从App类移植的方法：注销语言切换处理器
    unregisterLanguageChangeHandler(handler) {
        this.languageChangeHandlers.delete(handler);
    },

    // 通用防抖函数
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    async loadTranslations() {
        try {
            // 加载每种语言的翻译文件
            const loadPromises = this.supportedLangs.map(async lang => {
                try {
                    const response = await fetch(`translations/${lang}.json`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const translations = await response.json();
                    // 验证加载的翻译数据
                    if (typeof translations === 'object' && Object.keys(translations).length > 0) {
                        this.translations[lang] = translations;
                        console.log(`成功加载${lang}语言文件，包含 ${Object.keys(translations).length} 个翻译项`);
                    } else {
                        throw new Error(`${lang}语言文件格式无效`);
                    }
                } catch (error) {
                    console.error(`加载${lang}语言文件失败:`, error);
                    // 如果是中文翻译加载失败，使用基础翻译
                    if (lang === 'zh') {
                        this.translations.zh = this.getBaseTranslations();
                    }
                }
            });

            await Promise.all(loadPromises);

            // 验证所有语言是否都有基本的翻译内容
            this.supportedLangs.forEach(lang => {
                if (!this.translations[lang] || Object.keys(this.translations[lang]).length === 0) {
                    console.warn(`${lang}语言翻译内容为空，使用基础翻译`);
                    this.translations[lang] = this.getBaseTranslations();
                }
            });
        } catch (error) {
            console.error('加载翻译文件失败:', error);
            // 确保至少有基础的中文翻译
            this.translations.zh = this.getBaseTranslations();
        }
    },

    // 新增：加载模块扩展翻译
    async loadModuleTranslations() {
        try {
            console.log('开始加载模块扩展翻译...');
            // 加载每种语言的模块翻译文件
            const loadPromises = this.supportedLangs.map(async lang => {
                try {
                    const response = await fetch(`translations/module/${lang}.json`);
                    // 如果文件不存在，静默失败
                    if (response.status === 404) {
                        console.log(`模块翻译文件不存在: translations/module/${lang}.json`);
                        return;
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const moduleTranslations = await response.json();
                    
                    // 验证加载的翻译数据
                    if (typeof moduleTranslations === 'object' && Object.keys(moduleTranslations).length > 0) {
                        // 存储模块翻译
                        this.moduleTranslations[lang] = moduleTranslations;
                        
                        // 将模块翻译合并到主翻译中（模块翻译优先级低于主翻译）
                        this.translations[lang] = {
                            ...moduleTranslations,
                            ...this.translations[lang]  // 主翻译覆盖同名的模块翻译
                        };
                        
                        console.log(`成功加载${lang}模块翻译文件，包含 ${Object.keys(moduleTranslations).length} 个翻译项`);
                    } else {
                        console.warn(`${lang}模块翻译文件格式无效或为空`);
                    }
                } catch (error) {
                    // 模块翻译加载失败不影响主程序运行
                    console.warn(`加载${lang}模块翻译文件失败:`, error.message);
                }
            });

            await Promise.all(loadPromises);
            console.log('模块扩展翻译加载完成');
        } catch (error) {
            console.warn('加载模块翻译文件失败:', error.message);
        }
    },

    async determineInitialLanguage() {
        try {
            const savedLang = localStorage.getItem('currentLanguage');
            if (savedLang && this.supportedLangs.includes(savedLang)) {
                this.currentLang = savedLang;
                return;
            }
            const browserLang = navigator.language.split('-')[0];
            if (this.supportedLangs.includes(browserLang)) {
                this.currentLang = browserLang;
                localStorage.setItem('currentLanguage', this.currentLang);
                return;
            }
            console.log(`使用默认语言: ${this.currentLang}`);
        } catch (error) {
            console.error('确定初始语言失败:', error);
        }
    },

    applyTranslations() {
        // 处理带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.translate(key);
            if (translation) {
                el.textContent = translation;
            }
        });

        // 处理带有 data-i18n-placeholder 属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.translate(key);
            if (translation) {
                el.setAttribute('placeholder', translation);
            }
        });

        // 处理带有 data-i18n-title 属性的元素
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.translate(key);
            if (translation) {
                el.setAttribute('title', translation);
            }
        });

        // 处理带有 data-i18n-label 属性的元素
        const labelElements = document.querySelectorAll('[data-i18n-label]');
        labelElements.forEach(el => {
            const key = el.getAttribute('data-i18n-label');
            const translation = this.translate(key);
            if (translation && el.querySelector('.switch-label')) {
                el.querySelector('.switch-label').textContent = translation;
            }
        });
    },

    translate(key, defaultText = '') {
        if (!key) return defaultText;

        // 支持参数替换，例如：translate('HELLO', '你好 {name}', {name: '张三'})
        if (arguments.length > 2 && typeof arguments[2] === 'object') {
            let text = this.translations[this.currentLang][key] || defaultText || key;
            const params = arguments[2];

            for (const param in params) {
                if (Object.prototype.hasOwnProperty.call(params, param)) {
                    text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
                }
            }

            return text;
        }

        return this.translations[this.currentLang][key] || defaultText || key;
    },

    // 优化后的关闭语言选择器方法
    closeLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector || selector.classList.contains('closing')) return;

        // 添加关闭动画类
        selector.classList.add('closing');
        
        // 获取选择器内容元素并添加关闭动画类
        const content = selector.querySelector('.language-selector-content');
        if (content) {
            content.classList.add('closing');
        }

        // 使用单一setTimeout，等待动画完成后再移除类
        setTimeout(() => {
            selector.classList.remove('active');
            selector.classList.remove('closing');
            if (content) {
                content.classList.remove('closing');
            }
        }, 200); // 与CSS动画时间匹配
    },

    // 优化后的语言选择器初始化方法
    initLanguageSelector() {
        const languageButton = document.getElementById('language-button');
        if (!languageButton) {
            console.error('找不到语言选择器按钮');
            return;
        }

        // 使用已有的语言选择器容器
        const languageSelector = document.getElementById('language-selector');
        if (!languageSelector) {
            console.error('找不到语言选择器容器');
            return;
        }

        // 获取内容区域元素
        const content = languageSelector.querySelector('.language-selector-content');
        if (!content) {
            console.error('找不到语言选择器内容区域');
            return;
        }

        // 阻止内容区域的点击事件冒泡
        content.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // 设置语言按钮点击事件
        languageButton.addEventListener('click', () => {
            // 使用UI类的方法显示覆盖层
            if (window.UI && window.UI.showOverlay) {
                window.UI.showOverlay(languageSelector);
            } else {
                languageSelector.classList.add('active');
            }
        });

        // 添加点击遮罩关闭功能
        languageSelector.addEventListener('click', (event) => {
            // 确保点击的是遮罩层而不是内容区域或其子元素
            if (event.target === languageSelector && !event.target.closest('.language-selector-content')) {
                this.closeLanguageSelector();
            }
        });

        // 设置取消按钮点击事件
        const cancelButton = document.getElementById('cancel-language');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.closeLanguageSelector();
            });
        }

        // 更新语言选项
        this.updateLanguageSelector();
    },

    updateLanguageSelector() {
        const languageOptions = document.getElementById('language-options');
        if (!languageOptions) return;

        languageOptions.innerHTML = '';

        this.supportedLangs.forEach(lang => {
            const option = document.createElement('div');
            option.className = `language-option ${lang === this.currentLang ? 'selected' : ''}`;
            option.setAttribute('data-lang', lang);

            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'language';
            radioInput.id = `lang-${lang}`;
            radioInput.value = lang;
            radioInput.checked = lang === this.currentLang;
            radioInput.className = 'md-radio';

            const label = document.createElement('label');
            label.htmlFor = `lang-${lang}`;
            label.textContent = this.getLanguageDisplayName(lang);

            option.appendChild(radioInput);
            option.appendChild(label);

            option.addEventListener('click', async () => {
                // 如果点击的是当前语言，只关闭选择器
                if (lang === this.currentLang) {
                    this.closeLanguageSelector();
                    return;
                }

                // 先关闭语言选择器，然后再切换语言
                this.closeLanguageSelector();

                // 切换语言
                if (lang !== this.currentLang) {
                await this.setLanguage(lang);
                    this.updateLanguageSelector();
                }
            });

            languageOptions.appendChild(option);
        });
    },

    // 优化后的语言切换方法
    async setLanguage(lang) {
        if (!this.supportedLangs.includes(lang)) {
            console.warn(`不支持的语言: ${lang}`);
            return false;
        }

        if (this.currentLang === lang) {
            console.log(`已经是当前语言: ${lang}`);
            return true;
        }

        this.currentLang = lang;
        localStorage.setItem('currentLanguage', lang);

        // 应用翻译
        this.applyTranslations();

        // 触发语言变化事件
        this.notifyLanguageChange(lang);

        console.log(`语言已切换为: ${lang}`);
        return true;
    },

    // 新增：通知所有语言变化处理器
    notifyLanguageChange(lang) {
        // 创建并分发自定义事件
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));

        // 使用防抖函数通知所有注册的处理器
        const debouncedNotify = this.debounce(() => {
            // 通知所有注册的处理器
            this.languageChangeHandlers.forEach(handler => {
                try {
                    handler(lang);
                } catch (error) {
                    console.error('Language change handler failed:', error);
                }
            });
        }, 100);

        debouncedNotify();
    },

    getLanguageDisplayName(lang) {
        switch (lang) {
            case 'zh': return '中文';
            case 'en': return 'English';
            case 'ru': return 'Русский';
            default: return lang.toUpperCase();
        }
    },

    // 优化后的DOM变化观察方法
    observeDOMChanges() {
        // 使用防抖函数减少频繁调用
        const debouncedApplyTranslations = this.debounce(() => {
            this.applyTranslations();
        }, 50);

        // 使用 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver((mutations) => {
            let shouldApply = false;

            // 检查是否有新增的需要翻译的元素
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查新增元素或其子元素是否包含需要翻译的属性
                            if (
                                node.hasAttribute && (
                                    node.hasAttribute('data-i18n') ||
                                    node.hasAttribute('data-i18n-placeholder') ||
                                    node.hasAttribute('data-i18n-title') ||
                                    node.hasAttribute('data-i18n-label') ||
                                    node.querySelector('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-label]')
                                )
                            ) {
                                shouldApply = true;
                                break;
                            }
                        }
                    }
                }

                if (shouldApply) break;
            }

            // 如果有需要翻译的元素，应用翻译
            if (shouldApply) {
                debouncedApplyTranslations();
            }
        });

        // 配置观察选项
        const config = {
            childList: true,
            subtree: true
        };

        // 开始观察 document.body
        observer.observe(document.body, config);

        // 监听页面变化事件
        document.addEventListener('pageChanged', () => {
            // 使用 requestAnimationFrame 确保在下一帧渲染前应用翻译
            requestAnimationFrame(() => this.applyTranslations());
        });
    },

    // 基础翻译（如果翻译文件加载失败时使用）
    getBaseTranslations() {
        return {
        };
    }
};

// 导出 I18n 模块
window.I18n = I18n;