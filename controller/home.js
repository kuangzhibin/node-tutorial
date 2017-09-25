
module.exports = {
  get: async (ctx, next) => {
    ctx.body = `<h1>Hello 沪江！</h1>` 
  }
}

// module.exports = {
//   index: async function (scope) {
//     Object.assign(scope,{
//       title: "首页",
//       content: "正常进入首页 Hello World"
//     })
//     console.log(this.say)
//     await this.render("index")
//   },
//   login: async function (scope) {
//     let params = this.request.body
//     let name = params.name
//     let password = params.password
//     if (name === "brucecham" && password === "123456") {
//       Object.assign(scope,{
//         title: "登录成功",
//         content: "欢迎进入个人中心"
//       })
//       await this.render("success")
//     } else {
//       Object.assign(scope,{
//         title: "登录失败",
//         content: "请检查登录信息是否正常"
//       })
//       await this.render("error")
//     }
//   }
// };