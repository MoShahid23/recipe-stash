const express = require("express");
const router = express.Router();
const {isAuthenticated} = require('../middlewares');

router.get('/save/:postId', isAuthenticated, async (req, res) => {
    let postId = req.params.postId;
    let source = req.query.source;

    try {
        // Get user ID from the users table based on the username
        let userQuery = `
        SELECT id
        FROM users
        WHERE username = ?`;
        let [userResult] = await db.query(userQuery, [req.session.userId]);

        if (userResult.length === 0) {
            return res.status(404).send({ success: false, message: 'User not found' });
        }

        let userId = userResult[0].id;

        let tableName;
        if(source == "spoonacular"){
            tableName = "spoonacular_saved_recipes"
        }else{
            tableName = "saved_recipes"
        }

        // Check if the recipe is already saved by this user
        checkQuery = `
            SELECT *
            FROM ${tableName} sr
            WHERE sr.user_id = ? AND sr.recipe_id = ?`;
        let [result] = await db.query(checkQuery, [userId, postId]);

        if (result.length > 0) {
            // If the recipe is already saved, delete it
            let deleteQuery = `
                DELETE FROM ${tableName}
                WHERE user_id = ? AND recipe_id = ?`;

            await db.query(deleteQuery, [userId, postId]);
            return res.status(200).send({ success: true, message: 'Recipe removed from saved posts' });
        } else {
            // If not saved, insert the recipe into the saved_recipes table
            let insertQuery = `
                INSERT INTO ${tableName} (user_id, recipe_id) 
                VALUES (?, ?)`;

            await db.query(insertQuery, [userId, postId]);
            return res.status(200).send({ success: true, message: 'Recipe saved successfully' });
        }
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send({ success: false, message: 'Internal server error' });
    }
});

router.get('/logout', isAuthenticated, async (req, res) => {
    req.session.destroy();
    isAuthenticated(req, res);
});

module.exports = router