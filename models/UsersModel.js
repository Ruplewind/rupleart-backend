const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    email: String,
    first_name: String,
    second_name: String,
    password: String,
    phoneNumber: String,
    accountType: String,
    firstTime: Boolean,
    referralCode: String,
    canPostAds: { type: Boolean, default: false },
})


let UsersModel = mongoose.model('users', userSchema);

module.exports = UsersModel