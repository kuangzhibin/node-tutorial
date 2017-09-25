const Koa = require('koa')
const app = new Koa()

debugger
// 记录执行的时间
app.use(async (ctx, next)=>{
  let stime = new Date().getTime()
  await next()
  let etime = new Date().getTime()
  console.log(`${ctx.path} start: ${stime} end:${etime} loading:${etime - stime}`)
});

app.use(async (ctx, next) => {
  console.log('中间件1 doSoming')
  next();
  console.log('中间件1 end')
})

app.use(async (ctx, next) => {
  console.log('中间件2 doSoming')
  next();
  console.log('中间件2 end')
})

app.use(async (ctx, next) => {
  console.log('中间件3 doSoming')
  next();
  console.log('中间件3 end')
})

app.use(async (ctx, next) => {
  ctx.body = 'hello wordl!'
})

app.listen(3000, () => {
  console.log('server is running at http://0.0.0.0:3000')
})