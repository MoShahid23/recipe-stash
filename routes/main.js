//create a new router
const express = require("express")
const router = express.Router()
//import middleware to check if user is authenticated
const {isAuthenticated} = require('../middlewares');
//import utility functions for retrieving recipes
const { getRandomRecipes, getPosts } = require("./api");
//import Spoonacular API integration for random recipes
const { getRandomRecipes:getSpoonacularRandomRecipes } = require('../utils/spoonacular');

//handle the main route
router.get('/', async function(req, res) {
    //determine if the user is logged in based on session data
    let loggedIn = req.session.userId ? true : false;

    try {
        //generate a random number (purpose unclear, possibly for debugging)
        let randomizer = Math.round(Math.random()*7);

        const apiRecipes = await getSpoonacularRandomRecipes(randomizer)
        const dbRecipes = await getRandomRecipes(15-randomizer); //fetch 5 random recipes from the database
        let randomRecipes = [...dbRecipes, ...apiRecipes]; //combine results from both sources

        //shuffle the combined recipe list for variety
        randomRecipes = shuffleArray(randomRecipes);

        //prepare render data, including user state and recipes
        let renderData = {loggedIn, randomRecipes, username:req.session.userId, cateredRecipes:[]};

        if(loggedIn){
            //if the user is logged in, add catered (personalized) recipes
            Object.assign(renderData, await getCateredRecipes(req));

            //handle optional notification messages based on query parameters
            switch(req.query.notif) {
                case "registered":
                    Object.assign(renderData, {notif: "Thank you for registering! You have been logged in automatically."});
                    break;
                case "loggedin":
                    Object.assign(renderData, {notif: `Welcome back, ${req.session.userId}`});
                    break;
            }
        }

        //render the main page with the prepared data
        res.render("main.ejs", renderData);
    } catch (err) {
        console.log(err);
        //if an error occurs, render the main page with an error notification
        res.render("main.ejs", {
            error: 'There was an error retrieving recipes, please try again later.',
            loggedIn,
            recipes: [], //return an empty array or any default value
            username: req.session.userId
        });
    }
});

//handle the load-more route to fetch additional recipes
router.post('/load-more/:offset', isAuthenticated, async function(req, res) {
    //extract offset parameter from the URL and fetch more recipes
    let offset = req.params.offset;
    res.json(await getCateredRecipes(req, offset));
})

//fetch catered (personalized) feed for the user
async function getCateredRecipes(req, offset = 0){
    try {
        offset = Number(offset); //ensure offset is a number
        let cateredRecipes = [];

        //SQL query to fetch tags for saved recipes in the database
        let savedQuery = `
            SELECT t.name AS tag
                FROM saved_recipes sr
                JOIN users u ON u.id = sr.user_id
                JOIN recipes r ON r.id = sr.recipe_id
                JOIN recipe_tags rt ON r.id = rt.recipe_id
                JOIN tags t ON rt.tag_id = t.id
                WHERE u.username = ?;
        `;

        //SQL query to fetch tags for Spoonacular saved recipes
        let spoonacularSavedQuery = `
            SELECT t.name AS tag
                FROM spoonacular_saved_recipes sr
                JOIN users u ON u.id = sr.user_id
                JOIN spoonacular_recipe_tags rt ON sr.recipe_id = rt.recipe_id
                JOIN tags t ON rt.tag_id = t.id
                WHERE u.username = ?;
        `;

        //execute queries and retrieve results
        let [result1] = await db.query(savedQuery, [req.session.userId]);
        let [result2] = await db.query(spoonacularSavedQuery, [req.session.userId]);

        //combine the two outputs, removing duplicate tags
        let result = [...new Set([...(result1 || []), ...(result2 || [])])];

        if (result.length > 0) {
            //extract tag names from the results
            let tags = result.map(tagsObj => tagsObj.tag);
            console.log(tags);

            //fetch posts based on the extracted tags
            cateredRecipes = await getPosts({tags, offset});
            return {cateredRecipes};
        }
    } catch (err) {
        //log errors and return a generic error response
        console.error("Error fetching catered recipes:", err);
        return {error:"An error occurred while fetching catered recipes."};
    }
}

//utility function to shuffle an array (Fisher-Yates algorithm found on stack-overflow)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        //pick a random index and swap elements
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
}

//export the router for use in other parts of the application
module.exports = router
