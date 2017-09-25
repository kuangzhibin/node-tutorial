# Middleware 中间件(koa)

从koa的源码中不难看出之所以koa的代码简单灵活正是因为在中间件这块的扩展性。接下来将详细的介绍下koa中的中间件的原理和使用，
都知道的是 koa1 和 koa2 的中间件还是有区别的(当然在 koa2 中用 generator 会自动转换同时给出 warn )，下面简单的说下 koa1 和 koa2 的 middleware。


## Koa1 - middleware

> koa1的中间件的使用的是 generator 函数.

### generator简单回顾

那么再来回顾下 generator 相关的知识点，相关API见 [generator(MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)，这里简单的介绍下next的使用:

```
function* foo() {
  yield 'a';
  yield 'b';
}

var f = foo();
console.log(f.next())       // log: { value: "a", done: false}
console.log(f.next())       // log: { value: "b", done: false}
console.log(f.next())       // log: { value: undefined, done: true}
console.log(f.next())       // log: { value: undefined, done: true}
```

也许会有疑问为什么 f = foo() 这个表达式没有立即执行? 返回结果是什么？ 这段代码其实是执行了,只是返回的是一个 generator 对象, 当在执行了 next 之后 函数将执行到下一个[yield表达式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield), 并返回表达式对应的值,如上代码log: value
表示第一次要返回的值，done 标示这个迭代函数是否把要返回的内容都执行完成, 从上面的运行结果明显的看出 当执行完成后即 done:true, 后面执行多少次的 next 返回值都只会变成undefined。generator 函数 VS 普通的函数的最大区别在于:普通函数是将函数内表达式都执行完结束，而 generator函数则是 执行 -> 等待 -> 执行 ... -> 完成。

上面的栗子只是为了看下next的执行结果，传入参数后的情况如何？

```
// 改造上面的代码
function* foo(){
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

不是把值赋值给了m么？首先这个点解释下这个误区(最开始也遇到了)，每一个yield都会暂停函数的执行一直等到对应的next()执行后才会走到下一个yield的点(或结束)，那么我们来翻译下 刚刚的foo的代码([Regenerator生成器(fb)](https://facebook.github.io/regenerator/)在线转换：

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

按照从上到下的代码，先看regeneratorRuntime.mark 的代码如下图：

<img src="https://n1image.hjfile.cn/res7/2017/09/21/aa18db3ace23bb04111e5839b0db1b00.png" style="width:60%;">

此时foo被包裹后返回的结果(即_marked)如下图：

<img src="https://n1image.hjfile.cn/res7/2017/09/21/496966bb4b77e78253bf07cdccd6b417.png"  style="width:60%;">

那么我们在执行 var f = foo(); 通过regeneratorRuntime.wrap(具体代码可以到链接地址中看) 会通过闭包维护一个_context的上下文，当每次执行next时，会进入switch case 执行过程如下：

```
case 0 -> _context.next = 2 && { return 1 } -> while -> case 2 -> m = send(接收到的值2) -> _context.next = 5 && return 4(m * m) -> while -> end
```

到这里 next 的基本使用也已经了解。其他详细相关参考[generator(MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)。

### 编译过程

直接来一发核心部分的代码,主要还是在处理中间件上

```
app.listen = function(){
  var server = http.createServer(this.callback());
  return server.listen.apply(server, arguments);
};

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

这里和 koa2 的区别在于中间件的转换过程，具体可以看下[co](https://github.com/tj/co)，核心思想把 generator 函数 ->promise 这里就不过多的叙述。

## Koa2 - middleware

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
  let stime = new Date().getTime()
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

先 curl 看下结果如下图:

<img src="https://n1image.hjfile.cn/res7/2017/08/30/89212325e2fcbcafb85354cb489e8c06.png" width="60%">

我们来分析下这段代码的整个过程

### 编译的过程

按照代码顺序依次保存中间件

<img src="https://n1image.hjfile.cn/res7/2017/08/30/6b652e8f8c6884d3a46171940d72104e.png" width="60%">

中间件转换过程 compose

<img src="https://n1image.hjfile.cn/res7/2017/08/30/3360d24043052de921aff72d5f1bcec1.png" width="60%">

上文代码中next的变量是从哪里传入的可能是个疑惑, 从上图中可以看到compose递归加载了所有的中间件，next函数return dispath(idx)
一直递归到直到 idx === middleware.length。所以说所有的middleware 最终会返回一个fn(Promise)和前文的koa1通过co.warp 转换generator的思路是一致的，Promise 内部 return 下一个中间件的promise对象。说起来有点绕，接着看下面的执行原理

### 执行的原理

接着上面的一个中间件的转换过程，画了一个草图如下：

<img src="https://n1image.hjfile.cn/res7/2017/08/30/48b95711aa018e95f5269c42a947580a.png" width="60%">

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

相关参考：


- [深入掌握 ECMAScript 6 异步编程](http://www.ruanyifeng.com/blog/2015/04/generator.html)
- [The Basics Of ES6 Generators](https://davidwalsh.name/es6-generators)






















