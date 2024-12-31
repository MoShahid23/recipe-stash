const express = require ('express')
const ejs = require('ejs')
const mysql = require('mysql2/promise')
const session = require('express-session');
require('dotenv').config()

const app = express()
const port = 8000;

global.baseUrl = ""

app.set('view engine', 'ejs')

//body parser
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

//set up public folder
app.use(express.static(__dirname + '/public'))

//setup express-session
app.use(session({
    secret: JSON.parse(process.env.SECRET_ARRAY),
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}))

//setup db connection
const db = mysql.createPool ({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})
global.db = db

app.locals.data = {siteName: "Recipe Stash"}

//load the route handlers
const  { router } = require("./routes/api")

app.use('/api', router)

app.get("/about", (req, res) => {
    res.render("profile.ejs", {profileUsername:"RecipeStash", myAccount:false, posts:[], loggedIn:req.session.userId?true:false, username:req.session.userId})
})

const mainRoutes = require("./routes/main")
app.use('/', mainRoutes)

const registerRoutes = require("./routes/register")
app.use('/register', registerRoutes)

const loginRoutes = require("./routes/login")
app.use('/login', loginRoutes)

const userRoutes = require("./routes/user")
app.use('/user', userRoutes)

const createRoutes = require("./routes/create")
app.use('/create', createRoutes)

const usersRoutes = require("./routes/users")
app.use('/users', usersRoutes)

const searchRoutes = require("./routes/search")
app.use('/search', searchRoutes)

//start the web app
app.listen(port, () => console.log(`Node app listening on port ${port}!`))