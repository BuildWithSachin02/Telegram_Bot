require("dotenv").config();

const connectDB = require("./config/db");

const {
    findUserByTelegramId
} = require("./services/userService");

const {
    createPaymentRequest
} = require("./services/paymentRequestService");

const {
    getCustomerTotal
} = require("./services/ledgerService");


// ==========================================
// Test Payment Request
// ==========================================

const testPaymentRequest = async () => {

    try {

        // ==========================================
        // 1. Connect MongoDB
        // ==========================================

        await connectDB();


        // ==========================================
        // 2. Find customer
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
        // 3. Get total BEFORE request
        // ==========================================

        const before =
            await getCustomerTotal(
                user._id
            );


        console.log("--------------------------------");

        console.log(
            "BEFORE PAYMENT REQUEST"
        );

        console.log(
            "Total Purchase:",
            before.totalPurchase
        );

        console.log(
            "Total Payment:",
            before.totalPayment
        );

        console.log(
            "Outstanding:",
            before.outstanding
        );


        // ==========================================
        // 4. Create payment request
        // ==========================================

        const paymentRequest =
            await createPaymentRequest({

                customerId: user._id,

                amount: 30,

                message: "-30 cash diya",

                telegramMessageId: 999998,

                telegramUpdateId: 999998

            });


        console.log("--------------------------------");

        console.log(
            "Payment Request created successfully ✅"
        );

        console.log(
            "Request ID:",
            paymentRequest._id
        );

        console.log(
            "Customer ID:",
            paymentRequest.customerId
        );

        console.log(
            "Amount:",
            paymentRequest.amount
        );

        console.log(
            "Message:",
            paymentRequest.message
        );

        console.log(
            "Status:",
            paymentRequest.status
        );


        // ==========================================
        // 5. Get total AFTER request
        // ==========================================

        const after =
            await getCustomerTotal(
                user._id
            );


        console.log("--------------------------------");

        console.log(
            "AFTER PAYMENT REQUEST"
        );

        console.log(
            "Total Purchase:",
            after.totalPurchase
        );

        console.log(
            "Total Payment:",
            after.totalPayment
        );

        console.log(
            "Outstanding:",
            after.outstanding
        );


        // ==========================================
        // 6. Verify ledger did NOT change
        // ==========================================

        if (
            before.totalPurchase ===
                after.totalPurchase &&

            before.totalPayment ===
                after.totalPayment &&

            before.outstanding ===
                after.outstanding
        ) {

            console.log("--------------------------------");

            console.log(
                "Ledger unchanged successfully ✅"
            );

            console.log(
                "Payment is still PENDING owner approval."
            );

            console.log("--------------------------------");

        } else {

            console.log("--------------------------------");

            console.log(
                "WARNING: Ledger changed ❌"
            );

            console.log(
                "Something is wrong."
            );

            console.log("--------------------------------");
        }


        process.exit(0);


    } catch (error) {

        console.error(
            "Payment request test failed ❌"
        );

        console.error(
            error
        );

        process.exit(1);
    }
};


testPaymentRequest();