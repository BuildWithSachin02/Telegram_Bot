require("dotenv").config();

const connectDB = require("./config/db");

const Transaction = require("./models/Transaction");
const UndoRequest = require("./models/UndoRequest");
const PaymentRequest = require("./models/PaymentRequest");


// ==========================================
// Clear Test Data
// ==========================================
//
// IMPORTANT:
// This script deletes:
//
// 1. Transactions
// 2. Undo Requests
// 3. Payment Requests
//
// It DOES NOT delete Users.
//
// ==========================================

const clearTestData = async () => {

    try {

        // ==========================================
        // CONNECT DATABASE
        // ==========================================

        const connected = await connectDB();

        if (connected === false) {

            console.log(
                "MongoDB connection failed ❌"
            );

            process.exit(1);
        }


        console.log("--------------------------------");

        console.log(
            "Checking existing test data..."
        );


        // ==========================================
        // COUNT EXISTING DATA
        // ==========================================

        const transactionCount =
            await Transaction.countDocuments();


        const undoRequestCount =
            await UndoRequest.countDocuments();


        const paymentRequestCount =
            await PaymentRequest.countDocuments();


        console.log(
            "Transactions before delete:",
            transactionCount
        );


        console.log(
            "Undo Requests before delete:",
            undoRequestCount
        );


        console.log(
            "Payment Requests before delete:",
            paymentRequestCount
        );


        console.log("--------------------------------");


        // ==========================================
        // DELETE TRANSACTIONS
        // ==========================================

        const transactionResult =
            await Transaction.deleteMany({});


        console.log(
            "Transactions deleted:",
            transactionResult.deletedCount
        );


        // ==========================================
        // DELETE UNDO REQUESTS
        // ==========================================

        const undoResult =
            await UndoRequest.deleteMany({});


        console.log(
            "Undo Requests deleted:",
            undoResult.deletedCount
        );


        // ==========================================
        // DELETE PAYMENT REQUESTS
        // ==========================================

        const paymentResult =
            await PaymentRequest.deleteMany({});


        console.log(
            "Payment Requests deleted:",
            paymentResult.deletedCount
        );


        console.log("--------------------------------");


        // ==========================================
        // VERIFY CLEANUP
        // ==========================================

        const remainingTransactions =
            await Transaction.countDocuments();


        const remainingUndoRequests =
            await UndoRequest.countDocuments();


        const remainingPaymentRequests =
            await PaymentRequest.countDocuments();


        console.log(
            "Remaining Transactions:",
            remainingTransactions
        );


        console.log(
            "Remaining Undo Requests:",
            remainingUndoRequests
        );


        console.log(
            "Remaining Payment Requests:",
            remainingPaymentRequests
        );


        console.log("--------------------------------");


        if (
            remainingTransactions === 0 &&
            remainingUndoRequests === 0 &&
            remainingPaymentRequests === 0
        ) {

            console.log(
                "✅ Test data cleared successfully"
            );

        } else {

            console.log(
                "⚠️ Some test data still exists."
            );

        }


        console.log("--------------------------------");


        // ==========================================
        // IMPORTANT
        // ==========================================
        //
        // Users are NOT deleted.
        //
        // ==========================================

        console.log(
            "Users were NOT deleted ✅"
        );


        console.log("--------------------------------");


        process.exit(0);

    } catch (error) {

        console.error(
            "Test data cleanup failed ❌"
        );

        console.error(error);


        process.exit(1);
    }
};


clearTestData();