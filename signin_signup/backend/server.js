const express = require("express");
const app = express();
const port = 7000;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { User } = require("./models/User");
const { auth } = require("./middleware/auth");
const cors = require("cors");
const querystring = require('querystring');
const url = require('url');
const session = require('express-session');
const path = require('path');

app.use(session({ 
  secret: 'keyboard cat', 
  resave: false, 
  saveUninitialized: false, 
  cookie: { secure: false } 
}));

app.use(
  cors({
    origin: true,
    credentials: true, //도메인이 다른경우 서로 쿠키등을 주고받을때 허용해준다고 한다
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
//이곳에 mongodb 사이트에서 카피한 주소를 이곳에 넣으면 된다.
const dbAddress = "mongodb+srv://Nigerian:Nigerian@cluster0.yihsg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose
  .connect(dbAddress, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(express.static(path.join(__dirname, 'public')));

// index (메인화면) 라우터
const indexRouter = require('./router/index'); 
app.use('/', indexRouter); 

// register (회원가입) 라우터
app.post('/register', function(req, res){
  //회원가입을 할때 필요한것
  //post로 넘어온 데이터를 받아서 DB에 저장해준다
  const user = new User(req.body);
  user.save((err, userInfo) => {
    // if (err) return res.json({ success: false, err });
    // return res.status(200).json({ success: true });
  });
  console.log(req.session);
  const query = querystring.stringify({
    "name": user.name,
    "email": user.email
  });
  res.redirect('/practice?' + query);
});

// 회원가입 버튼 클릭 시 라우터
app.get('/moveRegister', function(req, res) {
  res.render('register', {
  	title: 'REGISTER'
  });
});

app.get('/practice', function(req, res){
  var queryData = url.parse(req.url, true).query;
  return res.render('practice',{
    name: String(queryData.name),
    email: String(queryData.email)
  });
});

// login (로그인) 라우터
app.post('/login', function(req, res) {
  //로그인을할때 아이디와 비밀번호를 받는다
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      return res.json({
        loginSuccess: false,
        message: "존재하지 않는 아이디입니다.",
      });
    }
    user
      .comparePassword(req.body.password)
      .then((isMatch) => {
        if (!isMatch) {
          return res.json({
            loginSuccess: false,
            message: "비밀번호가 일치하지 않습니다",
          });
        }
      //비밀번호가 일치하면 토큰을 생성한다
      //jwt 토큰 생성하는 메소드 작성
      user
        .generateToken()
        .then((user) => {
          res
            .cookie("x_auth", user.token)
            .status(200)
            .json({ loginSuccess: true, userId: user._id });
        })
        .catch((err) => {
          // res.status(400).send(err);
        });
    })
    .catch((err) => res.json({ loginSuccess: false, err }));
  });
  const query = querystring.stringify({
    "email": req.body.email
  });
  res.redirect('/practice2?' + query);
});

// 로그인 버튼 클릭 시 라우터
app.get('/moveLogin', function(req, res) {
  res.render('login', {
  	title: 'LOGIN'
  });
});

app.get('/practice2', function(req, res){
  var queryData = url.parse(req.url, true).query;
  console.log(queryData.name);
  return res.render('practice2',{
    name: String(queryData.name),
    email: String(queryData.email)
  });
});

//auth 미들웨어를 가져온다
//auth 미들웨어에서 필요한것 : Token을 찾아서 검증하기
app.get("/auth", auth, (req, res) => {
  //auth 미들웨어를 통과한 상태 이므로
  //req.user에 user값을 넣어줬으므로
  res.status(200).json({
    _id: req._id,
    isAdmin: req.user.role === 09 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
  });
});

//user_id를 찾아서(auth를 통해 user의 정보에 들어있다) db에있는 토큰값을 비워준다
app.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ success: false, err });
    res.clearCookie("x_auth");
    return res.status(200).send({
      success: true,
    });
  });
});

app.listen(port, () => console.log(`listening on port ${port}`));