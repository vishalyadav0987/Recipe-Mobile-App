const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    id:{
        type: String,
        required: true
    },
    userId:{
        type: String,
        required: true
    },
    recipeId:{
        type: Number,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    image:{
        type: String,
    },
     cookTime:{
        type: String,
     },
     servings:{
        type: String,
     }
},{timestamps:true});


module.exports = mongoose.model('Recipe', RecipeSchema);  //export the model