const mongoose = require('mongoose');

let productsSchema = new mongoose.Schema({
    images: [String],
    productName: String,
    description: String,
    ownedBy: String,
    type: String,
    price: Number,
    size: String,
    approvalStatus: String,
    availability: Boolean
})

let ProductsModel = mongoose.model('products', productsSchema);

module.exports = ProductsModel