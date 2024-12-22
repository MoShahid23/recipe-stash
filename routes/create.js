//create a new router
const express = require("express")
const crypto = require("crypto")
const router = express.Router()
const {isAuthenticated} = require('../middlewares');
const { body } = require("express-validator");

router.get('/', isAuthenticated, function(req, res) {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    const csrfToken = crypto.randomBytes(32).toString("hex");
    req.session.csrfToken = csrfToken;
    renderData.csrfToken = csrfToken;

    res.render('create', renderData)
});

router.post("/post", isAuthenticated, async function (req, res) {
    console.log(req.body);
    const { title, description, instructions, csrfToken, ingredients, tags } = req.body;

    // Validate CSRF token
    if (csrfToken !== req.session.csrfToken) {
        return res.status(403).send("Unauthorized request");
    }


    // Validate the inputs...
    if (!title || !description || !instructions || !Array.isArray(ingredients), !Array.isArray(tags)) {
        return res.status(400).json({ success: false, error: "Validation failed: required fields are missing." });
    }

    try {
        let recipeId = await addPost(title, description, instructions, req.session.userId, ingredients, tags);
        res.status(201).json({ success: true, message: "Recipe added successfully.", recipeId});
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

async function addPost(title, description, instructions, username, ingredients, tags) {
    const connection = await db.getConnection(); // Get a connection from the pool

    try {
        // Start a transaction
        await connection.beginTransaction();

        // Retrieve the author's ID using the username
        const [userRows] = await connection.query(
            "SELECT id FROM users WHERE username = ?",
            [username]
        );

        if (userRows.length === 0) {
            throw new Error("User not found");
        }

        const authorId = userRows[0].id;

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

        // Insert tags
        for (const tag of tags) {
            const [tagRow] = await connection.query(
                "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                [tag]
            );
            const tagId = tagRow.insertId;

            // Associate the tag with the recipe
            await connection.query(
                "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
                [recipeId, tagId]
            );
        }

        // Commit the transaction
        await connection.commit();
        return recipeId;
    } catch (error) {
        // Rollback the transaction in case of an error
        await connection.rollback();
        throw error;
    } finally {
        connection.release(); // Always release the connection back to the pool
    }
}

module.exports = router