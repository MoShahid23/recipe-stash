const express = require ('express')
const ejs = require('ejs')
const mysql = require('mysql2')
const session = require('express-session');
require('dotenv').config();

const app = express()
const port = 8080;

app.set('view engine', 'ejs')

//body parser
app.use(express.urlencoded({ extended: true }))

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
const db = mysql.createConnection ({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

//connect to the db
db.connect((err) => {
    if (err) {
        throw err
    }
    console.log('Connected to database')
})
global.db = db

app.locals.data = {siteName: "Recipe Stash"}

//load the route handlers
const mainRoutes = require("./routes/main")
app.use('/', mainRoutes)

const registerRoutes = require("./routes/register")
app.use('/register', registerRoutes)

//start the web app
app.listen(port, () => console.log(`Node app listening on port ${port}!`))