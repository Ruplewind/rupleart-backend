let express = require('express');
let app = express.Router();
const bodyParser = require('body-parser');
const urlEncoded = bodyParser.urlencoded({extended: false});
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/UsersModel');
const verifyToken = require('../middleware/authMiddleware');
const saltRounds = 10;
const master_password = process.env.MASTER_PASSWORD; // we should have user roles instead of master passwords

app.post('/user_login', urlEncoded, function(req, res){
    UsersModel.findOne({$and: [{email: req.body.email},{ accountType: 'user'}]})
    .then(data =>{
        if(data){
            bcrypt.compare(req.body.password, data.password, function(err, result) {
                if(result){
                    const token = jwt.sign({ userId: data._id }, process.env.MASTER_PASSWORD, {
                        expiresIn: '1d',
                        });
                    res.json({ token: token, userId: data._id, first_name: data.first_name, second_name: data.second_name, email: data.email, phoneNumber: data.phoneNumber })
                }else{
                    res.status(401).json('Wrong Credentials')
                }
            })

        }else{
            res.status(401).json('Wrong Credentails')
        }
    })
});

app.post('/register_user', urlEncoded, (req, res)=>{
    UsersModel.find({$or: [{email: req.body.email},{ phoneNumber : req.body.phoneNumber}]})
        .then(data =>{
            if(data.length > 0){
                res.status(409).json('Exists')
            }else{
                    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
                        // Store hash in your password DB.
                        UsersModel({ email: req.body.email, first_name: req.body.first_name, second_name: req.body.data.second_name, password: hash, phoneNumber: req.body.phoneNumber, accountType: 'user'}).save()
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
});

app.post('/change_user_password', urlEncoded, verifyToken, function(req, res){
    const current_password = req.body.current_password;
    const new_password = req.body.new_password;
    const user_id = req.body.user_id;

    UsersModel.findOne({_id: user_id})
    .then(data =>{
        if(data){
            bcrypt.compare(current_password, data.password, function(err, result) {
                if(result){

                    bcrypt.hash(new_password, saltRounds, function(err, hash) {
                        // Store hash in your password DB.
                        UsersModel.findByIdAndUpdate(user_id, {password: hash}, { new: true}).save()
                        .then( data =>{
                            res.json('Password Updated');
                        })
                        .catch(err =>{
                            res.status(500).json('Not Added')
                        })
                    });
                }else{
                    res.status(401).json('Wrong Credentials')
                }
            })

        }else{
            res.status(401).json('Wrong Credentails')
        }
    })
});

//Add Users
app.post('/add_admin_user', urlEncoded, verifyToken, function(req, res){
    
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
                        UsersModel({ email: req.body.email, password: hash, accountType: 'admin', first_name: req.body.first_name, second_name: req.body.second_name, phoneNumber: req.body.phoneNumber}).save()
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

//Get Admin Users
app.get('/admin_users', verifyToken, function(req, res){
    UsersModel.find({ accountType: 'admin'})
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
app.post('/admin_login', urlEncoded, function(req, res){
    UsersModel.findOne({$and: [{email: req.body.email},{ accountType: 'admin'}]})
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

app.post('/change_admin_password', urlEncoded, verifyToken, function(req, res){
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