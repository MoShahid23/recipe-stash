const axios = require('axios');
require('dotenv').config(); //load environment variables from .env file

//API Key for Spoonacular API
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

//fetches a specified number of random recipes from the Spoonacular API
async function getRandomRecipes(number) {
    const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/random/`;
    let recipesFetched = [];
    try {
        //fetch random recipes from Spoonacular API
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                number: number,
            },
        });

        const recipes = response.data.recipes;

        //process each recipe and add it to the array
        for (let recipe of recipes) {
            recipesFetched.push(await processRecipe(recipe));
        }
        return recipesFetched;
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

//fetches detailed information for a single recipe by ID
async function getRecipe(id) {
    try {
        const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/${id}/information`;
        //fetch recipe information from Spoonacular API
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                includeNutrition: false, //exclude nutritional information for simplicity
            },
        });
        return await processRecipe(response.data);
    } catch (error) {
        console.error('Error fetching or storing recipe:', error);
        console.log(error.message);
    }
}

//fetches detailed information for multiple recipes by their IDs
async function getRecipeBulk(ids) {
    const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/informationBulk`;
    let recipesFetched = [];
    try {
        //fetch bulk recipe information from Spoonacular API
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                includeNutrition: false, //exclude nutritional information
                ids: ids,
            },
        });

        const recipes = response.data;

        //process each recipe and add it to the array
        for (let recipe of recipes) {
            recipesFetched.push(await processRecipe(recipe));
        }
        return recipesFetched;
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

//processes a recipe object to a custom format
async function processRecipe(recipe) {
    //combine various tag arrays and normalize
    let tags = [
        ...(recipe.dishType || []),
        ...(recipe.cuisines || []),
        ...(recipe.diets || []),
        ...(recipe.occasions || []),
    ];

    //sQL queries for inserting tags and associating them with recipes
    let insertTagQuery = `
        INSERT INTO tags (name) VALUES (?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
    `;

    let insertRecipeTagQuery = `
        INSERT INTO spoonacular_recipe_tags (recipe_id, tag_id) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE recipe_id = recipe_id;
    `;

    for (let tag of tags) {
        //insert the tag and retrieve its ID
        await db.query(insertTagQuery, [tag]);
        let tagIdResult = await db.query(`SELECT LAST_INSERT_ID() AS tag_id;`);
        let tagId = tagIdResult[0][0].tag_id;

        //associate the tag with the recipe in the database
        await db.query(insertRecipeTagQuery, [recipe.id, tagId]);
    }

    //join tags into a single string and normalize to lowercase
    tags = tags.join(",").toLowerCase();

    //extract and format ingredients
    let ingredients = [];
    recipe.extendedIngredients.map(ing => ingredients.push({
        "name": ing.name,
        "quantity": ing.amount + " " + ing.unit,
    }));

    //extract and format instructions
    let instructions;
    if (recipe.instructions) {
        instructions = recipe.analyzedInstructions[0].steps
            .map(steps => `${steps.number}. ${steps.step}`)
            .join("\n");
    }

    //return a custom formatted recipe object
    return {
        id: recipe.id,
        title: recipe.title,
        description: `${(recipe.summary || 'No description available.')
            .replaceAll("<b>", "")
            .replaceAll("</b>", "")
            .split(".")[0]}.`,
        ingredients: ingredients,
        instructions: (instructions || 'No instructions provided.') +
            `\n\n<a target="_blank" class='recipe-credit' href='${recipe.spoonacularSourceUrl}'>This recipe is authored by ${recipe.sourceName} and accessed through Spoonacular</a>`,
        published: (recipe.datePublished || new Date()).toISOString().slice(0, 19).replace('T', ' '),
        username: 'RecipeStash',
        tags: tags,
    };
}

module.exports = { getRandomRecipes, getRecipe, getRecipeBulk };