const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    startdate: String,
    enddate: String,
    persons: Number,
    days: Number,
    price: Number,
    title: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model("Booking", bookingSchema);

