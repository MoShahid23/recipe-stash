//create a new router
const express = require("express")
const router = express.Router()
const axios = require("axios")
const {isAuthenticated} = require('../middlewares');
const { getRandomRecipes, getPosts } = require("./api");
const { apiRandomRecipes } = require('../utils/spoonacular');

router.get('/', async function(req, res) {
    let loggedIn = req.session.userId ? true : false;

    try {
        let randomizer = Math.round(Math.random()*10);
        console.log("", randomizer);
        const apiRecipes = []//await apiRandomRecipes(1);
        const dbRecipes = await getRandomRecipes(5);
        let randomRecipes = [...dbRecipes, ...apiRecipes];
        randomRecipes = shuffleArray(randomRecipes);

        let renderData = {loggedIn, randomRecipes, username:req.session.userId};

        if(loggedIn){
            Object.assign(renderData, await getCateredRecipes(req));
        }

        switch(req.query.notif) {
            case "registered":
                renderData.notif = "Thank you for registering! You have been logged in automatically.";
                break;
            case "loggedin":
                renderData.notif = `Welcome back, ${req.session.userId}`;
                break;
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

router.post('/load-more/:offset', isAuthenticated, async function(req, res) {
    let offset = req.params.offset;
    res.send(JSON.stringify(await getCateredRecipes(req, offset)));
})

async function getCateredRecipes(req, offset = 0){
    try {
        offset = Number(offset);
        let cateredRecipes = [];

        let savedQuery = `
            SELECT DISTINCT t.name AS tag
            FROM saved_recipes sr
            JOIN users u ON u.id = sr.user_id
            JOIN recipes r ON r.id = sr.recipe_id
            JOIN recipe_tags rt ON r.id = rt.recipe_id
            JOIN tags t ON rt.tag_id = t.id
            WHERE u.username = ?;
        `;
        let spoonacularSavedQuery = `
            SELECT DISTINCT t.name AS tag
            FROM spoonacular_saved_recipes sr
            JOIN users u ON u.id = sr.user_id
            JOIN spoonacular_recipe_tags rt ON sr.recipe_id = rt.recipe_id
            JOIN tags t ON rt.tag_id = t.id
            WHERE u.username = ?;
        `;

        let [result1] = await db.query(savedQuery, [req.session.userId]);
        let [result2] = await db.query(spoonacularSavedQuery, [req.session.userId]);

        //combine the two outputs, removing duplicates
        let result = [...new Set([...(result1 || []), ...(result2 || [])])];

        if (result.length > 0) {
            // Map result to extract tags
            let tags = result.map(tagsObj => tagsObj.tag);
            console.log(tags);

            // Get posts based on tags
            cateredRecipes = await getPosts({tags, offset});
            return {cateredRecipes};
        }
    } catch (err) {
        console.error("Error fetching catered recipes:", err);
        return {error:"An error occurred while fetching catered recipes."};
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
}

module.exports = router