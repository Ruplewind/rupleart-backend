let express = require('express');
let app = express.Router();
let mongoose = require('mongoose');
const bodyParser = require('body-parser');
const verifyToken = require('../middleware/authMiddleware');
const EventsModel = require('../models/EventsModel');
const urlEncoded = bodyParser.urlencoded({extended: false});
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For working with the file system
const path = require('path'); // For handling file paths

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, './uploads');
    },
    filename: (req, file, cb)=>{
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })

app.post('/add_event', verifyToken, upload.single('image'), (req, res)=>{
    let poster = req.file.filename;
    let title = req.body.title;
    let description= req.body.description;
    let date = req.body.date;
    let venue = req.body.venue;
    let price = req.body.price;

    EventsModel({poster, title, description, date, venue, price}).save()
    .then(()=>{
        res.json("Success");
    })
    .catch(err => {
        res.status(500).json("Failed");
    });
});

app.get('/events', (req, res)=>{
    EventsModel.find({})
    .then(data => {
        res.json(data);
    })
    .catch(err => {
        res.status(500).json("Error");
    })
});

app.delete("/delete_event/:id", verifyToken, urlEncoded, (req, res)=>{
    EventsModel.findByIdAndDelete(req.params.id)
    .then(data => {
        console.log("success");
        res.json("Success");
    })
    .catch(err =>{
        console.log(err);
        res.status(500).json("");
    })
})

app.put('/edit_event/:id', verifyToken, upload.single('image'), (req, res)=>{
    let id = req.params.id;
    let title = req.body.title;
    let description= req.body.description;
    let date = req.body.date;
    let venue = req.body.venue;
    let price = req.body.price;

    if(req.body.image){ // Image is retained
        let data = {
            title, date, price, description, venue
        }

        EventsModel.findByIdAndUpdate(id, data, {new: true})
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })

    }else{
        let poster = req.file.filename;
        let data = {
            poster, title, date, price, description, venue
        }

        EventsModel.findByIdAndUpdate(id, data, {new: true})
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })
    }
})

module.exports = app;