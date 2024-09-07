let express = require('express');

let app = express.Router();

const bodyParser = require('body-parser');

const urlEncoded = bodyParser.urlencoded({extended: false});

const multer = require('multer'); // For handling file uploads

const fs = require('fs'); // For working with the file system

const path = require('path'); // For handling file paths
const VideosModel = require('../models/VideosModel');
const verifyToken = require('../middleware/authMiddleware');
const unirest = require('unirest');

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, './uploads');
    },
    filename: (req, file, cb)=>{
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

app.post('/add_video', verifyToken, upload.single('thumbnail'), async (req, res)=>{
    let thumbnail = req.file.filename;
    let type = "video";
    let hours = req.body.hours;
    let minutes = req.body.minutes;
    let title = req.body.title;
    let price = req.body.price;

    let count = await VideosModel.countDocuments().then( count =>{
        const newCount = count + 1;
        VideosModel({ id: newCount, thumbnail, title, type, hours, minutes, price }).save()
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(400).json('success');
        })
    });
})

app.put('/edit_video/:id', verifyToken, upload.single('thumbnail'), (req, res)=>{
    let hours = req.body.hours;
    let minutes = req.body.minutes;
    let title = req.body.title;
    let price = req.body.price;
    let id = req.params.id;

    if(req.body.thumbnail){ // Image is retained
        VideosModel.findByIdAndUpdate(id, { title, hours, minutes, price }, { new: true })
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })
    }else{ // New Image
        let thumbnail = req.file.filename;
        VideosModel.findByIdAndUpdate(id, { thumbnail, title, hours, minutes, price }, { new: true })
        .then((response)=>{
            res.status(200).json('success');
        })
        .catch(err => {
            res.status(500).json('success');
        })
    }   
})

app.get('/get_videos', (req, res)=>{
    VideosModel.find({})
    .then((response)=>{
        res.json(response);
    })
    .catch(()=>{
        res.status(400).json('failed');
    })
})

app.delete('/del_video/:id', verifyToken, (req, res)=>{
    VideosModel.findByIdAndRemove(req.params.id)
    .then(()=>{
        unirest('DELETE', 'https://kajit.ikonini.live/delete_video')
        .headers({
            "Content-Type" : "application/json",
            "X-ClientID": process.env.CLIENT_ID,
            "X-ClientSecret": process.env.CLIENT_SECRET
        })
        .end(response => {
            if (response.error) {
                console.error("error deleting video", response.error);
            }
        });
        res.status(200).json('success');
    })
    .catch(()=>{
        res.status(400).json('success');
    })
});

app.get('/get_upload_url', verifyToken, (req, res)=>{
    
    const inputType = req.body.input_type;

    const uploadParams = {
        input_type: "paid",
    };

    unirest('POST', 'https://kajit.ikonini.live/get_upload_url') // changed this to https://LIVE_URL/get_upload_url
    .headers({
        'X-ClientID': process.env.CLIENT_ID,
        'X-ClientSecret': process.env.CLIENT_SECRET
    })
    .send(uploadParams)
    .end(response => {
        if (response.error) {
            console.error('GET error', response.error);
        } else {
            res.json(response.body);
        }
    });
})

module.exports = app;