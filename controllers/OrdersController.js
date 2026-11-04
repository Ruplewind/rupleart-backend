let express = require('express');
let app = express.Router();
let mongoose = require('mongoose');
const bodyParser = require('body-parser');
const OrdersModel = require('../models/OrdersModel');
const ProductsModel = require('../models/ProductsModel');
const urlEncoded = bodyParser.urlencoded({extended: false});
const unirest = require('unirest');
const LocationsModel = require('../models/LocationsModel');
const verifyToken = require('../middleware/authMiddleware');
const UsersModel = require('../models/UsersModel');
const CategoriesModel = require('../models/CategoriesModel');

function accessToken(req, res, next){
    unirest('POST', `${process.env.LIVE_BASE_URL}/api/Auth/RequestToken`)
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

    unirest('POST', `${process.env.LIVE_BASE_URL}/api/URLSetup/RegisterIPN`)
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

// Flowers need a recipient and a same-day window, so mixing them with artworks
// (which ship to the buyer's own location) is blocked. Set to true to allow it.
const ALLOW_MIXED_CARTS = false;
const MAX_NOTE_LENGTH = 250;
// Optional: hour (0-23, Nairobi time) after which same-day is refused, e.g. SAME_DAY_CUTOFF_HOUR=14
const SAME_DAY_CUTOFF_HOUR = parseInt(process.env.SAME_DAY_CUTOFF_HOUR, 10);

const toBool = (v) => v === true || v === 'true';

function nairobiHour() {
    return parseInt(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi', hour: '2-digit', hourCycle: 'h23'
    }).format(new Date()), 10);
}

// Returns { error } or { value } with cleaned data
function buildFlowerDetails(d) {
    if (!d || typeof d !== 'object') return { error: "Delivery details are required for flower orders" };

    const sameDay = toBool(d.sameDay);
    const recipientName = (d.recipientName || '').trim();
    const recipientPhone = (d.recipientPhone || '').trim();
    const recipientAddress = (d.recipientAddress || '').trim();
    const note = (d.note || '').trim();
    const preferredDate = (d.preferredDate || '').trim();

    if (!recipientName) return { error: "Recipient name is required" };
    if (!phoneRegex.test(recipientPhone)) return { error: "Invalid recipient phone number" };
    if (recipientAddress.length < 5) return { error: "Delivery address is required" };
    if (note.length > MAX_NOTE_LENGTH) return { error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer` };
    if (!toBool(d.acknowledgedAvailability)) {
        return { error: "Please confirm the recipient will be available to receive the delivery" };
    }
    if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
        return { error: "Invalid preferred delivery date" };
    }
    if (sameDay && !isNaN(SAME_DAY_CUTOFF_HOUR) && nairobiHour() >= SAME_DAY_CUTOFF_HOUR) {
        return { error: "Same-day delivery is no longer available for today. Please choose another day." };
    }

    return {
        value: {
            sameDay,
            preferredDate: sameDay ? '' : preferredDate,
            recipientName,
            recipientPhone,
            recipientAddress,
            note,
            acknowledgedAvailability: true,
        }
    };
}

//Submit Order Request
//Submit Order Request
app.post('/Checkout', urlEncoded, accessToken, verifyToken, async function(req, res){
    let date = getTodayDate();
    const TAX_RATE = 0.015;

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
        user_id: req.userId,
        items : req.body.products,
        completion_status: "pending",
        deliveryLocation : req.body.location,
        delivery_status : "pending",
        order_date : date,
        delivery_date : "",
        tax: req.tax,
        min_price: req.body.minPrice,
        phoneNumber: req.body.phoneNumber
    }

    try {
        const locationData = await LocationsModel.findById(received.deliveryLocation);
        if (!locationData) return res.status(400).json("Invalid delivery location");
        const delivery_cost = locationData.price;

        // Look up every product once (prices come from the DB, never the client)
        const lines = await Promise.all(received.items.map(async (item) => {
            const product = await ProductsModel.findOne({ _id: item._id });
            if (!product) return null;
            return { product, qty: item.quantity < 1 ? 1 : item.quantity };
        }));
        if (lines.some(l => l === null)) {
            return res.status(400).json("One or more products no longer exist");
        }

        const TotalPrice = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

        // Which of these products belong to a category that needs recipient details?
        const types = [...new Set(lines.map(l => l.product.type))];
        const flowerCats = await CategoriesModel.find({
            category: { $in: types },
            requiresRecipientDetails: true
        });
        const flowerTypes = new Set(flowerCats.map(c => c.category));

        const flowerLines = lines.filter(l => flowerTypes.has(l.product.type));
        const hasFlowers = flowerLines.length > 0;

        if (hasFlowers) {
            if (!ALLOW_MIXED_CARTS && flowerLines.length !== lines.length) {
                return res.status(400).json("Flowers must be ordered separately from other items");
            }
            const result = buildFlowerDetails(req.body.flowerDetails);
            if (result.error) return res.status(400).json(result.error);

            received.hasFlowers = true;
            received.flowerDelivery = result.value;
        }

        received.total_price = TotalPrice;
        received.delivery_cost = delivery_cost;
        received.amount_paid = received.min_price;

        const tax = (received.total_price + received.delivery_cost) * TAX_RATE;
        const grandTotal = received.total_price + received.delivery_cost + tax;

        if(received.min_price < grandTotal){
            return res.status(400).json("Min price is invalid");
        }

        const user = await UsersModel.findOne({ _id: received.user_id });
        const data = await OrdersModel(received).save();

        unirest('POST', `${process.env.LIVE_BASE_URL}/api/Transactions/SubmitOrderRequest`)
        .headers({
            'Content-Type':'application/json',
            'Accept':'application/json',
            'Authorization':'Bearer ' + req.access_token
        })
        .send({
            "id": data._id, //order id
            "currency": "KES",
            "amount":  received.min_price,
            "description": hasFlowers ? "Payment for Flowers" : "Payment for Artworks",
            "callback_url": process.env.CLIENT_URL +  "/confirm",
            "cancellation_url": process.env.CLIENT_URL + "/cancel",
            "redirect_mode": "",
            "notification_id": process.env.IPN_ID,
            "branch": "Ruple Art - Nairobi",
            "billing_address": {
                "email_address": user.email,
                "phone_number": received.phoneNumber, // user.phoneNumber
                "country_code": "KE",
                "first_name": user.first_name,
                "middle_name": "",
                "last_name": user.second_name,
                "line_1": "",
                "line_2": "",
                "city": "",
                "state": "",
                "postal_code": "",
                "zip_code": ""
            }
        })
        .end(response =>{
            if (response.error) {
                console.log(response.error);
                return res.status(500).json("Payment request failed. Try again");
            }

            //Update Order with tracking Id
            OrdersModel.findOneAndUpdate({_id: data._id}, { OrderTrackingId: response.raw_body.order_tracking_id}, {new: false})
            .then( () => {
                res.json(response.raw_body)
            })
            .catch( err => {
                res.status(500).json(err);
            })
        })
    } catch (error) {
        console.log(error);
        res.status(500).json("Server Error. Try again");
    }
})

//Receives IPN notifcations
app.post('/ipn_callback', accessToken, urlEncoded, function(req, res){
    console.log(`${req.body.OrderTrackingId} ipn callback`);
    //Get transaction Status
    unirest('GET', `${process.env.LIVE_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${req.body.OrderTrackingId}`)
    .headers({
        "Content-Type" : "application/json",
        "Accept" : "application/json",
        "Authorization": "Bearer " + req.access_token
    })
    .end(response =>{
        if (response.error) throw new Error(response.error);

        let result = JSON.parse(response.raw_body);

        OrdersModel.findOneAndUpdate({OrderTrackingId: req.body.OrderTrackingId}, { completion_status: result.payment_status_description, confirmation_code: result.confirmation_code},{ new: false })
        .then( mongoData => {     
            if (result.payment_status_description.toLowerCase() == "completed") {
                UsersModel.findOne({ _id: mongoData.user_id})
                .then(user => {
                    // Send Success email if paid
                    res.json("Success");
                })
                .catch(err => {
                    res.status(500).json("Server Error");
                });
            }else{
                res.json("Not succesfully paid");
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
    unirest('GET', `${process.env.LIVE_BASE_URL}/api/URLSetup/GetIpnList`)
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

app.get('/GetAllOrders', verifyToken, function(req, res){
    OrdersModel.find({ completion_status: "Completed" })
    .then(data => {
        let promises = data.map(order => {
            // Find the user who placed the order
            return UsersModel.findOne({ _id: order.user_id })
            .then(userResult => {
                // Map through each item in the order to find the item's owner details
                let itemPromises = order.items.map(item => {
                    return UsersModel.findOne({ _id: item.ownedBy })
                    .then(ownerResult => {
                        return {
                            ...item, // Keep the item data
                            owner_first_name: ownerResult.first_name,
                            owner_second_name: ownerResult.second_name,
                            owner_email : ownerResult.email,
                            owner_phone_number : ownerResult.phoneNumber
                        };
                    });
                });

                // Wait for all the item promises to resolve
                return Promise.all(itemPromises).then(updatedItems => {
                    return {
                        ...order.toObject(), // Convert the Mongoose document to a plain JavaScript object
                        items: updatedItems, // Updated items with owner's details
                        first_name: userResult.first_name, 
                        second_name: userResult.second_name, 
                        email: userResult.email, 
                        phoneNumber: userResult.phoneNumber
                    };
                });
            });
        });

        // Wait for all the promises to resolve
        return Promise.all(promises);
    })
    .then(newData => {
        res.json(newData);
    })
    .catch(err => {
        console.log(err);
    });
});

//Get My Orders
app.get('/GetMyOrders', verifyToken, function(req, res){
    OrdersModel.find({$and : [{ completion_status: "Completed", user_id: req.userId}]})
    .then(newData => {
        res.json(newData);
    })
    .catch(err =>{
        console.log(err);
    })
})

//Get Delivered Orders
app.get('/GetDeliveredOrders', verifyToken, function(req, res){
    OrdersModel.find({ delivery_status: 'delivered' })
    .then(data => {
        let promises = data.map(order => {
            // Find the user who placed the order
            return UsersModel.findOne({ _id: order.user_id })
            .then(userResult => {
                // Map through each item in the order to find the item's owner details
                let itemPromises = order.items.map(item => {
                    return UsersModel.findOne({ _id: item.ownedBy })
                    .then(ownerResult => {
                        return {
                            ...item, // Keep the item data
                            supplier_first_name: ownerResult.first_name,
                            supplier_second_name: ownerResult.second_name, 
                            supplier_email: ownerResult.email, 
                            supplier_phone_number: ownerResult.phoneNumber
                        };
                    });
                });

                // Wait for all the item promises to resolve
                return Promise.all(itemPromises).then(updatedItems => {
                    return {
                        ...order.toObject(), // Convert the Mongoose document to a plain JavaScript object
                        items: updatedItems, // Updated items with owner's details
                        client_first_name: userResult.first_name, 
                        client_second_name: userResult.second_name, 
                        client_email: userResult.email, 
                        client_phone_number: userResult.phoneNumber
                    };
                });
            });
        });

        // Wait for all the promises to resolve
        return Promise.all(promises);
    })
    .then(newData => {
        res.json(newData);
    })
    .catch(err => {
        console.log(err);
        res.status(500).send("Error fetching delivered orders");
    });
});

//Get Orders Pending Delivery
app.get('/GetPendingOrders', verifyToken, function(req, res) {
    OrdersModel.find({ $and: [{ delivery_status: 'pending' }, { completion_status: 'Completed' }] })
    .then(data => {
        let promises = data.map(order => {
            // Find the user who placed the order
            return UsersModel.findOne({ _id: order.user_id })
            .then(userResult => {
                // Map through each item in the order to find the item's owner details
                let itemPromises = order.items.map(item => {
                    return UsersModel.findOne({ _id: item.ownedBy })
                    .then(ownerResult => {
                        return {
                            ...item, // Keep the item data
                            supplier_first_name: ownerResult.first_name,
                            supplier_second_name: ownerResult.second_name, 
                            supplier_email: ownerResult.email, 
                            supplier_phone_number: ownerResult.phoneNumber
                        };
                    });
                });

                // Wait for all the item promises to resolve
                return Promise.all(itemPromises).then(updatedItems => {
                    return {
                        ...order.toObject(), // Convert the Mongoose document to a plain JavaScript object
                        items: updatedItems, // Updated items with owner's details
                        client_first_name: userResult.first_name, 
                        client_second_name: userResult.second_name, 
                        client_email: userResult.email, 
                        client_phone_number: userResult.phoneNumber
                    };
                });
            });
        });

        // Wait for all the promises to resolve
        return Promise.all(promises);
    })
    .then(newData => {
        res.json(newData);
    })
    .catch(err => {
        console.log(err);
        res.status(500).send("Error fetching pending orders");
    });
});

//Get Orders In Transit
app.get('/GetTransitOrders', verifyToken, function(req, res) {
    OrdersModel.find({ $and: [{ delivery_status: 'transit' }, { completion_status: 'Completed' }] })
    .then(data => {
        let promises = data.map(order => {
            // Find the user who placed the order
            return UsersModel.findOne({ _id: order.user_id })
            .then(userResult => {
                // Map through each item in the order to find the item's owner details
                let itemPromises = order.items.map(item => {
                    return UsersModel.findOne({ _id: item.ownedBy })
                    .then(ownerResult => {
                        return {
                            ...item, // Keep the item data
                            supplier_first_name: ownerResult.first_name,
                            supplier_second_name: ownerResult.second_name, 
                            supplier_email: ownerResult.email, 
                            supplier_phone_number: ownerResult.phoneNumber
                        };
                    });
                });

                // Wait for all the item promises to resolve
                return Promise.all(itemPromises).then(updatedItems => {
                    return {
                        ...order.toObject(), // Convert the Mongoose document to a plain JavaScript object
                        items: updatedItems, // Updated items with owner's details
                        client_first_name: userResult.first_name, 
                        client_second_name: userResult.second_name, 
                        client_email: userResult.email, 
                        client_phone_number: userResult.phoneNumber
                    };
                });
            });
        });

        // Wait for all the promises to resolve
        return Promise.all(promises);
    })
    .then(newData => {
        res.json(newData);
    })
    .catch(err => {
        console.log(err);
        res.status(500).send("Error fetching pending orders");
    });
});

//Update Orders On Transit
app.put('/update_transit/:id', urlEncoded, verifyToken, function(req, res){
    let date = getTodayDate(); 
    OrdersModel.findByIdAndUpdate(req.params.id,{delivery_status:'transit', delivery_date: date }, {new: true})
    .then(data => {
        res.json('success')
    })
    .catch(err => console.log('error'))
});

//Update Orders On Delivery
app.put('/update_delivery/:id', urlEncoded, verifyToken, function(req, res){
    let date = getTodayDate(); 
    OrdersModel.findByIdAndUpdate(req.params.id,{delivery_status:'delivered', delivery_date: date }, {new: true})
    .then(data => {
        res.json('success')
    })
    .catch(err => console.log('error'))
});

// Cancel Order
app.get('/cancel_order/:id', verifyToken, accessToken, (req, res)=>{
    const initiator_id = req.userId;

    OrdersModel.findById(req.params.id)
    .then((order)=>{
        UsersModel.findById(initiator_id)
        .then( user =>{
            if(order.user_id != initiator_id && user.accountType != "admin")
            {
                res.status(401).json("Unauthorized");
            }
            else if(order.delivery_status != "pending")
            {
                res.status(400).json("Order Cannot be cancelled.")
            }
            else
            {
                console.log(order.confirmation_code)
                const grandTotal = order.total_price + order.delivery_cost;
                unirest('POST', `${process.env.LIVE_BASE_URL}/api/Transactions/RefundRequest`)
                .headers({
                    "Content-Type" : "application/json",
                    "Accept" : "application/json",
                    "Authorization": "Bearer " + req.access_token
                })
                .send({
                    "confirmation_code": order.confirmation_code,
                    "amount": parseFloat(grandTotal).toFixed(2),
                    "username": `${user.first_name} ${user.second_name}`,
                    "remarks": "Order Cancelled"
                })
                .end(response => {
                    if (response.error) throw new Error(response.error);
                    OrdersModel.findByIdAndUpdate(req.params.id, { delivery_status: "cancelled" }, { new : true})
                    .then((data)=>{
                        console.log("----- Payment Refund Initiated ------")
                        console.log(response.raw_body);
                        res.json("Success");
                    })
                    .catch(err => {
                        res.status(500).json("Failed. Try again!")
                    })
                });
            }
        })
        .catch(err => {
            res.status(500).json("Failed. Try again!")
        })
    })
    .catch(err => {
        res.status(500).json("Failed. Try again!")
    })
});

module.exports = app;