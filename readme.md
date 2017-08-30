# Middleware 中间件(koa)

从koa的源码中不难看出之所以koa的代码简单灵活正是因为在中间件这块的扩展性。接下来将详细的介绍下koa中的middleware的原理和使用，
都知道的是koa1和koa2中中间件还是有区别的(当然在koa2中用 generator会自动转换同时给出warn)，下面简单的说下koa1 和 koa2的middleware


## koa v1中middleware

> koa1的中间件的使用的是generator函数，

### generator简单回顾

那么再来回顾下generator相关的知识点，相关API见[generator(MDN)](hhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)，这里主要说下next的使用

```
function *foo() {
  yield 'a';
  yield 'b';
}

var f = foo();
console.log(f.next())       // log: { value: 'a', done: false}
console.log(f.next())       // log: { value: 'b', done: false}
console.log(f.next())       // log: { value: undefined, done: true}
console.log(f.next())       // log: { value: undefined, done: true}
```

generator在执行了next后将返回 obj,如上代码，value 表示第一次要返回的值，done标示这个迭代函数是否把要返回的内容都执行完成,从上面的运行结果明显的看出 当执行完成后即done:true, 后面执行多少次的next 返回值都只会变成undefined。 也许会有疑问为什么 f = foo() 这个没有立即执行？

上面的栗子只是为了看下next的执行结果，传入参数后的情况如何？

```
// 改造上面的代码
function *foo(){
  var m = yield 1
  yield m * m
}

var f = foo();

console.log(f.next())       // log: { value: 1, done: false }
console.log(f.next(2))      // log: { value: 4, done: false }
console.log(f.next())       // log: { value: undefined, done: true}
console.log(f.next())       // log: { value: undefined, done: true}
```

可能会觉得为什么第二个next 执行出来的是 value:4, 为什么不是1？这个是很多人之前都遇到的一个困惑，代码中：

```
var m = yield 1
```

不是把值赋值给了m么？首先这个点解释下这个误区(最开始也遇到了)，每一个yield都会暂停函数的执行一直等到对应的next()执行后才会走到下一个yield的点(或结束)，那么我们来翻译下 刚刚的foo的代码(babel在线转换, 不能直接执行)：

```
"use strict";

var _marked = /*#__PURE__*/regeneratorRuntime.mark(foo);

function foo() {
  var m;
  return regeneratorRuntime.wrap(function foo$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return 1;

        case 2:
          m = _context.sent;
          _context.next = 5;
          return m * m;

        case 5:
        case "end":
          return _context.stop();
      }
    }
  }, _marked, this);
}
```

直接看核心的部分 m实际的赋值是_context.sent 也就是next(2)。 所以到这里 next的基本使用也已经了解。其他相关见[generator(MDN)](hhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)。

### 编译过程

直接来一发核心部分的代码,主要还是在处理middleware上

```
app.callback = function(){
  if (this.experimental) {
    console.error('Experimental ES7 Async Function support is deprecated. Please look into Koa v2 as the middleware signature has changed.')
  }
  var fn = this.experimental
    ? compose_es7(this.middleware)
    : co.wrap(compose(this.middleware));
  ....

}
```

这里和koa2的区别在于 middleware的装换的过程，具体可以看下[co](https://github.com/tj/co)，核心思想把generator函数 ->promise 这里就不过多的叙述。

## koa2中middleware

> koa2中引入了async await, 所以中间件的写法上有了改变，但是实现的思想上并没有变，下面只对koa2的中间件的加载和执行做下分析。

首先看下koa2中的核心代码

```
// 内部维护middleware列表
app.use = function(fn){
  ...
  this.middleware.push(fn);
  return this;
};

// 核心处理中间件
app.callback = function(){
  ....
  const fn = compose(this.middleware); // 下文将详细解释compose

  const handleRequest = (req, res) => {
    ....
    const ctx = this.createContext(req, res);
    ....
    return fn(ctx).then(handleResponse).catch(onerror);
  };

  return handleRequest;
};
```

看到了核心的部分，在koa2中写use(foo),use(foo1)... 到最后都是通过转换。下面写了一个实例一步一步的解释 整个执行的流程:

```
// 按照官方示例
const Koa = require('koa')
const app = new Koa()

// 记录执行的时间
app.use(async (ctx, next)=>{
  let stime = new Date().getTIme()
  await next()
  let etime = new Date().getTIme()
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

app.listen(3000, () => {
  console.log('server is running at http://0.0.0.0:3000')
})

```

先curl 看下结果如下图:

<img src="https://n1image.hjfile.cn/res7/2017/08/30/89212325e2fcbcafb85354cb489e8c06.png">

我们来分析下这段代码的整个过程

### 编译的过程

按照代码顺序依次保存中间件

<img src="https://n1image.hjfile.cn/res7/2017/08/30/6b652e8f8c6884d3a46171940d72104e.png">

中间件转换过程 compose

<img src="https://n1image.hjfile.cn/res7/2017/08/30/3360d24043052de921aff72d5f1bcec1.png">

上文代码中next的变量是从哪里传入的可能是个疑惑, 从上图中可以看到compose递归加载了所有的中间件，next函数return dispath(idx)
一直递归到直到 idx === middleware.length。所以说所有的middleware 最终会返回一个fn(Promise)和前文的koa1通过co.warp 转换generator的思路是一致的，Promise 内部 return 下一个中间件的promise对象。说起来有点绕，接着看下面的执行原理

### 执行的原理

接着上面的一个中间件的转换过程，画了一个草图如下：

<img src="https://n1image.hjfile.cn/res7/2017/08/30/48b95711aa018e95f5269c42a947580a.png">

当一个请求发起 按照 图示中的箭头方向 begin -> end 一个完整的请求结束。中间件的执行顺序是不是很好理解了？

知道了原理后，开发一些中间件便会变得的容易很多，比如开发log(当然需要考虑中间件的加载顺序)?

```
// log
const log = async (ctx, next) => {
  console.log('....begin')
  await next()
  console.log('....end')
}

// error
const error = async (ctx, next) => {
  next().then(() => {
    // 统一上报日志?
  }).catch((err)=>{
    console.log(err)
  })
}
```

以上是本章关于koa中间件的一些基本介绍和使用。






















