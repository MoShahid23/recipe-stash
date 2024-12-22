//create a new router
const express = require("express")
const router = express.Router()
const { getRecipe } = require('../utils/spoonacular');

router.get('/:username/posts/:id/:title?', async (req, res) => {
    let renderData = {};
    const { username, id } = req.params;
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    try {
        if(isNaN(id)) {
            throw new Error("Invalid value for 'id' entered.");
        }

        let result;
        //from RecipeStash, use spoonacular API.
        if(username == "RecipeStash"){
            result = [await getRecipe(id)];
            console.log(result);
        }
        else{
            let query = "CALL getRecipe(?);";
            [result] = await db.query(query, [id])
        }


        if (result) {
            renderData.post = result[0][0];
            renderData.post.username = username;


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
                console.log(result);
                if (result.length > 0) {
                    renderData.saved = true;
                }
            }

            console.log(renderData.post.ingredients);

            res.render("post", renderData);
        } else {
            // Post not found
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