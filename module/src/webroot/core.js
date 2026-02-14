/**
 * AMMF WebUI 核心功能模块
 * 提供Shell命令执行能力
 */

const Core = {
    // 模块路径
    MODULE_PATH: '/data/adb/modules/ts_enhancer_extreme/',

    // 执行Shell命令
    // core.js - 修改 execCommand 方法
async execCommand(command, timeout = 10000) {
    const callbackName = `exec_callback_${Date.now()}`;
    return new Promise((resolve, reject) => {
        let timeoutId;
        
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                delete window[callbackName];
                reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
            }, timeout);
        }
        
        window[callbackName] = (errno, stdout, stderr) => {
            if (timeoutId) clearTimeout(timeoutId);
            delete window[callbackName];
            // 合并stdout和stderr，确保返回完整输出
            const fullOutput = stdout + (stderr ? `\n\n错误输出:\n${stderr}` : '');
            errno === 0 ? resolve(fullOutput) : reject(fullOutput);
        };
        
        try {
            ksu.exec(command, "{}", callbackName);
        } catch (e) {
            if (timeoutId) clearTimeout(timeoutId);
            delete window[callbackName];
            reject(e);
        }
    });
},
    /**
     * 显示Toast消息
     * @param {string} message - 要显示的消息文本
     * @param {string} type - 消息类型 ('info', 'success', 'warning', 'error')
     * @param {number} duration - 消息显示时长 (毫秒)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');

            setTimeout(() => {
                if (toast.parentElement === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 150);
        }, duration);
    },

    /**
     * DOM 就绪检查
     * @param {function} callback - DOM 就绪后执行的回调函数
     */
    onDOMReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    },

    /**
     * 加载模块信息
     * @returns {Promise<Object>} 模块信息对象
     */
    async loadModuleInfo() {
        try {
            // 检查是否有缓存的模块信息
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                console.log('从缓存加载模块信息');
                return JSON.parse(cachedInfo);
            }

            // 尝试从配置文件获取模块信息
            const configOutput = await this.execCommand(`cat "${this.MODULE_PATH}module.prop"`);

            if (configOutput) {
                // 解析配置文件
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

                // 缓存模块信息
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                console.log('模块信息加载成功:', config);
                return config;
            } else {
                console.warn('无法读取模块配置文件');
                return {};
            }
        } catch (error) {
            console.error('加载模块信息失败:', error);
            return {};
        }
    }
};

// 导出核心模块到全局作用域
window.Core = Core;
