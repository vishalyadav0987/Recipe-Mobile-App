const express = require('express');
const { saveToFavorite, getAllFavorite, deleteFavoriteItem } = require('../controllers/recipeController');

const router = express.Router();

// POST - Add recipe to favorites
router.post('/favorites', saveToFavorite);

// GET - Get all favorite recipes for a user
router.get('/favorites/:userId', getAllFavorite);

// DELETE - Remove recipe from favorites
router.delete('/favorites/:id/:userId', deleteFavoriteItem);

module.exports = router;
