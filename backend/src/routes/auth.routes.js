const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");

const router = express.Router();

// ==========================================
// LOGIN RATE LIMITER
// Protects against brute-force login attempts
// ==========================================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

// ==========================================
// VALIDATE EMAIL
// ==========================================
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ==========================================
// REGISTER USER
// POST /api/auth/register
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            department
        } = req.body;

        // --------------------------------------
        // REQUIRED FIELDS
        // --------------------------------------
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // --------------------------------------
        // EMAIL VALIDATION
        // --------------------------------------
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // --------------------------------------
        // PASSWORD VALIDATION
        // --------------------------------------
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // --------------------------------------
        // NAME VALIDATION
        // --------------------------------------
        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid name"
            });
        }

        // --------------------------------------
        // CHECK EXISTING USER
        // --------------------------------------
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        // --------------------------------------
        // HASH PASSWORD
        // --------------------------------------
        const hashedPassword = await bcrypt.hash(password, 12);

        // --------------------------------------
        // IMPORTANT SECURITY CONTROL
        //
        // Public registration ALWAYS creates
        // an Employee account.
        //
        // The client cannot choose Admin or Manager.
        // --------------------------------------
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "Employee",
            department: department ? department.trim() : ""
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to register user"
        });
    }
});

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        // --------------------------------------
        // REQUIRED FIELDS
        // --------------------------------------
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // --------------------------------------
        // EMAIL VALIDATION
        // --------------------------------------
        if (!isValidEmail(normalizedEmail)) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // --------------------------------------
        // JWT SECRET CHECK
        // --------------------------------------
        const secret = process.env.JWT_SECRET;

        if (!secret || secret.length < 32) {
            console.error(
                "JWT_SECRET is missing or too short."
            );

            return res.status(500).json({
                success: false,
                message: "Authentication service is not properly configured"
            });
        }

        // --------------------------------------
        // FIND USER
        // --------------------------------------
        const user = await User.findOne({
            email: normalizedEmail
        });

        // --------------------------------------
        // GENERIC ERROR
        //
        // Don't reveal whether an email exists.
        // --------------------------------------
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // --------------------------------------
        // CHECK ACCOUNT STATUS
        // --------------------------------------
        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "This account is inactive"
            });
        }

        // --------------------------------------
        // VERIFY PASSWORD
        // --------------------------------------
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // --------------------------------------
        // CREATE JWT
        // --------------------------------------
        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role,
                email: user.email
            },
            secret,
            {
                expiresIn: "8h",
                issuer: "safi-po",
                audience: "safi-po-users"
            }
        );

        // --------------------------------------
        // RESPONSE
        // --------------------------------------
        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to login"
        });
    }
});

module.exports = router;