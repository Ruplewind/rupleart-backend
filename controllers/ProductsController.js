let express = require('express');
let app = express.Router();
const bodyParser = require('body-parser');
const urlEncoded = bodyParser.urlencoded({extended: false});
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For working with the file system
const path = require('path'); // For handling file paths
const ProductsModel = require('../models/ProductsModel');
const verifyToken = require('../middleware/authMiddleware');
const UsersModel = require('../models/UsersModel');

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, './uploads');
    },
    filename: (req, file, cb)=>{
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

app.get('/get_all_products', (req, res)=>{
    ProductsModel.find({availability: true})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
});

app.get('/get_unapproved_products', (req, res)=>{
    ProductsModel.find({approvalStatus: false})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
});

app.get('/get_products/:user_id', (req, res)=>{
    ProductsModel.find({ownedBy: req.params.user_id})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
})

app.get('/get_products/:type', (req, res)=>{
    ProductsModel.find({$and: [{availability: true},{type: req.params.type}]})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
})

app.post('/add_product', verifyToken, upload.single('image'), (req, res)=>{
    let image = req.file.filename;
    let productName  = req.body.productName;
    let description = req.body.description;
    let ownedBy = req.body.user_id;
    let type = req.body.type;
    let price = req.body.price;
    let size = req.body.size;

    let data = {
        image, type, productName, price, description, ownedBy, size, availability : true
    }

    UsersModel.findOne({ _id: ownedBy})
    .then(user => {
        let approvalStatus = false;

        if(user.accountType == 'admin'){
            approvalStatus = true;
        }

        ProductsModel({...data, approvalStatus: approvalStatus}).save()
        .then(()=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(400).json('failed');
        })
    })
    .catch(err => {
        res.status(500).json("Internal Server Error");
    });    
})

app.put('/edit_product/:id', verifyToken, upload.single('image'), (req, res)=>{
    let id = req.params.id;
    let productName  = req.body.productName;
    let description = req.body.description;
    let ownedBy = req.body.user_id;
    let type = req.body.type;
    let price = req.body.price;
    let size = req.body.size;

    if(req.body.image){ // Image is retained
        let data = {
            type, productName, price, description, ownedBy, size
        }

        ProductsModel.findByIdAndUpdate(id, data, {new: true})
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })

    }else{
        let image = req.file.filename;
        let data = {
            image, type, productName, price, description, ownedBy, size
        }

        ProductsModel.findByIdAndUpdate(id, data, {new: true})
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })
    }
})

app.delete('/del_product/:id', urlEncoded, verifyToken, (req, res)=>{
    ProductsModel.findByIdAndRemove(req.params.id)
    .then(()=>{
        res.status(200).json('success');
    })
    .catch(err => {
        res.status(400).json('failed');
    })
})

app.post('/approve_product/:id', urlEncoded, verifyToken, (req, res)=>{
    let approval_value = req.body.approval_value;
    let disapproval_reason = req.body.disapproval_reason;
    let approval_status = false;

    if(approval_value == 1){
        approval_status = true;
    }else if(approval_value == 0){
        approval_status = false;
    }

    ProductsModel.findByIdAndUpdate(req.params.id, { approvalStatus: approval_status, disapproval_reason }, {new: true})
    .then(()=>{
        res.status(200).json('success');
    })
    .catch(err => {
        res.status(400).json('failed');
    })
})

app.post('/change_availability/:id', urlEncoded, verifyToken, (req, res)=>{
    ProductsModel.findByIdAndUpdate(req.params.id, { availability: req.body.value }, {new: true})
    .then(()=>{
        res.status(200).json('success');
    })
    .catch(err => {
        res.status(400).json('failed');
    })
})

module.exports = app;