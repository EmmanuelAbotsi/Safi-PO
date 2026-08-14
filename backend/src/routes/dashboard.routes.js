const express = require("express");
const PurchaseRequest = require("../models/PurchaseRequest");

const {
    authenticate
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// DASHBOARD SUMMARY
// GET /api/dashboard/summary
//
// EMPLOYEE:
//   - Own requests only
//
// MANAGER / ADMIN:
//   - Organization-wide statistics
// ==========================================

router.get(
    "/summary",
    authenticate,
    async (req, res) => {

        try {

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

            const userId =
                req.user.id;

            const userRole =
                req.user.role;


            // ==========================================
            // EMPLOYEE DASHBOARD
            //
            // Employees must only receive statistics
            // relating to their own purchase requests.
            // ==========================================

            if (userRole === "Employee") {

                const myRequests =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId
                    });


                const requiresAction =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId,
                        status: "Rejected"
                    });


                const approved =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId,
                        status: "Approved"
                    });


                const inProcurement =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId,
                        status: "In Procurement"
                    });


                const completed =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId,
                        status: "Completed"
                    });


                return res.json({

                    success: true,

                    data: {

                        myRequests,

                        // Employees do not receive
                        // organization-wide pending data.
                        pendingApproval: 0,

                        requiresAction,

                        totalRequests:
                            myRequests,

                        approved,

                        inProcurement,

                        completed

                    }

                });

            }


            // ==========================================
            // MANAGER / ADMIN DASHBOARD
            //
            // Managers and Admins can view
            // organization-wide statistics.
            // ==========================================

            if (
                userRole === "Manager" ||
                userRole === "Admin"
            ) {

                const myRequests =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId
                    });


                const pendingApproval =
                    await PurchaseRequest.countDocuments({
                        status: "Pending"
                    });


                const requiresAction =
                    await PurchaseRequest.countDocuments({
                        requesterId: userId,
                        status: "Rejected"
                    });


                const totalRequests =
                    await PurchaseRequest.countDocuments();


                const approved =
                    await PurchaseRequest.countDocuments({
                        status: "Approved"
                    });


                const inProcurement =
                    await PurchaseRequest.countDocuments({
                        status: "In Procurement"
                    });


                const completed =
                    await PurchaseRequest.countDocuments({
                        status: "Completed"
                    });


                return res.json({

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

            }


            // ==========================================
            // UNKNOWN / INVALID ROLE
            // ==========================================

            return res.status(403).json({

                success: false,

                message:
                    "Your account does not have permission to access the dashboard"

            });

        } catch (error) {

            console.error(
                "Dashboard summary error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load dashboard summary"

            });

        }

    }
);


module.exports = router;