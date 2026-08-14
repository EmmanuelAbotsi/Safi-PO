const express = require("express");
const PurchaseOrder = require("../models/PurchaseOrder");
const PurchaseRequest = require("../models/PurchaseRequest");

const router = express.Router();

// ==========================================
// GET ALL PURCHASE ORDERS
// GET /api/purchase-orders
// ==========================================
router.get("/", async (req, res) => {
    try {
        const orders = await PurchaseOrder
            .find()
            .populate("purchaseRequest")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.error("Get purchase orders error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve purchase orders"
        });
    }
});

// ==========================================
// GET SINGLE PURCHASE ORDER
// GET /api/purchase-orders/:id
// ==========================================
router.get("/:id", async (req, res) => {
    try {
        const order = await PurchaseOrder
            .findById(req.params.id)
            .populate("purchaseRequest");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Purchase order not found"
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error("Get purchase order error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve purchase order"
        });
    }
});

// ==========================================
// CREATE PURCHASE ORDER
// POST /api/purchase-orders
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
            purchaseRequestId,
            supplierName,
            totalAmount
        } = req.body;

        if (
            !purchaseRequestId ||
            !supplierName ||
            totalAmount === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Purchase request, supplier and total amount are required"
            });
        }

        const request = await PurchaseRequest.findById(
            purchaseRequestId
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Purchase request not found"
            });
        }

         if (
    request.status !== "Approved" &&
    request.status !== "In Procurement"
) {
    return res.status(400).json({
        success: false,
        message: "Only approved or in-procurement purchase requests can create purchase orders"
    });
}

        const existingOrder = await PurchaseOrder.findOne({
            purchaseRequest: purchaseRequestId
        });

        if (existingOrder) {
            return res.status(400).json({
                success: false,
                message: "A purchase order already exists for this request"
            });
        }

        const poNumber = `PO-${Date.now()}`;

        const purchaseOrder = await PurchaseOrder.create({
            poNumber,
            supplierName,
            purchaseRequest: request._id,
            itemDescription: request.itemDescription,
            quantity: request.quantity,
            totalAmount
        });

        request.status = "In Procurement";
        await request.save();

        res.status(201).json({
            success: true,
            message: "Purchase order created successfully",
            data: purchaseOrder
        });

    } catch (error) {
        console.error("Create purchase order error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create purchase order"
        });
    }
});

// ==========================================
// ISSUE PURCHASE ORDER
// PATCH /api/purchase-orders/:id/issue
// ==========================================
router.patch("/:id/issue", async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(
            req.params.id
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Purchase order not found"
            });
        }

        if (order.status !== "Draft") {
            return res.status(400).json({
                success: false,
                message: "Only draft purchase orders can be issued"
            });
        }

        order.status = "Issued";

        await order.save();

        res.json({
            success: true,
            message: "Purchase order issued successfully",
            data: order
        });

    } catch (error) {
        console.error("Issue purchase order error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to issue purchase order"
        });
    }
});

// ==========================================
// COMPLETE PURCHASE ORDER
// PATCH /api/purchase-orders/:id/complete
// ==========================================
router.patch("/:id/complete", async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(
            req.params.id
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Purchase order not found"
            });
        }

        if (
            order.status !== "Issued" &&
            order.status !== "Delivered"
        ) {
            return res.status(400).json({
                success: false,
                message: "Only issued or delivered orders can be completed"
            });
        }

        order.status = "Completed";

        await order.save();

        // Update the related purchase request
        await PurchaseRequest.findByIdAndUpdate(
            order.purchaseRequest,
            {
                status: "Completed"
            }
        );

        res.json({
            success: true,
            message: "Purchase order completed successfully",
            data: order
        });

    } catch (error) {
        console.error("Complete purchase order error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to complete purchase order"
        });
    }
});

// ==========================================
// CANCEL PURCHASE ORDER
// PATCH /api/purchase-orders/:id/cancel
// ==========================================
router.patch("/:id/cancel", async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(
            req.params.id
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Purchase order not found"
            });
        }

        if (order.status === "Completed") {
            return res.status(400).json({
                success: false,
                message: "Completed purchase orders cannot be cancelled"
            });
        }

        order.status = "Cancelled";

        await order.save();

        res.json({
            success: true,
            message: "Purchase order cancelled",
            data: order
        });

    } catch (error) {
        console.error("Cancel purchase order error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to cancel purchase order"
        });
    }
});

module.exports = router;
