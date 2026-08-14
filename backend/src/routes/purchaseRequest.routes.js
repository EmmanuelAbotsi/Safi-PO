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
                itemDescription,
                quantity,
                estimatedCost,
                justification
            } = req.body;

            // ==========================================
            // VERIFY AUTHENTICATED USER
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
            // GET USER FROM DATABASE
            // NEVER TRUST IDENTITY FIELDS FROM FRONTEND
            // ==========================================

            const user = await User.findById(
                req.user.id
            );

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user account could not be found"
                });

            }

            if (!user.active) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account is inactive"
                });

            }

            // ==========================================
            // VALIDATE REQUEST
            // ==========================================

            if (
                !itemDescription ||
                !quantity ||
                estimatedCost === undefined ||
                estimatedCost === null ||
                !justification
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Item description, quantity, estimated cost and justification are required"
                });

            }

            // ==========================================
            // VALIDATE QUANTITY
            // ==========================================

            const numericQuantity =
                Number(quantity);

            if (
                !Number.isFinite(numericQuantity) ||
                numericQuantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity must be a valid number greater than zero"
                });

            }

            // ==========================================
            // VALIDATE ESTIMATED COST
            // ==========================================

            const numericCost =
                Number(estimatedCost);

            if (
                !Number.isFinite(numericCost) ||
                numericCost < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Estimated cost must be a valid number greater than or equal to zero"
                });

            }

            // ==========================================
            // CREATE REQUEST NUMBER
            // ==========================================

            const requestNumber =
                `PR-${Date.now()}`;

            // ==========================================
            // CREATE PURCHASE REQUEST
            //
            // IMPORTANT:
            // requesterName and department come from
            // MongoDB rather than the browser.
            // ==========================================

            const purchaseRequest =
                await PurchaseRequest.create({

                    requestNumber,

                    requesterId:
                        user._id,

                    requesterName:
                        user.name,

                    department:
                        user.department || "",

                    itemDescription:
                        String(itemDescription).trim(),

                    quantity:
                        numericQuantity,

                    estimatedCost:
                        numericCost,

                    justification:
                        String(justification).trim()

                });

            console.log(
                `Purchase request created: ${purchaseRequest.requestNumber} by ${user.email}`
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
                    "Failed to create purchase request"

            });

        }

    }
);


// ==========================================
// GET PURCHASE REQUESTS
// GET /api/purchase-requests
//
// EMPLOYEE:
//   Own requests only
//
// MANAGER:
//   All requests
//
// ADMIN:
//   All requests
// ==========================================

router.get(
    "/",
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

            let query = {};

            // ==========================================
            // EMPLOYEE
            // ==========================================

            if (req.user.role === "Employee") {

                query = {
                    requesterId: req.user.id
                };

            }

            // ==========================================
            // MANAGER / ADMIN
            // ==========================================
            //
            // Managers and Admins can see all requests.
            // ==========================================

            const requests =
                await PurchaseRequest
                    .find(query)
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
                "Get purchase requests error:",
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
                    "Failed to retrieve your purchase requests"

            });

        }

    }
);


// ==========================================
// GET SINGLE PURCHASE REQUEST
// GET /api/purchase-requests/:id
//
// EMPLOYEE:
//   Own request only
//
// MANAGER / ADMIN:
//   Any request
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
                )
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
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            // ==========================================
            // EMPLOYEE OWNERSHIP CHECK
            // ==========================================

            if (
                req.user.role === "Employee" &&
                request.requesterId &&
                request.requesterId._id.toString() !==
                    req.user.id
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to view this purchase request"
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

            if (!manager || !manager.active) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be verified."
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

            if (!manager || !manager.active) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be verified."
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
                    ? String(
                        req.body.rejectionReason
                    ).trim()
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
                    "Failed to reject purchase request"

            });

        }

    }
);


// ==========================================
// SEND TO PROCUREMENT
// PATCH /api/purchase-requests/:id/procurement
//
// MANAGER / ADMIN ONLY
// ==========================================

router.patch(
    "/:id/procurement",
    authenticate,
    async (req, res) => {

        try {

            // ==========================================
            // AUTHORIZATION
            // ==========================================

            if (
                !req.user ||
                (
                    req.user.role !== "Manager" &&
                    req.user.role !== "Admin"
                )
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Manager or Admin access required"
                });

            }

            // ==========================================
            // VALIDATE ID
            // ==========================================

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

            // ==========================================
            // STATUS CHECK
            // ==========================================

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
                    "Failed to send request to procurement"

            });

        }

    }
);


module.exports = router;