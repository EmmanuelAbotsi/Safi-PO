const jwt = require("jsonwebtoken");

// ==========================================
// VERIFY JWT TOKEN
// ==========================================
const authenticate = (req, res, next) => {
    try {
        const secret = process.env.JWT_SECRET;

        // --------------------------------------
        // SERVER CONFIGURATION CHECK
        // --------------------------------------
        if (!secret || secret.length < 32) {
            console.error(
                "JWT_SECRET is missing or too short."
            );

            return res.status(500).json({
                success: false,
                message: "Authentication service is not properly configured"
            });
        }

        const authHeader = req.headers.authorization;

        // --------------------------------------
        // CHECK AUTHORIZATION HEADER
        // --------------------------------------
        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = authHeader
            .substring(7)
            .trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // --------------------------------------
        // VERIFY TOKEN
        // --------------------------------------
        const decoded = jwt.verify(
            token,
            secret,
            {
                issuer: "safi-po",
                audience: "safi-po-users"
            }
        );

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

// ==========================================
// MANAGER ONLY
// ==========================================
const requireManager = (req, res, next) => {

    if (
        !req.user ||
        req.user.role !== "Manager"
    ) {
        return res.status(403).json({
            success: false,
            message: "Manager access required"
        });
    }

    next();
};

// ==========================================
// ADMIN ONLY
// ==========================================
const requireAdmin = (req, res, next) => {

    if (
        !req.user ||
        req.user.role !== "Admin"
    ) {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }

    next();
};

module.exports = {
    authenticate,
    requireManager,
    requireAdmin
};