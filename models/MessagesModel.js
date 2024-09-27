let mongoose = require('mongoose');

let MessagesSchema =  new mongoose.Schema({
    name: String,
    email : String,
    message: String,
    date: String
})

let MessagesModel = mongoose.model('messages', MessagesSchema);

module.exports = MessagesModel