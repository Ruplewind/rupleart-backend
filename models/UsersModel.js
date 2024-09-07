const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    email: String,
    password: String,
    acccountType: String,
    phoneNumber: String
})


let UsersModel = mongoose.model('users', userSchema);

module.exports = UsersModel