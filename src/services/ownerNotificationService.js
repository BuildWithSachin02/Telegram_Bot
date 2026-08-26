require("dotenv").config();

const {
    Telegraf
} = require("telegraf");

const User = require("../models/User");
const Transaction = require("../models/Transaction");


// ==========================================
// Owner Bot Telegram Client
// ==========================================

const ownerBot = new Telegraf(
    process.env.OWNER_BOT_TOKEN
);


// ==========================================
// Owner Telegram ID
// ==========================================

const OWNER_TELEGRAM_ID =
    process.env.OWNER_TELEGRAM_ID;


// ==========================================
// Send Message To Owner
// ==========================================

const sendOwnerMessage = async (
    message,
    extra = {}
) => {

    if (!OWNER_TELEGRAM_ID) {

        throw new Error(
            "OWNER_TELEGRAM_ID is missing in .env"
        );
    }


    await ownerBot.telegram.sendMessage(

        OWNER_TELEGRAM_ID,

        message,

        extra

    );
};


// ==========================================
// Notify Owner About Undo Request
// ==========================================

const notifyOwnerAboutUndoRequest = async (
    undoRequest
) => {

    // ==========================================
    // Find customer
    // ==========================================

    const customer =
        await User.findById(
            undoRequest.customerId
        );


    if (!customer) {

        throw new Error(
            "Customer not found for undo request."
        );
    }


    // ==========================================
    // Find transaction
    // ==========================================

    const transaction =
        await Transaction.findById(
            undoRequest.transactionId
        );


    if (!transaction) {

        throw new Error(
            "Transaction not found for undo request."
        );
    }


    // ==========================================
    // Customer information
    // ==========================================

    const customerName =
        customer.name ||
        "Unknown Customer";


    const username =
        customer.username
            ? `@${customer.username}`
            : "No username";


    const telegramUserId =
        customer.telegramUserId ||
        "Unknown";


    // ==========================================
    // Transaction date
    // ==========================================

    const transactionDate =
        transaction.createdAt
            ? new Date(
                transaction.createdAt
            ).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            )
            : "Unknown";


    // ==========================================
    // Send notification
    // ==========================================

    await sendOwnerMessage(

        "⚠️ *NEW UNDO REQUEST*\n\n" +

        `👤 *Customer:* ${customerName}\n` +

        `📱 *Username:* ${username}\n` +

        `🆔 *Telegram ID:* ${telegramUserId}\n\n` +

        `🛒 *Purchase Amount:* ₹${transaction.amount}\n` +

        `📅 *Purchase Date:* ${transactionDate}\n\n` +

        `📌 *Request Status:* PENDING\n\n` +

        "The customer wants to remove this purchase.\n\n" +

        "Please verify the request before approving.",

        {

            parse_mode: "Markdown",

            reply_markup: {

                inline_keyboard: [

                    [

                        {

                            text:
                                "✅ Approve Undo",

                            callback_data:
                                `undo_approve:${undoRequest._id}`

                        },

                        {

                            text:
                                "❌ Reject Undo",

                            callback_data:
                                `undo_reject:${undoRequest._id}`

                        }

                    ]

                ]

            }

        }

    );


    console.log(
        "Owner undo notification sent successfully ✅"
    );
};


// ==========================================
// Notify Owner About Purchase
// ==========================================

const notifyOwnerAboutPurchase = async (
    transaction
) => {

    const customer =
        await User.findById(
            transaction.customerId
        );


    if (!customer) {

        throw new Error(
            "Customer not found for purchase notification."
        );
    }


    const username =
        customer.username
            ? `@${customer.username}`
            : "No username";


    await sendOwnerMessage(

        "🛒 *NEW PURCHASE*\n\n" +

        `👤 *Customer:* ${customer.name}\n` +

        `📱 *Username:* ${username}\n` +

        `🆔 *Telegram ID:* ${customer.telegramUserId}\n\n` +

        `💰 *Purchase Amount:* ₹${transaction.amount}\n\n` +

        "📌 Status: RECORDED",

        {

            parse_mode: "Markdown"

        }

    );


    console.log(
        "Owner purchase notification sent successfully ✅"
    );
};


// ==========================================
// Notify Owner About Payment Request
// ==========================================

const notifyOwnerAboutPaymentRequest = async (
    paymentRequest
) => {

    const customer =
        await User.findById(
            paymentRequest.customerId
        );


    if (!customer) {

        throw new Error(
            "Customer not found for payment notification."
        );
    }


    const username =
        customer.username
            ? `@${customer.username}`
            : "No username";


    const requestDate =
        paymentRequest.createdAt
            ? new Date(
                paymentRequest.createdAt
            ).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            )
            : "Unknown";


    await sendOwnerMessage(

        "💰 *NEW PAYMENT VERIFICATION REQUEST*\n\n" +

        `👤 *Customer:* ${customer.name}\n` +

        `📱 *Username:* ${username}\n` +

        `🆔 *Telegram ID:* ${customer.telegramUserId}\n\n` +

        `💵 *Claimed Payment:* ₹${paymentRequest.amount}\n\n` +

        `📝 *Customer Message:*\n` +

        `"${paymentRequest.message}"\n\n` +

        `📅 *Request Date:* ${requestDate}\n\n` +

        "📌 *Status:* PENDING\n\n" +

        "Please verify whether the payment was actually received.",

        {

            parse_mode: "Markdown",

            reply_markup: {

                inline_keyboard: [

                    [

                        {

                            text:
                                "✅ Approve Payment",

                            callback_data:
                                `payment_approve:${paymentRequest._id}`

                        },

                        {

                            text:
                                "❌ Reject Payment",

                            callback_data:
                                `payment_reject:${paymentRequest._id}`

                        }

                    ]

                ]

            }

        }

    );


    console.log(
        "Owner payment notification sent successfully ✅"
    );
};


// ==========================================
// Export
// ==========================================

module.exports = {

    sendOwnerMessage,

    notifyOwnerAboutUndoRequest,

    notifyOwnerAboutPurchase,

    notifyOwnerAboutPaymentRequest

};