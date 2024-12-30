//import necessary modules
const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const { isAuthenticated } = require("../middlewares");

/**
 * GET / - Render the create post page with CSRF token.
 */
router.get('/', isAuthenticated, (req, res) => {
    let renderData = {};
    renderData.loggedIn = req.session.userId ? true : false;
    renderData.username = req.session.userId;

    //generate a CSRF token and store it in the session
    const csrfToken = crypto.randomBytes(32).toString("hex");
    req.session.csrfToken = csrfToken;
    renderData.csrfToken = csrfToken;
    renderData.baseUrl = global.baseUrl;

    res.render('create', renderData);
});

/**
 * POST /post - Handle the creation of a new post.
 */
router.post(
    "/post",
    isAuthenticated,
    [
        body("title").notEmpty().withMessage("Title is required.").trim().escape().isLength({ max: 500 }).withMessage("Title must be less than or equal to 500 characters."),
        body("description").notEmpty().withMessage("Description is required.").trim().escape(),
        body("instructions").notEmpty().withMessage("Instructions are required.").trim().escape(),
        body("csrfToken").notEmpty().withMessage("CSRF token is required."),
        body("ingredients").isArray({ min: 1 }).withMessage("Ingredients must be an array with at least one item."),
        body("ingredients.*.name").notEmpty().withMessage("Ingredient name is required.").trim().escape().isLength({ max: 500 }).withMessage("Ingredient name must be less than or equal to 255 characters."),
        body("ingredients.*.quantity").optional().trim().escape().isLength({ max: 255 }).withMessage("Ingredient quantity must be less than or equal to 500 characters."),
        body("tags").isArray({ min: 1 }).withMessage("Tags must be an array with at least 1 item."),
        body("tags.*").notEmpty().withMessage("Tag name is required.").trim().escape().isAlphanumeric().isLength({ max: 100 }).withMessage("Tag must be less than or equal to 100 characters and alphanumeric")
    ],
    async (req, res) => {
        //handle validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, description, instructions, csrfToken, ingredients, tags } = req.body;

        //validate CSRF token
        if (csrfToken !== req.session.csrfToken) {
            return res.status(403).send("Unauthorized request");
        }

        try {
            //add the post and get its ID
            let recipeId = await addPost(title, description, instructions, req.session.userId, ingredients, tags);
            res.redirect(global.baseUrl+`/users/${req.session.userId}/posts/${recipeId}/${title}`);
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Internal server error." });
        }
    }
);

/**
 * Add a new post to the database with associated ingredients and tags.
 * @param {string} title - The title of the recipe.
 * @param {string} description - The description of the recipe.
 * @param {string} instructions - The instructions for the recipe.
 * @param {string} username - The username of the author.
 * @param {Array} ingredients - The list of ingredients with their quantities.
 * @param {Array} tags - The list of tags.
 * @returns {Promise<number>} - The ID of the newly created recipe.
 */
async function addPost(title, description, instructions, username, ingredients, tags) {
    const connection = await db.getConnection(); //get a connection from the pool

    try {
        //start a transaction
        await connection.beginTransaction();

        //retrieve the author's ID using the username
        const [userRows] = await connection.query(
            "SELECT id FROM users WHERE username = ?",
            [username]
        );

        if (userRows.length === 0) {
            throw new Error("User not found");
        }

        const authorId = userRows[0].id;

        //insert the recipe
        const [recipeResult] = await connection.query(
            "INSERT INTO recipes (title, description, instructions, author_id) VALUES (?, ?, ?, ?)",
            [title, description, instructions, authorId]
        );
        const recipeId = recipeResult.insertId;

        //insert ingredients
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

        //insert tags
        for (const tag of tags) {
            const [tagRow] = await connection.query(
                "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                [tag]
            );
            const tagId = tagRow.insertId;

            //associate the tag with the recipe
            await connection.query(
                "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
                [recipeId, tagId]
            );
        }

        //commit the transaction
        await connection.commit();
        return recipeId;
    } catch (error) {
        //rollback the transaction in case of an error
        await connection.rollback();
        throw error;
    } finally {
        connection.release(); //always release the connection back to the pool
    }
}

module.exports = router;