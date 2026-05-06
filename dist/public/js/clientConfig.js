
let initialPath = "/";//在当前目录下的定位
let root = "/";//例如,http://124.223.50.99:8888
let extensionMap = new Map([
    ['ggb', './ggb/ggbvue.html']
]);//添加后缀名映射到打开方式,后缀名使用小写字母
let enableEverything = false;//在everything中打开http服务,设置enableEverything=true,并设置root
