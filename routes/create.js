//create a new router
const express = require("express")
const router = express.Router()
const {isAuthenticated} = require('../middlewares');

router.get('/', isAuthenticated, function(req, res) {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;
    res.render('create', renderData)
});

router.post("/post", async function (req, res) {
    const { title, description, instructions, authorId, ingredients } = req.body;

    // Validate the inputs...
    if (!title || !instructions || !authorId || !Array.isArray(ingredients)) {
        return res.status(400).json({ success: false, error: "Validation failed: required fields are missing." });
    }

    const connection = await db.getConnection(); // Get a connection from the pool

    try {
        // Start a transaction
        await connection.beginTransaction();

        // Insert the recipe
        const [recipeResult] = await connection.query(
            "INSERT INTO recipes (title, description, instructions, author_id) VALUES (?, ?, ?, ?)",
            [title, description, instructions, authorId]
        );
        const recipeId = recipeResult.insertId;

        // Insert ingredients
        for (const ingredient of ingredients) {
            const [ingredientRow] = await connection.query(
                "INSERT INTO ingredients (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                [ingredient.name]
            );
            const ingredientId = ingredientRow.insertId;

            await connection.query(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)",
                [recipeId, ingredientId, ingredient.quantity]
            );
        }

        // Commit the transaction
        await connection.commit();

        res.status(201).json({ success: true, message: "Recipe added successfully.", recipeId });
    } catch (err) {
        // If anything fails, rollback the transaction
        await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error." });
    } finally {
        connection.release(); // Release the connection back to the pool
    }
});

module.exports = router