const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    email: String,
    password: String
})


let UsersModel = mongoose.model('users', userSchema);

module.exports = UsersModel