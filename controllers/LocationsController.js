let express = require('express');

let app = express.Router();

let mongoose = require('mongoose');

const bodyParser = require('body-parser');
const LocationsModel = require('../models/LocationsModel');
const verifyToken = require('../middleware/authMiddleware');

const urlEncoded = bodyParser.urlencoded({extended: false});

app.post('/add_location', urlEncoded, verifyToken, (req, res)=>{
    let town = req.body.town;
    let price = req.body.price;

    LocationsModel.findOne({ town : town})
    .then(data => {
        if(data){
            res.status(409).json("Duplicate record")
        }else{
            LocationsModel({ town, price}).save()
            .then(()=>{
                res.json("Success");
            })
            .catch(error => {
                res.status(500).json("Server error");
            })
        }
    })
})

app.get('/get_locations', (req, res)=>{
    LocationsModel.find()
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.status(500).json("Server error");
    })
})

app.get('/get_location/:id', verifyToken, (req, res)=>{
    LocationsModel.findOne({ _id: req.params.id})
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.status(500).json("Server error");
    })
})

app.put('/edit_location/:id', urlEncoded, verifyToken, (req, res)=>{
    LocationsModel.findByIdAndUpdate(req.params.id, { town: req.body.town, price: req.body.price}, { new: true})
    .then(data => {
        res.json("Success");
    })
    .catch(error => {
        res.status(500).json("Server error");
    });
})

app.delete('/del_location/:id', urlEncoded, verifyToken, (req, res)=>{
    LocationsModel.findByIdAndRemove(req.params.id)
    .then(data => {
        res.json("Success");
    })
    .catch(error => {
        res.status(500).json("Server error");
    });
})

module.exports = app;