require("dotenv").config();

const connectDB = require("./config/db");

const {
    findUserByTelegramId
} = require("./services/userService");

const {
    getCustomerHistory
} = require("./services/ledgerService");

const {
    createUndoRequest
} = require("./services/undoRequestService");


const testUndoRequest = async () => {

    try {

        // ==========================================
        // 1. Connect MongoDB
        // ==========================================

        const connected = await connectDB();

        if (!connected) {

            console.log(
                "Database connection failed ❌"
            );

            return;
        }


        // ==========================================
        // 2. Find our Telegram customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                1999014485
            );


        if (!user) {

            console.log(
                "User not found ❌"
            );

            return;
        }


        console.log(
            "User found:",
            user.name
        );


        // ==========================================
        // 3. Get customer's latest transactions
        // ==========================================

        const transactions =
            await getCustomerHistory(
                user._id,
                1
            );


        if (transactions.length === 0) {

            console.log(
                "No transactions found ❌"
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
            "Amount:",
            latestTransaction.amount
        );

        console.log(
            "Transaction ID:",
            latestTransaction._id
        );


        // ==========================================
        // 4. Make sure it is a PURCHASE
        // ==========================================

        if (
            latestTransaction.type !== "PURCHASE"
        ) {

            console.log(
                "Latest transaction is not a PURCHASE ❌"
            );

            return;
        }


        // ==========================================
        // 5. Create Undo Request
        // ==========================================

        const undoRequest =
            await createUndoRequest({

                customerId:
                    user._id,

                transactionId:
                    latestTransaction._id

            });


        // ==========================================
        // 6. Display result
        // ==========================================

        console.log(
            "Undo Request created successfully ✅"
        );

        console.log(
            undoRequest
        );


        process.exit(0);


    } catch (error) {

        console.error(
            "Undo Request test failed ❌"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
};


testUndoRequest();