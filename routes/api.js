const express = require("express");
const router = express.Router();

router.get("/post/:id", async function (req, res) {
    const postId = parseInt(req.params.id, 10);

    // Validate postId: must be a positive integer
    if (isNaN(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid postId. postId must be a positive integer."
        });
    }

    try {
        const result = await getPost(postId);

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

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Internal server error. Please try again later."
        });
    }
});

async function getPost(postId){
    const query = "CALL getRecipe(?)";
    const [results] = await db.query(query, [postId]);
    return results[0];
}

router.get("/posts", async function (req, res) {
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

    try {
        const results = await getPosts(title, username, tags, publishedRange, number, offset);

        res.status(200).json({
            success: true,
            data: results,
            pagination: {
                offset: offset,
                limit: number,
                total: results.length
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

async function getPosts(title, username, tags, publishedRange, number, offset){
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
        SELECT r.id, r.title, r.published, r.description, u.username,
               GROUP_CONCAT(DISTINCT t.name) AS tags,
               JSON_ARRAYAGG(
                  JSON_OBJECT('name', i.name, 'quantity', ri.quantity)
               ) AS ingredients
        FROM recipes AS r
        JOIN users AS u ON r.author_id = u.id
        LEFT JOIN recipe_tags AS rt ON r.id = rt.recipe_id
        LEFT JOIN tags AS t ON rt.tag_id = t.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
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

    console.log(query);
    const [results] = await db.query(query, queryParameters);
    return results[0];
}

router.get("/posts/random/:number?", async function (req, res) {
    try {
        const number = Math.min(parseInt(req.params.number) || 10, 50);
        const results = await getRandomRecipes(number);

        res.status(200).json({
            success: true,
            data: results,
            limit: number,
            total: results.length
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

async function getRandomRecipes(number = 10){
    const query = `
        SELECT r.title, r.description, r.instructions, r.published, u.username,
               GROUP_CONCAT(t.name) AS tags,
               JSON_ARRAYAGG(
                   JSON_OBJECT('name', i.name, 'quantity', ri.quantity)
               ) AS ingredients
        FROM recipes r
        JOIN users u ON r.author_id = u.id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY r.id
        ORDER BY RAND() LIMIT ?;
    `;

    const [results] = await db.query(query, [number]);
    return results;
}

module.exports = {getPost, getPosts, getRandomRecipes, router};