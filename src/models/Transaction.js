const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: ["PURCHASE", "PAYMENT", "REVERSAL"],
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        telegramMessageId: {
            type: Number,
            default: null
        },

        telegramUpdateId: {
            type: Number,
            default: null,
            unique: true,
            sparse: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);