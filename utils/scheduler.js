const axios = require('axios');
require('dotenv').config();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

async function fetchRandomRecipes(number = 5) {
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
            recipesFetched.push({
                title: recipe.title,
                description: `${(recipe.summary || 'No description available.').replaceAll("<b>", "").replaceAll("</b>", "").split(".")[0]}.`,
                ingredients: ingredients,
                instructions: (instructions || 'No instructions provided.')+ "\n<a href='${recipe.spoonacularSourceUrl}'>This recipe is written by ${recipe.sourceName} and provided by Spoonacular</a>",
                published: (recipe.datePublished || new Date()).toISOString().slice(0, 19).replace('T', ' '),
                username: 'RecipeStash',
                tags: tags
            })
        }
        console.log(recipesFetched);
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

//schedule task for midnight, daily
function startScheduler() {
    //fetchRandomRecipes(1);
    console.log('Daily recipe fetch scheduled.');
}






module.exports = {
    startScheduler,
};
