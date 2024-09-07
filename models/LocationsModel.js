const mongoose = require('mongoose');

let locationsSchema = new mongoose.Schema({
    town: String,
    price: Number
})


let LocationsModel = mongoose.model('locations', locationsSchema);

module.exports = LocationsModel