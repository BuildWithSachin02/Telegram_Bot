require("dotenv").config();

const connectDB = require("./config/db");

const {
    createPaymentRequest
} = require("./services/paymentRequestService");

const {
    createUndoRequest
} = require("./services/undoRequestService");

const {
    findUserByTelegramId
} = require("./services/userService");

const Transaction = require("./models/Transaction");
const PaymentRequest = require("./models/PaymentRequest");
const UndoRequest = require("./models/UndoRequest");


// ==========================================
// Test Request Conflict Protection
// ==========================================

const testRequestConflict = async () => {

    try {

        await connectDB();


        console.log("--------------------------------");
        console.log("Testing request conflict protection...");
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
        // Clean test requests
        // ==========================================

        await PaymentRequest.deleteMany({

            customerId: user._id
        });


        await UndoRequest.deleteMany({

            customerId: user._id
        });


        await Transaction.deleteMany({

            customerId: user._id
        });


        console.log(
            "Old test data cleared."
        );


        // ==========================================
        // Create test transaction
        // ==========================================

        const transaction =
            await Transaction.create({

                customerId: user._id,

                type: "PURCHASE",

                amount: 50,

                telegramMessageId: 300001,

                telegramUpdateId: 300001
            });


        console.log(
            "Test transaction:",
            transaction._id
        );


        // ==========================================
        // TEST 1
        // First payment request
        // ==========================================

        console.log("--------------------------------");
        console.log("TEST 1: First payment request");
        console.log("--------------------------------");


        const firstPayment =
            await createPaymentRequest({

                customerId: user._id,

                amount: 50,

                message: "-50 cash diya",

                telegramMessageId: 300002,

                telegramUpdateId: 300002
            });


        console.log(
            "Success:",
            firstPayment.success
        );


        if (!firstPayment.success) {

            console.log(
                "TEST 1 FAILED ❌"
            );

            process.exit(1);
        }


        console.log(
            "First payment request allowed ✅"
        );


        // ==========================================
        // TEST 2
        // Second payment request
        // ==========================================

        console.log("--------------------------------");
        console.log("TEST 2: Second payment request");
        console.log("--------------------------------");


        const secondPayment =
            await createPaymentRequest({

                customerId: user._id,

                amount: 20,

                message: "-20 cash diya",

                telegramMessageId: 300003,

                telegramUpdateId: 300003
            });


        console.log(
            "Success:",
            secondPayment.success
        );


        console.log(
            "Reason:",
            secondPayment.reason
        );


        if (
            secondPayment.success === false &&
            secondPayment.reason ===
                "PENDING_PAYMENT_EXISTS"
        ) {

            console.log(
                "Second payment blocked correctly ✅"
            );

        } else {

            console.log(
                "TEST 2 FAILED ❌"
            );

            process.exit(1);
        }


        // ==========================================
        // TEST 3
        // Undo while payment pending
        // ==========================================

        console.log("--------------------------------");
        console.log(
            "TEST 3: Undo while payment pending"
        );
        console.log("--------------------------------");


        const undoWhilePaymentPending =
            await createUndoRequest({

                customerId: user._id,

                transactionId:
                    transaction._id
            });


        console.log(
            "Success:",
            undoWhilePaymentPending.success
        );


        console.log(
            "Reason:",
            undoWhilePaymentPending.reason
        );


        if (
            undoWhilePaymentPending.success === false &&
            undoWhilePaymentPending.reason ===
                "PENDING_PAYMENT_EXISTS"
        ) {

            console.log(
                "Undo blocked correctly ✅"
            );

        } else {

            console.log(
                "TEST 3 FAILED ❌"
            );

            process.exit(1);
        }


        // ==========================================
        // Clear payment request
        // ==========================================

        await PaymentRequest.deleteMany({

            customerId: user._id
        });


        // ==========================================
        // TEST 4
        // Create undo first
        // ==========================================

        console.log("--------------------------------");
        console.log(
            "TEST 4: Undo first, then payment"
        );
        console.log("--------------------------------");


        const firstUndo =
            await createUndoRequest({

                customerId: user._id,

                transactionId:
                    transaction._id
            });


        console.log(
            "Undo success:",
            firstUndo.success
        );


        if (!firstUndo.success) {

            console.log(
                "TEST 4 FAILED ❌"
            );

            process.exit(1);
        }


        console.log(
            "First undo request allowed ✅"
        );


        // ==========================================
        // Try payment while undo pending
        // ==========================================

        const paymentWhileUndoPending =
            await createPaymentRequest({

                customerId: user._id,

                amount: 50,

                message: "-50 cash diya",

                telegramMessageId: 300004,

                telegramUpdateId: 300004
            });


        console.log(
            "Payment success:",
            paymentWhileUndoPending.success
        );


        console.log(
            "Reason:",
            paymentWhileUndoPending.reason
        );


        if (
            paymentWhileUndoPending.success === false &&
            paymentWhileUndoPending.reason ===
                "PENDING_UNDO_EXISTS"
        ) {

            console.log(
                "Payment blocked correctly ✅"
            );

        } else {

            console.log(
                "TEST 4 FAILED ❌"
            );

            process.exit(1);
        }


        // ==========================================
        // FINAL RESULT
        // ==========================================

        console.log("--------------------------------");

        console.log(
            "ALL REQUEST CONFLICT TESTS PASSED ✅"
        );

        console.log("--------------------------------");


        // ==========================================
        // Cleanup
        // ==========================================

        await PaymentRequest.deleteMany({

            customerId: user._id
        });


        await UndoRequest.deleteMany({

            customerId: user._id
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

        console.error(
            "Request conflict test failed ❌"
        );

        console.error(error);

        process.exit(1);
    }
};


testRequestConflict();