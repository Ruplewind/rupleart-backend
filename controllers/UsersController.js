let express = require('express');
let app = express.Router();
const bodyParser = require('body-parser');
const urlEncoded = bodyParser.urlencoded({extended: false});
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/UsersModel');
const verifyToken = require('../middleware/authMiddleware');
const saltRounds = 10;
const master_password = process.env.MASTER_PASSWORD; // we should have user roles instead of master passwords
let nodemailer = require('nodemailer');
const crypto = require('crypto');

app.post('/user_login', urlEncoded, function(req, res){
    UsersModel.findOne({$and: [{email: req.body.email},{ accountType: 'user'}]})
    .then(data =>{
        if(data){
            bcrypt.compare(req.body.password, data.password, function(err, result) {
                if(result){
                    const token = jwt.sign({ userId: data._id }, process.env.MASTER_PASSWORD, {
                        expiresIn: '7d',
                        });
                    res.json({ token: token, userId: data._id, first_name: data.first_name, second_name: data.second_name, email: data.email, phoneNumber: data.phoneNumber, firstTime: data.firstTime })
                }else{
                    res.status(401).json('Wrong Credentials')
                }
            })

        }else{
            res.status(401).json('Wrong Credentails')
        }
    })
});

app.post('/user_m_login', urlEncoded, function(req, res){
    UsersModel.findOne({$and: [{email: req.body.email},{ accountType: 'user'}]})
    .then(data =>{
        if(data){
            bcrypt.compare(req.body.password, data.password, function(err, result) {
                if(result){
                    const token = jwt.sign({ userId: data._id }, process.env.MASTER_PASSWORD, {
                        expiresIn: 31449600,
                        });
                    res.json({ token: token, userId: data._id, first_name: data.first_name, second_name: data.second_name, email: data.email, phoneNumber: data.phoneNumber, firstTime: data.firstTime })
                }else{
                    res.status(401).json('Wrong Credentials')
                }
            })

        }else{
            res.status(401).json('Wrong Credentails')
        }
    })
});

app.get("/profile", urlEncoded, verifyToken, (req, res)=>{
    let userId = req.userId;

    UsersModel.findOne({_id: userId})
    .then(data => {
        res.json({
            first_name: data.first_name, second_name: data.second_name, email: data.email, phoneNumber: data.phoneNumber
        });
    })
    .catch(err => {
        res.status(500).json(err);
        console.log(err);
    })
});

app.put("/update_profile", urlEncoded, verifyToken, (req, res)=>{
    let userId = req.userId;
    let data = req.body;

    UsersModel.findByIdAndUpdate({_id: userId}, { first_name: data.firstname, second_name: data.secondname, phoneNumber: data.phoneNumber }, { new:true})
    .then(data => {
        res.json("Success");
    })
    .catch(err => {
        res.status(500).json(err);
        console.log(err);
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
                        UsersModel({ email: req.body.email, first_name: req.body.first_name, second_name: req.body.second_name, password: hash, phoneNumber: req.body.phoneNumber, accountType: 'user'}).save()
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

app.put('/change_user_password', urlEncoded, verifyToken, function(req, res){
    const current_password = req.body.current_password;
    const new_password = req.body.new_password;
    const user_id = req.userId;

    UsersModel.findOne({_id: user_id})
    .then(data =>{
        if(data){
            bcrypt.compare(current_password, data.password, function(err, result) {
                if(result){

                    bcrypt.hash(new_password, saltRounds, function(err, hash) {
                        // Store hash in your password DB.
                        UsersModel.findByIdAndUpdate(user_id, {password: hash, firstTime: false}, { new: true})
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

//Get Regular Users
app.get('/regular_users', verifyToken, function(req, res){
    UsersModel.find({ accountType: 'user'})
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


const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
});

const SENDMAIL = async (mailDetails, callback) => {
    try {
      const info = await transporter.sendMail(mailDetails)
      callback(info);
    } catch (error) {
      console.log(error);
    } 
};

function generateStrongPassword(user_id, timestamp, email) {
    // Combine the inputs to create a seed for randomness
    const seed = user_id + timestamp + email;

    // Use crypto to create a hash based on the seed
    const hash = crypto.createHash('sha256').update(seed).digest('hex');

    // Take the first 8 characters from the hash to create the password
    const password = hash.substring(0, 8);


    return password;
}

function generateRandomNumber() {
    const seed = Date.now();
    const random = Math.floor(seed * Math.random() * 90000) + 10000;
    return random % 90000 + 10000; // Ensures a 5-digit number
}

const RESET_EMAIL_TEMPLATE  = (password) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Password</title>
        <style>
        .container {
            margin-top: 10px;
        }

        .logo {
            font-weight: bold;
            padding: 20px;
            text-align: center;
        }

        .title {
            padding: 20px;
            text-align: center;
            background-color: #EEF2FE;
            font-weight: bold;
            font-size: 28px;
        }
  
        .content {
            text-align: center;
            background-color: #FAFAFA;
            padding: 20px;
        }
  
        .credentials {
            display: flex;
            justify-content: center;
            margin: 0 auto;
            margin-bottom: 30px;
        }
  
        table {
            font-weight: bold;
            padding: 15px;
            margin: 0 auto;
            margin-top: 20px;
            text-align: left;
            width: 30%;
        }
  
        table td {
            padding-right: 10px;
            font-weight: lighter;
            font-size: 16px;
        }
  
        .sign {
            display: flex;
            justify-content: center;
            color: black;
        }

        .signin-btn {
            background-color: #4A148C;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            display: block;
            margin: 0 auto;
            text-decoration: none;
            color: white !important;
            width: 30%;
        }
        .signin-btn a {
            color: white !important;
            text-decoration: none;
            display: block;
        }
  
        .footer {
            background-color: black;
            text-align: center;
            color: white;
            padding: 30px;
            margin-top: 20px;
        }

        .footer p {
            margin: 0;
        }

        .disclaimer {
            font-size: 12px;
            margin-top: 20px;
        }
        </style>
      </head>
  
      <body>
        <div class="container">
          <div class="logo">RUPLEART</div>
  
          <div class="title">Password reset</div>
  
          <div class="content">
            <p>Sign in to Rupleart using the following password:</p>
  
            <div class="credentials">
              <table>
                  <td>Password:</td>
                  <td>${password}</td>
                </tr>
              </table>
            </div>
  
            <div class="sign">
              <a href="https://rupleart.com/login" class="signin-btn">Sign In</a>
            </div>
          </div>
  
          <div class="footer">
            <p>RupleWind Limited</p>
            <p class="disclaimer">Please do not reply to this email. This mailbox is not monitored.</p>
          </div>
        </div>
      </body>
  
      </html>
      `;
}

app.post('/forgot_password', urlEncoded, (req, res)=>{
    let email = req.body.email;
  
    UsersModel.findOne({email: email})
    .then(data => {
        if(data){
            //Generate Password
            const generatedPassword = generateStrongPassword(data._id, generateRandomNumber(), email);
  
            const options = {
                from: `RUPLE ART <${process.env.EMAIL_USER}>`, // sender address
                to: `${email}`, // receiver email
                subject: "Password Reset", // Subject line
                html: RESET_EMAIL_TEMPLATE(generatedPassword),
            }
  
            // Send Email
            SENDMAIL(options, (info) => {
                console.log("Email sent successfully");
                console.log("MESSAGE ID: ", info.messageId);
            });
  
            bcrypt.hash(generatedPassword, saltRounds, function(err, hash) {
                // Store hash in your password DB.
                UsersModel.findOneAndUpdate({email: email},{ password: hash, firstTime: true},{new: true})
                .then( data =>{
                    res.json('Sent');
                })
                .catch(err =>{
                    res.status(401).json('Not Sent')
                })
            });
        }else{
            res.status(401).json('Account Does not Exist');
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json('Server Error');
    })
  
})

app.get('/token_validity', verifyToken, (req, res)=>{
    res.status(200).json("Valid");
})

module.exports = app