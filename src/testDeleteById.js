require("dotenv").config();

const connectDB = require("./config/db");

const Transaction = require("./models/Transaction");

const {
    deleteTransactionById
} = require("./services/ledgerService");


const testDeleteById = async () => {

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
        // 2. Find a test transaction
        // ==========================================

        const transaction =
            await Transaction.findOne({
                amount: 99,
                type: "PURCHASE"
            });


        if (!transaction) {

            console.log(
                "Test PURCHASE transaction not found ❌"
            );

            return;
        }


        console.log("--------------------------------");

        console.log(
            "Transaction found:"
        );

        console.log(
            "Transaction ID:",
            transaction._id
        );

        console.log(
            "Type:",
            transaction.type
        );

        console.log(
            "Amount:",
            transaction.amount
        );


        // ==========================================
        // 3. Delete transaction by ID
        // ==========================================

        const deleted =
            await deleteTransactionById(
                transaction._id
            );


        // ==========================================
        // 4. Check result
        // ==========================================

        if (!deleted) {

            console.log(
                "Transaction was not deleted ❌"
            );

            return;
        }


        console.log(
            "Transaction deleted successfully ✅"
        );

        console.log(
            "Deleted ID:",
            deleted._id
        );

        console.log(
            "Deleted Type:",
            deleted.type
        );

        console.log(
            "Deleted Amount:",
            deleted.amount
        );

        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error(
            "Delete test failed ❌"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
};


testDeleteById();