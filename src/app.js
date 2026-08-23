require("dotenv").config();

const { Telegraf } = require("telegraf");

const connectDB = require("./config/db");

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
    parseMessage
} = require("./utils/messageParser");

const Transaction = require("./models/Transaction");


const bot = new Telegraf(
    process.env.CUSTOMER_BOT_TOKEN
);


// ==========================================
// OWNER TELEGRAM ID
// ==========================================

const OWNER_TELEGRAM_ID =
    process.env.OWNER_TELEGRAM_ID;


// ==========================================
// Helper: Notify Owner
// ==========================================

const notifyOwner = async (message) => {

    try {

        if (!OWNER_TELEGRAM_ID) {

            console.log(
                "OWNER_TELEGRAM_ID is not configured ❌"
            );

            return;
        }

        await bot.telegram.sendMessage(
            OWNER_TELEGRAM_ID,
            message
        );

        console.log(
            "Owner notification sent successfully ✅"
        );

    } catch (error) {

        console.error(
            "Owner notification failed ❌"
        );

        console.error(
            error.message
        );
    }
};


// ==========================================
// /start command
// ==========================================

bot.start(async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name;


        const user =
            await findUserByTelegramId(
                telegramUserId
            );


        if (!user) {

            console.log(
                "User not found:",
                firstName
            );

            await ctx.reply(

                "❌ You are not registered yet.\n\n" +
                "Please contact the shop owner."

            );

            return;
        }


        console.log(
            "Existing customer:",
            firstName
        );


        await ctx.reply(

            `Welcome ${firstName} 👋`

        );


    } catch (error) {

        console.error(
            "User lookup failed ❌"
        );

        console.error(
            error.message
        );


        await ctx.reply(

            "Something went wrong. Please try again later."

        );

    }

});


// ==========================================
// /total command
// ==========================================

bot.command("total", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name;


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
        // Send to customer
        // ==========================================

        await ctx.reply(

            `📊 Your Khata\n\n` +

            `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

            `💵 Total Payment: ₹${total.totalPayment}\n` +

            `🔴 Outstanding: ₹${total.outstanding}`

        );


        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "Total calculation failed ❌"
        );

        console.error(
            error.message
        );


        await ctx.reply(

            "❌ Unable to calculate your total right now."

        );

    }

});


// ==========================================
// /history command
// ==========================================

bot.command("history", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name;


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
        // Get history
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


        if (transactions.length === 0) {

            await ctx.reply(
                "📭 No transactions found."
            );

            return;
        }


        // ==========================================
        // Build message
        // ==========================================

        let historyMessage =
            "📜 *Your Recent Transactions*\n\n";


        transactions.forEach(
            (transaction, index) => {

                const type =
                    transaction.type === "PURCHASE"
                        ? "🛒 Purchase"
                        : "💵 Payment";


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

        console.error(
            error.message
        );


        await ctx.reply(
            "❌ Unable to load transaction history."
        );

    }

});


// ==========================================
// /undo command
// ==========================================

bot.command("undo", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name;


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
        // Find latest transaction
        // ==========================================

        const latest =
            await Transaction.findOne({
                customerId: user._id
            })
                .sort({
                    createdAt: -1
                });


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


        console.log(
            "Latest transaction:",
            latest.type
        );

        console.log(
            "Latest amount:",
            latest.amount
        );


        // ==========================================
        // Check existing pending request
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

                "⏳ An undo request for this transaction is already pending.\n\n" +

                `🛒 Purchase: ₹${latest.amount}\n\n` +

                "Please wait for the shop owner to review it."

            );

            return;
        }


        // ==========================================
        // Create Undo Request
        // ==========================================

        const undoRequest =
            await createUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latest._id

            });


        console.log(
            "Undo request created successfully ✅:",
            undoRequest._id
        );


        // ==========================================
        // Customer notification
        // ==========================================

        await ctx.reply(

            "⏳ *Undo request created*\n\n" +

            `🛒 Purchase: ₹${latest.amount}\n\n` +

            "📨 Your request has been sent to the shop owner.\n\n" +

            "Please wait for the owner to review it.\n\n" +

            "⚠️ The transaction has NOT been deleted yet.",

            {
                parse_mode: "Markdown"
            }

        );


        // ==========================================
        // Notify Owner
        // ==========================================

        await notifyOwner(

            "⚠️ *New Undo Request*\n\n" +

            `👤 Customer: ${user.name}\n` +

            `📱 Telegram ID: ${telegramUserId}\n\n` +

            `🛒 Purchase: ₹${latest.amount}\n` +

            `🆔 Transaction ID: ${latest._id}\n\n` +

            "The customer wants to remove this purchase.\n\n" +

            "Please open the Owner Bot and use /requests to review it.",

        );


        console.log(
            "Undo request notification sent to owner ✅"
        );

        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "Undo request failed ❌"
        );

        console.error(
            error
        );


        await ctx.reply(
            "❌ Something went wrong while creating the undo request."
        );

    }

});


// ==========================================
// Normal financial text messages
// ==========================================

bot.on("text", async (ctx) => {

    try {

        const telegramUserId =
            ctx.from.id;

        const firstName =
            ctx.from.first_name;

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


        if (!parsed.success) {

            await ctx.reply(
                `❌ ${parsed.error}`
            );

            return;
        }


        // ==========================================
        // Decide transaction type
        // ==========================================

        let transactionType;


        if (parsed.isPayment) {

            transactionType =
                "PAYMENT";

        } else {

            transactionType =
                "PURCHASE";
        }


        // ==========================================
        // Create transaction
        // ==========================================

        const transaction =
            await createTransaction({

                customerId:
                    user._id,

                type:
                    transactionType,

                amount:
                    parsed.amount,

                telegramMessageId:
                    ctx.message.message_id,

                telegramUpdateId:
                    ctx.update.update_id

            });


        console.log(
            "Transaction created successfully ✅:",
            transaction._id
        );


        // ==========================================
        // Customer response
        // ==========================================

        if (
            transactionType === "PURCHASE"
        ) {

            await ctx.reply(

                "✅ *Purchase recorded!*\n\n" +

                `💰 Amount: ₹${parsed.amount}`,

                {
                    parse_mode: "Markdown"
                }

            );

        } else {

            await ctx.reply(

                "✅ *Payment recorded!*\n\n" +

                `💰 Amount: ₹${parsed.amount}`,

                {
                    parse_mode: "Markdown"
                }

            );

        }


        // ==========================================
        // Notify Owner
        // ==========================================

        const ownerType =
            transactionType === "PURCHASE"
                ? "🛒 Purchase"
                : "💵 Payment";


        await notifyOwner(

            "🔔 *New Customer Transaction*\n\n" +

            `👤 Customer: ${user.name}\n` +

            `📱 Telegram ID: ${telegramUserId}\n\n` +

            `${ownerType}\n` +

            `💰 Amount: ₹${parsed.amount}\n\n` +

            `📅 ${new Date(
                transaction.createdAt
            ).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            )}`

        );


        console.log(
            "Owner notified about transaction ✅"
        );


        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "Transaction processing failed ❌"
        );

        console.error(
            error
        );


        await ctx.reply(

            "❌ Something went wrong while saving your transaction."

        );

    }

});


// ==========================================
// Connect MongoDB
// ==========================================

connectDB();


// ==========================================
// Start Customer Bot
// ==========================================

bot.launch();


console.log(
    "Customer Bot is running..."
);


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