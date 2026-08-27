require("dotenv").config();

const connectDB = require("./config/db");

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const UndoRequest = require("./models/UndoRequest");
const PaymentRequest = require("./models/PaymentRequest");

const {
    deleteAllLedgerData
} = require("./services/dataCleanupService");


const testDataCleanupService = async () => {

    try {

        await connectDB();

        console.log("--------------------------------");
        console.log("DATA CLEANUP SERVICE TEST");
        console.log("--------------------------------");


        // ==========================================
        // 1. Count existing users
        // ==========================================

        const usersBefore =
            await User.countDocuments();


        console.log(
            "Users before cleanup:",
            usersBefore
        );


        // ==========================================
        // 2. Count existing ledger data
        // ==========================================

        const transactionsBefore =
            await Transaction.countDocuments();


        const undoRequestsBefore =
            await UndoRequest.countDocuments();


        const paymentRequestsBefore =
            await PaymentRequest.countDocuments();


        console.log(
            "Transactions before cleanup:",
            transactionsBefore
        );

        console.log(
            "Undo Requests before cleanup:",
            undoRequestsBefore
        );

        console.log(
            "Payment Requests before cleanup:",
            paymentRequestsBefore
        );


        // ==========================================
        // 3. Run cleanup
        // ==========================================

        console.log("--------------------------------");
        console.log("Running deleteAllLedgerData()...");
        console.log("--------------------------------");


        const result =
            await deleteAllLedgerData();


        // ==========================================
        // 4. Display deletion result
        // ==========================================

        console.log(
            "Transactions deleted:",
            result.transactionsDeleted
        );

        console.log(
            "Undo Requests deleted:",
            result.undoRequestsDeleted
        );

        console.log(
            "Payment Requests deleted:",
            result.paymentRequestsDeleted
        );


        // ==========================================
        // 5. Count remaining data
        // ==========================================

        const transactionsAfter =
            await Transaction.countDocuments();


        const undoRequestsAfter =
            await UndoRequest.countDocuments();


        const paymentRequestsAfter =
            await PaymentRequest.countDocuments();


        const usersAfter =
            await User.countDocuments();


        console.log("--------------------------------");

        console.log(
            "Remaining Transactions:",
            transactionsAfter
        );

        console.log(
            "Remaining Undo Requests:",
            undoRequestsAfter
        );

        console.log(
            "Remaining Payment Requests:",
            paymentRequestsAfter
        );

        console.log(
            "Users after cleanup:",
            usersAfter
        );


        // ==========================================
        // 6. Validate ledger data removed
        // ==========================================

        if (
            transactionsAfter !== 0 ||
            undoRequestsAfter !== 0 ||
            paymentRequestsAfter !== 0
        ) {

            throw new Error(
                "Ledger cleanup validation failed."
            );
        }


        console.log(
            "Ledger collections cleared successfully ✅"
        );


        // ==========================================
        // 7. Validate users were NOT deleted
        // ==========================================

        if (
            usersAfter !==
            usersBefore
        ) {

            throw new Error(
                "CRITICAL: User count changed during cleanup."
            );
        }


        console.log(
            "Users preserved successfully ✅"
        );


        // ==========================================
        // 8. Validate deletion counts
        // ==========================================

        if (
            result.transactionsDeleted !==
            transactionsBefore
        ) {

            throw new Error(
                "Transaction deletion count does not match."
            );
        }


        if (
            result.undoRequestsDeleted !==
            undoRequestsBefore
        ) {

            throw new Error(
                "Undo request deletion count does not match."
            );
        }


        if (
            result.paymentRequestsDeleted !==
            paymentRequestsBefore
        ) {

            throw new Error(
                "Payment request deletion count does not match."
            );
        }


        // ==========================================
        // SUCCESS
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "DATA CLEANUP SERVICE TEST PASSED ✅"
        );

        console.log("--------------------------------");

        console.log(
            "Transactions: CLEARED ✅"
        );

        console.log(
            "Undo Requests: CLEARED ✅"
        );

        console.log(
            "Payment Requests: CLEARED ✅"
        );

        console.log(
            "Users/Customers: PRESERVED ✅"
        );

        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "DATA CLEANUP SERVICE TEST FAILED ❌"
        );

        console.error("--------------------------------");

        console.error(error);

        process.exit(1);
    }
};


testDataCleanupService();