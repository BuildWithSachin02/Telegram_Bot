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


const bot = new Telegraf(
    process.env.CUSTOMER_BOT_TOKEN
);


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
                "You are not registered yet. Please contact the shop owner."
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
        // Send total
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


        // ==========================================
        // Empty history
        // ==========================================

        if (
            transactions.length === 0
        ) {

            await ctx.reply(
                "📜 Your Khata History\n\n" +
                "No transactions found."
            );


            return;
        }


        // ==========================================
        // Build history message
        // ==========================================

        let historyMessage =
            "📜 Your Recent Transactions\n\n";


        transactions.forEach(
            (transaction, index) => {

                let transactionIcon;

                let transactionName;


                if (
                    transaction.type === "PURCHASE"
                ) {

                    transactionIcon =
                        "🛒";

                    transactionName =
                        "Purchase";

                } else {

                    transactionIcon =
                        "💵";

                    transactionName =
                        "Payment";
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

                    `${index + 1}. ${transactionIcon} ${transactionName}\n` +

                    `   💰 Amount: ₹${transaction.amount}\n` +

                    `   📅 ${date}\n\n`;

            }
        );


        historyMessage +=
            "--------------------\n";


        // ==========================================
        // Get current total
        // ==========================================

        const total =
            await getCustomerTotal(
                user._id
            );


        historyMessage +=

            `🛒 Total Purchase: ₹${total.totalPurchase}\n` +

            `💵 Total Payment: ₹${total.totalPayment}\n` +

            `🔴 Outstanding: ₹${total.outstanding}`;


        // ==========================================
        // Send history
        // ==========================================

        await ctx.reply(
            historyMessage
        );


        console.log(
            "History sent successfully ✅"
        );

        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "History retrieval failed ❌"
        );

        console.error(
            error.message
        );


        await ctx.reply(
            "❌ Unable to get your transaction history right now."
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
        // 1. Find customer
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
        // 2. Get latest transaction
        // ==========================================

        const transactions =
            await getCustomerHistory(
                user._id,
                1
            );


        // ==========================================
        // 3. No transaction
        // ==========================================

        if (
            transactions.length === 0
        ) {

            console.log(
                "No transaction found ❌"
            );


            await ctx.reply(
                "ℹ️ You don't have any transactions to undo."
            );


            return;
        }


        const latestTransaction =
            transactions[0];


        console.log(
            "Latest transaction:",
            latestTransaction.type
        );

        console.log(
            "Latest amount:",
            latestTransaction.amount
        );


        // ==========================================
        // 4. Payment protection
        // ==========================================

        if (
            latestTransaction.type === "PAYMENT"
        ) {

            console.log(
                "Undo blocked because latest transaction is a PAYMENT ❌"
            );


            await ctx.reply(

                `⚠️ Your latest transaction is a payment.\n\n` +

                `💵 Payment: ₹${latestTransaction.amount}\n\n` +

                `❌ Payment cannot be removed using /undo.\n\n` +

                `ℹ️ /undo can only request removal of your latest purchase.`

            );


            return;
        }


        // ==========================================
        // 5. Check existing pending request
        // ==========================================

        const existingRequest =
            await findPendingUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latestTransaction._id

            });


        if (existingRequest) {

            console.log(
                "Undo request already pending ⚠️:",
                existingRequest._id
            );


            await ctx.reply(

                `⏳ An undo request for ₹${latestTransaction.amount} ` +

                `is already waiting for shop owner approval.\n\n` +

                `Please wait for the owner to review it.`

            );


            return;
        }


        // ==========================================
        // 6. Create Undo Request
        // ==========================================

        const undoRequest =
            await createUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latestTransaction._id

            });


        console.log(
            "Undo request created successfully ✅:",
            undoRequest._id
        );


        console.log(
            "Transaction:",
            latestTransaction._id
        );

        console.log(
            "Amount:",
            latestTransaction.amount
        );

        console.log(
            "Status:",
            undoRequest.status
        );


        // ==========================================
        // 7. Tell customer to wait
        // ==========================================

        await ctx.reply(

            `⏳ Undo request created.\n\n` +

            `🛒 Purchase: ₹${latestTransaction.amount}\n\n` +

            `📨 Your request has been sent for shop owner approval.\n\n` +

            `Please wait for the owner to review it.\n\n` +

            `❗ The transaction has NOT been deleted yet.`

        );


        console.log(
            "Undo request sent successfully ✅"
        );

        console.log("--------------------------------");


    } catch (error) {

        console.error(
            "Undo request failed ❌"
        );

        console.error(
            error.message
        );


        await ctx.reply(

            "❌ Unable to create your undo request right now."

        );
    }
});


// ==========================================
// Normal text messages
// ==========================================

bot.on("text", async (ctx) => {

    try {

        // ==========================================
        // 1. Telegram user information
        // ==========================================

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
        // 2. Find customer
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
        // 3. Parse message
        // ==========================================

        const parsed =
            parseMessage(message);


        console.log(
            "Parsed result:",
            parsed
        );


        // ==========================================
        // 4. Check parser result
        // ==========================================

        if (
            !parsed.success
        ) {

            await ctx.reply(
                `❌ ${parsed.error}`
            );


            return;
        }


        // ==========================================
        // 5. Decide transaction type
        // ==========================================

        let transactionType;


        if (
            parsed.isPayment
        ) {

            transactionType =
                "PAYMENT";

        } else {

            transactionType =
                "PURCHASE";
        }


        // ==========================================
        // 6. Save transaction
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
        // 7. Reply
        // ==========================================

        if (
            transactionType === "PURCHASE"
        ) {

            await ctx.reply(

                `✅ Purchase recorded!\n\n` +

                `💰 Amount: ₹${parsed.amount}`

            );

        } else {

            await ctx.reply(

                `✅ Payment recorded!\n\n` +

                `💰 Amount: ₹${parsed.amount}`

            );
        }


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
// Start MongoDB
// ==========================================

connectDB();


// ==========================================
// Start Telegram Bot
// ==========================================

bot.launch();


console.log(
    "Customer Bot is running..."
);


// ==========================================
// Graceful shutdown
// ==========================================

process.once(
    "SIGINT",
    () => {

        console.log(
            "Stopping bot..."
        );

        bot.stop(
            "SIGINT"
        );

    }
);


process.once(
    "SIGTERM",
    () => {

        console.log(
            "Stopping bot..."
        );

        bot.stop(
            "SIGTERM"
        );

    }
);