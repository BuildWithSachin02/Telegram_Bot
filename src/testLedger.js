require("dotenv").config();

const connectDB = require("./config/db");
const { findUserByTelegramId } = require("./services/userService");
const { createTransaction } = require("./services/ledgerService");

const testLedger = async () => {
    try {
        // 1. Connect to MongoDB
        const connected = await connectDB();

        if (!connected) {
            console.log("Database connection failed ❌");
            return;
        }

        // 2. Find our Telegram user
        const user = await findUserByTelegramId(1999014485);

        if (!user) {
            console.log("User not found ❌");
            return;
        }

        console.log("User found:", user.name);

        // 3. Create a test purchase
        const transaction = await createTransaction({
            customerId: user._id,
            type: "PURCHASE",
            amount: 500,
            telegramMessageId: 999999,
            telegramUpdateId: 999999
        });

        console.log("Transaction created successfully ✅");
        console.log(transaction);

        process.exit(0);

    } catch (error) {
        console.error("Ledger test failed ❌");
        console.error(error.message);

        process.exit(1);
    }
};

testLedger();