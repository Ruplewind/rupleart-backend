const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    email: String,
    first_name: String,
    second_name: String,
    password: String,
    phoneNumber: String,
    accountType: String
})


let UsersModel = mongoose.model('users', userSchema);

module.exports = UsersModel