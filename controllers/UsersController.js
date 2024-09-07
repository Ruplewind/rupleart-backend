let express = require('express');

let app = express.Router();

const bodyParser = require('body-parser');

const urlEncoded = bodyParser.urlencoded({extended: false});

const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const UsersModel = require('../models/UsersModel');

const verifyToken = require('../middleware/authMiddleware');

const saltRounds = 10;

const someOtherPlaintextPassword = 'niniiko';

const master_password = process.env.MASTER_PASSWORD; // we should have user roles instead of master passwords

//Add Users
app.post('/add_user', urlEncoded, verifyToken, function(req, res){
    
    const myPlaintextPassword = req.body.password;
    const user_master_password = req.body.master_password;

    if(master_password !== user_master_password){
        res.status(401).json("Wrong credential");
    }else{
        //Check if Users exists
        UsersModel.find({email: req.body.email})
        .then(data =>{
            if(data.length > 0){
                res.status(409).json('Exists')
            }else{
                    bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
                        // Store hash in your password DB.
                        UsersModel({ email: req.body.email, password: hash}).save()
                        .then( data =>{
                            res.json('Added');
                        })
                        .catch(err =>{
                            res.status(500).json('Not Added')
                        })
                    });
            }
        })
        .catch(err => console.log(err))
    }
    
})


//Get Userss
app.get('/Users', verifyToken, function(req, res){
    UsersModel.find()
    .then(data =>{
        res.json(data);    
    })
    .catch(err => console.log(err))
})

//Delete Users
app.delete('/delete/:master_password/:id', urlEncoded, verifyToken, function(req, res){

    const user_master_password = req.params.master_password;

    if(master_password !== user_master_password){
        res.status(401).json("Wrong credential");
    }else{
        UsersModel.findByIdAndDelete(req.params.id)
        .then(result =>{
            res.json('success');
        })
        .catch( err => console.log(err) )
    }
})


//Login
app.post('/login', urlEncoded, function(req, res){
    UsersModel.findOne({email: req.body.email})
    .then(data =>{
        if(data){
            bcrypt.compare(req.body.password, data.password, function(err, result) {
                if(result){
                    const token = jwt.sign({ userId: data._id }, process.env.MASTER_PASSWORD, {
                        expiresIn: '1d',
                        });
                    res.json(token)
                }else{
                    res.status(401).json('Wrong Credentials')
                }
            })

        }else{
            res.status(401).json('Wrong Credentails')
        }
    })
});

app.post('/change_password', urlEncoded, verifyToken, function(req, res){
    const user_master_password = req.body.master_password;
    const new_password = req.body.new_password;
    const user_id = req.body.user_id;

    if(master_password !== user_master_password){
        res.status(401).json("Wrong credential");
    }else{
        bcrypt.hash(new_password, saltRounds, function(err, hash) {
            // Store hash in your password DB.
            UsersModel.findByIdAndUpdate(user_id, { password: hash}, { new: true})
            .then( data =>{
                res.json('Added');
            })
            .catch(err =>{
                res.status(500).json('Not Added')
            })
        })
    }   
})

module.exports = app