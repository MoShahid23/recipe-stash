//create a new router
const express = require("express")
const router = express.Router()
const axios = require("axios")
const {isAuthenticated} = require('../middlewares');
const { getRandomRecipes } = require("./api");
const { apiRandomRecipes } = require('../utils/spoonacular');

let apitest = `{
    "title": "Madeleines With Irish Whiskey Fudge",
    "description": "Madeleines With Irish Whiskey Fudge takes about 45 minutes from beginning to end.",
    "ingredients": [
        { "name": "barbecue sauce", "quantity": "12 oz" },
        { "name": "chicken breasts", "quantity": "1 lbs" },
        { "name": "hamburger buns", "quantity": "4 " }
    ],
    "instructions": "1. In the global or electric whisk, beat eggs with sugar until the mixture is white and fluffy.\n2. Soften the butter in the microwave for a few seconds.\n3. Add flour sifted with baking powder and stir with a whisk, add the butter, milk and instant coffee powder.\n4. Cover the bowl with the plastic wrap and let stand in refrigerator for at least half an hour, the thermal shock will inflate the madeleine.\n5. Preheat the oven to 220C.\n6. Pour a teaspoon of dough into each cell previously brushed with melted butter and tableware mold (my Silikomart) over a perforated tray.\n7. Bake at this temperature for 4 minutes, then lower it to 180C and cook for 5-6 minutes.\n8. Did those in the case too quickly, lower the oven temperature has increased by one minute cooking.\n<a href='https://spoonacular.com/madeleines-with-irish-whiskey-fudge-650602'>This recipe is written by Foodista and provided by Spoonacular</a>",
    "published": "2024-12-13 05:11:39",
    "username": "RecipeStash",
    "tags": "european,irish,st patricks day"
  }`;

apitest = JSON.parse(apitest.replaceAll('\n', ""));

router.get('/', async function(req, res) {
    let loggedIn = req.session.userId ? true : false;

    try {
        let randomizer = Math.round(Math.random()*10);
        console.log("", randomizer);
        const apiRecipes = [apitest]; //await apiRandomRecipes(1);
        const dbRecipes = await getRandomRecipes(4);
        let randomRecipes = [...dbRecipes, ...apiRecipes];
        randomRecipes = shuffleArray(randomRecipes);

        let renderData = {loggedIn, randomRecipes, username:req.session.userId};

        if(loggedIn){
            
        }

        switch(req.query.notif) {
            case "registered":
                renderData.notif = "Thank you for registering! You have been logged in automatically.";
                break;
            case "loggedin":
                renderData.notif = `Welcome back, ${req.session.userId}`;
                break;
            default:
                res.render("main.ejs", { randomRecipes, loggedIn, username: req.session.userId });
        }
        res.render("main.ejs", renderData);
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
}

module.exports = router