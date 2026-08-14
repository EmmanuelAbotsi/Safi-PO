const express = require("express");
const PurchaseRequest = require("../models/PurchaseRequest");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// DASHBOARD SUMMARY
// GET /api/dashboard/summary
// ==========================================

router.get("/summary", authenticate, async (req, res) => {
    try {
        // ==========================================
        // IDENTIFY CURRENT USER
        // ==========================================

        const userId = req.user.id;

        // ==========================================
        // MY REQUESTS
        // Use requesterId instead of requesterName
        // ==========================================

        const myRequests =
            await PurchaseRequest.countDocuments({
                requesterId: userId
            });

        // ==========================================
        // PENDING APPROVAL
        // ==========================================

        const pendingApproval =
            await PurchaseRequest.countDocuments({
                status: "Pending"
            });

        // ==========================================
        // REQUIRES ACTION
        // ==========================================

        const requiresAction =
            await PurchaseRequest.countDocuments({
                requesterId: userId,
                status: "Rejected"
            });

        // ==========================================
        // TOTAL REQUESTS
        // ==========================================

        const totalRequests =
            await PurchaseRequest.countDocuments();

        // ==========================================
        // APPROVED REQUESTS
        // ==========================================

        const approved =
            await PurchaseRequest.countDocuments({
                status: "Approved"
            });

        // ==========================================
        // IN PROCUREMENT
        // ==========================================

        const inProcurement =
            await PurchaseRequest.countDocuments({
                status: "In Procurement"
            });

        // ==========================================
        // COMPLETED
        // ==========================================

        const completed =
            await PurchaseRequest.countDocuments({
                status: "Completed"
            });

        // ==========================================
        // RESPONSE
        // ==========================================

        res.json({
            success: true,
            data: {
                myRequests,
                pendingApproval,
                requiresAction,
                totalRequests,
                approved,
                inProcurement,
                completed
            }
        });

    } catch (error) {

        console.error(
            "Dashboard summary error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard summary"
        });
    }
});

module.exports = router;