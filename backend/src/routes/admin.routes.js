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
                    active: true
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

            res.json({
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

            res.status(500).json({
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

            res.json({
                success: true,
                count: users.length,
                data: users
            });

        } catch (error) {

            console.error(
                "Admin users error:",
                error
            );

            res.status(500).json({
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
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email and password are required"
                });

            }


            // ==========================================
            // VALIDATE ROLE
            // ==========================================

            const allowedRoles = [
                "Employee",
                "Manager",
                "Admin"
            ];

            const selectedRole =
                role || "Employee";


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
                email.toLowerCase().trim();


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
            // HASH PASSWORD
            // ==========================================

            const bcrypt =
                require("bcryptjs");


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            // ==========================================
            // CREATE USER
            // ==========================================

            const user =
                await User.create({

                    name:
                        name.trim(),

                    email:
                        normalizedEmail,

                    password:
                        hashedPassword,

                    role:
                        selectedRole,

                    department:
                        department
                            ? department.trim()
                            : "",

                    active:
                        true

                });


            // ==========================================
            // RESPONSE
            // ==========================================

            res.status(201).json({

                success: true,

                message:
                    "User created successfully",

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

                    active:
                        user.active

                }

            });

        } catch (error) {

            console.error(
                "Admin create user error:",
                error
            );

            res.status(500).json({
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
                !email
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name and email are required"
                });

            }


            // ==========================================
            // VALIDATE ROLE
            // ==========================================

            const allowedRoles = [
                "Employee",
                "Manager",
                "Admin"
            ];


            const selectedRole =
                role || "Employee";


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
                email.toLowerCase().trim();


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

            user.name =
                name.trim();

            user.email =
                normalizedEmail;

            user.department =
                department
                    ? department.trim()
                    : "";

            user.role =
                selectedRole;


            await user.save();


            // ==========================================
            // RESPONSE
            // ==========================================

            res.json({

                success: true,

                message:
                    "User updated successfully",

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

                    active:
                        user.active

                }

            });

        } catch (error) {

            console.error(
                "Admin edit user error:",
                error
            );

            res.status(500).json({
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

            user.active =
                active;


            await user.save();


            // ==========================================
            // RESPONSE
            // ==========================================

            res.json({

                success: true,

                message:
                    active
                        ? "User activated successfully"
                        : "User deactivated successfully",

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

                    active:
                        user.active

                }

            });

        } catch (error) {

            console.error(
                "Admin user status error:",
                error
            );

            res.status(500).json({
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


            res.json({

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

            res.status(500).json({
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