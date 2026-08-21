const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const User = require("../models/User");

const {
    authenticate
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// LOGIN RATE LIMITER
// Protects against brute-force login attempts
// ==========================================

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    // Administrators have a larger allowance so a typo or password-reset
    // issue does not lock them out as quickly. The account remains protected
    // from unlimited password guessing.
    limit: async req => {

        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();

        if (!isValidEmail(email)) {
            return 10;
        }

        const user = await User.findOne({ email })
            .select("role")
            .lean();

        return String(user?.role || "").toLowerCase() === "admin"
            ? 30
            : 10;
    },

    // Keep each account's failed attempts separate, even when several users
    // are working from the same office network.
    keyGenerator: req => {

        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();

        return `${ipKeyGenerator(req.ip)}:${email}`;
    },

    // A successful login should never contribute to a lockout.
    // Only failed attempts remain in the 15-minute allowance.
    skipSuccessfulRequests: true,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many login attempts. Please try again later."
    }
});

// ==========================================
// VALIDATE EMAIL
// ==========================================

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ==========================================
// VALIDATE PASSWORD
// ==========================================

const isValidPassword = (password) => {
    return (
        typeof password === "string" &&
        password.length >= 8
    );
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

        if (
            !name ||
            !email ||
            !password ||
            !department ||
            !department.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email, password and department are required"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        // --------------------------------------
        // EMAIL VALIDATION
        // --------------------------------------

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide a valid email address"
            });
        }

        // --------------------------------------
        // PASSWORD VALIDATION
        // --------------------------------------

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters long"
            });
        }

        // --------------------------------------
        // NAME VALIDATION
        // --------------------------------------

        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide a valid name"
            });
        }

        // --------------------------------------
        // CHECK EXISTING USER
        // --------------------------------------

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message:
                    "A user with this email already exists"
            });
        }

        // --------------------------------------
        // CREATE USER
        //
        // IMPORTANT:
        // Do NOT manually hash the password here.
        //
        // User.js handles password hashing through
        // the pre-save middleware.
        // --------------------------------------

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,

            password: password,

            // Public registration ALWAYS creates
            // an Employee account.
            role: "employee",

            department:
                department
                    ? department.trim()
                    : "",

            // Publicly registered users do not
            // need a forced password change.
            mustChangePassword: false,

            isActive: true
        });

        // --------------------------------------
        // RESPONSE
        // --------------------------------------

        return res.status(201).json({
            success: true,
            message:
                "User registered successfully",

            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                mustChangePassword:
                    user.mustChangePassword
            }
        });

    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to register user"
        });
    }
});

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post(
    "/login",
    loginLimiter,
    async (req, res) => {
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
                    message:
                        "Email and password are required"
                });
            }

            const normalizedEmail =
                email.trim().toLowerCase();

            // --------------------------------------
            // EMAIL VALIDATION
            // --------------------------------------

            if (!isValidEmail(normalizedEmail)) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password"
                });
            }

            // --------------------------------------
            // JWT SECRET CHECK
            // --------------------------------------

            const secret =
                process.env.JWT_SECRET;

            if (
                !secret ||
                secret.length < 32
            ) {
                console.error(
                    "JWT_SECRET is missing or too short."
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Authentication service is not properly configured"
                });
            }

            // --------------------------------------
            // FIND USER
            // --------------------------------------

            const user =
                await User.findOne({
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
                    message:
                        "Invalid email or password"
                });
            }

            // --------------------------------------
            // CHECK ACCOUNT STATUS
            // --------------------------------------

            if (user.isActive === false) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This account is inactive"
                });
            }

            // --------------------------------------
            // VERIFY PASSWORD
            // --------------------------------------

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password"
                });
            }

            // --------------------------------------
            // CREATE JWT
            // --------------------------------------

            const normalizedRole =
                String(user.role || "")
                    .toLowerCase();

            const token = jwt.sign(
                {
                    id: user._id.toString(),
                    role: normalizedRole,
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
                message:
                    "Login successful",

                token,

                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: normalizedRole,
                    department: user.department,

                    // ----------------------------------
                    // FIRST LOGIN FLAG
                    // ----------------------------------

                    mustChangePassword:
                        user.mustChangePassword === true
                }
            });

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to login"
            });
        }
    }
);

// ==========================================
// CHANGE PASSWORD
// POST /api/auth/change-password
//
// Used when:
// mustChangePassword === true
//
// Also available to authenticated users
// who want to change their password.
// ==========================================

router.post(
    "/change-password",
    authenticate,
    async (req, res) => {
        try {
            const {
                currentPassword,
                newPassword
            } = req.body;

            // --------------------------------------
            // REQUIRED FIELDS
            // --------------------------------------

            if (
                !currentPassword ||
                !newPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current password and new password are required"
                });
            }

            // --------------------------------------
            // NEW PASSWORD VALIDATION
            // --------------------------------------

            if (!isValidPassword(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New password must be at least 8 characters long"
                });
            }

            // --------------------------------------
            // PREVENT SAME PASSWORD
            // --------------------------------------

            if (
                currentPassword ===
                newPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New password must be different from your current password"
                });
            }

            // --------------------------------------
            // GET AUTHENTICATED USER
            // --------------------------------------

            const user =
                await User.findById(
                    req.user.id
                );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User account not found"
                });
            }

            // --------------------------------------
            // CHECK ACCOUNT STATUS
            // --------------------------------------

            if (user.isActive === false) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This account is inactive"
                });
            }

            // --------------------------------------
            // VERIFY CURRENT PASSWORD
            // --------------------------------------

            const passwordMatch =
                await bcrypt.compare(
                    currentPassword,
                    user.password
                );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Current password is incorrect"
                });
            }

            // --------------------------------------
            // UPDATE PASSWORD
            //
            // IMPORTANT:
            // Do NOT bcrypt.hash() here.
            //
            // User.js pre-save middleware will
            // automatically hash the new password.
            // --------------------------------------

            user.password =
                newPassword;

            // --------------------------------------
            // PASSWORD CHANGE COMPLETED
            // --------------------------------------

            user.mustChangePassword =
                false;

            await user.save();

            // --------------------------------------
            // RESPONSE
            // --------------------------------------

            return res.json({
                success: true,
                message:
                    "Password changed successfully",
                mustChangePassword: false
            });

        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to change password"
            });
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
