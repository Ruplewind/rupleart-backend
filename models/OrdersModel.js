let mongoose = require('mongoose');

let orderSchema =  new mongoose.Schema({
    OrderTrackingId : String,
    user_id: String,
    items : [{}],
    completion_status: String,
    deliveryLocation: String,
    delivery_status: String,
    delivery_cost: Number,
    order_date: String,
    delivery_date: String,
    total_price: Number,
    amount_paid: Number,
    email_sent: Boolean
})

let OrdersModel = mongoose.model('orders', orderSchema);

module.exports = OrdersModel