// 定义一些依赖的模块
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const uglify = require('uglify-js')

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

// 拿到要构建的所有的配置，获取所有vue版本对应的Rollup所需的config （数组）
let builds = require('./config').getAllBuilds()

// filter builds via command line arg
// 对拿到构建的所有的配置进行过滤
// process.argv 属性会返回一个数组，第一个元素是 process.execPath（启动 Node.js 进程的可执行文件的绝对路径名）； 
// 第二个元素是正被执行的 JavaScript 文件的路径（npm script 后面对应的参数）
if (process.argv[2]) { // npm script 后面对应的参数
  const filters = process.argv[2].split(',')
  // 过滤出需要编译的config配置
  builds = builds.filter(b => {
    // b.output.file生成文件的绝对路径
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

// 调用build函数进行真正的构建过程，入参为所有Rollup配置config
build(builds)

function build (builds) {
  // built计数器，一个一个去编译
  let built = 0
  const total = builds.length
  const next = () => {
    // 将builds中每一个config，通过Rollup编译成对应的版本文件输出到dist
    buildEntry(builds[built]).then(() => {
      built++
      if (built < total) {
        next()
      }
    }).catch(logError)
  }

  next()
}

function buildEntry (config) {
  const output = config.output
  const { file, banner } = output
  const isProd = /min\.js$/.test(file)
  return rollup.rollup(config)
  // 编译完成拿到bundle，再通过generate函数生成目标文件
    .then(bundle => bundle.generate(output))
    .then(({ code }) => {
      // 是否需要压缩
      if (isProd) {
        var minified = (banner ? banner + '\n' : '') + uglify.minify(code, {
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code
        // 将文件生成到dist目录下，入参：file生成的目标文件路径|minified：压缩后的文件大小|是否生成zip格式
        return write(file, minified, true)
      } else {
        return write(file, code)
      }
    })
}

function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}
// 生成到dist中的目标文件一共多少kb
function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
