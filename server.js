const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');  // 新增
const app = express();

// 在静态文件中间件之前添加压缩中间件
app.use(compression({
    level: 6, // 压缩级别，1-9，默认6
    threshold: 512, // 最小压缩字节数，默认1KB
    filter: (req, res) => {
        // 自定义过滤哪些请求需要压缩
        return true;
    }
}));

// 添加默认配置
// 修改配置加载方式
let config;
try {
    const configPath = process.pkg ? 
        path.join(path.dirname(process.execPath), 'config.js') : 
        path.join(__dirname, 'config.js');
    config = require(configPath);
    
    
    // Ensure staticFolder is defined in the loaded config
    if (!config.staticFolder) {
        config.staticFolder = 'public';
    }

// 将相对路径转换为绝对路径
if (!path.isAbsolute(config.staticFolder)) {
    config.staticFolder = path.resolve(
        process.pkg ? path.dirname(process.execPath) : __dirname,
        config.staticFolder
    );
}    
} catch (e) {
    // 修改配置加载逻辑，优先使用环境变量
    const config = {
        port: process.env.PORT || 8001,
        enableUpload: process.env.ENABLE_UPLOAD === 'true' || false,
        staticFolder: process.env.STATIC_FOLDER || 'public'
    };
}
// 解析命令行参数
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
  .help()
  .alias('help', 'h')
  .argv;

// 用命令行参数覆盖配置
config.port = argv.port;
config.staticFolder = argv.static;
config.enableUpload = argv.upload;

const multer = require('multer');


// 设置根目录
let ROOT_PATH = config.staticFolder;

app.use(express.static(ROOT_PATH));



// 处理所有请求的正则表达式路由
app.get(/^\/list:(?:\/(.*))?\/?$/, (req, res) => {
    const requestedPath = req.params[0] || '';
    const fullPath = path.join(ROOT_PATH, requestedPath);

    fs.stat(fullPath, (err, stats) => {
        if (err) {
            return res.status(404).json({ error: '文件或目录不存在' });
        }

        if (stats.isDirectory()) {
            fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
                if (err) {
                    return res.status(500).json({ error: '无法读取目录' });
                }
                const dirContents = files.map(file => {
                    const fileStats = fs.statSync(path.join(fullPath, file.name));
                    return {
                        name: file.name,
                        type: file.isDirectory() ? 'directory' : 'file',
                        path: path.join(requestedPath, file.name),
                        mtime: fileStats.mtime.toISOString() // 添加修改时间
                    };
                });
                res.json(dirContents);
				
            });
        } else {
            res.json({
                name: path.basename(fullPath),
                type: 'file',
                path: requestedPath,
                mtime: stats.mtime.toISOString() // 添加修改时间
            });
        }
    });
});

// 根据配置决定是否启用文件上传功能
if (config.enableUpload) {
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
    const upload = multer({ storage: storage });

    // 文件上传接口
    app.post('/upload', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({ message: 'File uploaded successfully', file: req.file });
    });
} else {
    // 当上传功能被禁用时的处理
    app.post('/upload', (req, res) => {
        res.status(403).json({ 
            error: '文件上传功能已被禁用',
            message: '如需启用上传功能，请修改config.js中的enableUpload为true'
        });
    });
}
// 启动服务器
if (require.main === module) {
    try {
        const server = app.listen(config.port, () => {
            console.log(`服务器运行在 http://localhost:${config.port}`);
            console.log(`静态文件目录: ${config.staticFolder}`);
            console.log(`文件上传功能: ${config.enableUpload ? '已启用' : '已禁用'}`);
        });

        // 统一的错误处理函数
        const handleError = (err) => {
            console.error('服务器错误，10秒后退出程序:', err.message);
            setTimeout(() => {
                process.exit(1);
            }, 10000);
        };

        server.on('error', handleError);
    } catch (err) {
        handleError(err);
    }
}

module.exports = app