const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);

        // Let the application entry point decide how to stop the process.
        // This keeps database setup reusable and ensures startup failures are
        // reported by the server's single error-handling path.
        throw error;
    }
};

module.exports = connectDB;
