const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const csv = require('csv-parser');
const { Stream } = require('stream');
require('dotenv').config({ path: '../.env' });

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

function getRandomMySQLTimestamp() {
    const start = new Date('2020-01-01T00:00:00Z').getTime();
    const end = Date.now();
    const randomTime = new Date(start + Math.random() * (end - start));
    return randomTime.toISOString().slice(0, 19).replace('T', ' ');
}

async function addPost(title, description, instructions, authorId, ingredients, tags, published) {
    const connection = await db.getConnection();
    try {
        // Start a transaction
        await connection.beginTransaction();

        // Insert the recipe
        const [recipeResult] = await connection.query(
            "INSERT INTO recipes (title, description, instructions, author_id, published) VALUES (?, ?, ?, ?, ?)",
            [title, description, instructions, authorId, published]
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
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE recipe_id=?",
                [recipeId, ingredientId, ingredient.quantity, recipeId]
            );
        }

        // Insert tags
        for (const tag of tags) {
            const [tagRow] = await connection.query(
                "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                [tag.toLowerCase()]
            );
            const tagId = tagRow.insertId;

            await connection.query(
                "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
                [recipeId, tagId]
            );
        }

        // Commit the transaction
        await connection.commit();
    } catch (err) {
        await connection.rollback(); // Rollback transaction on error
        console.error("Error inserting recipe:", err.message);
    } finally {
        connection.release(); // Release the connection back to the pool
    }
}

// Function to process the CSV
async function loadRecipesFromCSV(csvPath) {
    const recipes = [];
    const limit = 5000;

    console.log("Starting to process the CSV...");

    // Read and parse the CSV file
    return new Promise((resolve, reject) => {
        let stream = fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                // Transform the CSV row into a recipe object
                object = [];
                potIngredients = row.ingredients_quantity.split("  ");
                const ingredientsArray = [];
                row.ingredients_name.split(',').map((name) => {
                    for (const [index, ing] of potIngredients.entries()) {
                        if(ing.includes(name)){
                            let object = {
                                name: name,
                                quantity: ing.replace(name, "").replaceAll("  ", " ").replaceAll(" ,", ",")
                            };
                            potIngredients.splice(index, 1);
                            ingredientsArray.push(object);
                        }
                    }
                })
                recipes.push({
                    title: row.name,
                    description: row.description,
                    instructions: row.instructions,
                    ingredients: ingredientsArray,
                    tags: [row.cuisine, row.course, row.diet].filter(Boolean), // Ensure no empty tags
                    prepTime: parseFloat(row['prep_time (in mins)']),
                    cookTime: parseFloat(row['cook_time (in mins)']),
                });

                // Stop reading after 10,000 recipes
                if (recipes.length >= limit) {
                    resolve(recipes);
                    stream.destroy();
                }
            })
            .on('end', () => resolve(recipes))
            .on('error', reject);
    });
}

// Main function to handle everything
(async () => {
    try {
        const csvPath = path.join(__dirname, 'Food_Recipe.csv');
        const recipes = await loadRecipesFromCSV(csvPath);

        console.log(`Loaded ${recipes.length} recipes. Starting insertion...`);
        for (const recipe of recipes) {
            if((!recipe.tags.join(" ").includes("Indian") || Math.random() > 0.95)){ //balance data a bit more.
                const authorId = Math.round(Math.random() * 50) + 2; // Random author ID between 2 and 52
                await addPost(
                    recipe.title,
                    recipe.description,
                    recipe.instructions,
                    authorId,
                    recipe.ingredients,
                    recipe.tags,
                    getRandomMySQLTimestamp()
                );
            }
        }

        console.log("Successfully inserted recipes into the database.");
    } catch (err) {
        console.error("Error processing recipes:", err.message);
    } finally {
        db.end(); // Close the database connection
    }
})();
