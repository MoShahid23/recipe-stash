const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();
const { isAuthenticated } = require('../middlewares');

//save a recipe (or remove if already saved)
router.get('/save/:postId', [
    isAuthenticated,
    //validate that postId is an integer
    check('postId').isInt().withMessage('Invalid postId'),
    //validate source query parameter if provided
    check('source').optional().isIn(['spoonacular', 'internal']).withMessage('Invalid source')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const postId = req.params.postId; //recipe ID to be saved or removed
    const source = req.query.source; //source of the recipe (spoonacular or internal)

    try {
        //get user ID from the users table based on the session's username
        let userQuery = `
        SELECT id
        FROM users
        WHERE username = ?`;
        let [userResult] = await db.query(userQuery, [req.session.userId]);

        if (userResult.length === 0) {
            return res.status(404).send({ success: false, message: 'User not found' });
        }

        const userId = userResult[0].id;
        //determine table name dynamically based on the source
        const tableName = source === "spoonacular" ? "spoonacular_saved_recipes" : "saved_recipes";

        //check if the recipe is already saved by this user
        const checkQuery = `
            SELECT *
            FROM ${tableName} sr
            WHERE sr.user_id = ? AND sr.recipe_id = ?`;
        const [result] = await db.query(checkQuery, [userId, postId]);

        if (result.length > 0) {
            //if the recipe is already saved, delete it
            const deleteQuery = `
                DELETE FROM ${tableName}
                WHERE user_id = ? AND recipe_id = ?`;

            await db.query(deleteQuery, [userId, postId]);
            return res.status(200).send({ success: true, message: 'Recipe removed from saved posts' });
        } else {
            //if not saved, insert the recipe into the saved_recipes table
            const insertQuery = `
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

//delete a recipe
router.get('/delete/:postId', [
    isAuthenticated,
    //validate that postId is an integer
    check('postId').isInt().withMessage('Invalid postId'),
    //check for CSRF token in headers
    check('csrf').exists().withMessage('Missing CSRF token')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const recipeId = req.params.postId; //recipe ID to delete
    const csrfToken = req.headers.csrf; //cSRF token from the request header

    try {
        //validate the CSRF token
        if (csrfToken !== req.session.csrfToken) {
            return res.status(403).send({ success: false, message: 'Unauthorized request' });
        }

        //get user ID from the users table based on the session's username
        const userQuery = `
            SELECT id
            FROM users
            WHERE username = ?
        `;
        const [userResult] = await db.query(userQuery, [req.session.userId]);

        if (userResult.length === 0) {
            return res.status(404).send({ success: false, message: 'User not found' });
        }

        const userId = userResult[0].id;

        //call a stored procedure to delete the recipe for the user
        const query = `
            CALL deleteRecipe(?, ?);
        `;

        const [result] = await db.query(query, [recipeId, userId]);

        //check if any rows were affected by the delete operation
        if (result.affectedRows > 0) {
            return res.status(200).send({ success: true, message: 'Recipe deleted successfully' });
        } else {
            return res.status(404).send({ success: false, message: 'Recipe not found' });
        }
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send({ success: false, message: 'Internal server error' });
    }
});

//logout route
router.get('/logout', isAuthenticated, async (req, res) => {
    //destroy the session to log the user out
    req.session.destroy();
    isAuthenticated(req, res);
});

module.exports = router;
