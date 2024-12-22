const axios = require('axios');
require('dotenv').config();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

async function apiRandomRecipes(number) {
    const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/random/`;
    let recipesFetched = [];
    try {
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                number: number,
            },
        });

        const recipes = response.data.recipes;

        for (let recipe of recipes) {
            recipesFetched.push(await processRecipe(recipe));
        }
        return recipesFetched;
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

async function getRecipe(id){
    try {
        const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/${id}/information`;
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                includeNutrition:false
            },
        });
        return await processRecipe(response.data);
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

async function processRecipe(recipe){
    let tags = [
        ...(recipe.dishType || []),
        ...(recipe.cuisines || []),
        ...(recipe.diets || []),
        ...(recipe.occasions || [])
    ];

    let insertTagQuery = `
        INSERT INTO tags (name) VALUES (?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
    `;

    let insertRecipeTagQuery = `
        INSERT INTO spoonacular_recipe_tags (recipe_id, tag_id) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE recipe_id = recipe_id;
    `;

    for (let tag of tags) {
        // Insert the tag and get its ID
        await db.query(insertTagQuery, [tag]);
        let tagIdResult = await db.query(`SELECT LAST_INSERT_ID() AS tag_id;`);
        let tagId = tagIdResult[0][0].tag_id;

        console.log(`Tag ID for "${tag}":`, tagId);

        // Associate the tag with the recipe
        await db.query(insertRecipeTagQuery, [recipe.id, tagId]);
    }


    tags = tags.join(",").toLowerCase();

    let ingredients = [];
    recipe.extendedIngredients.map(ing => ingredients.push({"name":ing.name, "quantity":ing.amount+" "+ing.unit}));

    let instructions;
    if(recipe.instructions){
        instructions = recipe.analyzedInstructions[0].steps.map(steps => `${steps.number}. ${steps.step}`).join("\n");
    }

    return({
        id: recipe.id,
        title: recipe.title,
        description: `${(recipe.summary || 'No description available.').replaceAll("<b>", "").replaceAll("</b>", "").split(".")[0]}.`,
        ingredients: ingredients,
        instructions: (instructions || 'No instructions provided.')+ `\n<a href='${recipe.spoonacularSourceUrl}'>This recipe is written by ${recipe.sourceName} and provided by Spoonacular</a>`,
        published: (recipe.datePublished || new Date()).toISOString().slice(0, 19).replace('T', ' '),
        username: 'RecipeStash',
        tags: tags
    })
}

module.exports = { apiRandomRecipes, getRecipe };