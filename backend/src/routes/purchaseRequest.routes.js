const express = require("express");
const mongoose = require("mongoose");

const PurchaseRequest = require("../models/PurchaseRequest");
const User = require("../models/User");

const {
    authenticate,
    requireManager,
    requireAdmin
} = require("../middleware/auth");

// ==========================================
// EMAIL SERVICE
// ==========================================

const {
    sendNewRequestEmail,
    sendApprovedEmail,
    sendRejectedEmail
} = require("../email.service");

const router = express.Router();

// ==========================================
// CREATE PURCHASE REQUEST
// POST /api/purchase-requests
// ==========================================

router.post(
    "/",
    authenticate,
    async (req, res) => {

        try {

            const {
                requesterName,
                department,
                itemDescription,
                quantity,
                estimatedCost,
                justification
            } = req.body;

            // ==========================================
            // VERIFY USER
            // ==========================================

            if (!req.user || !req.user.id) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user could not be identified"
                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.user.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });

            }

            // ==========================================
            // VALIDATE REQUEST
            // ==========================================

            if (
                !requesterName ||
                !department ||
                !itemDescription ||
                !quantity ||
                estimatedCost === undefined ||
                !justification
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "All required fields must be provided"
                });

            }

            // ==========================================
            // CREATE REQUEST NUMBER
            // ==========================================

            const requestNumber =
                `PR-${Date.now()}`;

            // ==========================================
            // CREATE PURCHASE REQUEST
            // ==========================================

            const purchaseRequest =
                await PurchaseRequest.create({

                    requestNumber,

                    requesterId:
                        req.user.id,

                    requesterName,

                    department,

                    itemDescription,

                    quantity:
                        Number(quantity),

                    estimatedCost:
                        Number(estimatedCost),

                    justification

                });

            console.log(
                `Purchase request created: ${purchaseRequest.requestNumber}`
            );

            // ==========================================
            // FIND ACTIVE MANAGERS
            // ==========================================

            const managers =
                await User.find({
                    role: "Manager",
                    active: true
                });

            console.log(
                `Active managers found: ${managers.length}`
            );

            // ==========================================
            // SEND EMAIL TO MANAGERS
            // ==========================================

            if (managers.length > 0) {

                for (const manager of managers) {

                    try {

                        await sendNewRequestEmail({

                            manager,

                            request:
                                purchaseRequest

                        });

                        

                    } catch (emailError) {

                        console.error(
                            `❌ Failed to send new request email to ${manager.email}:`,
                            emailError
                        );

                    }

                }

            } else {

                console.warn(
                    "⚠️ No active managers found. New request email was not sent."
                );

            }

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(201).json({

                success: true,

                message:
                    "Purchase request created successfully",

                data:
                    purchaseRequest

            });

        } catch (error) {

            console.error(
                "Purchase request error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to create purchase request"

            });

        }

    }
);

// ==========================================
// GET ALL PURCHASE REQUESTS
// GET /api/purchase-requests
// ==========================================

router.get(
    "/",
    authenticate,
    async (req, res) => {

        try {

            const requests =
                await PurchaseRequest
                    .find()
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
                "Get purchase requests error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to retrieve purchase requests"

            });

        }

    }
);

// ==========================================
// GET MY PURCHASE REQUESTS
// GET /api/purchase-requests/my
// ==========================================

router.get(
    "/my",
    authenticate,
    async (req, res) => {

        try {

            if (!req.user || !req.user.id) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user could not be identified"
                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.user.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });

            }

            const requests =
                await PurchaseRequest
                    .find({
                        requesterId:
                            req.user.id
                    })
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
                "Get my purchase requests error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to retrieve your purchase requests"

            });

        }

    }
);

// ==========================================
// GET SINGLE PURCHASE REQUEST
// GET /api/purchase-requests/:id
// ==========================================

router.get(
    "/:id",
    authenticate,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            return res.json({

                success: true,

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Get purchase request error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to retrieve purchase request"

            });

        }

    }
);

// ==========================================
// REPAIR OLD REQUEST
// ADMIN ONLY
//
// PATCH
// /api/purchase-requests/:id/repair-requester
// ==========================================

router.patch(
    "/:id/repair-requester",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                email
            } = req.body;

            if (!email) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Employee email is required"
                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            const user =
                await User.findOne({
                    email:
                        email.toLowerCase().trim()
                });

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee with that email was not found"
                });

            }

            request.requesterId =
                user._id;

            request.requesterName =
                user.name;

            if (user.department) {

                request.department =
                    user.department;

            }

            await request.save();

            return res.json({

                success: true,

                message:
                    "Purchase request requester repaired successfully",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Repair requester error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to repair purchase request"

            });

        }

    }
);

// ==========================================
// APPROVE PURCHASE REQUEST
// PATCH /api/purchase-requests/:id/approve
// ==========================================

router.patch(
    "/:id/approve",
    authenticate,
    requireManager,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            if (
                !req.user ||
                !req.user.id
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager identity could not be verified"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            // ==========================================
            // REQUESTER ID CHECK
            // ==========================================

            if (!request.requesterId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This purchase request has no requester ID. Please repair the request before approving it."
                });

            }

            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                request.status !== "Pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Request cannot be approved because it is currently ${request.status}`
                });

            }

            // ==========================================
            // FIND EMPLOYEE
            // ==========================================

            const employee =
                await User.findById(
                    request.requesterId
                );

            if (!employee) {

                return res.status(400).json({
                    success: false,
                    message:
                        "The requester associated with this purchase request could not be found."
                });

            }

            // ==========================================
            // FIND MANAGER
            // ==========================================

            const manager =
                await User.findById(
                    req.user.id
                );

            if (!manager) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be found."
                });

            }

            // ==========================================
            // APPROVE REQUEST
            // ==========================================

            request.status =
                "Approved";

            request.approvedBy =
                req.user.id;

            request.approvedAt =
                new Date();

            request.rejectedBy =
                null;

            request.rejectedAt =
                null;

            request.rejectionReason =
                null;

            await request.save();

            console.log(
                `Request ${request.requestNumber} approved by ${manager.email}`
            );

            // ==========================================
            // SEND APPROVAL EMAIL
            // ==========================================

            try {

                await sendApprovedEmail({

                    employee,

                    request,

                    manager

                });

                console.log(
                    `📧 Approval email sent to ${employee.email}`
                );

            } catch (emailError) {

                console.error(
                    "❌ Approval email failed:",
                    emailError
                );

            }

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.json({

                success: true,

                message:
                    "Purchase request approved successfully",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Approval error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to approve purchase request"

            });

        }

    }
);

// ==========================================
// REJECT PURCHASE REQUEST
// PATCH /api/purchase-requests/:id/reject
// ==========================================

router.patch(
    "/:id/reject",
    authenticate,
    requireManager,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            if (!request.requesterId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This purchase request has no requester ID and must be repaired first."
                });

            }

            if (
                request.status !== "Pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Request cannot be rejected because it is currently ${request.status}`
                });

            }

            // ==========================================
            // FIND EMPLOYEE
            // ==========================================

            const employee =
                await User.findById(
                    request.requesterId
                );

            if (!employee) {

                return res.status(400).json({
                    success: false,
                    message:
                        "The requester associated with this purchase request could not be found."
                });

            }

            // ==========================================
            // FIND MANAGER
            // ==========================================

            const manager =
                await User.findById(
                    req.user.id
                );

            if (!manager) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be found."
                });

            }

            // ==========================================
            // REJECT REQUEST
            // ==========================================

            request.status =
                "Rejected";

            request.rejectedBy =
                req.user.id;

            request.rejectedAt =
                new Date();

            request.rejectionReason =
                req.body &&
                req.body.rejectionReason
                    ? req.body.rejectionReason
                    : null;

            request.approvedBy =
                null;

            request.approvedAt =
                null;

            await request.save();

            console.log(
                `Request ${request.requestNumber} rejected by ${manager.email}`
            );

            // ==========================================
            // SEND REJECTION EMAIL
            // ==========================================

            try {

                await sendRejectedEmail({

                    employee,

                    request,

                    manager

                });

                console.log(
                    `📧 Rejection email sent to ${employee.email}`
                );

            } catch (emailError) {

                console.error(
                    "❌ Rejection email failed:",
                    emailError
                );

            }

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.json({

                success: true,

                message:
                    "Purchase request rejected",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Rejection error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to reject purchase request"

            });

        }

    }
);

// ==========================================
// SEND TO PROCUREMENT
// PATCH /api/purchase-requests/:id/procurement
// ==========================================

router.patch(
    "/:id/procurement",
    authenticate,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            if (
                request.status !== "Approved"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only approved requests can be sent to procurement"
                });

            }

            request.status =
                "In Procurement";

            await request.save();

            return res.json({

                success: true,

                message:
                    "Request sent to procurement",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Procurement status error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to send request to procurement"

            });

        }

    }
);

module.exports = router;