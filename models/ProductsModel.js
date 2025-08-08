const mongoose = require('mongoose');

let productsSchema = new mongoose.Schema({
    image: [String],
    productName: String,
    description: String,
    ownedBy: String,
    type: String,
    price: Number,
    size: String,
    approvalStatus: Number,
    availability: Boolean,
    disapproval_reason: String
})

let ProductsModel = mongoose.model('products', productsSchema);

module.exports = ProductsModel