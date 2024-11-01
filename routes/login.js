//create a new router
const express = require("express")
const router = express.Router()

router.get('/',function(req, res){
    res.render("login.ejs");
})

module.exports = router