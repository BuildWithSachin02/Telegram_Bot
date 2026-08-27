require("dotenv").config();

const { Telegraf } = require("telegraf");


// ==========================================
// DATABASE
// ==========================================

const connectDB = require("./config/db");


// ==========================================
// SERVICES
// ==========================================

const {
    getPendingUndoRequests,
    getUndoRequestById,
    approveUndoRequest,
    rejectUndoRequest
} = require("./services/undoRequestService");


const {
    getPendingPaymentRequests,
    getPaymentRequestById,
    approvePaymentRequest,
    rejectPaymentRequest
} = require("./services/paymentRequestService");


const {
    createTransaction,
    getCustomerTotal
} = require("./services/ledgerService");


// ==========================================
// OWNER REPORT SERVICE
// ==========================================

const {
    getUnpaidCustomers,
    getPaidCustomers,
    getCreditCustomers,
    getShopSummary,
    getCustomerReportByName
} = require("./services/ownerReportService");


// ==========================================
// MODELS
// ==========================================

const Transaction = require("./models/Transaction");
const User = require("./models/User");

// ==========================================
// OWNER CLEANUP COMMANDS
// ==========================================

const {
    registerOwnerCleanupCommands
} = require("./ownerCleanupCommands");

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const OWNER_BOT_TOKEN =
    process.env.OWNER_BOT_TOKEN;

const CUSTOMER_BOT_TOKEN =
    process.env.CUSTOMER_BOT_TOKEN;

const OWNER_TELEGRAM_ID =
    Number(process.env.OWNER_TELEGRAM_ID);


// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

if (!OWNER_BOT_TOKEN) {

    console.error(
        "OWNER_BOT_TOKEN is missing from .env ❌"
    );

    process.exit(1);
}


if (!CUSTOMER_BOT_TOKEN) {

    console.error(
        "CUSTOMER_BOT_TOKEN is missing from .env ❌"
    );

    process.exit(1);
}


if (!OWNER_TELEGRAM_ID) {

    console.error(
        "OWNER_TELEGRAM_ID is missing from .env ❌"
    );

    process.exit(1);
}


// ==========================================
// CREATE OWNER BOT
// ==========================================

const ownerBot =
    new Telegraf(
        OWNER_BOT_TOKEN
    );


// ==========================================
// CUSTOMER BOT
// ==========================================
//
// This bot is NOT launched here.
//
// We only use its Telegram API to send
// notifications to customers.
//
// Customer Bot itself runs from app.js.
//
// ==========================================

const customerBot =
    new Telegraf(
        CUSTOMER_BOT_TOKEN
    );


// ==========================================
// FORMAT DATE
// ==========================================

const formatDate = (date) => {

    if (!date) {

        return "Unknown";
    }

    return new Date(date).toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
};


// ==========================================
// REMOVE INLINE BUTTONS
// ==========================================

const removeButtons = async (ctx) => {

    try {

        if (
            ctx.callbackQuery &&
            ctx.callbackQuery.message
        ) {

            await ctx.editMessageReplyMarkup({
                inline_keyboard: []
            });

        }

    } catch (error) {

        console.log(
            "Could not remove inline buttons:",
            error.message
        );

    }
};


// ==========================================
// OWNER AUTHORIZATION
// ==========================================

ownerBot.use(
    async (ctx, next) => {

        try {

            const telegramUserId =
                ctx.from?.id;


            if (
                !telegramUserId ||
                Number(telegramUserId) !==
                    OWNER_TELEGRAM_ID
            ) {

                console.log(
                    "Unauthorized Owner Bot access attempt:",
                    telegramUserId
                );


                if (ctx.callbackQuery) {

                    await ctx.answerCbQuery(
                        "⛔ Unauthorized.",
                        {
                            show_alert: true
                        }
                    );

                } else {

                    await ctx.reply(
                        "⛔ You are not authorized to use this bot."
                    );

                }

                return;
            }


            await next();

        } catch (error) {

            console.error(
                "Owner authorization failed ❌"
            );

            console.error(error);

        }

    }
);


// ==========================================
// /START
// ==========================================

ownerBot.start(
    async (ctx) => {

        try {

            await ctx.reply(

                "👋 *Welcome to SR Khata Owner Bot*\n\n" +

                "📊 *Reports*\n\n" +

                "*/report* - Unpaid customers\n" +
                "*/paid* - Settled customers\n" +
                "*/credit* - Customer credit\n" +
                "*/summary* - Shop summary\n" +
                "*/customer <name>* - Customer details\n\n" +

                "⚠️ *Requests*\n\n" +

                "*/undo* - Pending undo requests\n" +
                "*/payments* - Pending payment requests\n\n" +

                "ℹ️ */help* - Show all commands.",

                {
                    parse_mode: "Markdown"
                }

            );

        } catch (error) {

            console.error(
                "Owner /start failed ❌"
            );

            console.error(error);

        }

    }
);


// ==========================================
// /HELP
// ==========================================

ownerBot.command(
    "help",
    async (ctx) => {

        try {

            await ctx.reply(

                "👨‍💼 *SR Khata Owner Bot*\n\n" +

                "📊 *Reports*\n\n" +

                "*/report* - Unpaid customers\n" +
                "*/paid* - Settled customers\n" +
                "*/credit* - Customer credit\n" +
                "*/summary* - Shop summary\n" +
                "*/customer <name>* - Customer details\n\n" +

                "⚠️ *Requests*\n\n" +

                "*/undo* - Pending undo requests\n" +
                "*/payments* - Pending payment requests\n\n" +

                "ℹ️ */help* - Show this help message.",

                {
                    parse_mode: "Markdown"
                }

            );

        } catch (error) {

            console.error(
                "Owner /help failed ❌"
            );

            console.error(error);

        }

    }
);


// ==========================================
// /REPORT
// Show all unpaid customers
// ==========================================

ownerBot.command(
    "report",
    async (ctx) => {

        try {

            console.log("--------------------------------");
            console.log("Owner /report requested");

            const customers =
                await getUnpaidCustomers();

            if (customers.length === 0) {

                await ctx.reply(
                    "✅ *No Unpaid Customers*\n\n" +
                    "All customers are currently settled.",
                    {
                        parse_mode: "Markdown"
                    }
                );

                console.log("Unpaid customers: 0");
                console.log("--------------------------------");
                return;
            }

            let message =
                "🔴 *UNPAID CUSTOMERS*\n\n";

            let totalOutstanding = 0;

            customers.forEach((customer, index) => {

                const outstanding =
                    Number(customer.outstanding);

                totalOutstanding += outstanding;

                message +=
                    `${index + 1}. ${customer.name || "Unknown"} — ₹${outstanding}\n`;
            });

            message +=
                "\n────────────────\n" +
                `👥 *Unpaid:* ${customers.length}\n` +
                `💰 *Total Due:* ₹${totalOutstanding}`;

            await ctx.reply(
                message,
                {
                    parse_mode: "Markdown"
                }
            );

            console.log("Unpaid customers:", customers.length);
            console.log("Total due:", totalOutstanding);
            console.log("--------------------------------");

        } catch (error) {

            console.error("Owner /report failed ❌");
            console.error(error);

            await ctx.reply(
                "❌ Unable to generate the unpaid customer report."
            );
        }
    }
);


// ==========================================
// /PAID
// Show settled customers
// ==========================================

ownerBot.command(
    "paid",
    async (ctx) => {

        try {

            console.log("--------------------------------");
            console.log("Owner /paid requested");

            const customers =
                await getPaidCustomers();

            if (customers.length === 0) {

                await ctx.reply(
                    "ℹ️ *No Settled Customers*\n\n" +
                    "No customer currently has a ₹0 balance.",
                    {
                        parse_mode: "Markdown"
                    }
                );

                console.log("Paid customers: 0");
                console.log("--------------------------------");
                return;
            }

            let message =
                "🟢 *PAID CUSTOMERS*\n\n";

            customers.forEach((customer, index) => {

                message +=
                    `${index + 1}. ${customer.name || "Unknown"}\n`;
            });

            message +=
                "\n────────────────\n" +
                `👥 *Paid:* ${customers.length}`;

            await ctx.reply(
                message,
                {
                    parse_mode: "Markdown"
                }
            );

            console.log("Paid customers:", customers.length);
            console.log("--------------------------------");

        } catch (error) {

            console.error("Owner /paid failed ❌");
            console.error(error);

            await ctx.reply(
                "❌ Unable to generate the paid customer report."
            );
        }
    }
);


// ==========================================
// /CREDIT
// Show customers with credit
// ==========================================

ownerBot.command(
    "credit",
    async (ctx) => {

        try {

            console.log("--------------------------------");
            console.log("Owner /credit requested");

            const customers =
                await getCreditCustomers();

            if (customers.length === 0) {

                await ctx.reply(
                    "ℹ️ *No Customer Credit*\n\n" +
                    "No customer currently has an overpayment.",
                    {
                        parse_mode: "Markdown"
                    }
                );

                console.log("Credit customers: 0");
                console.log("--------------------------------");
                return;
            }

            let message =
                "🔵 *CUSTOMER CREDIT*\n\n";

            let totalCredit = 0;

            customers.forEach((customer, index) => {

                const credit =
                    Math.abs(Number(customer.outstanding));

                totalCredit += credit;

                message +=
                    `${index + 1}. ${customer.name || "Unknown"} — ₹${credit}\n`;
            });

            message +=
                "\n────────────────\n" +
                `👥 *Credit:* ${customers.length}\n` +
                `💰 *Total Credit:* ₹${totalCredit}`;

            await ctx.reply(
                message,
                {
                    parse_mode: "Markdown"
                }
            );

            console.log("Credit customers:", customers.length);
            console.log("Total credit:", totalCredit);
            console.log("--------------------------------");

        } catch (error) {

            console.error("Owner /credit failed ❌");
            console.error(error);

            await ctx.reply(
                "❌ Unable to generate the credit customer report."
            );
        }
    }
);


// ==========================================
// /SUMMARY
// Show shop summary
// ==========================================

ownerBot.command(
    "summary",
    async (ctx) => {

        try {

            console.log("--------------------------------");
            console.log("Owner /summary requested");

            const summary =
                await getShopSummary();

            const message =
                "📊 *SHOP SUMMARY*\n\n" +
                `👥 Customers: ${summary.totalCustomers}\n\n` +
                `🔴 Unpaid: ${summary.unpaidCustomers}\n` +
                `🟢 Paid: ${summary.paidCustomers}\n` +
                `🔵 Credit: ${summary.creditCustomers}\n\n` +
                `🛒 Sales: ₹${summary.totalPurchase}\n` +
                `💵 Payments: ₹${summary.totalPayment}\n\n` +
                `💰 Outstanding: ₹${summary.totalOutstanding}`;

            await ctx.reply(
                message,
                {
                    parse_mode: "Markdown"
                }
            );

            console.log("Total customers:", summary.totalCustomers);
            console.log("Unpaid customers:", summary.unpaidCustomers);
            console.log("Paid customers:", summary.paidCustomers);
            console.log("Credit customers:", summary.creditCustomers);
            console.log("Total purchase:", summary.totalPurchase);
            console.log("Total payment:", summary.totalPayment);
            console.log("Total outstanding:", summary.totalOutstanding);
            console.log("--------------------------------");

        } catch (error) {

            console.error("Owner /summary failed ❌");
            console.error(error);

            await ctx.reply(
                "❌ Unable to generate the shop summary."
            );
        }
    }
);


// ==========================================
// /CUSTOMER <NAME>
// Show one customer's report
// ==========================================

ownerBot.command(
    "customer",
    async (ctx) => {

        try {

            console.log("--------------------------------");
            console.log("Owner /customer requested");

            const commandText =
                ctx.message?.text || "";

            const customerName =
                commandText
                    .replace(/^\/customer(?:@\w+)?\s*/i, "")
                    .trim();

            if (!customerName) {

                await ctx.reply(
                    "ℹ️ *Usage*\n\n" +
                    "`/customer Sachin`",
                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }

            const customer =
                await getCustomerReportByName(
                    customerName
                );

            if (!customer) {

                await ctx.reply(
                    `❌ Customer *${customerName}* not found.`,
                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }

            let status;

            if (customer.outstanding > 0) {

                status =
                    `🔴 Due: ₹${customer.outstanding}`;

            } else if (customer.outstanding === 0) {

                status =
                    "🟢 Paid: ₹0";

            } else {

                status =
                    `🔵 Credit: ₹${Math.abs(customer.outstanding)}`;
            }

            const message =
                "👤 *CUSTOMER REPORT*\n\n" +
                `Name: ${customer.name}\n` +
                `Telegram ID: ${customer.telegramUserId || "Unknown"}\n\n` +
                `🛒 Purchase: ₹${customer.totalPurchase}\n` +
                `💵 Payment: ₹${customer.totalPayment}\n\n` +
                status;

            await ctx.reply(
                message,
                {
                    parse_mode: "Markdown"
                }
            );

            console.log("Customer:", customer.name);
            console.log("Telegram ID:", customer.telegramUserId);
            console.log("Purchase:", customer.totalPurchase);
            console.log("Payment:", customer.totalPayment);
            console.log("Outstanding:", customer.outstanding);
            console.log("--------------------------------");

        } catch (error) {

            console.error("Owner /customer failed ❌");
            console.error(error);

            await ctx.reply(
                "❌ Unable to generate the customer report."
            );
        }
    }
);


// ==========================================
// /UNDO
// ==========================================
//
// Shows pending purchase undo requests.
//
// ==========================================

ownerBot.command(
    "undo",
    async (ctx) => {

        try {

            console.log("--------------------------------");

            console.log(
                "Pending undo requests requested by owner"
            );


            const requests =
                await getPendingUndoRequests();


            console.log(
                "Pending undo requests:",
                requests.length
            );


            if (
                requests.length === 0
            ) {

                await ctx.reply(
                    "✅ No pending undo requests."
                );

                console.log("--------------------------------");

                return;
            }


            for (
                const request of requests
            ) {

                try {

                    // ==========================================
                    // CUSTOMER
                    // ==========================================

                    const customer =
                        await User.findById(
                            request.customerId
                        );


                    if (!customer) {

                        console.log(
                            "Customer not found:",
                            request.customerId
                        );


                        await rejectUndoRequest(
                            request._id
                        );

                        continue;
                    }


                    // ==========================================
                    // TRANSACTION
                    // ==========================================

                    const transaction =
                        await Transaction.findById(
                            request.transactionId
                        );


                    // ==========================================
                    // STALE REQUEST
                    // ==========================================

                    if (!transaction) {

                        console.log(
                            "Stale undo request:",
                            request._id
                        );


                        await rejectUndoRequest(
                            request._id
                        );

                        continue;
                    }


                    // ==========================================
                    // ONLY PURCHASE CAN BE UNDONE
                    // ==========================================

                    if (
                        transaction.type !==
                        "PURCHASE"
                    ) {

                        console.log(
                            "Invalid undo transaction type:",
                            transaction.type
                        );


                        await rejectUndoRequest(
                            request._id
                        );

                        continue;
                    }


                    const customerName =
                        customer.name ||
                        "Unknown Customer";


                    const username =
                        customer.username
                            ? `@${customer.username}`
                            : "No username";


                    const requestDate =
                        formatDate(
                            request.createdAt
                        );


                    // ==========================================
                    // SEND REQUEST TO OWNER
                    // ==========================================

                    await ctx.reply(

                        "⚠️ *Undo Request*\n\n" +

                        `👤 *Customer:* ${customerName}\n` +

                        `📱 *Username:* ${username}\n` +

                        `🆔 *Telegram ID:* ${customer.telegramUserId || "Unknown"}\n\n` +

                        `💰 *Purchase Amount:* ₹${transaction.amount}\n\n` +

                        `🧾 *Transaction ID:* ${transaction._id}\n\n` +

                        `📅 *Date:* ${requestDate}\n\n` +

                        `📌 *Status:* ${request.status}\n\n` +

                        "The customer wants this purchase removed from the khata.",

                        {
                            parse_mode: "Markdown",

                            reply_markup: {

                                inline_keyboard: [

                                    [

                                        {
                                            text:
                                                "✅ Approve Undo",

                                            callback_data:
                                                `undo_approve:${request._id}`
                                        },

                                        {
                                            text:
                                                "❌ Reject Undo",

                                            callback_data:
                                                `undo_reject:${request._id}`
                                        }

                                    ]

                                ]

                            }

                        }

                    );

                } catch (requestError) {

                    console.error(
                        "Failed to process undo request:",
                        request._id
                    );

                    console.error(
                        requestError
                    );

                }

            }


            console.log(
                "Undo requests sent successfully ✅"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Failed to get undo requests ❌"
            );

            console.error(error);


            await ctx.reply(
                "❌ Unable to load pending undo requests."
            );

        }

    }
);


// ==========================================
// /PAYMENTS
// ==========================================
//
// Shows pending payment requests.
//
// ==========================================

ownerBot.command(
    "payments",
    async (ctx) => {

        try {

            console.log("--------------------------------");

            console.log(
                "Pending payment requests requested by owner"
            );


            const requests =
                await getPendingPaymentRequests();


            console.log(
                "Pending payment requests:",
                requests.length
            );


            if (
                requests.length === 0
            ) {

                await ctx.reply(
                    "✅ No pending payment requests."
                );

                console.log("--------------------------------");

                return;
            }


            for (
                const request of requests
            ) {

                try {

                    // ==========================================
                    // CUSTOMER
                    // ==========================================

                    const customer =
                        await User.findById(
                            request.customerId
                        );


                    if (!customer) {

                        console.log(
                            "Customer not found:",
                            request.customerId
                        );


                        await rejectPaymentRequest(
                            request._id
                        );

                        continue;
                    }


                    const customerName =
                        customer.name ||
                        "Unknown Customer";


                    const username =
                        customer.username
                            ? `@${customer.username}`
                            : "No username";


                    const requestDate =
                        formatDate(
                            request.createdAt
                        );


                    // ==========================================
                    // SEND PAYMENT REQUEST
                    // ==========================================

                    await ctx.reply(

                        "💰 *Payment Verification Request*\n\n" +

                        `👤 *Customer:* ${customerName}\n` +

                        `📱 *Username:* ${username}\n` +

                        `🆔 *Telegram ID:* ${customer.telegramUserId || "Unknown"}\n\n` +

                        `💵 *Claimed Payment:* ₹${request.amount}\n\n` +

                        `📝 *Customer Message:*\n` +

                        `"${request.message || "No message"}"\n\n` +

                        `📅 *Date:* ${requestDate}\n\n` +

                        `📌 *Status:* ${request.status}\n\n` +

                        "Please verify whether this payment was actually received.",

                        {

                            parse_mode: "Markdown",

                            reply_markup: {

                                inline_keyboard: [

                                    [

                                        {
                                            text:
                                                "✅ Approve Payment",

                                            callback_data:
                                                `payment_approve:${request._id}`
                                        }

                                    ],

                                    [

                                        {
                                            text:
                                                "❌ Reject Payment",

                                            callback_data:
                                                `payment_reject:${request._id}`
                                        }

                                    ]

                                ]

                            }

                        }

                    );

                } catch (requestError) {

                    console.error(
                        "Failed to process payment request:",
                        request._id
                    );

                    console.error(
                        requestError
                    );

                }

            }


            console.log(
                "Payment requests sent successfully ✅"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Failed to get payment requests ❌"
            );

            console.error(error);


            await ctx.reply(
                "❌ Unable to load pending payment requests."
            );

        }

    }
);


// ==========================================
// UNDO APPROVE
// ==========================================

ownerBot.action(
    /^undo_approve:(.+)$/,
    async (ctx) => {

        try {

            const undoRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "UNDO APPROVE button clicked"
            );

            console.log(
                "Undo Request ID:",
                undoRequestId
            );


            // ==========================================
            // FIND REQUEST
            // ==========================================

            const undoRequest =
                await getUndoRequestById(
                    undoRequestId
                );


            if (!undoRequest) {

                await ctx.answerCbQuery(
                    "Request not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                undoRequest.status !==
                "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "Request already processed.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(
                    `⚠️ Request is already ${undoRequest.status}.`
                );

                return;
            }


            // ==========================================
            // FIND TRANSACTION
            // ==========================================

            const transaction =
                await Transaction.findById(
                    undoRequest.transactionId
                );


            if (!transaction) {

                await rejectUndoRequest(
                    undoRequest._id
                );


                await ctx.answerCbQuery(
                    "Transaction no longer exists.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "⚠️ *Undo Request Closed*\n\n" +

                    "The transaction no longer exists.\n\n" +

                    "This request has been closed as stale.",

                    {
                        parse_mode: "Markdown"
                    }

                );

                return;
            }


            // ==========================================
            // SAFETY CHECK
            // ==========================================

            if (
                transaction.type !==
                "PURCHASE"
            ) {

                await rejectUndoRequest(
                    undoRequest._id
                );


                await ctx.answerCbQuery(
                    "Only purchases can be undone.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // FIND CUSTOMER
            // ==========================================

            const customer =
                await User.findById(
                    undoRequest.customerId
                );


            if (!customer) {

                await ctx.answerCbQuery(
                    "Customer not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            if (
                !customer.telegramUserId
            ) {

                await ctx.answerCbQuery(
                    "Customer Telegram ID missing.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // DELETE PURCHASE
            // ==========================================

            const deleteResult =
                await Transaction.deleteOne({

                    _id:
                        transaction._id,

                    type:
                        "PURCHASE"

                });


            if (
                deleteResult.deletedCount !==
                1
            ) {

                await ctx.answerCbQuery(
                    "Transaction could not be deleted.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            console.log(
                "Transaction deleted successfully ✅:",
                transaction._id
            );


            // ==========================================
            // APPROVE REQUEST
            // ==========================================

            const approvedRequest =
                await approveUndoRequest(
                    undoRequest._id
                );


            if (!approvedRequest) {

                console.error(
                    "WARNING: Transaction deleted but request status could not be updated."
                );


                await ctx.answerCbQuery(
                    "Undo completed with warning.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(
                    "⚠️ Transaction was deleted, but the request status could not be updated.\n\nPlease inspect the database."
                );

                return;
            }
                        // ==========================================
            // REMOVE BUTTONS
            // ==========================================

            await removeButtons(ctx);


            await ctx.answerCbQuery(
                "Undo approved."
            );


            // ==========================================
            // UPDATED TOTAL
            // ==========================================

            const total =
                await getCustomerTotal(
                    customer._id
                );


            // ==========================================
            // OWNER CONFIRMATION
            // ==========================================

            await ctx.reply(

                "✅ *Undo Approved*\n\n" +

                `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                `🛒 *Purchase Removed:* ₹${transaction.amount}\n\n` +

                `🧾 *Transaction ID:* ${transaction._id}\n\n` +

                "🗑 The purchase has been removed from the khata.\n\n" +

                "📌 *Request:* APPROVED\n\n" +

                "📊 *Updated Khata*\n\n" +

                `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                `💰 Total Payment: ₹${total.totalPayment}\n` +

                `📌 Outstanding: ₹${total.outstanding}`,

                {
                    parse_mode: "Markdown"
                }

            );


            // ==========================================
            // CUSTOMER NOTIFICATION
            // ==========================================

            try {

                await customerBot.telegram.sendMessage(

                    customer.telegramUserId,

                    "✅ *Undo Request Approved*\n\n" +

                    `🛒 *Purchase Removed:* ₹${transaction.amount}\n\n` +

                    "The shop owner approved your undo request.\n\n" +

                    "🗑 The transaction has been removed from your khata.\n\n" +

                    "📊 *Updated Khata*\n\n" +

                    `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                    `💰 Total Payment: ₹${total.totalPayment}\n` +

                    `📌 Outstanding: ₹${total.outstanding}`,

                    {
                        parse_mode: "Markdown"
                    }

                );


                console.log(
                    "Customer notification sent using Customer Bot ✅"
                );

            } catch (notificationError) {

                console.error(
                    "Customer undo approval notification failed ❌"
                );

                console.error(
                    notificationError.message
                );

            }


            console.log(
                "Undo approved successfully ✅"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Undo approval failed ❌"
            );

            console.error(error);


            try {

                await ctx.answerCbQuery(
                    "Undo approval failed.",
                    {
                        show_alert: true
                    }
                );

            } catch (_) {}


            await ctx.reply(
                "❌ Unable to approve this undo request."
            );

        }

    }
);


// ==========================================
// UNDO REJECT
// ==========================================

ownerBot.action(
    /^undo_reject:(.+)$/,
    async (ctx) => {

        try {

            const undoRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "UNDO REJECT button clicked"
            );

            console.log(
                "Undo Request ID:",
                undoRequestId
            );


            // ==========================================
            // FIND REQUEST
            // ==========================================

            const undoRequest =
                await getUndoRequestById(
                    undoRequestId
                );


            if (!undoRequest) {

                await ctx.answerCbQuery(
                    "Request not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                undoRequest.status !==
                "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "Request already processed.",
                    {
                        show_alert: true
                    }
                );

                await ctx.reply(
                    `⚠️ Request is already ${undoRequest.status}.`
                );

                return;
            }


            // ==========================================
            // FIND CUSTOMER
            // ==========================================

            const customer =
                await User.findById(
                    undoRequest.customerId
                );


            if (!customer) {

                await ctx.answerCbQuery(
                    "Customer not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // REJECT
            // ==========================================

            const rejectedRequest =
                await rejectUndoRequest(
                    undoRequest._id
                );


            if (!rejectedRequest) {

                await ctx.answerCbQuery(
                    "Could not reject request.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // REMOVE BUTTONS
            // ==========================================

            await removeButtons(ctx);


            await ctx.answerCbQuery(
                "Undo rejected."
            );


            // ==========================================
            // CURRENT TOTAL
            // ==========================================

            const total =
                await getCustomerTotal(
                    customer._id
                );


            // ==========================================
            // OWNER MESSAGE
            // ==========================================

            await ctx.reply(

                "❌ *Undo Request Rejected*\n\n" +

                `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                "📌 *Request:* REJECTED\n\n" +

                "The purchase remains in the customer's khata.\n\n" +

                "📊 *Current Khata*\n\n" +

                `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                `💰 Total Payment: ₹${total.totalPayment}\n` +

                `📌 Outstanding: ₹${total.outstanding}`,

                {
                    parse_mode: "Markdown"
                }

            );


            // ==========================================
            // CUSTOMER NOTIFICATION
            // ==========================================

            if (
                customer.telegramUserId
            ) {

                try {

                    await customerBot.telegram.sendMessage(

                        customer.telegramUserId,

                        "❌ *Undo Request Rejected*\n\n" +

                        "The shop owner rejected your request to remove the purchase.\n\n" +

                        "⚠️ The purchase remains in your khata.\n\n" +

                        "If you believe this is incorrect, please contact the shop owner.",

                        {
                            parse_mode: "Markdown"
                        }

                    );


                    console.log(
                        "Customer notification sent using Customer Bot ❌"
                    );

                } catch (notificationError) {

                    console.error(
                        "Customer undo rejection notification failed ❌"
                    );

                    console.error(
                        notificationError.message
                    );

                }

            }


            console.log(
                "Undo request rejected successfully ❌"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Undo rejection failed ❌"
            );

            console.error(error);


            try {

                await ctx.answerCbQuery(
                    "Undo rejection failed.",
                    {
                        show_alert: true
                    }
                );

            } catch (_) {}


            await ctx.reply(
                "❌ Unable to reject this undo request."
            );

        }

    }
);


// ==========================================
// PAYMENT APPROVE
// ==========================================
//
// IMPORTANT:
//
// The payment is NOT automatically trusted.
//
// Before creating a PAYMENT transaction:
//
// 1. Request must be PENDING
// 2. Customer must exist
// 3. Payment amount must be valid
// 4. Customer must have outstanding balance
// 5. Payment cannot be greater than outstanding
//
// ==========================================

ownerBot.action(
    /^payment_approve:(.+)$/,
    async (ctx) => {

        try {

            const paymentRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "PAYMENT APPROVE button clicked"
            );

            console.log(
                "Payment Request ID:",
                paymentRequestId
            );


            // ==========================================
            // FIND PAYMENT REQUEST
            // ==========================================

            const paymentRequest =
                await getPaymentRequestById(
                    paymentRequestId
                );


            if (!paymentRequest) {

                await ctx.answerCbQuery(
                    "Payment request not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                paymentRequest.status !==
                "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "Payment request already processed.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(
                    `⚠️ Payment request is already ${paymentRequest.status}.`
                );

                return;
            }


            // ==========================================
            // FIND CUSTOMER
            // ==========================================

            const customer =
                await User.findById(
                    paymentRequest.customerId
                );


            if (!customer) {

                await ctx.answerCbQuery(
                    "Customer not found.",
                    {
                        show_alert: true
                    }
                );

                await ctx.reply(
                    "❌ Customer could not be found."
                );

                return;
            }


            // ==========================================
            // CUSTOMER TELEGRAM ID
            // ==========================================

            if (
                !customer.telegramUserId
            ) {

                await ctx.answerCbQuery(
                    "Customer Telegram ID missing.",
                    {
                        show_alert: true
                    }
                );

                await ctx.reply(
                    "❌ Customer Telegram ID is missing."
                );

                return;
            }


            // ==========================================
            // PAYMENT AMOUNT
            // ==========================================

            const paymentAmount =
                Number(
                    paymentRequest.amount
                );


            if (
                !Number.isFinite(
                    paymentAmount
                ) ||
                paymentAmount <= 0
            ) {

                await ctx.answerCbQuery(
                    "Invalid payment amount.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "❌ *Payment Approval Blocked*\n\n" +

                    "The payment request contains an invalid amount.\n\n" +

                    "No PAYMENT transaction was created.",

                    {
                        parse_mode: "Markdown"
                    }

                );

                return;
            }


            // ==========================================
            // GET CURRENT KHATA
            // ==========================================

            const beforeTotal =
                await getCustomerTotal(
                    customer._id
                );


            const outstanding =
                Number(
                    beforeTotal.outstanding
                );


            console.log(
                "Current Outstanding:",
                outstanding
            );

            console.log(
                "Requested Payment:",
                paymentAmount
            );


            // ==========================================
            // VALIDATION #1
            // NO OUTSTANDING
            // ==========================================

            if (
                outstanding <= 0
            ) {

                await ctx.answerCbQuery(
                    "No outstanding balance exists.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "⚠️ *Payment Approval Blocked*\n\n" +

                    `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                    `💰 *Claimed Payment:* ₹${paymentAmount}\n` +

                    `📌 *Current Outstanding:* ₹${outstanding}\n\n` +

                    "There is no outstanding balance to receive this payment.\n\n" +

                    "❌ No PAYMENT transaction was created.\n" +

                    "❌ The khata was NOT changed.\n\n" +

                    "📌 The payment request remains *PENDING*.",

                    {
                        parse_mode: "Markdown"
                    }

                );


                // ==========================================
                // CUSTOMER NOTIFICATION
                // ==========================================

                try {

                    await customerBot.telegram.sendMessage(

                        customer.telegramUserId,

                        "⚠️ *Payment Verification Pending*\n\n" +

                        `💰 *Claimed Payment:* ₹${paymentAmount}\n\n` +

                        "The shop owner cannot approve this payment because there is no outstanding balance in your khata.\n\n" +

                        "❌ No payment was added.\n\n" +

                        "Please contact the shop owner if this is incorrect.",

                        {
                            parse_mode: "Markdown"
                        }

                    );


                    console.log(
                        "Customer payment validation notification sent using Customer Bot ✅"
                    );

                } catch (notificationError) {

                    console.error(
                        "Customer payment validation notification failed ❌"
                    );

                    console.error(
                        notificationError.message
                    );

                }


                return;
            }
                        // ==========================================
            // VALIDATION #2
            // PAYMENT > OUTSTANDING
            // ==========================================

            if (
                paymentAmount >
                outstanding
            ) {

                const excess =
                    paymentAmount -
                    outstanding;


                await ctx.answerCbQuery(
                    "Payment is greater than outstanding balance.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "⚠️ *Payment Approval Blocked*\n\n" +

                    `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                    `💰 *Claimed Payment:* ₹${paymentAmount}\n` +

                    `📌 *Current Outstanding:* ₹${outstanding}\n\n` +

                    `⚠️ Excess Amount: ₹${excess}\n\n` +

                    "The claimed payment is greater than the customer's current outstanding balance.\n\n" +

                    "❌ No PAYMENT transaction was created.\n" +

                    "❌ The khata was NOT changed.\n\n" +

                    "📌 The payment request remains *PENDING*.\n\n" +

                    "Please verify the actual payment amount before approving.",

                    {
                        parse_mode: "Markdown"
                    }

                );


                // ==========================================
                // CUSTOMER NOTIFICATION
                // ==========================================

                try {

                    await customerBot.telegram.sendMessage(

                        customer.telegramUserId,

                        "⚠️ *Payment Verification Pending*\n\n" +

                        `💰 *Claimed Payment:* ₹${paymentAmount}\n` +

                        `📌 *Current Outstanding:* ₹${outstanding}\n\n` +

                        "The shop owner cannot approve this payment amount because it is greater than your current outstanding balance.\n\n" +

                        "❌ No payment was added to your khata.\n\n" +

                        "Please contact the shop owner to verify the correct payment amount.",

                        {
                            parse_mode: "Markdown"
                        }

                    );


                    console.log(
                        "Customer payment validation notification sent using Customer Bot ✅"
                    );

                } catch (notificationError) {

                    console.error(
                        "Customer payment validation notification failed ❌"
                    );

                    console.error(
                        notificationError.message
                    );

                }


                return;
            }


            // ==========================================
            // CREATE PAYMENT TRANSACTION
            // ==========================================

            const paymentTransaction =
                await createTransaction({

                    customerId:
                        paymentRequest.customerId,

                    shopId:
                        null,

                    type:
                        "PAYMENT",

                    amount:
                        paymentAmount,

                    telegramMessageId:
                        paymentRequest.telegramMessageId ||
                        null,

                    telegramUpdateId:
                        paymentRequest.telegramUpdateId ||
                        null

                });


            if (!paymentTransaction) {

                await ctx.answerCbQuery(
                    "Payment transaction failed.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "❌ Payment transaction failed.\n\n" +

                    "The payment was NOT added to the khata."

                );

                return;
            }


            console.log(
                "Payment transaction created successfully ✅:",
                paymentTransaction._id
            );


            // ==========================================
            // MARK REQUEST APPROVED
            // ==========================================

            const approvedRequest =
                await approvePaymentRequest(
                    paymentRequest._id
                );


            if (!approvedRequest) {

                // ==========================================
                // ROLLBACK PAYMENT
                // ==========================================

                await Transaction.deleteOne({

                    _id:
                        paymentTransaction._id

                });


                await ctx.answerCbQuery(
                    "Payment approval failed.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(

                    "❌ Payment approval failed.\n\n" +

                    "The payment was NOT added to the khata."

                );

                return;
            }


            // ==========================================
            // REMOVE BUTTONS
            // ==========================================

            await removeButtons(ctx);


            await ctx.answerCbQuery(
                "Payment approved."
            );


            // ==========================================
            // UPDATED TOTAL
            // ==========================================

            const total =
                await getCustomerTotal(
                    customer._id
                );


            // ==========================================
            // OWNER CONFIRMATION
            // ==========================================

            await ctx.reply(

                "✅ *Payment Approved*\n\n" +

                `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                `💰 *Payment:* ₹${paymentAmount}\n\n` +

                `🧾 *Transaction ID:* ${paymentTransaction._id}\n\n` +

                "The payment has been verified and added to the khata.\n\n" +

                "📌 *Request:* APPROVED\n\n" +

                "📊 *Updated Khata*\n\n" +

                `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                `💰 Total Payment: ₹${total.totalPayment}\n` +

                `📌 Outstanding: ₹${total.outstanding}`,

                {
                    parse_mode: "Markdown"
                }

            );


            // ==========================================
            // CUSTOMER NOTIFICATION
            // ==========================================

            try {

                await customerBot.telegram.sendMessage(

                    customer.telegramUserId,

                    "✅ *Payment Approved*\n\n" +

                    `💰 *Payment:* ₹${paymentAmount}\n\n` +

                    "Your payment request has been verified and approved by the shop owner.\n\n" +

                    "🧾 The payment has been added to your khata.\n\n" +

                    "📊 *Updated Khata*\n\n" +

                    `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                    `💰 Total Payment: ₹${total.totalPayment}\n` +

                    `📌 Outstanding: ₹${total.outstanding}`,

                    {
                        parse_mode: "Markdown"
                    }

                );


                console.log(
                    "Customer payment approval notification sent using Customer Bot ✅"
                );

            } catch (notificationError) {

                console.error(
                    "Customer payment approval notification failed ❌"
                );

                console.error(
                    notificationError.message
                );

            }


            console.log(
                "Payment approved successfully ✅"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Payment approval failed ❌"
            );

            console.error(error);


            try {

                await ctx.answerCbQuery(
                    "Payment approval failed.",
                    {
                        show_alert: true
                    }
                );

            } catch (_) {}


            await ctx.reply(
                "❌ Payment approval failed. Please check the server logs."
            );

        }

    }
);


// ==========================================
// PAYMENT REJECT
// ==========================================

ownerBot.action(
    /^payment_reject:(.+)$/,
    async (ctx) => {

        try {

            const paymentRequestId =
                ctx.match[1];


            console.log("--------------------------------");

            console.log(
                "PAYMENT REJECT button clicked"
            );

            console.log(
                "Payment Request ID:",
                paymentRequestId
            );


            // ==========================================
            // FIND REQUEST
            // ==========================================

            const paymentRequest =
                await getPaymentRequestById(
                    paymentRequestId
                );


            if (!paymentRequest) {

                await ctx.answerCbQuery(
                    "Payment request not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                paymentRequest.status !==
                "PENDING"
            ) {

                await ctx.answerCbQuery(
                    "Payment request already processed.",
                    {
                        show_alert: true
                    }
                );


                await ctx.reply(
                    `⚠️ Payment request is already ${paymentRequest.status}.`
                );

                return;
            }


            // ==========================================
            // CUSTOMER
            // ==========================================

            const customer =
                await User.findById(
                    paymentRequest.customerId
                );


            if (!customer) {

                await ctx.answerCbQuery(
                    "Customer not found.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // REJECT
            // ==========================================

            const rejectedRequest =
                await rejectPaymentRequest(
                    paymentRequest._id
                );


            if (!rejectedRequest) {

                await ctx.answerCbQuery(
                    "Could not reject payment request.",
                    {
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // REMOVE BUTTONS
            // ==========================================

            await removeButtons(ctx);


            await ctx.answerCbQuery(
                "Payment rejected."
            );


            // ==========================================
            // CURRENT TOTAL
            // ==========================================

            const total =
                await getCustomerTotal(
                    customer._id
                );


            // ==========================================
            // OWNER CONFIRMATION
            // ==========================================

            await ctx.reply(

                "❌ *Payment Rejected*\n\n" +

                `👤 *Customer:* ${customer.name || "Unknown"}\n` +

                `💰 *Claimed Payment:* ₹${paymentRequest.amount}\n\n` +

                "The payment request was rejected.\n\n" +

                "⚠️ No PAYMENT transaction was created.\n" +

                "⚠️ The khata was NOT changed.\n\n" +

                "📌 *Request:* REJECTED\n\n" +

                "📊 *Current Khata*\n\n" +

                `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

                `💰 Total Payment: ₹${total.totalPayment}\n` +

                `📌 Outstanding: ₹${total.outstanding}`,

                {
                    parse_mode: "Markdown"
                }

            );


            // ==========================================
            // CUSTOMER NOTIFICATION
            // ==========================================

            if (
                customer.telegramUserId
            ) {

                try {

                    await customerBot.telegram.sendMessage(

                        customer.telegramUserId,

                        "❌ *Payment Request Rejected*\n\n" +

                        `💰 *Claimed Payment:* ₹${paymentRequest.amount}\n\n` +

                        "The shop owner rejected your payment verification request.\n\n" +

                        "⚠️ Your khata has NOT been changed.\n" +

                        "⚠️ The payment was NOT added to your account.\n\n" +

                        "If you actually made this payment, please contact the shop owner.",

                        {
                            parse_mode: "Markdown"
                        }

                    );


                    console.log(
                        "Customer payment rejection notification sent using Customer Bot ❌"
                    );

                } catch (notificationError) {

                    console.error(
                        "Customer payment rejection notification failed ❌"
                    );

                    console.error(
                        notificationError.message
                    );

                }

            }


            console.log(
                "Payment request rejected successfully ❌"
            );

            console.log("--------------------------------");

        } catch (error) {

            console.error(
                "Payment rejection failed ❌"
            );

            console.error(error);


            try {

                await ctx.answerCbQuery(
                    "Payment rejection failed.",
                    {
                        show_alert: true
                    }
                );

            } catch (_) {}


            await ctx.reply(
                "❌ Unable to reject this payment request."
            );

        }

    }
);
// ==========================================
// OWNER DATA CLEANUP COMMANDS
// ==========================================

registerOwnerCleanupCommands(
    ownerBot,
    OWNER_TELEGRAM_ID
);


// ==========================================
// START OWNER BOT
// ==========================================

const startOwnerBot = async () => {

    try {

        await connectDB();

        console.log(
            "MongoDB Connected Successfully ✅"
        );

        console.log("--------------------------------");

        await ownerBot.launch();

        console.log(
            "Owner Bot is running..."
        );

        console.log(
            "Owner Telegram ID:",
            OWNER_TELEGRAM_ID
        );

        console.log(
            "Customer notification bot configured ✅"
        );

        console.log("--------------------------------");

    } catch (error) {

        console.error(
            "Owner Bot startup failed ❌"
        );

        console.error(error);

        process.exit(1);
    }

};


startOwnerBot();


// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

process.once(
    "SIGINT",
    () => {

        console.log(
            "Stopping Owner Bot..."
        );


        ownerBot.stop(
            "SIGINT"
        );

    }
);


process.once(
    "SIGTERM",
    () => {

        console.log(
            "Stopping Owner Bot..."
        );


        ownerBot.stop(
            "SIGTERM"
        );

    }
);