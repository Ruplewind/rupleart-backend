let express = require('express');

let app = express.Router();

let mongoose = require('mongoose');

const bodyParser = require('body-parser');
const CategoriesModel = require('../models/CategoriesModel');
const verifyToken = require('../middleware/authMiddleware');

const urlEncoded = bodyParser.urlencoded({extended: false});

app.post('/add_category', urlEncoded, verifyToken, (req, res)=>{
    let category = req.body.category;

    CategoriesModel.findOne({ category : category})
    .then(data => {
        if(data){
            res.status(409).json("Duplicate record")
        }else{
            CategoriesModel({ category }).save()
            .then(()=>{
                res.json("Success");
            })
            .catch(error => {
                res.status(500).json("Server error");
            })
        }
    })
})

app.get('/get_categories', (req, res)=>{
    CategoriesModel.find()
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.status(500).json("Server error");
    })
})

app.get('/get_category/:id', verifyToken, (req, res)=>{
    CategoriesModel.findOne({ _id: req.params.id})
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.status(500).json("Server error");
    })
})

app.put('/edit_category/:id', urlEncoded, verifyToken, (req, res)=>{
    CategoriesModel.findByIdAndUpdate(req.params.id, { category: req.body.category }, { new: true})
    .then(data => {
        res.json("Success");
    })
    .catch(error => {
        res.status(500).json("Server error");
    });
})

app.delete('/del_category/:id', urlEncoded, verifyToken, (req, res)=>{
    CategoriesModel.findByIdAndRemove(req.params.id)
    .then(data => {
        res.json("Success");
    })
    .catch(error => {
        res.status(500).json("Server error");
    });
})

module.exports = app;