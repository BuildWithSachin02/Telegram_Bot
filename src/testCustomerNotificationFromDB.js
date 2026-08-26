require("dotenv").config();

const { Telegraf } = require("telegraf");

const connectDB = require("./config/db");

const User = require("./models/User");


// ==========================================
// ENVIRONMENT
// ==========================================

const CUSTOMER_BOT_TOKEN =
    process.env.CUSTOMER_BOT_TOKEN;


// ==========================================
// TEST CUSTOMER
// ==========================================

const TELEGRAM_USER_ID = 1999014485;


// ==========================================
// VALIDATE TOKEN
// ==========================================

if (!CUSTOMER_BOT_TOKEN) {

    console.error(
        "CUSTOMER_BOT_TOKEN is missing ❌"
    );

    process.exit(1);
}


// ==========================================
// CUSTOMER BOT
// ==========================================

const customerBot =
    new Telegraf(
        CUSTOMER_BOT_TOKEN
    );


// ==========================================
// TEST
// ==========================================

const testCustomerNotificationFromDB =
    async () => {

        try {

            // ==========================================
            // CONNECT DATABASE
            // ==========================================

            await connectDB();

            console.log(
                "MongoDB Connected Successfully ✅"
            );


            console.log(
                "--------------------------------"
            );


            // ==========================================
            // FIND CUSTOMER
            // ==========================================

            const customer =
                await User.findOne({
                    telegramUserId:
                        TELEGRAM_USER_ID
                });


            // ==========================================
            // CUSTOMER NOT FOUND
            // ==========================================

            if (!customer) {

                console.error(
                    "Customer not found in MongoDB ❌"
                );

                console.log(
                    "Searching for Telegram ID:",
                    TELEGRAM_USER_ID
                );

                process.exit(1);
            }


            // ==========================================
            // DISPLAY CUSTOMER DATA
            // ==========================================

            console.log(
                "Customer found successfully ✅"
            );

            console.log(
                "MongoDB _id:",
                customer._id
            );

            console.log(
                "Customer Name:",
                customer.name
            );

            console.log(
                "Username:",
                customer.username
            );

            console.log(
                "Telegram User ID:",
                customer.telegramUserId
            );


            console.log(
                "--------------------------------"
            );


            // ==========================================
            // VERIFY TELEGRAM ID
            // ==========================================

            if (
                Number(customer.telegramUserId) !==
                Number(TELEGRAM_USER_ID)
            ) {

                console.error(
                    "Telegram ID mismatch ❌"
                );

                console.error(
                    "Expected:",
                    TELEGRAM_USER_ID
                );

                console.error(
                    "Database:",
                    customer.telegramUserId
                );

                process.exit(1);
            }


            console.log(
                "Telegram ID matches successfully ✅"
            );


            // ==========================================
            // VERIFY CUSTOMER BOT
            // ==========================================

            const botInfo =
                await customerBot.telegram.getMe();


            console.log(
                "Customer Bot:",
                `@${botInfo.username}`
            );


            console.log(
                "--------------------------------"
            );


            // ==========================================
            // SEND MESSAGE USING DATABASE ID
            // ==========================================

            const message =
                await customerBot.telegram.sendMessage(

                    customer.telegramUserId,

                    "🔔 *Database Notification Test*\n\n" +

                    `👤 Customer: ${customer.name}\n` +

                    `🆔 Telegram ID: ${customer.telegramUserId}\n\n` +

                    "✅ MongoDB customer lookup works.\n" +

                    "✅ Customer Telegram ID works.\n" +

                    "✅ Customer Bot notification works.\n\n" +

                    "The Owner Bot should now be able to notify you.",

                    {
                        parse_mode: "Markdown"
                    }
                );


            // ==========================================
            // SUCCESS
            // ==========================================

            console.log(
                "Customer notification sent successfully ✅"
            );

            console.log(
                "Message ID:",
                message.message_id
            );

            console.log(
                "--------------------------------"
            );


            process.exit(0);


        } catch (error) {

            console.error(
                "Customer notification from DB test failed ❌"
            );

            console.error(
                "Error:",
                error
            );

            process.exit(1);
        }
    };


testCustomerNotificationFromDB();