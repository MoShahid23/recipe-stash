const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_URL = `https://api.spoonacular.com/recipes/random/`;

// Function to fetch and store 10 random recipes
async function fetchAndStoreRandomRecipes() {
    try {
        const response = await axios.get(SPOONACULAR_URL, {
            params: {
                apiKey: SPOONACULAR_API_KEY,
                number: 1,
            },
        });

        const recipes = response.data.recipes;
        console.log(response);
        console.log(recipes);

        for (let recipe of recipes) {
            let tags = [
                ...(recipe.dishType || []),
                ...(recipe.cuisines || []),
                ...(recipe.diets || []),
                ...(recipe.occasions || [])
            ]
            tags = tags.join(",").toLowerCase();

            let ingredients = recipe.extendedIngredients.map(ing => `${ing.amount} ${ing.unit}#q#${ing.originalName}`).join("#p#");

            let instructions;
            if(recipe.instructions){
                instructions = recipe.analyzedInstructions[0].steps.map(steps => `${steps.number}. ${steps.step}`).join("\n");
            }
            const result = await global.db.promise().query(
                'CALL addSpoonacularRecipe(?, ?, ?, ?, ?, ?, ?)',
                [
                    recipe.title,
                    `${(recipe.summary || 'No description available.').replaceAll("<b>", "").replaceAll("</b>", "").split(".")[0]}.`,
                    ingredients,
                    (instructions || 'No instructions provided.')+ "\n<a href='${recipe.spoonacularSourceUrl}'>This recipe is written by ${recipe.sourceName} and provided by Spoonacular</a>",
                    (recipe.datePublished || new Date()).toISOString().slice(0, 19).replace('T', ' '),
                    'RecipeStash',
                    tags
                ]
            );
        }

        console.log('10 random recipes successfully fetched and stored.');
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

//schedule task for midnight, daily
function startScheduler() {
    fetchAndStoreRandomRecipes();
    //cron.schedule('22 16 * * *', fetchAndStoreRandomRecipes);
    console.log('Daily recipe fetch scheduled.');
}

module.exports = {
    startScheduler,
};
