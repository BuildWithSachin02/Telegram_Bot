require("dotenv").config();

const connectDB = require("./config/db");
const Transaction = require("./models/Transaction");

const deleteTestTransaction = async () => {
    try {
        const connected = await connectDB();

        if (!connected) {
            console.log("Database connection failed ❌");
            return;
        }

        const result = await Transaction.deleteOne({
            telegramUpdateId: 999999
        });

        if (result.deletedCount === 1) {
            console.log("Test transaction deleted successfully ✅");
        } else {
            console.log("Test transaction not found.");
        }

        process.exit(0);

    } catch (error) {
        console.error("Delete failed ❌");
        console.error(error.message);

        process.exit(1);
    }
};

deleteTestTransaction();