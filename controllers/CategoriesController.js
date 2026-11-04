let express = require('express');

let app = express.Router();

let mongoose = require('mongoose');

const bodyParser = require('body-parser');
const CategoriesModel = require('../models/CategoriesModel');
const verifyToken = require('../middleware/authMiddleware');
const ProductsModel = require('../models/ProductsModel');

const urlEncoded = bodyParser.urlencoded({extended: false});

const toBool = (v) => v === true || v === 'true';

app.post('/add_category', urlEncoded, verifyToken, (req, res)=>{
    let category = req.body.category.trim();
    const requiresRecipientDetails = toBool(req.body.requiresRecipientDetails);

    CategoriesModel.findOne({ category })
    .then(data => {
        if(data){
            res.status(409).json("Duplicate record")
        }else{
            CategoriesModel({ category, requiresRecipientDetails }).save()
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
    const newName = req.body.category.trim();
    const update = { category: newName };
    // Only touch the flag if the admin sent it, so older admin clients don't reset it
    if (req.body.requiresRecipientDetails !== undefined) {
        update.requiresRecipientDetails = toBool(req.body.requiresRecipientDetails);
    }

    CategoriesModel.findByIdAndUpdate(req.params.id, update, { new: false})
    .then(data => {
        let previousCategory = data.category;
        ProductsModel.updateMany({ type: previousCategory}, {$set : { type: newName }}, {multi: true})
        .then(()=>{
            res.json("Success");
        })
        .catch(error => {
            res.status(500).json("Server Error. Error updating products categories.");
        });
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