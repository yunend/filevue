const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const multer = require('multer');
let app;
let config;
let server;




function handleError(err) {
    console.error('程序错误:', err.message);
    if (err instanceof SyntaxError) {
        console.error('配置文件格式错误,请检查config.json文件格式');
    }
    console.error('程序将在5秒后退出...');
    setTimeout(() => {
        process.exit(1);
    }, 5000);
}

function loadConfig(){
    const configPath = process.pkg ? 
        path.join(path.dirname(process.execPath), 'config.json') : 
        path.join(__dirname, 'config.json');
    
    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
        console.log('配置文件不存在，正在创建默认配置文件...');
        
        // 创建默认配置
        const defaultConfig = {
            port: 8001,
            enableUpload: false,
            staticFolder: 'public',
            enableCORS: true
        };
        
        // 写入默认配置文件
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(`默认配置文件已创建: ${configPath}`);
        
        config = defaultConfig;
    } else {
        // 读取 JSON 配置文件
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
    }
    
    // 静态文件配置默认值
    if (!config.staticFolder) {
        config.staticFolder = 'public';
    }
    // 跨域配置默认值
    if (config.enableCORS === undefined) {
        config.enableCORS = true;
    }

    // 将相对路径转换为绝对路径
    if (!path.isAbsolute(config.staticFolder)) {
        config.staticFolder = path.resolve(
            process.pkg ? path.dirname(process.execPath) : __dirname,
            config.staticFolder
        );
    }    
}

function parseArg(){
const argv = yargs(hideBin(process.argv))
  .option('port', {
    alias: 'p',
    type: 'number',
    description: '设置服务器端口',
    default: config.port
  })
  .option('static', {
    alias: 's',
    type: 'string',
    description: '设置静态文件目录',
    default: config.staticFolder
  })
  .option('upload', {
    alias: 'u',
    type: 'boolean',
    description: '启用/禁用文件上传',
    default: config.enableUpload
  })
  .option('cors', {
    alias: 'c',
    type: 'boolean',
    description: '启用/禁用跨域支持',
    default: config.enableCORS
  })
  .help()
  .alias('help', 'h')
  .argv;

// 用命令行参数覆盖配置
config.port = argv.port;
config.staticFolder = argv.static;
config.enableUpload = argv.upload;
config.enableCORS = argv.cors;

}
// 解析命令行参数


function routeApp(){

    // 配置重载路由：重新加载配置文件并重启服务
    app.get('/reload-config', (req, res) => {
        res.json({ message: '配置已重新加载，服务正在重启...' });
        console.log('[' + new Date().toLocaleTimeString() + '] 收到重新加载配置请求...');

        const startTime = Date.now();
        server.closeAllConnections();
        server.close(() => {
            const closeTime = Date.now() - startTime;
            console.log('[' + new Date().toLocaleTimeString() + '] 服务器已关闭 (' + closeTime + 'ms)，正在重新加载配置...');
            try{
                    startServer();
                }catch(e){
                    handleError(e);
                }
        });
    });

    // 添加跨域中间件（根据配置决定是否启用）
if (config.enableCORS) {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            return res.status(204).end(); 
        }
        next();
    });
}


// 设置根目录
let ROOT_PATH = config.staticFolder;

app.use(express.static(ROOT_PATH));
// 在静态文件中间件之前添加压缩中间件
app.use(compression({
    level: 6, // 压缩级别，1-9，默认6
    threshold: 512, // 最小压缩字节数，默认1KB
    filter: (req, res) => {
        // 自定义过滤哪些请求需要压缩
        return true;
    }
}));

// 添加上传功能状态检查API
app.get('/api/upload-status', (req, res) => {
    res.json({ 
        enabled: config.enableUpload===true,
        message: config.enableUpload===true ? '文件上传功能已启用' : '文件上传功能已被禁用'
    });
});

// 处理所有请求的正则表达式路由
app.post("/api/dir", async (req, res) => {
     // 从请求体中获取路径数组
    const { path: pathArray } = req.body;
    if (!pathArray ||!Array.isArray(pathArray)) {
            return res.status(400).json({ error: '路径参数必须是数组格式' });
        }
    
    // 将路径数组拼接成完整路径
    const requestedPath = pathArray.length > 0 ? '/' + pathArray.join('/') : '/';
    const fullPath = path.join(ROOT_PATH, requestedPath);
    
    try {
        const stats = await fs.promises.stat(fullPath);
        
        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(fullPath, { withFileTypes: true });
            const dirContents = await Promise.all(files.map(async (file) => {
                const filePath = path.join(fullPath, file.name);
                const fileStats = await fs.promises.stat(filePath);
                return {
                    name: file.name,
                    type: file.isDirectory() ? 'directory' : 'file',
                    path: path.join(requestedPath, file.name),
                    mtime: fileStats.mtime.toISOString()
                };
            }));
            res.json(dirContents);
        } else {
            res.json({
                name: path.basename(fullPath),
                type: 'file',
                path: requestedPath,
                mtime: stats.mtime.toISOString()
            });
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: '文件或目录不存在' });
        }
        return res.status(500).json({ error: '无法读取目录' });
    }
});

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
    const uploadPath = path.join(ROOT_PATH, 'upload');  // 使用配置的静态文件夹
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, decodedName);
    }
});
const upload = multer({ storage: storage,
    limits: {
        fileSize: 1024*1024*1024,// 限制文件大小为1GB
        //files:10
    }
    });

app.post('/upload', (req, res) => {
    
    if(!config.enableUpload){
        return res.status(403).json({ message: '文件上传功能已被禁用' });
    }
    
    // 调用 multer 中间件
    upload.array('files')(req, res, (err) => {
        if(err){
            return res.status(500).json({ message: '文件上传失败: ' + err.message });
        }
        if(!req.files || req.files.length === 0){
            return res.json({ message: "无上传文件！" });
        }
        res.json({ message: `成功上传 ${req.files.length} 个文件`});
    });
});



// 404处理
app.use((req, res) => {
    res.status(404);  // 设置HTTP状态码为404
    
    // 优先使用自定义的404.html文件
    const filePath = path.join(config.staticFolder, '404.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);  // 发送自定义页面
    } else {
        res.send(`...内嵌的默认HTML...`);  // 兜底：内嵌页面
    }
});
}

function startServer(){
    app= express();
    // 禁用 X-Powered-By 头，避免泄露服务器技术信息
    app.disable('x-powered-by');
    app.use(express.urlencoded({ extended: true }));
    // 自定义 JSON 解析中间件，捕获解析错误并返回通用响应，避免泄露堆栈
    app.use((req, res, next) => {
        express.json()(req, res, (err) => {
            if (err) {
                if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
                    return res.status(400).json({ error: '请求体格式错误' });
                }
                if (err.type === 'entity.too.large') {
                    return res.status(413).json({ error: '请求体过大' });
                }
                return res.status(400).json({ error: '请求错误' });
            }
            next();
        });
    });
    loadConfig();
    parseArg();
    routeApp();
    // 全局错误处理中间件（必须在所有路由和中间件之后）
    // 捕获所有未处理错误，防止泄露堆栈和内部文件路径
    app.use((err, req, res, next) => {
        console.error('[' + new Date().toLocaleTimeString() + '] 请求错误:', err.message);
        // Multer 上传错误处理
        if (err && err.code && err.code.startsWith('LIMIT_')) {
            const msgMap = {
                'LIMIT_FILE_SIZE': '文件大小超过限制',
                'LIMIT_FILE_COUNT': '文件数量超过限制',
                'LIMIT_FIELD_KEY': '字段名过长',
                'LIMIT_FIELD_VALUE': '字段值过大',
                'LIMIT_FIELD_COUNT': '字段数量过多',
                'LIMIT_UNEXPECTED_FILE': '意外的文件字段'
            };
            return res.status(400).json({ error: msgMap[err.code] || '上传参数错误' });
        }
        // 其他情况统一返回通用错误，不暴露堆栈或内部路径
        res.status(500).json({ error: '服务器内部错误' });
    });
    server = app.listen(config.port, () => {
        console.log(`服务器运行在 http://localhost:${config.port}`);
        console.log(`静态文件目录: ${config.staticFolder}`);
        console.log(`文件上传功能: ${config.enableUpload ? '已启用' : '已禁用'}`);
        console.log(`跨域支持: ${config.enableCORS ? '已启用' : '已禁用'}`);  
    });
    server.on('error', handleError);
}

//运行主程序
if (require.main === module) {
    try{
        startServer();
    }catch(e){
        handleError(e);
    }
}

module.exports = app