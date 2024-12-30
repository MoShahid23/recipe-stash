const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const csv = require('csv-parser');
//.env expected to be setup in parent folder
require('dotenv').config({ path: '../.env' });

//mySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

//random timestamps
function getRandomTimestamp() {
    let start = new Date('2020-01-01T00:00:00Z').getTime();
    let end = Date.now();
    let randomTime = new Date(start + Math.random() * (end - start));
    return randomTime.toISOString().slice(0, 19).replace('T', ' ');
}

//main workflow, executes automatically
(async () => {
    let args = process.argv.slice(2);
    let seed = args[0] === 'seed';
    let limit = parseInt(args[1], 10) || 1000; //default limit to 1000 if not specified

    //paths to files
    let createDBScript = path.join(__dirname, 'create_db.sql');
    let populateDBScript = path.join(__dirname, 'populate_db.sql');
    let csvPath = path.join(__dirname, 'Food_Recipe.csv');

    //execute SQL file
    let executeSQLFile = (filePath) => {
        //exec, asynchronous, requires promise wrapper
        return new Promise((resolve, reject) => {
            let command = `mysql -h ${process.env.DB_HOST} -u root -p${process.env.DB_PASSWORD_ROOT} < "${filePath}"`;
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error executing ${filePath}:`, stderr);
                    reject(err);
                } else {
                    console.log(`${filePath} executed successfully.`);
                    resolve();
                }
            });
        });
    };

    //process CSV
    let loadRecipes = async (csvPath, limit) => {
        let recipes = [];
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    if (recipes.length >= limit) {
                        return; //stop processing when limit is reached
                    }

                    let ingredients = row.ingredients_name.split(',').map((name, index) => ({
                        name: name.trim(),
                        quantity: row.ingredients_quantity.split('  ')[index]?.trim() || ''
                    }));

                    recipes.push({
                        title: row.name,
                        description: row.description,
                        instructions: row.instructions.replaceAll(/\.([a-zA-Z])/g, ".\n\n$1"),
                        ingredients,
                        tags: [row.cuisine, row.course, row.diet].filter(Boolean),
                    });
                })
                .on('end', () => resolve(recipes))
                .on('error', (err) => reject(err));
        });
    };

    //add recipe to database
    let addPost = async (recipe) => {
        let connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            let [recipeResult] = await connection.query(
                "INSERT INTO recipes (title, description, instructions, author_id, published) VALUES (?, ?, ?, ?, ?)",
                [recipe.title, recipe.description, recipe.instructions, Math.ceil(Math.random() * 50) + 2, getRandomTimestamp()]
            );
            let recipeId = recipeResult.insertId;

            for (let ingredient of recipe.ingredients) {
                let [ingredientRow] = await connection.query(
                    "INSERT INTO ingredients (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                    [ingredient.name]
                );
                await connection.query(
                    "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE recipe_id=?",
                    [recipeId, ingredientRow.insertId, ingredient.quantity, recipeId]
                );
            }

            for (let tag of recipe.tags) {
                let [tagRow] = await connection.query(
                    "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
                    [tag.toLowerCase()]
                );
                await connection.query("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)", [recipeId, tagRow.insertId]);
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            //A common error is due to the character limit for some fields.
            //this is fine as the transaction ensures data integrity and enough recipes are added regardless.
            console.error("error inserting recipe:", err.message);
        } finally {
            connection.release();
        }
    };

    try {
        //execute create_db.sql
        await executeSQLFile(createDBScript);

        //if seed is true, execute populate_db.sql
        if (seed) {
            await executeSQLFile(populateDBScript);

            //load and process CSV
            console.log("loading recipes from CSV...");
            let recipes = await loadRecipes(csvPath, limit);

            console.log(`inserting ${recipes.length} recipes into the database...`);
            for (let recipe of recipes) {
                //personal preference to filter Indian recipes as database heavily leans towards indian cuisine.
                if (!recipe.tags.join(" ").includes("Indian") || Math.random() > 0.95) { // some will still come through
                    await addPost(recipe);
                }
            }

            console.log("all recipes have been inserted successfully.");
        }
    } catch (err) {
        console.error("error occurred:", err.message);
    } finally {
        db.end();
    }
})();
