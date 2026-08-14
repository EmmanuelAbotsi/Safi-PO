const jwt = require("jsonwebtoken");

// ==========================================
// VERIFY JWT TOKEN
// ==========================================
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        console.error("Authentication error:", error);

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

    if (!req.user || req.user.role !== "Manager") {
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

    if (!req.user || req.user.role !== "Admin") {
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