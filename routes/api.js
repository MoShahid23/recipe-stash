const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();

//get a post by ID
router.get("/post/:id", [
    check("id").isInt({ min: 1 }).withMessage("postId must be a positive integer."),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const postId = parseInt(req.params.id, 10);

    try {
        const result = await getPost(postId);

        //check if the post exists
        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Post #${postId} not found.`
            });
        }

        //respond with the post data
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        //handle server errors
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

//fetch post data from the database
async function getPost(postId) {
    const query = "CALL getRecipe(?)";
    const [results] = await db.query(query, [postId]);
    return results[0]; //return the first result
}

//get posts with optional filters
router.get("/posts", [
    check("number").optional().isInt({ min: 1, max: 50 }).withMessage("Number must be between 1 and 50."),
    check("offset").optional().isInt({ min: 0 }).withMessage("Offset must be a non-negative integer."),
    check("from").optional().isISO8601().toDate().withMessage("From must be a valid date."),
    check("to").optional().isISO8601().toDate().withMessage("To must be a valid date."),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const title = req.query.title || ""; //filter by title
    const username = req.query.username; //filter by username
    const tags = req.query.tags ? req.query.tags.split(",").map(tag => tag.trim()) : undefined; //filter by tags
    const from = req.query.from; //filter by start date
    const to = req.query.to; //filter by end date
    const number = Math.min(parseInt(req.query.number) || 10, 50); //limit the number of results
    const offset = Math.max(parseInt(req.query.offset) || 0, 0); //offset for pagination

    try {
        const results = await getPosts({ title, username, tags, from, to, number, offset });

        //respond with the filtered posts and pagination data
        res.status(200).json({
            success: true,
            data: results,
            pagination: {
                offset,
                limit: number,
                total: results.length
            }
        });
    } catch (error) {
        //handle server errors
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

//fetch posts from the database with filters
async function getPosts({ title = "", username, tags, from, to, number = 10, offset = 0, strict = false } = {}) {
    const queryParameters = [];
    const matchingRule = strict ? "=" : "LIKE"; //determine matching rule based on strictness

    tags = (tags==""||tags==undefined)?[]:tags;

    //callback function is simply assigning number of occurrences as value to key (array item, tag).
    const tagWeights = tags.reduce((obj, tag) => {
        obj[tag] = (obj[tag] || 0) + 1; //if tag exists, it will simply increment, otherwise it will initialize as 0 and then increment
        return obj;
    }, {/*begins as empty object*/});

    //SQL query with dynamic filters
    let query = `
        SELECT
            r.id,
            r.title,
            r.description,
            r.instructions,
            r.published,
            u.username,
            GROUP_CONCAT(DISTINCT t.name) AS tags,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('name', i.name, 'quantity', ri.quantity))
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = r.id
            ) AS ingredients,
            ${tags.length>0?`SUM(
                CASE
                    ${Object.keys(tagWeights).map(
                        (tag, idx) => `WHEN t.name = ? THEN ${Object.values(tagWeights)[idx]}`
                    ).join(" ")}
                    ELSE 0
                END
            ) AS tag_match_score`:
            "0 AS tag_match_score"}
        FROM recipes r
        JOIN users u ON r.author_id = u.id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        WHERE 1=1
    `;

    queryParameters.push(...Object.keys(tagWeights))

    //add filters dynamically to the query
    if (title) {
        query += " AND LOWER(r.title) LIKE ?";
        queryParameters.push(`%${title}%`);
    }

    if (username) {
        query += ` AND u.username ${matchingRule} ?`;
        queryParameters.push(matchingRule === "LIKE" ? `%${username}%` : username);
    }

    if (from || to) {
        if (from) {
            query += " AND r.published >= ?";
            queryParameters.push(from);
        }
        if (to) {
            query += " AND r.published <= ?";
            queryParameters.push(to);
        }
    }

    if (tags && tags.length > 0) {
        if (strict) {
            query += `
                AND r.id IN (
                    SELECT rt.recipe_id
                    FROM recipe_tags rt
                    JOIN tags t ON rt.tag_id = t.id
                    WHERE t.name IN (${Object.keys(tagWeights).map(() => "?").join(",")})
                    GROUP BY rt.recipe_id
                    HAVING COUNT(DISTINCT t.id) = ?
                )
            `;
            queryParameters.push(...Object.keys(tagWeights), Object.keys(tagWeights).length);
        } else {
            query += `
                AND r.id IN (
                    SELECT rt.recipe_id
                    FROM recipe_tags rt
                    JOIN tags t ON rt.tag_id = t.id
                    WHERE t.name IN (${Object.keys(tagWeights).map(() => "?").join(",")})
                    GROUP BY rt.recipe_id
                    HAVING SUM (
                        CASE
                            ${Object.keys(tagWeights).map((tag, idx) =>
                            `WHEN t.name = ? THEN ${Object.values(tagWeights)[idx]}`).join(" ")}
                            ELSE 0
                        END
                    ) > 0
                )
            `;
            queryParameters.push(...Object.keys(tagWeights), ...Object.keys(tagWeights));
        }
    }
    query += "GROUP BY r.id ORDER BY tag_match_score DESC LIMIT ? OFFSET ?";
    queryParameters.push(number, offset);

    //execute the query with parameters
    const [results] = await db.query(query, queryParameters);
    return results;
}

//get random posts
router.get("/posts/random/:number?", [
    check("number").optional().isInt({ min: 1, max: 50 }).withMessage("Number must be between 1 and 50."),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const number = Math.min(parseInt(req.params.number) || 10, 50); //limit the number of random posts
        const results = await getRandomRecipes(number);

        //respond with random posts
        res.status(200).json({
            success: true,
            data: results,
            limit: number,
            total: results.length
        });
    } catch (error) {
        //handle server errors
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

//fetch random posts from the database
async function getRandomRecipes(number = 10) {
    const query = `
        SELECT
            r.id,
            r.title,
            r.description,
            r.instructions,
            r.published,
            u.username,
            GROUP_CONCAT(DISTINCT t.name) AS tags,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('name', i.name, 'quantity', ri.quantity))
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = r.id
            ) AS ingredients
        FROM recipes r
        JOIN users u ON r.author_id = u.id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        GROUP BY r.id
        ORDER BY RAND() LIMIT ?;
    `;

    //execute the query with the limit parameter
    const [results] = await db.query(query, [number]);
    return results;
}

//export the functions and router
module.exports = { getPost, getPosts, getRandomRecipes, router };
