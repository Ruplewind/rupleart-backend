let mongoose = require('mongoose');

let EventsSchema =  new mongoose.Schema({
    poster: String,
    title : String,
    description: String,
    date: String,
    venue: String,
    price: Number
})

let EventsModel = mongoose.model('events', EventsSchema);

module.exports = EventsModel