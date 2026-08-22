require("dotenv").config();

const connectDB = require("./config/db");

const {
    getPendingUndoRequests
} = require("./services/undoRequestService");


const testPendingUndo = async () => {

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
        // 2. Get pending requests
        // ==========================================

        const requests =
            await getPendingUndoRequests();


        // ==========================================
        // 3. Display result
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "Pending Undo Requests:",
            requests.length
        );


        for (const request of requests) {

            console.log(
                "Request ID:",
                request._id
            );

            console.log(
                "Transaction ID:",
                request.transactionId
            );

            console.log(
                "Customer ID:",
                request.customerId
            );

            console.log(
                "Status:",
                request.status
            );

            console.log(
                "Created At:",
                request.createdAt
            );

            console.log("--------------------------------");
        }


        process.exit(0);


    } catch (error) {

        console.error(
            "Pending undo test failed ❌"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
};


testPendingUndo();