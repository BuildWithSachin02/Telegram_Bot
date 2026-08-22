const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        telegramUserId: {
            type: Number,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true
        },

        username: {
            type: String,
            default: null
        },

        role: {
            type: String,
            enum: ["OWNER", "CUSTOMER"],
            required: true
        },

        shopId: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);