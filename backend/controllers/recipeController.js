const RecipeSchema = require('../modals/RecipeSchema');


const saveToFavorite = async (req, res) => {
    try {
        const { userId, recipeId, title, image, cookTime, servings } = req.body;

        if (!userId || !recipeId || !title) {
            return res.status(400).json({ error: "Missing required fields" });
        }


        // Check if recipe already exists in favorites
        const existingRecipe = await RecipeSchema.findOne({ userId, recipeId });
        if (existingRecipe) {
            return res.status(400).json({ message: 'Recipe already in favorites' });
        }

        // Create unique id for the recipe
        const id = `${userId}_${recipeId}_${Date.now()}`;

        const newRecipe = new RecipeSchema({
            id,
            userId,
            recipeId,
            title,
            image,
            cookTime,
            servings
        });

        const savedRecipe = await newRecipe.save();
        res.status(201).json({success:true, message: 'Recipe added to favorites', recipe: savedRecipe });
    } catch (error) {
        res.status(500).json({success:false, message: 'Error saving recipe', error: error.message });
    }
};

const getAllFavorite = async (req, res) => {
    try {
        const { userId } = req.params;

        const favoriteRecipes = await RecipeSchema.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({success:true, recipes: favoriteRecipes, count: favoriteRecipes.length });
    } catch (error) {
        res.status(500).json({ success:false,message: 'Error fetching favorite recipes', error: error.message });
    }
};

const deleteFavoriteItem = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const recipe = await RecipeSchema.findOneAndDelete({ id, userId });
        if (!recipe) {
            return res.status(404).json({success:false, message: 'Recipe not found' });
        }
        res.status(200).json({ success:true,message: 'Recipe deleted from favorites' });

    } catch (error) {
        res.status(500).json({success:false, message: 'Error deleting recipe', error: error.message });
    }
};

module.exports = {
    saveToFavorite,
    getAllFavorite,
    deleteFavoriteItem
}