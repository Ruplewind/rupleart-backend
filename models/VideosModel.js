const mongoose = require('mongoose');

let videosSchema = new mongoose.Schema({
    id: Number,
    title: String,
    type: String,
    hours: Number,
    minutes: Number,
    thumbnail: String,
    price: Number
})


let VideosModel = mongoose.model('videos', videosSchema);

module.exports = VideosModel