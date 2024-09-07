let express = require('express');

let app = express.Router();

let mongoose = require('mongoose');

const bodyParser = require('body-parser');

const OrdersModel = require('../models/OrdersModel');
const ProductsModel = require('../models/ProductsModel');

const urlEncoded = bodyParser.urlencoded({extended: false});

const unirest = require('unirest');
const VideosModel = require('../models/VideosModel');
const LocationsModel = require('../models/LocationsModel');
const verifyToken = require('../middleware/authMiddleware');

function accessToken(req, res, next){

    unirest('POST', 'https://pay.pesapal.com/v3/api/Auth/RequestToken')
    .headers({
        "Content-Type" : "application/json",
        "Accept" : "application/json"
    })
    .send({
        "consumer_key" : process.env.CONSUMER_KEY,
        "consumer_secret" : process.env.CONSUMER_SECRET
    })
    .end(response => {
        if (response.error) throw new Error(response.error);

        let token = response.raw_body.token

        req.access_token = token;

        next();
    });
}

function getTodayDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
}

//Register IPN callback URL
app.get('/RegisterIpn', accessToken, function(req, res){

    unirest('POST', 'https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN')
    .headers({
        "Content-Type" : "application/json",
        "Accept" : "application/json",
        "Authorization": "Bearer " + req.access_token
    })
    .send({
        "url" : process.env.SERVER_URL +  "/ipn_callback",
        "ipn_notification_type" : "POST"
    })
    .end(response => {
        if (response.error) throw new Error(response.error);
        console.log(response.raw_body);
        res.json(response.raw_body);
    });
    
})

const phoneRegex = /^0[0-9]{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//Submit Order Request
app.post('/Checkout', urlEncoded, accessToken, function(req, res){
    let date = getTodayDate();

    // Validate email
    if (!emailRegex.test(req.body.email)) {
        return res.status(400).json("Invalid email address");
    }

    // Validate phone number
    if (req.body.phoneNumber && !phoneRegex.test(req.body.phoneNumber)) {
        return res.status(400).json("Invalid phone number");
    }

    let received = {
        OrderTrackingId : "",
        first_name: req.body.firstname,
        second_name: req.body.secondname,
        email : req.body.email,
        phone_number : req.body.phoneNumber, 
        items : req.body.products,
        completion_status: "pending",
        deliveryLocation : req.body.location,
        delivery_status : "pending",
        order_date : date,
        delivery_date : "",
        min_price: req.body.minPrice,
        email_sent : false
    }

    let TotalPrice = 0;
    let location =  received.deliveryLocation;

    // Check if all items are videos    
    let allItemsAreVideos = received.items.every(item => item.title);

    if (allItemsAreVideos) {
        received.deliveryLocation = "NA";
        let delivery_cost = 0;

        let promises = received.items.map( item => {
            if(item.title){
                return VideosModel.findOne({ _id : item._id })
                .then(response => {
                    if(item.quantity < 1){
                        TotalPrice = TotalPrice + ( response.price * 1);
                    }else{
                        TotalPrice = TotalPrice + ( response.price * item.quantity);
                    }
                })
            }else{
                return ProductsModel.findOne({ _id : item._id })
                .then(response => {
                    if(item.quantity < 1){
                        TotalPrice = TotalPrice + ( response.price * 1);
                    }else{
                        TotalPrice = TotalPrice + ( response.price * item.quantity);
                    }
                })
            }
        })
    
        Promise.all(promises)
        .then(() => {
            received.total_price = TotalPrice;
            received.delivery_cost = delivery_cost;
            received.amount_paid = received.min_price;

            const grandTotal = received.total_price + received.delivery_cost;

            if(received.min_price < grandTotal){
                return res.status(400).json("Min price is invalid");
            }else{
                OrdersModel(received).save()
                .then(data => {
        
                    unirest('POST', 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest')
                    .headers({
                        'Content-Type':'application/json',
                        'Accept':'application/json',
                        'Authorization':'Bearer ' + req.access_token
                    })
                    .send({
                        "id": data._id, //order id
                        "currency": "KES",
                        "amount":  received.min_price,
                        "description": "Payment for Iko Nini Merch",
                        "callback_url": process.env.CLIENT_URL +  "/confirm",
                        "cancellation_url": process.env.CLIENT_URL + "/cancel", //Replace with frontend failed Page URL
                        "redirect_mode": "",
                        "notification_id": process.env.IPN_ID,
                        "branch": "Iko Nini - Nairobi",
                        "billing_address": {
                            "email_address": data.email,
                            "phone_number": data.phone_number,
                            "country_code": "KE",
                            "first_name": received.first_name,
                            "middle_name": "",
                            "last_name": received.second_name,
                            "line_1": "",
                            "line_2": "",
                            "city": "",
                            "state": "",
                            "postal_code": "",
                            "zip_code": ""
                        }
                    })
                    .end(response =>{
                        if (response.error) throw new Error(response.error);
        
                        //Update Order with tracking Id
                        OrdersModel.findOneAndUpdate({_id: data._id}, { OrderTrackingId: response.raw_body.order_tracking_id}, {new: false})
                        .then( data => {
                            res.json(response.raw_body)
                        })
                        .catch( err => {
                            res.status(500).json(err);
                        })
                    })
                })
                .catch(function(err){
                    res.status(500).json(err);
                })
            }
        })
        .catch(error => {
            console.log(error);
            // Handle errors here
            res.status(500).json("Server Error. Try again");
        });

    }else{
        LocationsModel.findById(location)
        .then(locationData => {
            let delivery_cost = locationData.price;
            let promises = received.items.map( item => {
                if(item.title){
                    return VideosModel.findOne({ _id : item._id })
                    .then(response => {
                        if(item.quantity < 1){
                            TotalPrice = TotalPrice + ( response.price * 1);
                        }else{
                            TotalPrice = TotalPrice + ( response.price * item.quantity);
                        }
                    })
                }else{
                    return ProductsModel.findOne({ _id : item._id })
                    .then(response => {
                        if(item.quantity < 1){
                            TotalPrice = TotalPrice + ( response.price * 1);
                        }else{
                            TotalPrice = TotalPrice + ( response.price * item.quantity);
                        }
                    })
                }
            })
            Promise.all(promises)
            .then(() => {
                received.total_price = TotalPrice;
                received.delivery_cost = delivery_cost;
                received.amount_paid = received.min_price;

                const grandTotal = received.total_price + received.delivery_cost;

                if(received.min_price < grandTotal){
                    return res.status(400).json("Min price is invalid");
                }else{
                    OrdersModel(received).save()
                    .then(data => {
            
                        unirest('POST', 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest')
                        .headers({
                            'Content-Type':'application/json',
                            'Accept':'application/json',
                            'Authorization':'Bearer ' + req.access_token
                        })
                        .send({
                            "id": data._id, //order id
                            "currency": "KES",
                            "amount":  received.min_price,
                            "description": "Payment for Iko Nini Merch",
                            "callback_url": process.env.CLIENT_URL +  "/confirm",
                            "cancellation_url": process.env.CLIENT_URL + "/cancel", //Replace with frontend failed Page URL
                            "redirect_mode": "",
                            "notification_id": process.env.IPN_ID,
                            "branch": "Iko Nini - Nairobi",
                            "billing_address": {
                                "email_address": data.email,
                                "phone_number": data.phone_number,
                                "country_code": "KE",
                                "first_name": received.first_name,
                                "middle_name": "",
                                "last_name": received.second_name,
                                "line_1": "",
                                "line_2": "",
                                "city": "",
                                "state": "",
                                "postal_code": "",
                                "zip_code": ""
                            }
                        })
                        .end(response =>{
                            if (response.error) throw new Error(response.error);
            
                            //Update Order with tracking Id
                            OrdersModel.findOneAndUpdate({_id: data._id}, { OrderTrackingId: response.raw_body.order_tracking_id}, {new: false})
                            .then( data => {
                                res.json(response.raw_body)
                            })
                            .catch( err => {
                                res.status(500).json(err);
                            })
                        })
                    })
                    .catch(function(err){
                        res.status(500).json(err);
                    })
                }
            })
            .catch(error => {
                console.log(error)
                // Handle errors here
                res.status(500).json("Server Error. Try again");
            });
        })
    }    
})

//Receives IPN notifcations
app.post('/ipn_callback', accessToken, urlEncoded, function(req, res){
    console.log(`${req.body.OrderTrackingId} ipn callback`);
    //Get transaction Status
    unirest('GET', `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${req.body.OrderTrackingId}`)
    .headers({
        "Content-Type" : "application/json",
        "Accept" : "application/json",
        "Authorization": "Bearer " + req.access_token
    })
    .end(response =>{
        if (response.error) throw new Error(response.error);

        let result = JSON.parse(response.raw_body);

        OrdersModel.findOneAndUpdate({OrderTrackingId: req.body.OrderTrackingId}, { completion_status: result.payment_status_description},{ new: false })
        .then( mongoData => {
            if (mongoData.email_sent) {
                console.log('Email already sent.');
                return res.json('success');  // If email already sent, just respond with success
            }

            if(mongoData.deliveryLocation == "NA"){
                const reformattedData = {
                    email: mongoData.email,
                    username: `${mongoData.first_name} ${mongoData.second_name}`,
                    delivery_location: "NA",
                    videos: mongoData.items
                        .filter(item => item.type === 'video')
                        .map((item, index) => ({
                            name: item.title,
                            price: Number(item.price),
                            video_id: item.id
                        })),
                    products: mongoData.items
                        .filter(item => item.type !== 'video')
                        .map(item => ({
                            name: item.productName,
                            price: Number(item.price),
                            image_link: `https://api.ikonini.live/uploads/${item.image}`,
                            quantity: Number(item.quantity),
                            size: item.size
                        })),
                    payment: {
                        transaction_id: mongoData.OrderTrackingId,
                        total_amount: Number(mongoData.amount_paid),
                        delivery_amount: Number(mongoData.delivery_cost)
                    }
                };
                
                if (result.payment_status_description.toLowerCase() == "completed") {
                    // Send Success email if paid
                unirest('POST', 'https://kajit.ikonini.live/send_one_time_link')
                .headers({
                    "Content-Type" : "application/json",
                    "X-ClientID": process.env.CLIENT_ID,
                    "X-ClientSecret": process.env.CLIENT_SECRET
                })
                .send(reformattedData)
                .end(response => {
                    if (response.error){
                        console.log(response.error);
                        throw new Error(response.error);
                    }else{
                        OrdersModel.findOneAndUpdate({OrderTrackingId: req.body.OrderTrackingId}, { email_sent: true},{ new: false })
                        .then(()=>{
                            console.log("Email sent succesfully");
                            res.json('success');
                        })
                        .catch(()=>{
                            res.status(500).json("Email not sent");
                        })
                    }
                });

                }
                
            }else{
                LocationsModel.findOne({ _id: mongoData.deliveryLocation})
                .then(LocationData => {
                    const reformattedData = {
                        email: mongoData.email,
                        username: `${mongoData.first_name} ${mongoData.second_name}`,
                        delivery_location: LocationData.town,
                        videos: mongoData.items
                            .filter(item => item.type === 'video')
                            .map((item, index) => ({
                                name: item.title,
                                price: Number(item.price),
                                video_id: item.id
                            })),
                        products: mongoData.items
                            .filter(item => item.type !== 'video')
                            .map(item => ({
                                name: item.productName,
                                price: Number(item.price),
                                image_link: `https://api.ikonini.live/uploads/${item.image}`,
                                quantity: Number(item.quantity),
                                size: item.size
                            })),
                        payment: {
                            transaction_id: mongoData.OrderTrackingId,
                            total_amount: Number(mongoData.total_price),
                            delivery_amount: Number(mongoData.delivery_cost)
                        }
                    };

                    if (result.payment_status_description.toLowerCase() == "completed") {
                            // Send Success email if paid
                            unirest('POST', 'https://kajit.ikonini.live/send_one_time_link')
                            .headers({
                                "Content-Type" : "application/json",
                                "X-ClientID": process.env.CLIENT_ID,
                                "X-ClientSecret": process.env.CLIENT_SECRET
                            })
                            .send(reformattedData)
                            .end(response => {
                                if (response.error){
                                    console.log(response.error);
                                    throw new Error(response.error);
                                }else{
                                    OrdersModel.findOneAndUpdate({OrderTrackingId: req.body.OrderTrackingId}, { email_sent: true},{ new: false })
                                    .then(()=>{
                                        console.log("Email sent succesfully");
                                        res.json('success');
                                    })
                                    .catch(()=>{
                                        res.status(500).json("Email not sent");
                                    })
                                }
                            });
                        }
                    })
                    .catch(error => {
                        res.status(500).json("Server error");
                    })
            }

            
        })
        .catch(err =>{
            console.log(err);
            res.status(500).json(err);
        })
    })
})

app.get('/ConfirmPayment/:id', urlEncoded, function(req, res){

    //Check if Id is valid mongo Id
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
    {
        res.json('Invalid Id')
    }else{
        OrdersModel.findById(req.params.id)
        .then(data => {
            if(data){ //Check id data has been found
                if(data.completion_status === "Completed"){
                    res.status(200).json('Completed')
                }else if(data.completion_status === "Failed"){
                    res.status(402).json('Failed')
                }else if(data.completion_status === "pending"){
                    res.status(409).json('Pending')
                }

            }else{
                res.status(404).json('Order Does Not Exist');
            }
        })
        .catch(err => {
            res.status(500).json('Server Error');  
        })
    }
})

//Get registered IPNs for Particular Merchant
app.get('/RegisteredIpns', accessToken, function(req, res){
    unirest('GET', 'https://pay.pesapal.com/v3/api/URLSetup/GetIpnList')
    .headers({
        "Content-Type" : "application/json",
        "Accept" : "application/json",
        "Authorization": "Bearer " + req.access_token
    })
    .end(response => {
        if (response.error) throw new Error(response.error);

        res.json(response.raw_body)
    });
})

//Get Delivered Orders
app.get('/GetAllOrders', verifyToken, function(req, res){
    OrdersModel.find({ completion_status: "Completed"})
    .then( data =>{ 
        res.json(data);
    })
    .catch(err =>{
        console.log(err);
    })
})

app.get('/GetDeliveredOrders', verifyToken, function(req, res){
    OrdersModel.find({ delivery_status: 'delivered' })
    .then( data =>{ 
        res.json(data);
    })
    .catch(err =>{
        console.log(err);
    })
})

//Get Orders Pending Delivery
app.get('/GetPendingOrders', verifyToken, function(req, res){
    OrdersModel.find({$and:[{ delivery_status: 'pending' },{completion_status: 'Completed'}]})
    .then( data =>{ 
        res.json(data);
    })
    .catch(err =>{
        console.log(err);
    })
})

//Update Orders On Delivery
app.put('/update_delivery/:id', urlEncoded, verifyToken, function(req, res){
    let date = getTodayDate(); 
    OrdersModel.findByIdAndUpdate(req.params.id,{delivery_status:'delivered', delivery_date: date }, {new: true})
    .then(data => {
        res.json('success')
    })
    .catch(err => console.log('error'))
});


module.exports = app;