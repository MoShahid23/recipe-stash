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
            let tags = [
                ...(recipe.dishType || []),
                ...(recipe.cuisines || []),
                ...(recipe.diets || []),
                ...(recipe.occasions || [])
            ]
            tags = tags.join(",").toLowerCase();

            let ingredients = [];
            recipe.extendedIngredients.map(ing => ingredients.push({"name":ing.name, "quantity":ing.amount+" "+ing.unit}));

            let instructions;
            if(recipe.instructions){
                instructions = recipe.analyzedInstructions[0].steps.map(steps => `${steps.number}. ${steps.step}`).join("\n");
            }
            recipesFetched.push({
                title: recipe.title,
                description: `${(recipe.summary || 'No description available.').replaceAll("<b>", "").replaceAll("</b>", "").split(".")[0]}.`,
                ingredients: ingredients,
                instructions: (instructions || 'No instructions provided.')+ `\n<a href='${recipe.spoonacularSourceUrl}'>This recipe is written by ${recipe.sourceName} and provided by Spoonacular</a>`,
                published: (recipe.datePublished || new Date()).toISOString().slice(0, 19).replace('T', ' '),
                username: 'RecipeStash',
                tags: tags
            })
        }
        return recipesFetched;
    } catch (error) {
        console.error('Error fetching or storing recipes:', error);
        console.log(error.message);
    }
}

module.exports = { apiRandomRecipes };