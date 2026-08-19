const express = require("express");
const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");
const PurchaseRequest = require("../models/PurchaseRequest");

const {
    authenticate,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// GET ALL PURCHASE ORDERS
// GET /api/purchase-orders
//
// EMPLOYEE:
//   Own purchase orders only
//
// MANAGER:
//   All purchase orders
//
// ADMIN:
//   All purchase orders
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

            let orders;


            // ==========================================
            // EMPLOYEE
            // ==========================================
            // Employees can only see purchase orders
            // belonging to their own purchase requests.
            // ==========================================

            if (req.user.role === "employee") {

                const myRequests =
                    await PurchaseRequest.find({
                        requesterId: req.user.id
                    }).select("_id");

                const requestIds =
                    myRequests.map(
                        request => request._id
                    );

                orders =
                    await PurchaseOrder
                        .find({
                            purchaseRequest: {
                                $in: requestIds
                            }
                        })
                        .populate("purchaseRequest")
                        .sort({
                            createdAt: -1
                        });

            }


            // ==========================================
            // MANAGER / ADMIN
            // ==========================================
            // Managers and Admins can view all POs.
            // ==========================================

            else if (
                req.user.role === "manager" ||
                req.user.role === "admin"
            ) {

                orders =
                    await PurchaseOrder
                        .find()
                        .populate("purchaseRequest")
                        .sort({
                            createdAt: -1
                        });

            }


            // ==========================================
            // INVALID ROLE
            // ==========================================

            else {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account does not have permission to view purchase orders"
                });

            }


            return res.json({

                success: true,

                count:
                    orders.length,

                data:
                    orders

            });

        } catch (error) {

            console.error(
                "Get purchase orders error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve purchase orders"

            });

        }

    }
);


// ==========================================
// GET SINGLE PURCHASE ORDER
// GET /api/purchase-orders/:id
//
// EMPLOYEE:
//   Own purchase order only
//
// MANAGER / ADMIN:
//   Any purchase order
// ==========================================

router.get(
    "/:id",
    authenticate,
    async (req, res) => {

        try {

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
                        "Invalid purchase order ID"

                });

            }


            // ==========================================
            // FIND PURCHASE ORDER
            // ==========================================

            const order =
                await PurchaseOrder
                    .findById(
                        req.params.id
                    )
                    .populate(
                        "purchaseRequest"
                    );


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Purchase order not found"

                });

            }


            // ==========================================
            // EMPLOYEE OWNERSHIP CHECK
            // ==========================================

            if (
                req.user.role === "employee"
            ) {

                if (
                    !order.purchaseRequest ||
                    !order.purchaseRequest.requesterId
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not authorized to view this purchase order"

                    });

                }


                if (
                    order.purchaseRequest.requesterId.toString() !==
                    req.user.id
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not authorized to view this purchase order"

                    });

                }

            }


            // ==========================================
            // ROLE VALIDATION
            // ==========================================

            if (
                req.user.role !== "employee" &&
                req.user.role !== "manager" &&
                req.user.role !== "admin"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your account does not have permission to view purchase orders"

                });

            }


            return res.json({

                success: true,

                data:
                    order

            });

        } catch (error) {

            console.error(
                "Get purchase order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve purchase order"

            });

        }

    }
);


// ==========================================
// CREATE PURCHASE ORDER
// POST /api/purchase-orders
//
// ADMIN ONLY
// ==========================================

router.post(
    "/",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                purchaseRequestId,
                supplierName,
                totalAmount
            } = req.body;


            // ==========================================
            // VALIDATE INPUT
            // ==========================================

            if (
                !purchaseRequestId ||
                !supplierName ||
                totalAmount === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Purchase request, supplier and total amount are required"

                });

            }


            // ==========================================
            // VALIDATE PURCHASE REQUEST ID
            // ==========================================

            if (
                !mongoose.Types.ObjectId.isValid(
                    purchaseRequestId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid purchase request ID"

                });

            }


            // ==========================================
            // VALIDATE SUPPLIER
            // ==========================================

            if (
                typeof supplierName !== "string" ||
                !supplierName.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Supplier name is required"

                });

            }


            // ==========================================
            // VALIDATE TOTAL AMOUNT
            // ==========================================

            const numericTotalAmount =
                Number(totalAmount);

            if (
                !Number.isFinite(
                    numericTotalAmount
                ) ||
                numericTotalAmount < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Total amount must be a valid number greater than or equal to zero"

                });

            }


            // ==========================================
            // FIND PURCHASE REQUEST
            // ==========================================

            const request =
                await PurchaseRequest.findById(
                    purchaseRequestId
                );

            if (!request) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Purchase request not found"

                });

            }


            // ==========================================
            // CHECK REQUEST STATUS
            // ==========================================

            if (
                request.status !== "Approved" &&
                request.status !== "In Procurement"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only approved or in-procurement purchase requests can create purchase orders"

                });

            }


            // ==========================================
            // CHECK EXISTING PURCHASE ORDER
            // ==========================================

            const existingOrder =
                await PurchaseOrder.findOne({

                    purchaseRequest:
                        purchaseRequestId

                });

            if (existingOrder) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A purchase order already exists for this request"

                });

            }


            // ==========================================
            // CREATE PO NUMBER
            // ==========================================

            const poNumber =
                `PO-${Date.now()}`;


            // ==========================================
            // CREATE PURCHASE ORDER
            // ==========================================

            const purchaseOrder =
                await PurchaseOrder.create({

                    poNumber,

                    supplierName:
                        supplierName.trim(),

                    purchaseRequest:
                        request._id,

                    itemDescription:
                        request.itemDescription,

                    quantity:
                        request.quantity,

                    totalAmount:
                        numericTotalAmount

                });


            // ==========================================
            // UPDATE REQUEST STATUS
            // ==========================================

            request.status =
                "In Procurement";

            await request.save();


            console.log(
                `Purchase order ${poNumber} created by admin ${req.user.email}`
            );


            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(201).json({

                success: true,

                message:
                    "Purchase order created successfully",

                data:
                    purchaseOrder

            });

        } catch (error) {

            console.error(
                "Create purchase order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to create purchase order"

            });

        }

    }
);


// ==========================================
// ISSUE PURCHASE ORDER
// PATCH /api/purchase-orders/:id/issue
//
// ADMIN ONLY
// ==========================================

router.patch(
    "/:id/issue",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

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
                        "Invalid purchase order ID"

                });

            }


            const order =
                await PurchaseOrder.findById(
                    req.params.id
                );

            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Purchase order not found"

                });

            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                order.status !== "Draft"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only draft purchase orders can be issued"

                });

            }


            // ==========================================
            // ISSUE ORDER
            // ==========================================

            order.status =
                "Issued";

            await order.save();


            console.log(
                `Purchase order ${order.poNumber} issued by admin ${req.user.email}`
            );


            return res.json({

                success: true,

                message:
                    "Purchase order issued successfully",

                data:
                    order

            });

        } catch (error) {

            console.error(
                "Issue purchase order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to issue purchase order"

            });

        }

    }
);


// ==========================================
// COMPLETE PURCHASE ORDER
// PATCH /api/purchase-orders/:id/complete
//
// ADMIN ONLY
// ==========================================

router.patch(
    "/:id/complete",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

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
                        "Invalid purchase order ID"

                });

            }


            const order =
                await PurchaseOrder.findById(
                    req.params.id
                );

            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Purchase order not found"

                });

            }


            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                order.status !== "Issued" &&
                order.status !== "Delivered"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only issued or delivered orders can be completed"

                });

            }


            // ==========================================
            // COMPLETE ORDER
            // ==========================================

            order.status =
                "Completed";

            await order.save();


            // ==========================================
            // UPDATE RELATED PURCHASE REQUEST
            // ==========================================

            await PurchaseRequest.findByIdAndUpdate(

                order.purchaseRequest,

                {
                    status:
                        "Completed"
                }

            );


            console.log(
                `Purchase order ${order.poNumber} completed by admin ${req.user.email}`
            );


            return res.json({

                success: true,

                message:
                    "Purchase order completed successfully",

                data:
                    order

            });

        } catch (error) {

            console.error(
                "Complete purchase order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to complete purchase order"

            });

        }

    }
);


// ==========================================
// CANCEL PURCHASE ORDER
// PATCH /api/purchase-orders/:id/cancel
//
// ADMIN ONLY
// ==========================================

router.patch(
    "/:id/cancel",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

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
                        "Invalid purchase order ID"

                });

            }


            const order =
                await PurchaseOrder.findById(
                    req.params.id
                );

            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Purchase order not found"

                });

            }


            // ==========================================
            // COMPLETED ORDERS CANNOT BE CANCELLED
            // ==========================================

            if (
                order.status === "Completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Completed purchase orders cannot be cancelled"

                });

            }


            // ==========================================
            // ALREADY CANCELLED
            // ==========================================

            if (
                order.status === "Cancelled"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Purchase order is already cancelled"

                });

            }


            // ==========================================
            // CANCEL ORDER
            // ==========================================

            order.status =
                "Cancelled";

            await order.save();


            console.log(
                `Purchase order ${order.poNumber} cancelled by admin ${req.user.email}`
            );


            return res.json({

                success: true,

                message:
                    "Purchase order cancelled",

                data:
                    order

            });

        } catch (error) {

            console.error(
                "Cancel purchase order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to cancel purchase order"

            });

        }

    }
);


module.exports = router;