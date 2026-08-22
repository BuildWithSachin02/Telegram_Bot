require("dotenv").config();

const connectDB = require("./config/db");

const {
    findUserByTelegramId
} = require("./services/userService");

const {
    getCustomerHistory
} = require("./services/ledgerService");


const testHistory = async () => {

    try {

        // 1. Connect MongoDB
        const connected = await connectDB();

        if (!connected) {
            console.log("Database connection failed ❌");
            return;
        }


        // 2. Find customer
        const user = await findUserByTelegramId(
            1999014485
        );

        if (!user) {
            console.log("User not found ❌");
            return;
        }

        console.log(
            "User found:",
            user.name
        );


        // 3. Get transaction history
        const transactions =
            await getCustomerHistory(user._id, 10);


        console.log("--------------------------------");

        console.log(
            "Transactions found:",
            transactions.length
        );


        // 4. Display transactions
        transactions.forEach((transaction, index) => {

            console.log(
                `${index + 1}.`,
                transaction.type,
                "₹" + transaction.amount,
                transaction.createdAt
            );

        });


        console.log("--------------------------------");


        process.exit(0);

    } catch (error) {

        console.error(
            "History test failed ❌"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
};


testHistory();