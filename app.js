const Koa = require('koa')
const router = require('./router')
/**
 * 自定义中间件
 */
// const middleware = require('./middleware')
const app = new Koa()
// middleware(app)

// 初始化router
router(app)

app.listen(3003)
console.log('app started at port 3000...');