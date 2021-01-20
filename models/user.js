const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verifyEmail: String,
    active: Boolean,
    phone: Number,
    isAdmin: {
        type: Boolean,
        default: false
    },
    code: String
}, {timestamps: true});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);