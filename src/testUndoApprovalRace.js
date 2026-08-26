require("dotenv").config();

const connectDB = require("./config/db");

const UndoRequest = require("./models/UndoRequest");
const Transaction = require("./models/Transaction");

const {
    approveUndoRequest
} = require("./services/undoRequestService");

const testUndoApprovalRace = async () => {

    try {

        await connectDB();

        console.log("--------------------------------");
        console.log("Testing atomic undo approval...");
        console.log("--------------------------------");


        // ==========================================
        // 1. Clean old test data
        // ==========================================

        await UndoRequest.deleteMany({
            telegramUpdateId: 999992
        });

        await Transaction.deleteMany({
            telegramUpdateId: 999992
        });

        console.log(
            "Old test data cleared."
        );


        // ==========================================
        // 2. Create test transaction
        // ==========================================

        const transaction =
            await Transaction.create({

                customerId:
                    "6a88a6ab5f207dca0064edbe",

                type: "PURCHASE",

                amount: 20,

                telegramMessageId: 999992,

                telegramUpdateId: 999992
            });


        console.log("--------------------------------");

        console.log(
            "Test Transaction Created"
        );

        console.log(
            "Transaction ID:",
            transaction._id
        );

        console.log(
            "Amount:",
            transaction.amount
        );


        // ==========================================
        // 3. Create ONE pending Undo request
        // ==========================================

        const undoRequest =
            await UndoRequest.create({

                customerId:
                    "6a88a6ab5f207dca0064edbe",

                transactionId:
                    transaction._id,

                status: "PENDING",

                telegramUpdateId: 999992
            });


        console.log("--------------------------------");

        console.log(
            "Undo Request Created"
        );

        console.log(
            "Request ID:",
            undoRequest._id
        );

        console.log(
            "Initial Status:",
            undoRequest.status
        );


        // ==========================================
        // 4. FIRST APPROVAL
        // ==========================================

        console.log("--------------------------------");
        console.log("FIRST APPROVAL");
        console.log("--------------------------------");


        const firstApproval =
            await approveUndoRequest(
                undoRequest._id
            );


        if (!firstApproval) {

            console.log(
                "First approval failed ❌"
            );

            throw new Error(
                "First Undo approval should have succeeded."
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
                "First Undo approval did not change status to APPROVED."
            );
        }


        console.log(
            "First approval succeeded ✅"
        );


        // ==========================================
        // 5. SECOND APPROVAL
        // ==========================================

        console.log("--------------------------------");
        console.log("SECOND APPROVAL");
        console.log("--------------------------------");


        const secondApproval =
            await approveUndoRequest(
                undoRequest._id
            );


        console.log(
            "Request returned:",
            !!secondApproval
        );


        // ==========================================
        // 6. Verify second approval was blocked
        // ==========================================

        if (secondApproval !== null) {

            console.log(
                "Second approval was NOT blocked ❌"
            );

            throw new Error(
                "Atomic Undo approval protection failed."
            );
        }


        console.log(
            "Second approval blocked correctly ✅"
        );


        // ==========================================
        // 7. Verify final request state
        // ==========================================

        const finalRequest =
            await UndoRequest.findById(
                undoRequest._id
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
                "Final Undo request status is incorrect."
            );
        }


        // ==========================================
        // SUCCESS
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "ATOMIC UNDO APPROVAL TEST PASSED ✅"
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

        await UndoRequest.deleteOne({
            _id: undoRequest._id
        });

        await Transaction.deleteOne({
            _id: transaction._id
        });


        console.log(
            "Test data cleaned successfully ✅"
        );

        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "Atomic Undo approval test failed ❌"
        );

        console.error(
            error
        );

        console.error("--------------------------------");

        process.exit(1);
    }
};


testUndoApprovalRace();