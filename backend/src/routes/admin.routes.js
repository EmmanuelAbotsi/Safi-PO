const express = require("express");
const User = require("../models/User");
const PurchaseRequest = require("../models/PurchaseRequest");

const {
    authenticate,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// ADMIN DASHBOARD SUMMARY
// GET /api/admin/summary
// ==========================================

router.get(
    "/summary",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const totalUsers =
                await User.countDocuments();

            const activeUsers =
                await User.countDocuments({
                    isActive: true
                });

            const totalRequests =
                await PurchaseRequest.countDocuments();

            const pendingRequests =
                await PurchaseRequest.countDocuments({
                    status: "Pending"
                });

            const approvedRequests =
                await PurchaseRequest.countDocuments({
                    status: "Approved"
                });

            const rejectedRequests =
                await PurchaseRequest.countDocuments({
                    status: "Rejected"
                });

            const procurementRequests =
                await PurchaseRequest.countDocuments({
                    status: "In Procurement"
                });

            const completedRequests =
                await PurchaseRequest.countDocuments({
                    status: "Completed"
                });

            return res.json({
                success: true,
                data: {
                    totalUsers,
                    activeUsers,
                    totalRequests,
                    pendingRequests,
                    approvedRequests,
                    rejectedRequests,
                    procurementRequests,
                    completedRequests
                }
            });

        } catch (error) {

            console.error(
                "Admin summary error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load admin summary"
            });

        }

    }
);


// ==========================================
// GET ALL USERS
// GET /api/admin/users
// ==========================================

router.get(
    "/users",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const users =
                await User.find()
                    .select("-password")
                    .sort({
                        createdAt: -1
                    });

            return res.json({
                success: true,
                count: users.length,
                data: users
            });

        } catch (error) {

            console.error(
                "Admin users error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to retrieve users"
            });

        }

    }
);


// ==========================================
// CREATE USER
// POST /api/admin/users
// ==========================================
//
// Admin-created users are required to change
// their password after their first login.
//
// The password is NOT manually hashed here.
// User.js handles hashing through its
// pre-save middleware.
// ==========================================

router.post(
    "/users",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                name,
                email,
                password,
                role,
                department
            } = req.body;


            // ==========================================
            // VALIDATION
            // ==========================================

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


            // ==========================================
            // PASSWORD VALIDATION
            // ==========================================

            if (
                typeof password !== "string" ||
                password.length < 8
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long"
                });

            }


            // ==========================================
            // NAME VALIDATION
            // ==========================================

            if (
                name.trim().length < 2
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid name"
                });

            }


            // ==========================================
            // VALIDATE ROLE
            // ==========================================

            const allowedRoles = [
                "employee",
                "manager",
                "admin"
            ];

            const selectedRole =
                String(role || "employee")
                    .toLowerCase();


            if (
                !allowedRoles.includes(
                    selectedRole
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user role"
                });

            }


            // ==========================================
            // NORMALIZE EMAIL
            // ==========================================

            const normalizedEmail =
                email.trim().toLowerCase();


            // ==========================================
            // VALIDATE EMAIL
            // ==========================================

            const isValidEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    normalizedEmail
                );


            if (!isValidEmail) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid email address"
                });

            }


            // ==========================================
            // CHECK EMAIL
            // ==========================================

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


            // ==========================================
            // CREATE USER
            // ==========================================
            //
            // IMPORTANT:
            //
            // We pass the plain temporary password
            // to User.create().
            //
            // User.js pre-save middleware automatically
            // hashes it before MongoDB stores it.
            //
            // mustChangePassword = true means the user
            // must change this temporary password after
            // their first successful login.
            // ==========================================

            const user =
                await User.create({

                    name:
                        name.trim(),

                    email:
                        normalizedEmail,

                    password:
                        password,

                    role:
                        selectedRole,

                    department:
                        department
                            ? department.trim()
                            : "",

                    mustChangePassword:
                        true,

                    isActive:
                        true

                });


            // ==========================================
            // RESPONSE
            // ==========================================

            return res.status(201).json({

                success: true,

                message:
                    "User created successfully. The user must change their password after first login.",

                data: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role,

                    department:
                        user.department,

                    // Keep "active" for existing
                    // frontend compatibility.
                    active:
                        user.isActive,

                    isActive:
                        user.isActive,

                    mustChangePassword:
                        user.mustChangePassword

                }

            });

        } catch (error) {

            console.error(
                "Admin create user error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to create user"
            });

        }

    }
);


// ==========================================
// EDIT USER
// PATCH /api/admin/users/:id
// ==========================================

router.patch(
    "/users/:id",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                name,
                email,
                department,
                role
            } = req.body;


            // ==========================================
            // VALIDATION
            // ==========================================

            if (
                !name ||
                !email ||
                !department ||
                !department.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email and department are required"
                });

            }


            // ==========================================
            // VALIDATE ROLE
            // ==========================================

            const allowedRoles = [
                "employee",
                "manager",
                "admin"
            ];

            const selectedRole =
                String(role || "employee")
                    .toLowerCase();


            if (
                !allowedRoles.includes(
                    selectedRole
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user role"
                });

            }


            // ==========================================
            // FIND USER
            // ==========================================

            const user =
                await User.findById(
                    req.params.id
                );


            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });

            }


            // ==========================================
            // NORMALIZE EMAIL
            // ==========================================

            const normalizedEmail =
                email.trim().toLowerCase();


            // ==========================================
            // VALIDATE EMAIL
            // ==========================================

            const isValidEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    normalizedEmail
                );


            if (!isValidEmail) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid email address"
                });

            }


            // ==========================================
            // CHECK WHETHER EMAIL BELONGS
            // TO ANOTHER USER
            // ==========================================

            const existingUser =
                await User.findOne({
                    email: normalizedEmail,
                    _id: {
                        $ne: user._id
                    }
                });


            if (existingUser) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Another user already has this email address"
                });

            }


            // ==========================================
            // UPDATE USER
            // ==========================================

            const updatedUser =
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            name: name.trim(),
                            email: normalizedEmail,
                            department: department.trim(),
                            role: selectedRole
                        }
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select("-password");


            // ==========================================
            // RESPONSE
            // ==========================================

            return res.json({

                success: true,

                message:
                    "User updated successfully",

                data: {

                    id:
                        updatedUser._id,

                    name:
                        updatedUser.name,

                    email:
                        updatedUser.email,

                    role:
                        updatedUser.role,

                    department:
                        updatedUser.department,

                    active:
                        updatedUser.isActive,

                    isActive:
                        updatedUser.isActive,

                    mustChangePassword:
                        updatedUser.mustChangePassword

                }

            });

        } catch (error) {

            console.error(
                "Admin edit user error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update user"
            });

        }

    }
);


// ==========================================
// ACTIVATE / DEACTIVATE USER
// PATCH /api/admin/users/:id/status
// ==========================================

router.patch(
    "/users/:id/status",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                active
            } = req.body;


            // ==========================================
            // VALIDATE ACTIVE VALUE
            // ==========================================

            if (
                typeof active !== "boolean"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Active status must be true or false"
                });

            }


            // ==========================================
            // FIND USER
            // ==========================================

            const user =
                await User.findById(
                    req.params.id
                );


            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });

            }


            // ==========================================
            // PREVENT ADMIN FROM DEACTIVATING
            // THEMSELVES
            // ==========================================

            if (
                user._id.toString() ===
                req.user.id &&
                active === false
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "You cannot deactivate your own account"
                });

            }


            // ==========================================
            // UPDATE STATUS
            // ==========================================

            const updatedUser =
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            isActive: active
                        }
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select("-password");


            // ==========================================
            // RESPONSE
            // ==========================================

            return res.json({

                success: true,

                message:
                    active
                        ? "User activated successfully"
                        : "User deactivated successfully",

                data: {

                    id:
                        updatedUser._id,

                    name:
                        updatedUser.name,

                    email:
                        updatedUser.email,

                    role:
                        updatedUser.role,

                    department:
                        updatedUser.department,

                    active:
                        updatedUser.isActive,

                    isActive:
                        updatedUser.isActive,

                    mustChangePassword:
                        updatedUser.mustChangePassword

                }

            });

        } catch (error) {

            console.error(
                "Admin user status error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update user status"
            });

        }

    }
);


// ==========================================
// GET ALL PURCHASE REQUESTS
// GET /api/admin/purchase-requests
// ==========================================

router.get(
    "/purchase-requests",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const requests =
                await PurchaseRequest.find()
                    .populate(
                        "requesterId",
                        "name email role department"
                    )
                    .populate(
                        "approvedBy",
                        "name email"
                    )
                    .populate(
                        "rejectedBy",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.json({

                success: true,

                count:
                    requests.length,

                data:
                    requests

            });

        } catch (error) {

            console.error(
                "Admin purchase requests error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to retrieve purchase requests"
            });

        }

    }
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;