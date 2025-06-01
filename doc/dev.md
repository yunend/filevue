# FileVue 开发与部署指南

## 服务端配置
修改`config.js`文件，支持自定义参数。例如：可将`public`文件夹重命名或移动至其他目录，需相应修改`staticFolder`参数。若不修改则使用默认配置。
```javascript
module.exports = {
    port: 8888,         // 服务器监听端口
    enableUpload: true, // 是否启用文件上传功能
    staticFolder: 'D:/public2' // 静态资源文件夹路径，必须使用正斜杠，不能使用反斜杠
};
```

## 客户端配置
在html文件中引入fileVue.js与fileVue.css，以及fileListContainer
```html
<head>
    <link rel="stylesheet" href="/css/fileVue.css">
</head>
<body>
    <div id="fileListContainer"></div>
    <script src="/js/fileVue.js"></script>
</body>
```
如果不配置则使用默认配置；如需要配置则增加以下代码
```html
<script>
window.addEventListener("DOMContentLoaded", function () {
    fileVue.setConfig({
        showHeader: true,    // 是否显示文件列表头
        showDate: true,      // 是否显示文件日期
        showDownload: true,  // 是否显示下载链接
        initialPath: '/'     // 初始化加载目录
    });

    // 自定义文件类型处理
    
    fileVue.handleFileClick = function (item) {
        const extension = item.name.split('.').pop().toLowerCase();
        switch (extension) {
            case 'ggb':
                window.open(`/ggb/ggb-editor.html?path=${encodeURIComponent(item.path)}`, '_ggb');
                break;
            default:
                window.open(`${item.path}`, '_blank');
        }
    }
});
</script>
```
## 系统自启动配置
### Windows 使用 NSSM 自启动
1. 下载 NSSM: https://nssm.cc/download
2. 安装服务:
```bash
nssm install FileVue "D:\path\to\fileVue.exe"
```
3. 启动服务:
```bash
nssm start FileVue
```
### Linux 自启动 (Systemd)
创建服务文件 /etc/systemd/system/filevue.service:
```ini
[Unit]
Description=FileVue Service
After=network.target

[Service]
ExecStart=/path/to/fileVue.exe
WorkingDirectory=/path/to/
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```
然后启用并启动服务
```bash
systemctl enable filevue
systemctl start filevue
```
## Everything HTTP 服务器兼容
`filevue-e.js` 和 `ggbVue-e.html` 是专为与 Everything HTTP 服务器兼容而设计的版本。使用时:

将 `filevue-e.js` 替换标准版 `fileVue.js`
将 `ggbVue-e.html` 放在 /ggb/ 目录下
## 命令行使用
```bash
filevue.exe -h  # 查看帮助

Options:
      --version  显示版本号                                   [boolean]
  -p, --port     设置服务器端口                         [number] [default: 8888]
  -s, --static   设置静态文件目录                [string] [default: "D:/public"]
  -u, --upload   启用/禁用文件上传                     [boolean] [default: true]
  -h, --help     显示帮助信息 
  ```
使用示例:
```bash
# 使用默认配置启动
filevue.exe

# 自定义端口和静态文件目录
filevue.exe --port 8080 --static D:/my_files

# 禁用文件上传功能
filevue.exe --upload false

# 组合使用多个参数
filevue.exe -p 9000 -s E:/teaching_files -u false
```
## API 指南

### getFilesAndDirectories(path)
```javascript
/**
 * 获取指定路径下的所有文件和目录
 * @param {string} path - 要查询的目录路径，如 '/docs'
 * @returns {Promise<Array>} 返回包含文件和目录信息的数组
 *   每个元素格式: {name: string, type: 'file'|'directory', path: string, mtime: string}
 */
const items = await fileVue.getFilesAndDirectories('/path/to/dir');
```
### getFiles(path)
```javascript
/**
 * 获取指定路径下的所有文件
 * @param {string} path - 要查询的目录路径
 * @returns {Promise<Array>} 返回仅包含文件信息的数组
 *   每个元素格式: {name: string, type: 'file', path: string, mtime: string}
 */
const files = await fileVue.getFiles('/path/to/dir');
```
### getDirectories(path)
```javascript
/**
 * 获取指定路径下的所有目录
 * @param {string} path - 要查询的目录路径
 * @returns {Promise<Array>} 返回仅包含目录信息的数组
 *   每个元素格式: {name: string, type: 'directory', path: string, mtime: string}
 */
const dirs = await fileVue.getDirectories('/path/to/dir');
```
## Q&A
### Q: Windows下如何开机未登录系统自动启动？
A:   使用NSSM自启动服务，并钩选"Allow service to interact with desktop"