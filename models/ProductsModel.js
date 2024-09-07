const mongoose = require('mongoose');

let productsSchema = new mongoose.Schema({
    image: String,
    productName: String,
    type: String,
    price: Number,
    xSmall: Boolean,
    small: Boolean,
    medium: Boolean,
    large: Boolean,
    xLarge: Boolean,
    xXLarge: Boolean,
    availability: Boolean
})

let ProductsModel = mongoose.model('products', productsSchema);

module.exports = ProductsModel