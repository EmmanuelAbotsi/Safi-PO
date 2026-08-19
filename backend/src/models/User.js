const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema(
    {
        // ==========================================
        // BASIC USER INFORMATION
        // ==========================================

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        department: {
            type: String,
            required: true,
            trim: true
        },

        role: {
            type: String,
            enum: [
                "employee",
                "manager",
                "admin"
            ],
            default: "employee"
        },

        // ==========================================
        // PASSWORD
        // ==========================================

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        // ==========================================
        // FIRST-LOGIN PASSWORD CHANGE
        // ==========================================

        mustChangePassword: {
            type: Boolean,
            default: false
        },

        // ==========================================
        // ACCOUNT STATUS
        // ==========================================

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// ==========================================
// HASH PASSWORD BEFORE SAVING
// ==========================================

userSchema.pre("save", async function (next) {
    // Do not re-hash password if it has not changed
    if (!this.isModified("password")) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);

        this.password = await bcrypt.hash(
            this.password,
            salt
        );

        next();
    } catch (error) {
        next(error);
    }
});

// ==========================================
// COMPARE PASSWORD
// ==========================================

userSchema.methods.comparePassword = async function (
    candidatePassword
) {
    return bcrypt.compare(
        candidatePassword,
        this.password
    );
};

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
    "User",
    userSchema
);