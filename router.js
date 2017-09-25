const Router = require('koa-router')
const homeController = require ('./controller/home')
const router = new Router()

module.exports = (app) => {
  // 首页
  router.get('/home', homeController.get)
  
  app.use(router.routes())
     .use(router.allowedMethods())
}

// module.exports = [
//   {
//     match: "/",
//     controller: "home.index"
//   },
//   {
//     match: "/login",
//     controller: "home.login",
//     method: "post"
//   }
// ]