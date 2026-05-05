const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const app = express();

// 解析请求体的中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const multer = require('multer');
let config;
//app.use('/test', express.static('e:/'));
//统一的错误处理函数
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

    // 添加跨域中间件（根据配置决定是否启用）
if (config.enableCORS) {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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


// 处理所有请求的正则表达式路由
app.post("/api/dir:", async (req, res) => {
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
    const upload = multer({ storage: storage,
        limits: {
            fileSize: 1024*1024*1024,// 限制文件大小为1GB
            //files:10
        }
     });

    app.post('/upload', upload.array('files'),(req, res) => {
        if(!req.files){
            res.json({ message: "无上传文件！"});
        }
        else{
            res.json({ message: `成功上传 ${req.files.length} 个文件`});
        }
    });

    // 添加文件夹上传路由
    app.post('/upload-folder', upload.fields([{ name: 'files', maxCount: 1 }, { name: 'relativePath' }]), async (req, res) => {
        try {
            const files = req.files['files'];
            if (!files || files.length === 0) {
                return res.status(400).json({ message: '无上传文件' });
            }

            const file = files[0];
            
            // 获取相对路径信息（从 FormData 中获取）
            const decodedPath = req.body.relativePath || file.originalname;

            // 构建完整的目标路径
            const targetPath = path.join(ROOT_PATH, 'upload', decodedPath);
            
            // 获取目标目录
            const targetDir = path.dirname(targetPath);
            
            // 创建目录（如果不存在）
            await fs.promises.mkdir(targetDir, { recursive: true });
            
           // 移动文件到目标位置
            await fs.promises.rename(file.path, targetPath);
            
            res.json({ message: '文件上传成功' });
        } catch (err) {
            console.error('文件夹上传错误:', err);
            res.status(500).json({ message: '文件上传失败', error: err.message });
        }
    });

   
} else {
    // 当上传功能被禁用时的处理
    app.post('/upload', (req, res) => {
        res.status(403).json({ 
            message: '文件上传功能已被禁用', 
        });
    });
    
    
}

}


// 启动服务器
if (require.main === module) {
    try {
        loadConfig();
        parseArg();
        routeApp();
        const server = app.listen(config.port, () => {
            console.log(`服务器运行在 http://localhost:${config.port}`);
            console.log(`静态文件目录: ${config.staticFolder}`);
            console.log(`文件上传功能: ${config.enableUpload ? '已启用' : '已禁用'}`);
            console.log(`跨域支持: ${config.enableCORS ? '已启用' : '已禁用'}`);  
        });

        server.on('error', handleError);
    } catch (err) {
        handleError(err);
    }
}

module.exports = app