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
       await User.find({
        isActive: true
    })
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
            // ROLE
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
            // EMAIL
            // ==========================================

            const normalizedEmail =
                email.trim().toLowerCase();


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
                        department.trim(),

                    mustChangePassword:
                        true,

                    isActive:
                        true

                });


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


            const normalizedEmail =
                email.trim().toLowerCase();


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


            const updatedUser =
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            name:
                                name.trim(),

                            email:
                                normalizedEmail,

                            department:
                                department.trim(),

                            role:
                                selectedRole
                        }
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select("-password");


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
// RESET USER PASSWORD
// PATCH /api/admin/users/:id/password
// ==========================================
//
// The admin sets a temporary password.
//
// User.js automatically hashes the password
// when user.save() is called.
//
// The user will be required to change the
// temporary password after logging in.
// ==========================================

router.patch(
    "/users/:id/password",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                password
            } = req.body;


            // ==========================================
            // VALIDATE PASSWORD
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
            // SET PASSWORD
            // ==========================================

            user.password =
                password;

            user.mustChangePassword =
                true;


            // ==========================================
            // SAVE
            // ==========================================

            // User.js pre-save middleware
            // automatically hashes the password.

            await user.save();


            return res.json({

                success: true,

                message:
                    "Password reset successfully. The user must change the temporary password after login.",

                data: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    mustChangePassword:
                        user.mustChangePassword

                }

            });

        } catch (error) {

            console.error(
                "Admin password reset error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to reset user password"
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


            if (
                typeof active !== "boolean"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Active status must be true or false"
                });

            }


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
            // PREVENT SELF-DEACTIVATION
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


            const updatedUser =
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            isActive:
                                active
                        }
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select("-password");


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
// DELETE USER
// DELETE /api/admin/users/:id
// ==========================================
//
// Permanently deletes a user only if they
// have no purchase requests associated with them.
//
// Admin cannot delete their own account.
// ==========================================

router.delete(
    "/users/:id",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            // ==========================================
            // PREVENT ADMIN FROM DELETING THEMSELVES
            // ==========================================

            if (
                req.params.id === req.user.id
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "You cannot delete your own account"
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
            // CHECK PURCHASE REQUESTS
            // ==========================================

            const purchaseRequestCount =
                await PurchaseRequest.countDocuments({
                    requesterId: user._id
                });


            if (
                purchaseRequestCount > 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `This user cannot be deleted because they have ${purchaseRequestCount} purchase request(s). Deactivate the account instead.`
                });

            }


            // ==========================================
            // DELETE USER
            // ==========================================

            await User.findByIdAndDelete(
                user._id
            );


            // ==========================================
            // RESPONSE
            // ==========================================

            return res.json({

                success: true,

                message:
                    `User ${user.name} deleted successfully`,

                data: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }

            });

        } catch (error) {

            console.error(
                "Admin delete user error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to delete user"
            });

        }

    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;