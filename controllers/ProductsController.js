let express = require('express');
let app = express.Router();
const bodyParser = require('body-parser');
const urlEncoded = bodyParser.urlencoded({limit: '50mb', extended: false});
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For working with the file system
const path = require('path'); // For handling file paths
const ProductsModel = require('../models/ProductsModel');
const verifyToken = require('../middleware/authMiddleware');
const UsersModel = require('../models/UsersModel');
const nodemailer  = require('nodemailer');

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, './uploads');
    },
    filename: (req, file, cb)=>{
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const ProductApprovedMailTemplate  = (product) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Product has been approved</title>
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
            background-color: #C8F761;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            display: block;
            margin: 0 auto;
            text-decoration: none;
            color: black;
            width: 30%;
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
          <div class="logo">RupleArt</div>
  
          <div class="title">Product Approval Alerts</div>
  
          <div class="content">
            <p>Yay! Your product has been approved. It can now be accessed by buyers on the Site!</p>

            <p>Here are the product details</p>
  
            <div class="credentials">
              <table>
                <tr>
                  <td>Products name:</td>
                  <td>${product.productName}</td>
                </tr>
                <tr>
                  <td>Description:</td>
                  <td>${product.description}</td>
                </tr>
                <tr>
                  <td>Size:</td>
                  <td>${product.size}</td>
                </tr>
                <tr>
                  <td>Price:</td>
                  <td>${product.price}</td>
                </tr>
              </table>
            </div>
  
            <div class="sign">
              <a href="https://rupleart.com/" class="signin-btn">Sign In</a>
            </div>
          </div>
  
          <div class="footer">
            <p>Ruple Wind Limited</p>
            <p class="disclaimer">Please do not reply to this email. This mailbox is not monitored.</p>
          </div>
        </div>
      </body>
  
      </html>
      `;
}

const ProductRecalledMailTemplate  = (product) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Product Approval has been recalled</title>
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
          background-color: #C8F761;
          text-align: center;
          padding: 10px;
          border-radius: 5px;
          display: block;
          margin: 0 auto;
          text-decoration: none;
          color: black;
          width: 30%;
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
        <div class="logo">RupleArt</div>

        <div class="title">Product Approval Alerts</div>

        <div class="content">
          <p>Your product approval has been recalled for further verification. You will get a response within 24hrs!</p>

          <p>Here are the product details</p>

          <div class="credentials">
            <table>
              <tr>
                <td>Products name:</td>
                <td>${product.productName}</td>
              </tr>
              <tr>
                <td>Description:</td>
                <td>${product.description}</td>
              </tr>
              <tr>
                <td>Size:</td>
                <td>${product.size}</td>
              </tr>
              <tr>
                <td>Price:</td>
                <td>${product.price}</td>
              </tr>
            </table>
          </div>

          <div class="sign">
            <a href="https://rupleart.com/" class="signin-btn">Sign In</a>
          </div>
        </div>

        <div class="footer">
          <p>Ruple Wind Limited</p>
          <p class="disclaimer">Please do not reply to this email. This mailbox is not monitored.</p>
        </div>
      </div>
    </body>

    </html>
    `;
}

const ProductNotApprovedMailTemplate  = (product, reason) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Product has been failed approval</title>
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
            background-color: #C8F761;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            display: block;
            margin: 0 auto;
            text-decoration: none;
            color: black;
            width: 30%;
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
          <div class="logo">RupleArt</div>
  
          <div class="title">Product Approval Alerts</div>
  
          <div class="content">
            <p>Oops! Your product has failed approval due to the following reason</p>

            <div class="credentials">
              <table>
                <tr>
                  <td>Reason:</td>
                  <td>${reason}</td>
                </tr>
            </table>
            </div>

            <p>To reapply for approval, login in <a href="https://rupleart.com/">here</a> and edit the product to satisfy the reason above and then submit.</p>

            <p>Your application will be reviewed in 24 hrs and a response communicated to you</p>

            <p>Here are the product details</p>
  
            <div class="credentials">
              <table>
                <tr>
                  <td>Products name:</td>
                  <td>${product.productName}</td>
                </tr>
                <tr>
                  <td>Description:</td>
                  <td>${product.description}</td>
                </tr>
                <tr>
                  <td>Size:</td>
                  <td>${product.size}</td>
                </tr>
                <tr>
                  <td>Price:</td>
                  <td>${product.price}</td>
                </tr>
              </table>
            </div>
  
            <div class="sign">
              <a href="https://rupleart.com/" class="signin-btn">Sign In</a>
            </div>
          </div>
  
          <div class="footer">
            <p>Ruple Wind Limited</p>
            <p class="disclaimer">Please do not reply to this email. This mailbox is not monitored.</p>
          </div>
        </div>
      </body>
  
      </html>
      `;
}

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


const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

app.get('/get_single_product/:id', (req, res)=>{
  ProductsModel.findOne({_id: req.params.id})
  .then((data)=>{
      res.status(200).json(data);
  })
  .catch(err => {
      res.status(400).json('error');
  })
});

app.get('/get_all_products', (req, res)=>{
    ProductsModel.find()
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
});

app.get('/get_approved_products', (req, res)=>{
    ProductsModel.find({ approvalStatus: 1})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
});

app.get('/my_products', verifyToken, (req, res) => {
    let user_id = req.userId;
    UsersModel.findOne({ _id: user_id })
        .then(response => {
            if (response.accountType == 'admin') {
                // Find all products owned by admins
                UsersModel.find({ accountType: 'admin' })
                    .then(adminUsers => {
                        const adminIds = adminUsers.map(user => user._id); // Extract the ids of all admins
                        ProductsModel.find({ ownedBy: { $in: adminIds } })
                            .then((data) => {
                                res.status(200).json(data);
                            })
                            .catch(err => {
                                res.status(400).json('error');
                            });
                    })
                    .catch(err => {
                        res.status(400).json('error');
                    });
            } else {
                // Find only products owned by this user
                ProductsModel.find({ ownedBy: user_id })
                    .then((data) => {
                        res.status(200).json(data);
                    })
                    .catch(err => {
                        res.status(400).json('error');
                    });
            }
        })
        .catch(err => {
            res.status(400).json('error');
        });
});


app.get('/get_unapproved_products', (req, res)=>{
    ProductsModel.find({approvalStatus: 0})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
});

app.get('/get_products/:type', (req, res)=>{
    ProductsModel.find({$and: [{availability: true},{type: req.params.type}]})
    .then((data)=>{
        res.status(200).json(data);
    })
    .catch(err => {
        res.status(400).json('error');
    })
})

app.post('/add_product', upload.array('image'), verifyToken, (req, res)=>{
    let image = req.files ? req.files.map(file => file.filename) : [];
    let productName  = req.body.productName;
    let description = req.body.description;
    let ownedBy = req.userId;
    let type = req.body.type.charAt(0).toUpperCase() + req.body.type.slice(1).toLowerCase();
    let price = req.body.price;
    let size = req.body.size;

    let data = {
        image, type, productName, price, description, ownedBy, size, availability : true
    }

    let nextId = 1000;

    ProductsModel.findOne().sort({ productId: -1 }).limit(1)
    .then(lastProduct => {
      if (lastProduct) {
          nextId = lastProduct.productId + 1;
      } else {
        nextId = 1000;
      }
    })
    .then(()=>{
          UsersModel.findOne({ _id: ownedBy})
          .then(user => {
              let approvalStatus = 0;

              if(user.accountType == 'admin'){
                  approvalStatus = 1;
              }

              ProductsModel({...data, approvalStatus: approvalStatus, productId : nextId}).save()
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
    .catch(err => console.error(err));       
})

// app.put('/assign_product_ids', async (req, res) => {
//   try {
//     // Fetch all products (sorted alphabetically by _id for consistency)
//     const products = await ProductsModel.find({}).sort({ _id: 1 });

//     if (products.length === 0) {
//       return res.status(200).json("No products found.");
//     }

//     let counter = 1000; // starting ID
//     let updatedCount = 0;

//     for (const product of products) {
//       product.productId = counter;
//       await product.save();
//       counter++;
//       updatedCount++;
//     }

//     res.status(200).json(`${updatedCount} products updated with product IDs.`);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json("Internal Server Error");
//   }
// });

app.put('/edit_product/:id', upload.array('image'), verifyToken, async (req, res)=>{
    let id = req.params.id;
    let productName  = req.body.productName;
    let description = req.body.description;
    let type = req.body.type.charAt(0).toUpperCase() + req.body.type.slice(1).toLowerCase();
    let price = req.body.price;
    let size = req.body.size;

    let data = {
      type, productName, price, description, size, approvalStatus : 0
    }

    const incomingImages = req.body.image
  
    let images = [];
  
    if (Array.isArray(incomingImages)) {
      images = [...images, ...incomingImages]
  
    } else if (typeof incomingImages === 'string') {
      images.push(incomingImages)
    }

    try {
      const product = await ProductsModel.findById(id);
      
      if (!product) {
        return res.status(404).json('Product not found');
      }
  
      if (req.files && req.files.length > 0) {
        let filenames = req.files.map(file => file.filename);
        data.image = [...images, ...filenames];
      }else{
        data.image = images;
      }
  
      const updatedProduct = await ProductsModel.findByIdAndUpdate(id, data, { new: true });
      res.status(200).json('success');
    } catch (err) {
      console.error(err);
      res.status(500).json('failed');
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
    let disapproval_reason = req.body.dissapprovalReason;

    ProductsModel.findByIdAndUpdate(req.params.id, { approvalStatus: approval_value, disapproval_reason }, {new: true})
    .then((data)=>{
        let ownerId = data.ownedBy;

        UsersModel.findOne({_id: ownerId})
        .then(result => {

            if(approval_value == 1)
            {
                const options = {
                    from: `RupleArt <${process.env.EMAIL_USER}>`, // sender address
                    to: `${result.email}`, // receiver email
                    subject: "Your Product Has been approved", // Subject line
                    html: ProductApprovedMailTemplate(data),
                }
                // Send Email
                SENDMAIL(options, (info) => {
                    console.log("Email sent successfully");
                    console.log("MESSAGE ID: ", info.messageId);
                    res.status(200).json('success');
                });
            }else if(approval_value == 2){
                const options = {
                    from: `RupleArt <${process.env.EMAIL_USER}>`, // sender address
                    to: `${result.email}`, // receiver email
                    subject: "Your Product Has failed approval", // Subject line
                    html: ProductNotApprovedMailTemplate(data, disapproval_reason),
                }
        
                // Send Email
                SENDMAIL(options, (info) => {
                    console.log("Email sent successfully");
                    console.log("MESSAGE ID: ", info.messageId);
                    res.status(200).json('success');
                });
            }else{
              const options = {
                    from: `RupleArt <${process.env.EMAIL_USER}>`, // sender address
                    to: `${result.email}`, // receiver email
                    subject: "Product Approval has Beeen Recalled For Further Verification", // Subject line
                    html: ProductRecalledMailTemplate(data),
                }
                // Send Email
                SENDMAIL(options, (info) => {
                    console.log("Email sent successfully");
                    console.log("MESSAGE ID: ", info.messageId);
                    res.status(200).json('success');
                });
            }
        })
        .catch(err => {
            res.json(err);
        })
        
    })
    .catch(err => {
        res.status(400).json('failed');
    })
})

app.post('/change_availability/:id', urlEncoded, verifyToken, (req, res)=>{
    const initiator_id = req.userId;
    
    ProductsModel.findById(req.params.id)
    .then((product)=>{
        UsersModel.findById(initiator_id)
        .then(user => {
            if(initiator_id != product.ownedBy || user.accountType != "admin") // Check if initiator owns product or is an admin
            {
              res.status(401).json("Unauthorized");
            }
            else
            {
              ProductsModel.findByIdAndUpdate(req.params.id, { availability: req.body.value }, {new: true})
              .then(()=>{
                  res.status(200).json('success');
              })
              .catch(err => {
                  res.status(500).json('failed');
              })
            }
        })
        .catch(err => {
            res.status(400).json('failed');
        })
    })
    .catch(err => {
        res.status(400).json('failed');
    })
})

module.exports = app;