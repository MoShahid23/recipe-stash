//create a new router
const express = require("express")
const router = express.Router()

router.get('/',function(req, res){
    switch(req.query.notif){
        case "registered":
            res.render("main.ejs", {notif:"Thank you for registering! You have been logged in automatically.", loggedIn:true});
            break;
        default:
            res.render("main.ejs")
    }
})

module.exports = router