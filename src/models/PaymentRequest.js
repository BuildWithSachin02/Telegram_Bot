const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema(
    {

        // Customer who claims the payment
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },


        // Payment amount claimed by customer
        amount: {
            type: Number,
            required: true,
            min: 0.01
        },


        // Original Telegram message
        message: {
            type: String,
            required: true
        },


        // Telegram message ID
        telegramMessageId: {
            type: Number,
            default: null
        },


        // Telegram update ID
        telegramUpdateId: {
            type: Number,
            default: null
        },


        // Request status
        status: {
            type: String,
            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ],
            default: "PENDING"
        },


        // When owner processed request
        processedAt: {
            type: Date,
            default: null
        }

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "PaymentRequest",
    paymentRequestSchema
);