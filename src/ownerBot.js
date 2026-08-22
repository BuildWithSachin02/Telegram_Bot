require("dotenv").config();

const { Telegraf } = require("telegraf");

const connectDB = require("./config/db");

const {
    getPendingUndoRequests,
    getUndoRequestById,
    approveUndoRequest,
    rejectUndoRequest
} = require("./services/undoRequestService");

const Transaction = require("./models/Transaction");
const User = require("./models/User");

const bot = new Telegraf(
    process.env.OWNER_BOT_TOKEN
);


// ==========================================
// /start
// ==========================================

bot.start(async (ctx) => {

    try {

        await ctx.reply(
            "👋 Welcome to SR Khata Owner Bot.\n\n" +
            "Use /requests to check pending undo requests."
        );

    } catch (error) {

        console.error(
            "Owner start command failed ❌"
        );

        console.error(error.message);

    }

});


// ==========================================
// /requests
// ==========================================

bot.command("requests", async (ctx) => {

    try {

        console.log("--------------------------------");
        console.log("Pending requests requested by owner");


        // ==========================================
        // Get pending requests
        // ==========================================

        const requests =
            await getPendingUndoRequests();


        console.log(
            "Pending requests:",
            requests.length
        );


        // ==========================================
        // No requests
        // ==========================================

        if (requests.length === 0) {

            await ctx.reply(
                "✅ No pending undo requests."
            );

            console.log("--------------------------------");

            return;
        }


        // ==========================================
        // Process every request
        // ==========================================

        for (const request of requests) {

            // --------------------------------------
            // Find customer
            // --------------------------------------

            const customer =
                await User.findById(
                    request.customerId
                );


            // --------------------------------------
            // Find transaction
            // --------------------------------------

            const transaction =
                await Transaction.findById(
                    request.transactionId
                );


            // --------------------------------------
            // Transaction no longer exists
            // --------------------------------------

            if (!transaction) {

                await ctx.reply(
                    "⚠️ Undo Request\n\n" +
                    "❌ Transaction no longer exists.\n\n" +
                    `📌 Request ID: ${request._id}\n\n` +
                    "This request needs to be cleaned up."
                );

                continue;
            }


            // ==========================================
            // Customer information
            // ==========================================

            const customerName =
                customer?.name || "Unknown Customer";

            const telegramUserId =
                customer?.telegramUserId || "Unknown";


            // ==========================================
            // Transaction information
            // ==========================================

            let transactionType =
                transaction.type;

            if (transaction.type === "PURCHASE") {

                transactionType = "🛒 Purchase";

            } else if (transaction.type === "PAYMENT") {

                transactionType = "💵 Payment";
            }


            // ==========================================
            // Date
            // ==========================================

            const transactionDate =
                transaction.createdAt
                    ? new Date(
                        transaction.createdAt
                    ).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short"
                    })
                    : "Unknown";


            // ==========================================
            // Send request to owner
            // ==========================================

            await ctx.reply(

                "⚠️ *Undo Request*\n\n" +

                `👤 *Customer:* ${customerName}\n` +

                `📱 *Telegram ID:* ${telegramUserId}\n\n` +

                `${transactionType}\n` +

                `💰 *Amount:* ₹${transaction.amount}\n` +

                `📅 *Date:* ${transactionDate}\n\n` +

                `📌 *Status:* ${request.status}\n\n` +

                "Please check the transaction before approving.",

                {
                    parse_mode: "Markdown",

                    reply_markup: {

                        inline_keyboard: [

                            [

                                {
                                    text: "✅ Approve",

                                    callback_data:
                                        `undo_approve:${request._id}`
                                },

                                {
                                    text: "❌ Reject",

                                    callback_data:
                                        `undo_reject:${request._id}`
                                }

                            ]

                        ]

                    }

                }

            );

        }


        console.log(
            "Pending requests sent successfully ✅"
        );

        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "Failed to get pending requests ❌"
        );

        console.error(error);

        await ctx.reply(
            "❌ Unable to load pending undo requests."
        );

    }

});


// ==========================================
// APPROVE BUTTON
// ==========================================

bot.action(
    /^undo_approve:(.+)$/,
    async (ctx) => {

        try {

            const undoRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "APPROVE button clicked"
            );

            console.log(
                "Undo Request ID:",
                undoRequestId
            );


            // ==========================================
            // Get Undo Request
            // ==========================================

            const undoRequest =
                await getUndoRequestById(
                    undoRequestId
                );


            if (!undoRequest) {

                await ctx.answerCbQuery(
                    "Undo request not found."
                );

                await ctx.reply(
                    "❌ This undo request no longer exists."
                );

                return;
            }


            // ==========================================
            // Check request status
            // ==========================================

            if (
                undoRequest.status !== "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "This request has already been processed."
                );

                await ctx.reply(
                    `⚠️ This request is already ${undoRequest.status}.`
                );

                return;
            }


            // ==========================================
            // Find transaction
            // ==========================================

            const transaction =
                await Transaction.findById(
                    undoRequest.transactionId
                );


            if (!transaction) {

                await ctx.answerCbQuery(
                    "Transaction not found."
                );

                await ctx.reply(
                    "❌ Transaction no longer exists."
                );

                return;
            }


            // ==========================================
            // Safety check
            // ==========================================

            if (
                transaction.type !== "PURCHASE"
            ) {

                await ctx.answerCbQuery(
                    "Only purchases can be deleted."
                );

                await ctx.reply(
                    "❌ This transaction is not a purchase.\n\n" +
                    "The transaction was NOT deleted."
                );

                return;
            }


            // ==========================================
            // Delete transaction
            // ==========================================

            await Transaction.deleteOne({
                _id: transaction._id
            });


            // ==========================================
            // Mark request APPROVED
            // ==========================================

            await approveUndoRequest(
                undoRequest._id
            );


            // ==========================================
            // Answer Telegram callback
            // ==========================================

            await ctx.answerCbQuery(
                "Transaction deleted successfully."
            );


            // ==========================================
            // Notify owner
            // ==========================================

            await ctx.reply(

                "✅ *Undo Approved*\n\n" +

                `🛒 Purchase: ₹${transaction.amount}\n` +

                `📌 Transaction ID: ${transaction._id}\n\n` +

                "🗑 Transaction has been deleted.\n" +

                "📌 Undo request marked as APPROVED.",

                {
                    parse_mode: "Markdown"
                }

            );


            console.log(
                "Transaction deleted successfully ✅:",
                transaction._id
            );

            console.log(
                "Undo request approved successfully ✅"
            );

            console.log("--------------------------------");


        } catch (error) {

            console.error(
                "Approve request failed ❌"
            );

            console.error(error);

            await ctx.answerCbQuery(
                "Approval failed."
            );

            await ctx.reply(
                "❌ Something went wrong while approving this request."
            );

        }

    }
);


// ==========================================
// REJECT BUTTON
// ==========================================

bot.action(
    /^undo_reject:(.+)$/,
    async (ctx) => {

        try {

            const undoRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "REJECT button clicked"
            );

            console.log(
                "Undo Request ID:",
                undoRequestId
            );


            // ==========================================
            // Get Undo Request
            // ==========================================

            const undoRequest =
                await getUndoRequestById(
                    undoRequestId
                );


            if (!undoRequest) {

                await ctx.answerCbQuery(
                    "Undo request not found."
                );

                return;
            }


            // ==========================================
            // Check status
            // ==========================================

            if (
                undoRequest.status !== "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "Request already processed."
                );

                await ctx.reply(
                    `⚠️ This request is already ${undoRequest.status}.`
                );

                return;
            }


            // ==========================================
            // Reject request
            // ==========================================

            await rejectUndoRequest(
                undoRequest._id
            );


            // ==========================================
            // Answer callback
            // ==========================================

            await ctx.answerCbQuery(
                "Undo request rejected."
            );


            // ==========================================
            // Notify owner
            // ==========================================

            await ctx.reply(

                "❌ *Undo Request Rejected*\n\n" +

                "The transaction was NOT deleted.\n\n" +

                "📌 Request marked as REJECTED.",

                {
                    parse_mode: "Markdown"
                }

            );


            console.log(
                "Undo request rejected successfully ❌"
            );

            console.log("--------------------------------");


        } catch (error) {

            console.error(
                "Reject request failed ❌"
            );

            console.error(error);

            await ctx.answerCbQuery(
                "Rejection failed."
            );

            await ctx.reply(
                "❌ Something went wrong while rejecting this request."
            );

        }

    }
);


// ==========================================
// Connect MongoDB
// ==========================================

connectDB();


// ==========================================
// Start Owner Bot
// ==========================================

bot.launch();

console.log(
    "Owner Bot is running..."
);


// ==========================================
// Graceful Shutdown
// ==========================================

process.once(
    "SIGINT",
    () => {

        console.log(
            "Stopping Owner Bot..."
        );

        bot.stop("SIGINT");

    }
);


process.once(
    "SIGTERM",
    () => {

        console.log(
            "Stopping Owner Bot..."
        );

        bot.stop("SIGTERM");

    }
);