//create a new router
const express = require("express")
const { check, validationResult } = require("express-validator");
const router = express.Router()
const crypto = require("crypto")
const { getRecipe, getRecipeBulk } = require('../utils/spoonacular');
const { getPosts } = require("./api");

router.get('/:username', [
    check('username').isAlphanumeric().withMessage('Invalid username')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send("Invalid username, please try again.");
    }

    let renderData = {};
    const { username } = req.params;
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;
    renderData.myAccount = false;
    renderData.profileUsername = username;
    //viewing own profile
    if(username == req.session.userId){
        renderData.myAccount = true;
    }

    //all saved posts will be added to this array
    renderData.savedPosts = []

    //user's posts here
    renderData.posts = []

    try {
        //only run when profile navigated to belongs to logged in user
        if (renderData.myAccount) {
            const csrfToken = crypto.randomBytes(32).toString("hex");
            req.session.csrfToken = csrfToken;
            renderData.csrfToken = csrfToken;
            renderData.savedPosts = await getSavedPosts(req);
            console.log(renderData.savedPosts)
        }

        //getPosts with the username of the profile to retrieve relevant posts
        renderData.posts.push(...(await getPosts({username:username, number:1000, strict:"on"})));

        res.render('profile', renderData);
    } catch (err) {
        console.error(err);
        renderData.error = "Unable to load user profile";
        res.render('post', renderData);
    }
});

async function getSavedPosts(req) {
    let posts = [];
    //retrieving saved api posts
    let query = `
        SELECT recipe_id
        FROM spoonacular_saved_recipes sr
        JOIN users u ON u.id = sr.user_id
        WHERE u.username = ?
    `;

    //list of spoonacular saved recipeIds is joined as comma separated list and used for a single bulk retrieval api call
    let [result] = await db.query(query, [req.session.userId]);
    let spoonacularRecipeIds = result.map(res => res.recipe_id).join(",");
    //ensure there are posts before making call
    if(spoonacularRecipeIds != ""){
        posts.push(...(await getRecipeBulk(spoonacularRecipeIds)));
    }

    //retrieving saved internal posts
    query = `
        SELECT recipe_id
        FROM saved_recipes sr
        JOIN users u ON u.id = sr.user_id
        WHERE u.username = ?
    `;
    //using getRecipe on each item after retrieving list of saved recipeIds
    [recipeIds] = await db.query(query, [req.session.userId]);

    for (let recipe of recipeIds) {
        let query = "CALL getRecipe(?)";
        [[[result]]] = await db.query(query, [recipe.recipe_id]);
        posts.push(result)
    }
    return posts;
}

router.get('/:username/posts/:id/:title?', [
    check('username').isAlphanumeric().withMessage('Invalid username'),
    check('id').isInt().withMessage('Invalid post ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    let renderData = {};
    const { username, id } = req.params;
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    try {
        let result;
        //from RecipeStash, use spoonacular API.
        if(username == "RecipeStash"){
            result = [await getRecipe(id)];
        }
        else{
            let query = "CALL getRecipe(?);";
            [[result]] = await db.query(query, [id])
        }

        console.log(result);

        if (result) {
            renderData.post = result[0];
            renderData

            renderData.saved = false;
            if(renderData.loggedIn){
                let query;
                if(username == "RecipeStash"){
                    query = `SELECT *
                    FROM spoonacular_saved_recipes sr
                    JOIN users u ON u.id = sr.user_id
                    WHERE u.username = ? AND sr.recipe_id = ?`;
                }else{
                    query = `SELECT *
                    FROM saved_recipes sr
                    JOIN users u ON u.id = sr.user_id
                    WHERE u.username = ? AND sr.recipe_id = ?`;
                }

                let [result] = await db.query(query, [req.session.userId, renderData.post.id]);
                if (result.length > 0) {
                    renderData.saved = true;
                }
            }

            res.render("post", renderData);
        } else {
            //post not found
            renderData.error = "Recipe not found...";
            res.render('post', renderData);
        }
    } catch (err) {
        console.error(err);
        renderData.error = "404 - Post not found";
        res.render('post', renderData);
    }
});

module.exports = router