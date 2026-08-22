require("dotenv").config();

const connectDB = require("./config/db");

const { findUserByTelegramId } = require("./services/userService");

const { getCustomerTotal } = require("./services/ledgerService");


const testTotal = async () => {

    try {

        // ==========================================
        // 1. Connect MongoDB
        // ==========================================

        const connected = await connectDB();

        if (!connected) {

            console.log("Database connection failed ❌");

            return;
        }


        // ==========================================
        // 2. Find Sachin's Telegram user
        // ==========================================

        const user = await findUserByTelegramId(1999014485);

        if (!user) {

            console.log("User not found ❌");

            return;
        }

        console.log("User found:", user.name);


        // ==========================================
        // 3. Calculate total
        // ==========================================

        const total = await getCustomerTotal(user._id);


        // ==========================================
        // 4. Display result
        // ==========================================

        console.log("--------------------------------");

        console.log("Total Purchase:", total.totalPurchase);

        console.log("Total Payment:", total.totalPayment);

        console.log("Outstanding:", total.outstanding);

        console.log("--------------------------------");


        process.exit(0);

    } catch (error) {

        console.error("Total test failed ❌");

        console.error(error.message);

        process.exit(1);
    }
};


testTotal();