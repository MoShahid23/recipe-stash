//create a new router
const express = require("express")
const router = express.Router()
const {isAuthenticated} = require('../middlewares');

router.get('/', function(req, res) {
    let loggedIn = req.session.userId ? true : false;
    let query = "CALL getRecipes('');";
    let tags = req.session.tags || '';
    db.query(query, tags, function(err, data) {
        if (err) {
            console.log(err);
            return res.render("main.ejs", {
                notif: 'There was an error retrieving recipes, please try again later.',
                loggedIn,
                recipes: [], // Return an empty array or any default value
                username: req.session.userId
            });
        }

        // When the query is successful, set recipes to the retrieved data
        let recipes = data[0];

        switch(req.query.notif) {
            case "registered":
                res.render("main.ejs", {
                    notif: "Thank you for registering! You have been logged in automatically.",
                    loggedIn,
                    recipes,
                    username: req.session.userId
                });
                break;
            case "loggedin":
                res.render("main.ejs", {
                    notif: `Welcome back, ${req.session.userId}`,
                    loggedIn,
                    recipes,
                    username: req.session.userId
                });
                break;
            default:
                res.render("main.ejs", { recipes, loggedIn, username: req.session.userId });
        }
    });
});


module.exports = router