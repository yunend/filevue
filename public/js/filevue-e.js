class FileVue {
    // 处理文件点击
    handleFileClick(item) {
        // 获取文件扩展名
        const extension = item.name.split('.').pop().toLowerCase();
        // 根据文件类型处理
        switch (extension) {
            case 'ggb':
                // 将路径中的反斜杠替换为正斜杠
                //const normalizedPath = item.path.replace(/\\/g, '/');
                // 打开ggb编辑器页面
                //alert(normalizedPath);
                window.open(`${this.root}/ggb/ggbVue.html?path=${encodeURIComponent(item.path)}`, '_ggb');
                break;
            // 可以继续添加其他文件类型的处理
            default:
                // 默认处理方式：打开文件链接
                window.open(`${item.path}`, '_blank');
            // window.location.href = `/${item.path}`;
        }
    }
    constructor() {
        this.currentPath = '/';
        //this.root路径规范：使用绝对路径，开头使用/,结尾不能带/,中间不能使用\
        this.root="/D:/dockImage/test/github/fileVue/public"
        this.sortState = {
            byName: 'asc', // 修改：初始值为'asc'，表示默认按名称升序排列
            byDate: null  // 修改：初始值为null
        };
        // 添加配置选项
        this.config = {
            showHeader: true,    // 是否显示fileListHeader
            showDate: true,      // 是否显示文件日期
            showDownload: true,   // 是否显示“下载”链接
            initialPath: '/'     // 初始化时加载的目录
        };
        this.currentData = []; // 用于存储当前目录数据
    }

    // 初始化文件浏览器
    init() {
        // 加载初始目录
        if (this.config.initialPath) {
            this.currentPath = this.config.initialPath;
        }
        this.loadDirectory(this.currentPath);
    }

// 获取文件与目录
/*
{
    "results": [
        {
            "type": "folder",
            "name": "data",
            "size": "",
            "date_modified": "133864886659797477"
        },
        {
            "type": "file",
            "name": "mc.exe",
            "size": "30128128",
            "date_modified": "133864885421736421"
        },
        {
            "type": "file",
            "name": "minio.exe",
            "size": "119406592",
            "date_modified": "133864882104959110"
        }
    ]
}​

将上面的JSON数据转换为以下格式：
[
    {
        "name": "GeoGebra",
        "type": "directory",
        "path": "/ggb/GeoGebra",
        "mtime": "2025-03-09T05:37:12.354Z"
    },
    {
        "name": "ggb-editor.html",
        "type": "file",
        "path": "/ggb/ggb-editor.html",
        "mtime": "2025-04-10T08:44:10.813Z"
    },
    {
        "name": "ggbResources",
        "type": "directory",
        "path": "/ggb/ggbResources",
        "mtime": "2025-04-09T09:18:14.101Z"
    }
]
*/



async getFilesAndDirectories(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`; 
    
    const response = await fetch(`${this.root}${normalizedPath}?j=1`);
    if (!response.ok) throw new Error('Network response was not ok');

    let data = await response.json();
    
    return data.results.map(item => {
        // 处理路径拼接
        const itemPath = path === '/' 
            ? `${path}${item.name}`
            : `${path}/${item.name}`;
        
        // 转换Windows文件时间（100 纳秒间隔）转换为 Unix 时间戳（毫秒）
        const windowsFileTime = parseInt(item.date_modified);
        const unixTimestampMs = (windowsFileTime - 116444736000000000) / 10000;
        
        return {
            "name": item.name,
            "type": item.type === "folder" ? "directory" : "file",
            "path": itemPath,
            "mtime": new Date(unixTimestampMs).toISOString()
        };
    });
}

    // 获取目录
    async getDirectories(path) {
        try {
            const allItems = await this.getFilesAndDirectories(path);
            if (!Array.isArray(allItems)) {
                throw new Error('获取的目录数据格式不正确');
            }
            return allItems.filter(item => item && item.type === 'directory');
        } catch (error) {
            console.error('获取目录出错:', error);
            return []; // 返回空数组保证应用继续运行
        }
    }

    // 获取文件
    async getFiles(path) {
        try {
            const allItems = await this.getFilesAndDirectories(path);
            if (!Array.isArray(allItems)) {
                throw new Error('获取的文件数据格式不正确');
            }
            return allItems.filter(item => item && item.type !== 'directory');
        } catch (error) {
            console.error('获取文件出错:', error);
            return []; // 返回空数组保证应用继续运行
        }
    }


    // 渲染文件列表表头
    renderFileListHeader() {
        const fileListContainer = document.getElementById('fileListContainer');
        // 清空容器
        fileListContainer.innerHTML = '';
        // 创建 fileListHeader
        const fileListHeader = document.createElement('div');
        fileListHeader.id = 'fileListHeader';
        fileListContainer.appendChild(fileListHeader);

        // 根据配置决定是否显示fileListHeader
        if (!this.config.showHeader) {
            fileListHeader.style.display = 'none';
            return;
        }

        const pathParts = this.currentPath.split('/').filter(Boolean);
        let currentPath = '';
        fileListHeader.innerHTML = `
            <div class="fv-header-content">
                <h4 class="fv-list-item">
                    <span class="fv-path-link" onclick="fileVue.loadDirectory('/')">🏠/</span>
                    ${pathParts.map((part, index) => {
            currentPath += `/${part}`;
            return `<span class="fv-path-link" onclick="fileVue.loadDirectory('${currentPath}')">${decodeURIComponent(part)}</span> /`;
        }).join('')}
                </h4>
                <div class="fv-sort-buttons">
                    <button class="fv-sort-btn" onclick="fileVue.handleSortClick('name')">
                        文件名 ${this.sortState.byName !== null ? (this.sortState.byName === 'asc' ? '▲' : '▼') : ''}
                    </button>
                    <button class="fv-sort-btn" onclick="fileVue.handleSortClick('date')">
                        修改时间 ${this.sortState.byDate !== null ? (this.sortState.byDate === 'asc' ? '▲' : '▼') : ''}
                    </button>
                </div>
            </div>
        `;
    }

    // 渲染文件列表主体
    renderFileListBody() {
        const fileListContainer = document.getElementById('fileListContainer');
        // 创建 fileList
        const fileList = document.createElement('ul');
        fileList.id = 'fileList';
        fileList.className = 'list-unstyled';
        fileListContainer.appendChild(fileList);

        // 使用currentData进行排序
        const sortedItems = this.currentData.slice()
            .sort((a, b) => {
                // 预转换日期，避免重复转换，因为date类型转换非常耗时
                const dateA = a._cachedDate || (a._cachedDate = new Date(a.mtime));
                const dateB = b._cachedDate || (b._cachedDate = new Date(b.mtime));
                
                // 文件夹优先
                if (a.type === 'directory' && b.type !== 'directory') return -1;
                if (a.type !== 'directory' && b.type === 'directory') return 1;
        
                // 按当前激活的排序状态排序
                if (this.sortState.byName !== null) {
                    return this.sortState.byName === 'asc' 
                        ? a.name.localeCompare(b.name) 
                        : b.name.localeCompare(a.name);
                } 
                if (this.sortState.byDate !== null) {
                    return this.sortState.byDate === 'asc' 
                        ? dateA - dateB 
                        : dateB - dateA;
                }
                return 0;
            });

        // 添加返回上级目录按钮（如果不是根目录）
        if (this.currentPath !== '/') {
            const backItem = document.createElement('li');
            backItem.className = 'fv-item';
            backItem.innerHTML = '<span class="fv-name">📁 ..</span>';
            backItem.onclick = () => this.navigateUp();
            fileList.appendChild(backItem);
        }

        // 渲染每个项目
        sortedItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'fv-item';

            // 根据配置决定是否显示日期
            const modifiedTime = this.config.showDate ?
                `<span class="fv-secondary-text">${new Date(item.mtime).toLocaleString()}</span>` : '';

            if (item.type === 'directory') {
                listItem.innerHTML = `
                    <span class="fv-name">📁 ${item.name}</span>
                    ${modifiedTime}
                `;
                
                listItem.onclick = () => this.handleFolderClick(item);
            } else {
                // 根据配置决定是否显示下载链接
                const downloadLink = this.config.showDownload ?
                    `<a href="${item.path}" download class="fv-download-link" onclick="event.stopPropagation()">下载</a>` : '';

                listItem.innerHTML = `
                    <span class="fv-name">📄 ${item.name}</span>
                    ${modifiedTime}
                    ${downloadLink}
                `;
                listItem.onclick = () => this.handleFileClick(item);
            }
            fileList.appendChild(listItem);
        });
    }

    // 加载指定目录
    async loadDirectory(path) {
        try {
            const processedData = await this.getFilesAndDirectories(path);
            this.currentPath = path;
            this.currentData = processedData;
            this.renderFileListHeader(); // 更新为调用新函数
            this.renderFileListBody();   // 更新为调用新函数
        } catch (error) {
            console.error('Error loading directory:', error);
        }
    }

    

   
    // 处理文件夹点击
    handleFolderClick(item) {    
        this.loadDirectory( item.path);
    }
    // 导航到上一级目录
    navigateUp() {
        const parts = this.currentPath.split('/').filter(Boolean);
        if (parts.length > 1) {
            parts.pop();
            this.currentPath = '/' + parts.join('/');
        } else {
            this.currentPath = '/';
        }
        this.loadDirectory(this.currentPath);
    }


    // 排序方法
    sortItems(items, sortBy, order) {
        try {
            if (!Array.isArray(items)) {
                throw new Error('排序数据必须为数组');
            }
            
            return items.sort((a, b) => {
                // 确保比较对象存在
                if (!a || !b) return 0;
                
                if (sortBy === 'name') {
                    // 确保name属性存在
                    const nameA = a.name ? a.name.toLowerCase() : '';
                    const nameB = b.name ? b.name.toLowerCase() : '';
                    return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                } else if (sortBy === 'date') {
                    // 确保mtime属性存在且有效
                    const dateA = a.mtime ? new Date(a.mtime) : new Date(0);
                    const dateB = b.mtime ? new Date(b.mtime) : new Date(0);
                    return order === 'asc' ? dateA - dateB : dateB - dateA;
                }
                return 0;
            });
        } catch (error) {
            console.error('排序出错:', error);
            return items; // 返回原始数据保证应用继续运行
        }
    }

    // 处理排序按钮点击
    handleSortClick(sortBy) {
        if (sortBy === 'name') {
            this.sortState.byName = this.sortState.byName === 'asc' ? 'desc' : 'asc';
            this.sortState.byDate = null; // 重置日期排序状态
        } else if (sortBy === 'date') {
            this.sortState.byDate = this.sortState.byDate === 'asc' ? 'desc' : 'asc';
            this.sortState.byName = null; // 重置名称排序状态
        }
        this.loadDirectory(this.currentPath);
    }
    // 添加配置方法
    setConfig(config) {
        this.config = { ...this.config, ...config };
        
    }
    
}

// 初始化文件浏览器
if (typeof window !== 'undefined') {
    window.fileVue = new FileVue();
    window.onload = () => window.fileVue.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileVue;
}