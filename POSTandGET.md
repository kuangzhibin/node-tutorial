# 处理 POST/GET 请求

在学习了 Router 之后，我们就可以用它来处理 POST/GET 请求

其实 koa-router 提供了 `.get`，`.post`，`.put` 和 `.del` 接口来处理各种请求，但实际业务上，我们大部分只会接触到 POST 和 GET，所以接下来只针对这两种请求类型来说明。

## 捕获 GET 请求

我们先来看下捕获 GET 请求，最基础的写法。

```js
route.get('/', ( ctx )=>{
  // 请求的url为： http://xxxxxxxx.com/
  ctx.body = '我获取到了一个GET请求'；
})

route.get('/home', ( ctx )=>{
  // 请求的url为： http://xxxxxxxx.com/home
  ctx.body = '我获取到了一个GET请求'；
})
```

## 解析 GET 请求的数据

既然我们可以捕获到 GET 的请求，那么我们就需要获取到 GET 请求所带的数据。众所周知，GET 请求的数据一般都是放在 URL 上的。

request 对象中的 query 方法或 querystring 方法可以直接获取到GET请求的数据，唯一不同的是 query 返回是对象，而 querystring 返回的是字符串。其实因为上下文 ctx 自身也引用了 request 的 API，所以也能通过 ctx 来获取 GET 的数据。

```js
// 假设请求的url为： http://xxxxxxxx.com/home?id=10&sort=hot
route.get('/home', ( ctx )=>{
  // 方法 1 ：从上下文的request对象中获取
  const request = ctx.request
  let req_query = request.query  // req_query : {id:10,sort:hot}
  let req_querystring = request.querystring  // req_querystring : id=10&sort=hot
  // 方法 2 ：从上下文中直接获取
  let ctx_query = ctx.query     // ctx_query : {id:10,sort:hot}
  let ctx_querystring = ctx.querystring     //  ctx_querystring : id=10&sort=hot

  ctx.body = '我获取到了一个GET请求'；
})
```

## 捕获 POST 请求

与捕获 GET 请求类似，直接用 route 提供的方法来捕获 POST 就可以了，基本代码如下：

```js

route.post('/post', ( ctx )=>{
  // 请求的url为： http://xxxxxxxx.com/post
  ctx.body = '我获取到了一个POST请求'；
})
```

## 解析 POST 请求的数据

因为 POST 的数据是放在 request 里面，所以我们第一步应该是取出 request 里面的数据。假设我们请求的数据是 {id：10,sort: 'hot'}

```js
route.post('/post', ( ctx )=>{
  let postData = "";
  // 这里的 ctx.req 是 Node 的 request 对象。
  ctx.req.on('data', (data) => {
      // 这里的data是buffer流 例如：<Buffer 69 64 3d 31 30 26 73 6f 72 74 3d 68 6f 74>
      postData += data
  })
  ctx.req.on('end', () => {
      // 这里输出字符串： id=10&sort=hot
      // 原生里并没有转化数据为对象格式的方法，所以如果要对象格式，
      // 则需要自己去实现
      console.log(postData)
  })
  // 这里的返回一般会比2个on方法的回调快
  ctx.body = '这是一个POST请求'
})
```

这里有个坑，就是 ctx.req.on 方法是异步的，故 ctx.body 并不会等待 post 的数据处理，所以这里我们还需要用控制异步流的方法，来让流程符合我们的预期。

> request 对象具体的资料可以看 [Node 的文档](https://nodejs.org/api/http.html#http_class_http_clientrequest)

现阶段最好的解决方案就是 async/await。我们抽离出数据的处理过程，到一个用 Promise 包装的方法里：

```js
// 把回调改成 async 回调
route.post('/post', async ( ctx )=>{
    // 这里流程会等待 handleData 里 promise 的 resolve 执行之后，再接着运行
    let postData = await handleData( ctx )
    ctx.body = postData
})

function handleData(ctx) {
  // 事实上，这里需要 try/cathc 下来执行错误处理，不过为了方便理解，这里就不详细处理了
  return new Promise((resolve)=>{
      let postData = "";
      ctx.req.on('data', (data) => {
          postData += data
      })
      ctx.req.on('end', () => {
          // 返回数据
          resolve(postData)
      })
  })
}
```
## 使用 koa-bodyparser 简化数据处理过程

其实， POST 请求带的数据有许多种类型，比如说还有文件流，所以自己一个一个来实现是很没有效率的一件事。这时候就是 [koa-bodyparser](https://github.com/koajs/bodyparser) 登场的机会了。

koa-bodyparser 中间件的作用就是把 POST 的数据解析到 ctx.request.body 中，即取即用。

```js
// 使用ctx.body解析中间件
app.use(bodyParser())

route.post('/post', async ( ctx )=>{
    // so easy! 妈妈再也不用担心，我处理 POST 数据抓狂了
    let postData = ctx.request.body
    ctx.body = postData
})
```

至此，我们学习了以下内容：

1. 如何捕获 GET 和 POST 请求
2. 获取到 GET 和 POST 请求中所带的数据
3. 可以用 koa-bodyparser 中间件来简化数据的处理过程
