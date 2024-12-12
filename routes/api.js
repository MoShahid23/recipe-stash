const express = require("express");
const router = express.Router();

router.get("/post/:id", function (req, res) {
    const postId = parseInt(req.params.id, 10);

    // Validate postId: must be a positive integer
    if (isNaN(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid postId. postId must be a positive integer."
        });
    }

    const query = "CALL getRecipe(?)";

    db.query(query, [postId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: "Internal server error. Please try again later."
            });
        }

        // Check if the post exists
        if (data[0].length === 0) {
            return res.status(404).json({
                success: false,
                error: `Post #${postId} not found. Please ensure the postId is correct.`
            });
        }

        // Respond with the post data
        res.status(200).json({
            success: true,
            data: data[0]
        });
    });
});

router.get("/posts", function (req, res) {
    console.log("running");
    const title = req.query.title || "";
    const username = req.query.username || null;
    const tags = req.query.tags ? req.query.tags.split(",").map(tag => tag.trim()) : null;
    const publishedRange = req.query.dateRange || null;
    const number = Math.min(parseInt(req.query.number) || 10, 50);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    if (publishedRange && !/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(publishedRange)) {
        return res.status(400).json({
            success: false,
            error: "Invalid dateRange format. Use 'YYYY-MM-DD,YYYY-MM-DD'."
        });
    }

    let queryParameters = [`%${title}%`, `%${title}%`];
    let tagFilterQuery = "";

    if (tags && tags.length > 0) {
        tagFilterQuery = `
        AND r.id IN (
            SELECT rt.recipe_id
            FROM recipe_tags AS rt
            JOIN tags AS t ON rt.tag_id = t.id
            WHERE t.name IN (${tags.map(() => "?").join(",")})
            GROUP BY rt.recipe_id
            HAVING COUNT(DISTINCT t.id) = ?
        )`;
        queryParameters.push(...tags, tags.length);
    }

    let query = `
        SELECT r.id, r.title, r.published, r.description, r.ingredients, u.username,
               GROUP_CONCAT(DISTINCT t.name) AS tags
        FROM recipes AS r
        JOIN users AS u ON r.author_id = u.id
        LEFT JOIN recipe_tags AS rt ON r.id = rt.recipe_id
        LEFT JOIN tags AS t ON rt.tag_id = t.id
        WHERE (r.title LIKE ? OR r.description LIKE ?)
    `;

    if (username) {
        query += ` AND u.username LIKE ?`;
        queryParameters.push(`%${username}%`);
    }

    if (publishedRange) {
        const [startDate, endDate] = publishedRange.split(",");
        query += ` AND r.published BETWEEN ? AND ?`;
        queryParameters.push(startDate, endDate);
    }

    query += tagFilterQuery;
    query += ` GROUP BY r.id LIMIT ? OFFSET ?`;
    queryParameters.push(number, offset);

    db.query(query, queryParameters, function (error, results) {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: "Internal server error." });
        }

        res.status(200).json({
            success: true,
            data: results,
            pagination: {
                offset: offset,
                limit: number,
                total: results.length // Optional, add a COUNT query for the total
            }
        });
    });
});

router.post("/add/recipe", async function (req, res) {
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


module.exports = router;