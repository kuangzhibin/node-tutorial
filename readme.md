## Router & Controller

在这一章节，我们会循序渐进完成一个比较完整的渲染页面的例子。

### 简单开始

首先我们先来个最最简单的渲染示例，修改我们的app.js文件

```js
const Koa = require('koa')
// 引入Koa-router
const Router = require('koa-router')

const app = new Koa()
// 实例化router对象
const router = new Router()

// 简单路由
router.get('/home', async function (ctx, next) {
  ctx.body = '<h1>Hello 沪江！</h1>'    
})

// 挂在路由中间件
app.use(router.routes())
   .use(router.allowedMethods())

app.listen(3000)
```
启动服务后，在浏览器输入 http://localhost:3000/home 就可以访问到我们定义好的路由，不出意外，你会看到个大大的 “Hello 沪江！”

现在你已经迈出了成功的第一步。在这个示例中，路由`/home`会对应一个async的函数，所以对此路由的处理都会放到这个函数里面。可能有同学会问了，在实际的项目中，一个路由不会简单的就吐出页面一个“Hello”的文本吧，免不了需要一些与后端的交互以及复杂页面的拼装，就这么全写在`app.js`中岂不是要疯掉？

这位同学你很聪明嘛！ 

不错，在实际的项目中，我们的路由处理可能会非常复杂，全部写在一个文件中，不论是对后期维护还是对患有强迫症的同学来讲都不是件好事情。那么我们做的事情就是，分离！

### 分离

首先路由部分的代码就可以单独分离成一个`router.js`, 可以直接置于项目根目录，亦可独立到一个`router`文件夹存放，完全看喜好。

router.js
```js
const Router = require('koa-router');
const router = new Router();

module.exports = (app) => {
  router.get('/home', async function (ctx, next) {
    ctx.body = '<h1>Hello 沪江！</h1>'    
  });
  
  app.use(router.routes())
     .use(router.allowedMethods())
}
``` 
app.js
```js
const Koa = require('koa')
const router = require('./route')

const app = new Koa()

// 初始化router
router(app)

app.listen(3000)
```
这样代码就看起来清爽了很多，这可以万事大吉了吧！

慢着！`router` 文件独立出来以后，应用的主文件 `app.js` 是会比较清爽，但是现在只有一个路由，并且处理函数也非常简单粗暴。那如果这样呢：

```js
  // 路由1
  router.get('/home', async function (ctx, next) {
    ctx.body = `<h1>Hello 沪江！</h1>`    
  })
  // 路由2
  router.get('/home', async function (ctx, next) {
    // 次数省略N行路由处理代码（请求数据啊，参数处理啊 BalaBala.....）
    // ...
    ctx.body = `<h1>Hello 沪江！</h1>
                <p>哈哈韩寒会画画后悔画韩红韩红和韩寒嘿嘿嘿韩寒喊韩红坏坏哈哈</p>
                ...
                <!-- 省略无数DOM结构 -->
               `    
  })
  // 路由3
  router.get('/home', async function (ctx, next) {
    // .....    
  })

  // ....
}
```

有N多的路由，每个处理函数一堆，这样会不会被主管打死~ 

（这位同学，你戏很多啊！）

好吧，如此看来还得继续优化才是

### 继续分离

新建 `controller` 文件夹，增加一个 `home.js` 文件，这个文件将作为路由 `/home` 的处理文件。
home.js
```js
module.exports = {
  get: async (ctx, next) => {
    ctx.body = `<h1>Hello 沪江！</h1>` 
  }
}
```

router.js
```js
const Router = require('koa-router')
const homeController = require ('./controller/home')
const router = new Router()

module.exports = (app) => {
  // 首页
  router.get('/home', homeController.get)
  
  app.use(router.routes())
     .use(router.allowedMethods())
}
```

这样就更好一点了，将每个路由的处理逻辑独立到 `controller` 中的独立文件中，后期维护更加方便。

```js
router.get('/home', homeController.get)
```

这里的 `homeController.get` 同样是一个Middleware，我们一样可以在这里串行增加我们需要的Moddleware

```js
router.get('/home', middlewareA, middlewareB, homeController.get)
```

### 独立视图

通过上面的简单的示例，我们将代码分离除了路由部分和Controller部分，显而易见，View部分自然也可以分离，这很MVC ! 这一部分需要结合视图模板引擎 `Nunjucks` ,这一部分将放在下一章讲解



