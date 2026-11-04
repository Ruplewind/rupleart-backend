let mongoose = require('mongoose');

// Only present on orders that contain flowers
let flowerDeliverySchema = new mongoose.Schema({
    sameDay: Boolean,
    preferredDate: String,          // YYYY-MM-DD, only when not same day (optional)
    recipientName: String,
    recipientPhone: String,
    recipientAddress: String,       // where the flowers should be delivered
    note: String,                   // message on the card
    acknowledgedAvailability: Boolean, // user confirmed the receiver will be available
}, { _id: false });

let orderSchema =  new mongoose.Schema({
    OrderTrackingId : String,
    user_id: String,
    items : [{}],
    completion_status: String,
    confirmation_code: String,
    deliveryLocation: String,
    delivery_status: String,
    delivery_cost: Number,
    order_date: String,
    delivery_date: String,
    total_price: Number,
    amount_paid: Number,
    email_sent: Boolean,
    phoneNumber: String,            // Checkout already sets this but it was missing from the schema, so it was being dropped
    hasFlowers: Boolean,
    flowerDelivery: { type: flowerDeliverySchema, default: undefined },
})

let OrdersModel = mongoose.model('orders', orderSchema);

module.exports = OrdersModel