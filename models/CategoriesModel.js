const mongoose = require('mongoose');

let categorySchema = new mongoose.Schema({
    category: String,
})


let CategoriesModel = mongoose.model('categories', categorySchema);

module.exports = CategoriesModel