//create a new router
const express = require("express")
const router = express.Router()
const axios = require("axios")
const {isAuthenticated} = require('../middlewares');
const { getRandomRecipes } = require("./api");

router.get('/', async function(req, res) {
    let loggedIn = req.session.userId ? true : false;

    try {
        // Fetch random recipes from the API
        const response = await getRandomRecipes(10);
        const recipes = response; // Assuming the API returns the recipes in the response data
        console.log(response)
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
    } catch (err) {
        console.log(err);
        res.render("main.ejs", {
            notif: 'There was an error retrieving recipes, please try again later.',
            loggedIn,
            recipes: [], // Return an empty array or any default value
            username: req.session.userId
        });
    }
});


module.exports = router