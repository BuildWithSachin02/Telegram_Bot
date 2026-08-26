require("dotenv").config();

const { Telegraf } = require("telegraf");

const CUSTOMER_BOT_TOKEN =
    process.env.CUSTOMER_BOT_TOKEN;

const CUSTOMER_TELEGRAM_ID = 1999014485;


// ==========================================
// Validate Environment
// ==========================================

if (!CUSTOMER_BOT_TOKEN) {

    console.error(
        "CUSTOMER_BOT_TOKEN is missing from .env ❌"
    );

    process.exit(1);
}


// ==========================================
// Create Customer Bot API Client
// ==========================================

const customerBot =
    new Telegraf(
        CUSTOMER_BOT_TOKEN
    );


// ==========================================
// Test Notification
// ==========================================

const testCustomerNotification = async () => {

    try {

        console.log("--------------------------------");

        console.log(
            "Testing Customer Bot notification..."
        );

        console.log(
            "Customer Telegram ID:",
            CUSTOMER_TELEGRAM_ID
        );


        // ==========================================
        // Verify Bot Token
        // ==========================================

        const botInfo =
            await customerBot.telegram.getMe();

        console.log("--------------------------------");

        console.log(
            "Customer Bot connected successfully ✅"
        );

        console.log(
            "Bot ID:",
            botInfo.id
        );

        console.log(
            "Bot Username:",
            botInfo.username
        );


        // ==========================================
        // Send Test Message
        // ==========================================

        const message =
            await customerBot.telegram.sendMessage(

                CUSTOMER_TELEGRAM_ID,

                "🔔 *SR Khata Notification Test*\n\n" +

                "This is a test notification from your Customer Bot.\n\n" +

                "✅ Customer Bot token is working.\n" +

                "✅ Telegram ID is reachable.\n\n" +

                "If you received this message, the notification system is working correctly.",

                {
                    parse_mode: "Markdown"
                }

            );


        // ==========================================
        // Success
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "Customer notification sent successfully ✅"
        );

        console.log(
            "Message ID:",
            message.message_id
        );

        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "Customer notification test FAILED ❌"
        );

        console.error(
            "Error:",
            error.message
        );

        console.error("--------------------------------");

        process.exit(1);
    }
};


testCustomerNotification();