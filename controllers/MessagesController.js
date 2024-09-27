let express = require('express');
let app = express.Router();
let mongoose = require('mongoose');
const bodyParser = require('body-parser');
const urlEncoded = bodyParser.urlencoded({extended: false});
const unirest = require('unirest');
const verifyToken = require('../middleware/authMiddleware');
const MessagesModel = require('../models/MessagesModel');

app.post('/send_message', urlEncoded, (req, res)=>{
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0];

    let name = req.body.name;
    let email = req.body.email;
    let message = req.body.message;

    MessagesModel({ name, email, message, date: formattedDate}).save()
    .then(()=>{
        res.json("Successs");
    })
    .catch(err => {
        res.status(500).json();
    })
});

app.get('/messages', verifyToken, (req, res)=>{
    MessagesModel.find({})
    .then((data)=>{
        res.json(data);
    })
    .catch(err => {
        res.status(500).json("Failed");
    })
});


module.exports = app;