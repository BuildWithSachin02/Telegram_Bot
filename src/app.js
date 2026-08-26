require("dotenv").config();

const { Telegraf } = require("telegraf");

// ==========================================
// Database
// ==========================================

const connectDB = require("./config/db");

// ==========================================
// Services
// ==========================================

const {
    findUserByTelegramId
} = require("./services/userService");

const {
    createTransaction,
    getCustomerTotal,
    getCustomerHistory
} = require("./services/ledgerService");

const {
    createUndoRequest,
    findPendingUndoRequest
} = require("./services/undoRequestService");

const {
    createPaymentRequest,
    findPendingPaymentRequest
} = require("./services/paymentRequestService");

const {
    notifyOwnerAboutUndoRequest,
    notifyOwnerAboutPurchase,
    notifyOwnerAboutPaymentRequest
} = require("./services/ownerNotificationService");

// ==========================================
// Utilities
// ==========================================

const {
    parseMessage
} = require("./utils/messageParser");

// ==========================================
// Models
// ==========================================

const Transaction = require("./models/Transaction");

// ==========================================
// Customer Bot Configuration
// ==========================================

if (!process.env.CUSTOMER_BOT_TOKEN) {

    throw new Error(
        "CUSTOMER_BOT_TOKEN is missing from .env"
    );
}

const bot = new Telegraf(
    process.env.CUSTOMER_BOT_TOKEN
);


// ==========================================
// /start
// ==========================================

bot.start(async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name || "Customer";

        console.log("--------------------------------");

        console.log(
            "Start requested by:",
            firstName
        );

        console.log(
            "Telegram User ID:",
            telegramUserId
        );

        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                telegramUserId
            );

        if (!user) {

            console.log(
                "User not found:",
                telegramUserId
            );

            await ctx.reply(

                "❌ You are not registered yet.\n\n" +

                "Please contact the shop owner."

            );

            return;
        }

        console.log(
            "Existing customer:",
            user.name
        );

        await ctx.reply(

            `Welcome ${firstName} 👋\n\n` +

            "You can send your purchases and payments here.\n\n" +

            "Useful commands:\n\n" +

            "/total - View your khata total\n" +

            "/history - View recent transactions\n" +

            "/undo - Request removal of your latest purchase"

        );

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "Start command failed ❌"
        );

        console.error(error);

        try {

            await ctx.reply(
                "❌ Something went wrong. Please try again later."
            );

        } catch (replyError) {

            console.error(
                "Failed to send start error message ❌"
            );

        }

    }

});


// ==========================================
// /total
// ==========================================

bot.command("total", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name || "Customer";

        console.log("--------------------------------");

        console.log(
            "Total requested by:",
            firstName
        );

        console.log(
            "Telegram User ID:",
            telegramUserId
        );

        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                telegramUserId
            );

        if (!user) {

            console.log(
                "Customer not found ❌"
            );

            await ctx.reply(

                "❌ You are not registered yet.\n\n" +

                "Please contact the shop owner."

            );

            return;
        }

        // ==========================================
        // Get total
        // ==========================================

        const total =
            await getCustomerTotal(
                user._id
            );

        console.log(
            "Total Purchase:",
            total.totalPurchase
        );

        console.log(
            "Total Payment:",
            total.totalPayment
        );

        console.log(
            "Outstanding:",
            total.outstanding
        );

        // ==========================================
        // Outstanding status
        // ==========================================

        let balanceLabel;

        if (total.outstanding > 0) {

            balanceLabel =
                `🔴 Amount Due: ₹${total.outstanding}`;

        } else if (total.outstanding < 0) {

            balanceLabel =
                `🟢 Customer Credit: ₹${Math.abs(
                    total.outstanding
                )}`;

        } else {

            balanceLabel =
                "🟢 Account Settled";
        }

        // ==========================================
        // Send customer total
        // ==========================================

        await ctx.reply(

            "📊 *Your Khata*\n\n" +

            `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

            `💵 Total Payment: ₹${total.totalPayment}\n\n` +

            `${balanceLabel}`,

            {
                parse_mode: "Markdown"
            }

        );

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "Total calculation failed ❌"
        );

        console.error(error);

        try {

            await ctx.reply(
                "❌ Unable to calculate your total right now."
            );

        } catch (replyError) {

            console.error(
                "Failed to send total error message ❌"
            );

        }

    }

});


// ==========================================
// /history
// ==========================================

bot.command("history", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name || "Customer";

        console.log("--------------------------------");

        console.log(
            "History requested by:",
            firstName
        );

        console.log(
            "Telegram User ID:",
            telegramUserId
        );

        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                telegramUserId
            );

        if (!user) {

            await ctx.reply(
                "❌ You are not registered yet."
            );

            return;
        }

        console.log(
            "Customer found:",
            user.name
        );

        // ==========================================
        // Get recent transactions
        // ==========================================

        const transactions =
            await getCustomerHistory(
                user._id,
                10
            );

        console.log(
            "Transactions found:",
            transactions.length
        );

        // ==========================================
        // No transactions
        // ==========================================

        if (transactions.length === 0) {

            await ctx.reply(
                "📭 No transactions found."
            );

            console.log("--------------------------------");

            return;
        }

        // ==========================================
        // Build history message
        // ==========================================

        let historyMessage =
            "📜 *Your Recent Transactions*\n\n";

        transactions.forEach(
            (transaction, index) => {

                let type;

                if (
                    transaction.type === "PURCHASE"
                ) {

                    type = "🛒 Purchase";

                } else if (
                    transaction.type === "PAYMENT"
                ) {

                    type = "💵 Payment";

                } else {

                    type =
                        `ℹ️ ${transaction.type}`;
                }

                const date =
                    new Date(
                        transaction.createdAt
                    ).toLocaleString(
                        "en-IN",
                        {
                            dateStyle: "medium",
                            timeStyle: "short"
                        }
                    );

                historyMessage +=

                    `${index + 1}. ${type}\n` +

                    `💰 Amount: ₹${transaction.amount}\n` +

                    `📅 ${date}\n\n`;

            }
        );

        // ==========================================
        // Send history
        // ==========================================

        await ctx.reply(

            historyMessage,

            {
                parse_mode: "Markdown"
            }

        );

        console.log(
            "History sent successfully ✅"
        );

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "History failed ❌"
        );

        console.error(error);

        try {

            await ctx.reply(
                "❌ Unable to load transaction history."
            );

        } catch (replyError) {

            console.error(
                "Failed to send history error message ❌"
            );

        }

    }

});


// ==========================================
// /undo
//
// Customer requests removal of latest PURCHASE.
//
// Transaction is NOT deleted here.
// Owner must approve the request.
//
// IMPORTANT:
// Payment and Undo requests cannot
// exist at the same time.
// ==========================================

bot.command("undo", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name || "Customer";

        console.log("--------------------------------");

        console.log(
            "Undo requested by:",
            firstName
        );

        console.log(
            "Telegram User ID:",
            telegramUserId
        );

        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                telegramUserId
            );

        if (!user) {

            console.log(
                "Customer not found ❌"
            );

            await ctx.reply(
                "❌ You are not registered yet."
            );

            return;
        }

        console.log(
            "Customer found:",
            user.name
        );

        // ==========================================
        // Check pending PAYMENT first
        // ==========================================

        const pendingPayment =
            await findPendingPaymentRequest({
                customerId: user._id
            });

        if (pendingPayment) {

            console.log(
                "Undo blocked because payment request is pending ❌"
            );

            await ctx.reply(

                "⚠️ *Payment Request Already Pending*\n\n" +

                `💵 Payment: ₹${pendingPayment.amount}\n\n` +

                "You already have a payment verification request " +

                "waiting for the shop owner.\n\n" +

                "Please wait for the owner to approve or reject " +

                "the payment before requesting an undo.",

                {
                    parse_mode: "Markdown"
                }

            );

            console.log("--------------------------------");

            return;
        }

        // ==========================================
        // Find latest transaction
        // ==========================================

        const latest =
            await Transaction.findOne({

                customerId:
                    user._id

            })
                .sort({
                    createdAt: -1
                });

        // ==========================================
        // No transaction
        // ==========================================

        if (!latest) {

            await ctx.reply(

                "❌ You don't have any transactions to undo."

            );

            return;
        }

        // ==========================================
        // Payment cannot be undone
        // ==========================================

        if (
            latest.type === "PAYMENT"
        ) {

            console.log(
                "Undo blocked because latest transaction is PAYMENT ❌"
            );

            await ctx.reply(

                "⚠️ Your latest transaction is a payment.\n\n" +

                `💵 Payment: ₹${latest.amount}\n\n` +

                "❌ Payment was NOT deleted.\n\n" +

                "ℹ️ /undo only requests removal of the latest purchase."

            );

            return;
        }

        // ==========================================
        // Safety check
        // ==========================================

        if (
            latest.type !== "PURCHASE"
        ) {

            await ctx.reply(
                "❌ This transaction cannot be undone."
            );

            return;
        }

        console.log(
            "Latest transaction:",
            latest.type
        );

        console.log(
            "Latest amount:",
            latest.amount
        );

        // ==========================================
        // Check existing pending UndoRequest
        // ==========================================

        const existingRequest =
            await findPendingUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latest._id

            });

        if (existingRequest) {

            await ctx.reply(

                "⏳ *Undo Request Already Pending*\n\n" +

                `🛒 Purchase: ₹${latest.amount}\n\n` +

                "Your undo request is already waiting " +

                "for the shop owner.\n\n" +

                "Please wait for the owner to approve or reject it.",

                {
                    parse_mode: "Markdown"
                }

            );

            return;
        }

        // ==========================================
        // Create Undo Request
        //
        // IMPORTANT:
        // createUndoRequest() returns:
        //
        // {
        //     success: true,
        //     request: undoRequest
        // }
        //
        // So we MUST use undoResult.request.
        // ==========================================

        const undoResult =
            await createUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latest._id

            });

        // ==========================================
        // Handle failed/conflicting request
        // ==========================================

        if (!undoResult.success) {

            console.log(
                "Undo request blocked ❌"
            );

            console.log(
                "Reason:",
                undoResult.reason
            );

            // ==========================================
            // Another Undo request already pending
            // ==========================================

            if (
                undoResult.reason ===
                "PENDING_UNDO_EXISTS"
            ) {

                await ctx.reply(

                    "⏳ *Undo Request Already Pending*\n\n" +

                    `🛒 Purchase: ₹${latest.amount}\n\n` +

                    "Your undo request is already waiting " +

                    "for the shop owner.\n\n" +

                    "Please wait for the owner to approve or reject it.",

                    {
                        parse_mode: "Markdown"
                    }

                );

                console.log("--------------------------------");

                return;
            }

            // ==========================================
            // Payment request already pending
            // ==========================================

            if (
                undoResult.reason ===
                "PENDING_PAYMENT_EXISTS"
            ) {

                const existingPayment =
                    undoResult.request;

                await ctx.reply(

                    "⚠️ *Payment Request Already Pending*\n\n" +

                    (
                        existingPayment
                            ? `💵 Payment: ₹${existingPayment.amount}\n\n`
                            : ""
                    ) +

                    "You already have a payment verification request " +

                    "waiting for the shop owner.\n\n" +

                    "Please wait for the owner to approve or reject " +

                    "the payment before requesting an undo.",

                    {
                        parse_mode: "Markdown"
                    }

                );

                console.log("--------------------------------");

                return;
            }

            // ==========================================
            // Unknown failure
            // ==========================================

            await ctx.reply(

                "⚠️ Your undo request could not be created.\n\n" +

                "Please wait for any pending request to be " +

                "processed by the shop owner."

            );

            console.log("--------------------------------");

            return;
        }

        // ==========================================
        // IMPORTANT FIX
        //
        // Extract the actual UndoRequest document.
        // ==========================================

        const undoRequest =
            undoResult.request;

        // ==========================================
        // Safety validation
        // ==========================================

        if (!undoRequest) {

            console.error(
                "Undo request was created but request document is missing ❌"
            );

            await ctx.reply(

                "❌ Your undo request could not be completed.\n\n" +

                "Please try again later."

            );

            return;
        }

        console.log(
            "Undo request created successfully ✅:",
            undoRequest._id
        );

        console.log(
            "Undo request status:",
            undoRequest.status
        );

        console.log(
            "Undo request customer ID:",
            undoRequest.customerId
        );

        console.log(
            "Undo request transaction ID:",
            undoRequest.transactionId
        );

        // ==========================================
        // Tell Customer
        // ==========================================

        await ctx.reply(

            "⏳ *Undo Request Created*\n\n" +

            `🛒 Purchase: ₹${latest.amount}\n\n` +

            "📨 Your request has been sent to the shop owner.\n\n" +

            "Please wait for the owner to review it.\n\n" +

            "⚠️ The transaction has NOT been deleted yet.",

            {
                parse_mode: "Markdown"
            }

        );

        // ==========================================
        // Notify Owner Immediately
        // ==========================================

        try {

            await notifyOwnerAboutUndoRequest(
                undoRequest
            );

            console.log(
                "Undo request notification sent to owner successfully ✅"
            );

        } catch (notificationError) {

            console.error(
                "Owner undo notification failed ❌"
            );

            console.error(
                notificationError.message
            );

            // ==========================================
            // Important:
            // The request is already stored.
            // Notification failure must NOT delete
            // or corrupt the request.
            // ==========================================

            try {

                await ctx.reply(

                    "⚠️ Your undo request was created, " +

                    "but the shop owner notification could not be sent right now.\n\n" +

                    "Please contact the shop owner if needed."

                );

            } catch (replyError) {

                console.error(
                    "Failed to send owner notification warning to customer ❌"
                );

            }

        }

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "Undo request failed ❌"
        );

        console.error(error);

        try {

            await ctx.reply(

                "❌ Something went wrong while creating the undo request."

            );

        } catch (replyError) {

            console.error(
                "Failed to send undo error message ❌"
            );

        }

    }

});


// ==========================================
// Normal Financial Messages
//
// Purchase:
// 20 cig
// 50 mava
//
// Payment:
// -30 cash diya
//
// Payment creates PENDING PaymentRequest.
// Owner must approve it.
// ==========================================

bot.on("text", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name || "Customer";

        const username =
            ctx.from.username || null;

        const message =
            ctx.message.text;

        console.log("--------------------------------");

        console.log(
            "Telegram User ID:",
            telegramUserId
        );

        console.log(
            "First Name:",
            firstName
        );

        console.log(
            "Username:",
            username
        );

        console.log(
            "Message:",
            message
        );

        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                telegramUserId
            );

        if (!user) {

            console.log(
                "Customer not found ❌"
            );

            await ctx.reply(

                "❌ You are not registered yet.\n\n" +

                "Please contact the shop owner."

            );

            return;
        }

        console.log(
            "Customer found:",
            user.name
        );

        // ==========================================
        // Parse message
        // ==========================================

        const parsed =
            parseMessage(message);

        console.log(
            "Parsed result:",
            parsed
        );

        // ==========================================
        // Invalid financial message
        // ==========================================

        if (!parsed.success) {

            await ctx.reply(
                `❌ ${parsed.error}`
            );

            return;
        }

        // ==========================================
        // PAYMENT
        //
        // Payment is NOT immediately added
        // to the ledger.
        //
        // It creates a PENDING PaymentRequest.
        // Owner must approve it.
        // ==========================================

        if (parsed.isPayment) {

            // ==========================================
            // Create Payment Request
            // ==========================================

            const paymentResult =
                await createPaymentRequest({

                    customerId:
                        user._id,

                    amount:
                        parsed.amount,

                    message:
                        message,

                    telegramMessageId:
                        ctx.message.message_id,

                    telegramUpdateId:
                        ctx.update.update_id

                });

            // ==========================================
            // Handle duplicate/conflicting request
            // ==========================================

            if (!paymentResult.success) {

                console.log(
                    "Payment request blocked ❌"
                );

                console.log(
                    "Reason:",
                    paymentResult.reason
                );

                // ==========================================
                // Another payment is already pending
                // ==========================================

                if (
                    paymentResult.reason ===
                    "PENDING_PAYMENT_EXISTS"
                ) {

                    const existing =
                        paymentResult.request;

                    await ctx.reply(

                        "⚠️ *Payment Request Already Pending*\n\n" +

                        `💵 Existing Payment: ₹${existing.amount}\n\n` +

                        "You already have a payment verification " +

                        "request waiting for the shop owner.\n\n" +

                        "Please wait for the owner to approve or " +

                        "reject it before sending another payment.",

                        {
                            parse_mode: "Markdown"
                        }

                    );

                    console.log("--------------------------------");

                    return;
                }

                // ==========================================
                // Undo request is already pending
                // ==========================================

                if (
                    paymentResult.reason ===
                    "PENDING_UNDO_EXISTS"
                ) {

                    await ctx.reply(

                        "⚠️ *Undo Request Already Pending*\n\n" +

                        "You already have an undo request waiting " +

                        "for the shop owner.\n\n" +

                        "Please wait for the owner to approve or " +

                        "reject the undo request before sending a payment.",

                        {
                            parse_mode: "Markdown"
                        }

                    );

                    console.log("--------------------------------");

                    return;
                }

                // ==========================================
                // Unknown protection reason
                // ==========================================

                await ctx.reply(

                    "⚠️ Your payment request could not be created.\n\n" +

                    "Please wait for any pending request to be " +

                    "processed by the shop owner."

                );

                console.log("--------------------------------");

                return;
            }

            // ==========================================
            // Extract actual PaymentRequest document
            // ==========================================

            const paymentRequest =
                paymentResult.request;

            if (!paymentRequest) {

                console.error(
                    "Payment request was created but request document is missing ❌"
                );

                await ctx.reply(

                    "❌ Your payment request could not be completed.\n\n" +

                    "Please try again later."

                );

                return;
            }

            console.log(
                "Payment request created successfully ✅:",
                paymentRequest._id
            );

            // ==========================================
            // Customer response
            // ==========================================

            await ctx.reply(

                "⏳ *Payment Verification Requested*\n\n" +

                `💵 Claimed Payment: ₹${parsed.amount}\n\n` +

                "📨 Your payment request has been sent to the shop owner.\n\n" +

                "⚠️ Your khata has NOT been updated yet.\n\n" +

                "Please wait for the owner to verify the payment.",

                {
                    parse_mode: "Markdown"
                }

            );

            // ==========================================
            // Notify Owner
            // ==========================================

            try {

                await notifyOwnerAboutPaymentRequest(
                    paymentRequest
                );

                console.log(
                    "Payment request notification sent to owner successfully ✅"
                );

            } catch (notificationError) {

                console.error(
                    "Owner payment notification failed ❌"
                );

                console.error(
                    notificationError.message
                );

                try {

                    await ctx.reply(

                        "⚠️ Your payment request was created, " +

                        "but the shop owner notification could not be sent right now."

                    );

                } catch (replyError) {

                    console.error(
                        "Failed to send payment notification warning ❌"
                    );

                }

            }

            console.log("--------------------------------");

            return;
        }

        // ==========================================
        // PURCHASE
        //
        // ==========================================

        const transaction =
            await createTransaction({

                customerId:
                    user._id,

                type:
                    "PURCHASE",

                amount:
                    parsed.amount,

                telegramMessageId:
                    ctx.message.message_id,

                telegramUpdateId:
                    ctx.update.update_id

            });

        console.log(
            "Purchase transaction created successfully ✅:",
            transaction._id
        );

        // ==========================================
        // Customer response
        // ==========================================

        await ctx.reply(

            "✅ *Purchase Recorded!*\n\n" +

            `🛒 Amount: ₹${parsed.amount}`,

            {
                parse_mode: "Markdown"
            }

        );

        // ==========================================
        // Notify Owner
        // ==========================================

        try {

            await notifyOwnerAboutPurchase(
                transaction
            );

            console.log(
                "Owner notified about purchase successfully ✅"
            );

        } catch (notificationError) {

            console.error(
                "Owner purchase notification failed ❌"
            );

            console.error(
                notificationError.message
            );

        }

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "Message processing failed ❌"
        );

        console.error(error);

        try {

            await ctx.reply(

                "❌ Something went wrong while processing your message."

            );

        } catch (replyError) {

            console.error(
                "Failed to send processing error message ❌"
            );

        }

    }

});


// ==========================================
// Connect MongoDB + Start Bot
// ==========================================

const startBot = async () => {

    try {

        // ==========================================
        // Connect DB FIRST
        // ==========================================

        await connectDB();

        console.log(
            "MongoDB connection initialized successfully ✅"
        );

        // ==========================================
        // Launch Telegram Bot
        // ==========================================

        await bot.launch();

        console.log(
            "Customer Bot is running..."
        );

    } catch (error) {

        console.error(
            "Customer Bot startup failed ❌"
        );

        console.error(error);

        process.exit(1);

    }

};

startBot();


// ==========================================
// Graceful Shutdown
// ==========================================

process.once(
    "SIGINT",
    () => {

        console.log(
            "Stopping Customer Bot..."
        );

        bot.stop("SIGINT");

    }
);

process.once(
    "SIGTERM",
    () => {

        console.log(
            "Stopping Customer Bot..."
        );

        bot.stop("SIGTERM");

    }
);