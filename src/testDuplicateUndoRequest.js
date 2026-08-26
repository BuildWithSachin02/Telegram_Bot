require("dotenv").config();

const connectDB = require("./config/db");

const {
    createUndoRequest
} = require("./services/undoRequestService");

const {
    findUserByTelegramId
} = require("./services/userService");

const Transaction = require("./models/Transaction");
const UndoRequest = require("./models/UndoRequest");


const testDuplicateUndoRequest = async () => {

    try {

        await connectDB();


        console.log("--------------------------------");
        console.log("Testing duplicate undo protection...");
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
        // Create test transaction
        // ==========================================

        const transaction =
            await Transaction.create({

                customerId: user._id,

                type: "PURCHASE",

                amount: 20,

                telegramMessageId: 200001,

                telegramUpdateId: 200001
            });


        console.log(
            "Test transaction:",
            transaction._id
        );


        // ==========================================
        // Clean old undo requests
        // ==========================================

        await UndoRequest.deleteMany({

            customerId: user._id
        });


        // ==========================================
        // FIRST REQUEST
        // ==========================================

        const first =
            await createUndoRequest({

                customerId: user._id,

                transactionId:
                    transaction._id
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
            await createUndoRequest({

                customerId: user._id,

                transactionId:
                    transaction._id
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
                "PENDING_UNDO_EXISTS"
        ) {

            console.log("--------------------------------");

            console.log(
                "Duplicate undo protection PASSED ✅"
            );

            console.log("--------------------------------");

        } else {

            console.log("--------------------------------");

            console.log(
                "Duplicate undo protection FAILED ❌"
            );

            console.log("--------------------------------");

            process.exit(1);
        }


        // ==========================================
        // CLEAN TEST DATA
        // ==========================================

        await UndoRequest.deleteMany({

            customerId: user._id
        });


        await Transaction.deleteOne({

            _id: transaction._id
        });


        console.log(
            "Test data cleaned successfully ✅"
        );


        process.exit(0);


    } catch (error) {

        console.error(
            "Duplicate undo test failed ❌"
        );

        console.error(error);

        process.exit(1);
    }
};


testDuplicateUndoRequest();