require("dotenv").config();

const connectDB = require("./config/db");

const PaymentRequest = require("./models/PaymentRequest");

const {
    approvePaymentRequest
} = require("./services/paymentRequestService");

const testPaymentApprovalRace = async () => {

    try {

        await connectDB();

        console.log("--------------------------------");
        console.log("Testing atomic payment approval...");
        console.log("--------------------------------");


        // ==========================================
        // 1. Clean old test payment requests
        // ==========================================

        await PaymentRequest.deleteMany({
            telegramUpdateId: 999991
        });

        console.log(
            "Old test payment requests cleared."
        );


        // ==========================================
        // 2. Create ONE pending payment request
        // ==========================================

        const paymentRequest =
            await PaymentRequest.create({

                customerId: "6a88a6ab5f207dca0064edbe",

                amount: 20,

                message: "-20 cash diya",

                telegramMessageId: 999991,

                telegramUpdateId: 999991,

                status: "PENDING"
            });


        console.log("--------------------------------");

        console.log(
            "Payment Request Created"
        );

        console.log(
            "Request ID:",
            paymentRequest._id
        );

        console.log(
            "Initial Status:",
            paymentRequest.status
        );


        // ==========================================
        // 3. FIRST APPROVAL
        // ==========================================

        console.log("--------------------------------");
        console.log("FIRST APPROVAL");
        console.log("--------------------------------");


        const firstApproval =
            await approvePaymentRequest(
                paymentRequest._id
            );


        if (!firstApproval) {

            console.log(
                "First approval failed ❌"
            );

            throw new Error(
                "First approval should have succeeded."
            );
        }


        console.log(
            "Request returned:",
            !!firstApproval
        );

        console.log(
            "Status:",
            firstApproval.status
        );


        if (
            firstApproval.status !==
            "APPROVED"
        ) {

            throw new Error(
                "First approval did not change status to APPROVED."
            );
        }


        console.log(
            "First approval succeeded ✅"
        );


        // ==========================================
        // 4. SECOND APPROVAL
        // ==========================================

        console.log("--------------------------------");
        console.log("SECOND APPROVAL");
        console.log("--------------------------------");


        const secondApproval =
            await approvePaymentRequest(
                paymentRequest._id
            );


        console.log(
            "Request returned:",
            !!secondApproval
        );


        // ==========================================
        // 5. Verify second approval was blocked
        // ==========================================

        if (secondApproval !== null) {

            console.log(
                "Second approval was NOT blocked ❌"
            );

            throw new Error(
                "Atomic approval protection failed."
            );
        }


        console.log(
            "Second approval blocked correctly ✅"
        );


        // ==========================================
        // 6. Verify final database state
        // ==========================================

        const finalRequest =
            await PaymentRequest.findById(
                paymentRequest._id
            );


        console.log("--------------------------------");

        console.log(
            "FINAL REQUEST STATUS:",
            finalRequest.status
        );


        if (
            finalRequest.status !==
            "APPROVED"
        ) {

            throw new Error(
                "Final request status is incorrect."
            );
        }


        // ==========================================
        // SUCCESS
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "ATOMIC PAYMENT APPROVAL TEST PASSED ✅"
        );

        console.log(
            "First approval: ALLOWED ✅"
        );

        console.log(
            "Second approval: BLOCKED ✅"
        );

        console.log(
            "Final status: APPROVED ✅"
        );

        console.log("--------------------------------");


        // ==========================================
        // Cleanup
        // ==========================================

        await PaymentRequest.deleteOne({
            _id: paymentRequest._id
        });


        console.log(
            "Test data cleaned successfully ✅"
        );

        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "Atomic payment approval test failed ❌"
        );

        console.error(
            error
        );

        console.error("--------------------------------");

        process.exit(1);
    }
};


testPaymentApprovalRace();