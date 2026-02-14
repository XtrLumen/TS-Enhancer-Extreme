class SVGIconSystem {
    constructor() {
        this.icons = new Map();
        this.loading = new Map();
    }

    async loadIcon(name) {
        if (this.icons.has(name)) {
            return this.icons.get(name);
        }

        if (this.loading.has(name)) {
            return this.loading.get(name);
        }

        const promise = fetch(`svg/${name}.svg`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load icon: ${name}`);
                }
                return response.text();
            })
            .then(svg => {
                // 解析SVG并修改属性
                const parser = new DOMParser();
                const doc = parser.parseFromString(svg, 'image/svg+xml');
                const svgElement = doc.querySelector('svg');
                
                if (svgElement) {
                    // 设置尺寸为24px
                    svgElement.setAttribute('width', '24');
                    svgElement.setAttribute('height', '24');
                    
                    // 设置填充颜色为currentColor，继承父元素颜色
                    svgElement.setAttribute('fill', 'currentColor');
                    
                    // 移除内联样式中的尺寸设置
                    svgElement.removeAttribute('style');
                    
                    // 确保保留原始viewBox以正确缩放
                    if (!svgElement.getAttribute('viewBox')) {
                        svgElement.setAttribute('viewBox', '0 0 1024 1024');
                    }
                    
                    // 更新所有path元素的fill属性
                    const paths = svgElement.querySelectorAll('path');
                    paths.forEach(path => {
                        path.setAttribute('fill', 'currentColor');
                    });
                    
                    svg = svgElement.outerHTML;
                }
                
                this.icons.set(name, svg);
                this.loading.delete(name);
                return svg;
            })
            .catch(error => {
                console.error(`Error loading icon ${name}:`, error);
                this.loading.delete(name);
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
            });

        this.loading.set(name, promise);
        return promise;
    }

    async renderIcon(name, className = '') {
        const svg = await this.loadIcon(name);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');
        
        if (svgElement) {
            if (className) {
                const existingClass = svgElement.getAttribute('class') || '';
                svgElement.setAttribute('class', `${existingClass} ${className}`.trim());
            }
            return svgElement.outerHTML;
        }
        
        return '';
    }

    createIconElement(name, className = '') {
        const container = document.createElement('span');
        container.className = className;
        
        this.loadIcon(name).then(svg => {
            container.innerHTML = svg;
        });
        
        return container;
    }
}

const svgIcons = new SVGIconSystem();
