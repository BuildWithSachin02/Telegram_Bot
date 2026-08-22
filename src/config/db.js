const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected Successfully ✅");

        return true;

    } catch (error) {
        console.error("MongoDB Connection Failed ❌");
        console.error(error.message);

        return false;
    }
};

module.exports = connectDB;