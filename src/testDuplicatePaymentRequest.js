require("dotenv").config();

const connectDB = require("./config/db");

const {
    createPaymentRequest
} = require("./services/paymentRequestService");

const {
    findUserByTelegramId
} = require("./services/userService");

const PaymentRequest = require("./models/PaymentRequest");


const testDuplicatePaymentRequest = async () => {

    try {

        await connectDB();


        console.log("--------------------------------");
        console.log("Testing duplicate payment protection...");
        console.log("--------------------------------");


        // ==========================================
        // Find customer
        // ==========================================

        const user =
            await findUserByTelegramId(
                1999014485
            );


        if (!user) {

            console.log(
                "User not found ❌"
            );

            process.exit(1);
        }


        console.log(
            "Customer:",
            user.name
        );


        // ==========================================
        // Clean only payment requests for this test
        // ==========================================

        await PaymentRequest.deleteMany({

            customerId: user._id
        });


        console.log(
            "Old payment requests cleared for test."
        );


        // ==========================================
        // FIRST REQUEST
        // ==========================================

        const first =
            await createPaymentRequest({

                customerId: user._id,

                amount: 20,

                message: "-20 cash diya",

                telegramMessageId: 100001,

                telegramUpdateId: 100001
            });


        console.log("--------------------------------");

        console.log(
            "FIRST REQUEST"
        );

        console.log(
            "Success:",
            first.success
        );


        if (first.success) {

            console.log(
                "Request ID:",
                first.request._id
            );

            console.log(
                "Status:",
                first.request.status
            );
        }


        // ==========================================
        // SECOND REQUEST
        // ==========================================

        const second =
            await createPaymentRequest({

                customerId: user._id,

                amount: 30,

                message: "-30 cash diya",

                telegramMessageId: 100002,

                telegramUpdateId: 100002
            });


        console.log("--------------------------------");

        console.log(
            "SECOND REQUEST"
        );

        console.log(
            "Success:",
            second.success
        );

        console.log(
            "Reason:",
            second.reason || "NONE"
        );


        // ==========================================
        // VERIFY
        // ==========================================

        if (
            first.success === true &&
            second.success === false &&
            second.reason ===
                "PENDING_PAYMENT_EXISTS"
        ) {

            console.log("--------------------------------");

            console.log(
                "Duplicate payment protection PASSED ✅"
            );

            console.log("--------------------------------");

        } else {

            console.log("--------------------------------");

            console.log(
                "Duplicate payment protection FAILED ❌"
            );

            console.log("--------------------------------");

            process.exit(1);
        }


        process.exit(0);


    } catch (error) {

        console.error(
            "Duplicate payment test failed ❌"
        );

        console.error(error);

        process.exit(1);
    }
};


testDuplicatePaymentRequest();