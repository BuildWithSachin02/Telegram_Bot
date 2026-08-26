require("dotenv").config();

const connectDB = require("./config/db");

const {
    getPendingPaymentRequests
} = require("./services/paymentRequestService");

const testPendingPayment = async () => {

    try {

        await connectDB();

        const requests =
            await getPendingPaymentRequests();

        console.log("--------------------------------");

        console.log(
            "Pending Payment Requests:",
            requests.length
        );

        for (const request of requests) {

            console.log("--------------------------------");

            console.log(
                "Request ID:",
                request._id
            );

            console.log(
                "Customer ID:",
                request.customerId
            );

            console.log(
                "Amount:",
                request.amount
            );

            console.log(
                "Message:",
                request.message
            );

            console.log(
                "Status:",
                request.status
            );

            console.log(
                "Created At:",
                request.createdAt
            );
        }

        console.log("--------------------------------");

        process.exit(0);

    } catch (error) {

        console.error(
            "Pending payment test failed ❌"
        );

        console.error(error.message);

        process.exit(1);
    }
};

testPendingPayment();