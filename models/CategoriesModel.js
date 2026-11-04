const mongoose = require('mongoose');

let categorySchema = new mongoose.Schema({
    category: String,
    // When true, any order containing a product from this category must
    // include recipient/delivery details at checkout (used for Flowers)
    requiresRecipientDetails: { type: Boolean, default: false },
})

let CategoriesModel = mongoose.model('categories', categorySchema);

module.exports = CategoriesModel