const jwt = require("jsonwebtoken");

// ==========================================
// VERIFY JWT TOKEN
// ==========================================

const authenticate = (req, res, next) => {
    try {

        const secret =
            process.env.JWT_SECRET;

        // --------------------------------------
        // SERVER CONFIGURATION CHECK
        // --------------------------------------

        if (
            !secret ||
            secret.length < 32
        ) {

            console.error(
                "JWT_SECRET is missing or too short."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Authentication service is not properly configured"
            });

        }

        // --------------------------------------
        // GET AUTHORIZATION HEADER
        // --------------------------------------

        const authHeader =
            req.headers.authorization;

        console.log(
            "AUTH HEADER RECEIVED:",
            authHeader ? "YES" : "NO"
        );

        console.log(
            "JWT SECRET EXISTS:",
            !!secret
        );

        console.log(
            "JWT SECRET LENGTH:",
            secret.length
        );

        // --------------------------------------
        // CHECK AUTHORIZATION HEADER
        // --------------------------------------

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication required"
            });

        }

        // --------------------------------------
        // EXTRACT TOKEN
        // --------------------------------------

        const token =
            authHeader
                .substring(7)
                .trim();

        if (!token) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication required"
            });

        }

        // --------------------------------------
        // VERIFY TOKEN
        // --------------------------------------

        const decoded =
            jwt.verify(
                token,
                secret,
                {
                    issuer: "safi-po",
                    audience: "safi-po-users"
                }
            );

        console.log(
            "JWT DECODED SUCCESSFULLY:",
            {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email,
                issuer: decoded.iss,
                audience: decoded.aud,
                expiresAt: decoded.exp
            }
        );

        // --------------------------------------
        // ATTACH USER TO REQUEST
        // --------------------------------------

        req.user = {
            ...decoded,
            role:
                String(decoded.role || "")
                    .toLowerCase()
        };

        next();

    } catch (error) {

        console.error(
            "JWT ERROR:",
            error.name
        );

        console.error(
            "JWT MESSAGE:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired token"
        });

    }
};


// ==========================================
// MANAGER ONLY
// ==========================================

const requireManager = (
    req,
    res,
    next
) => {

    if (
        !req.user ||
        req.user.role !== "manager"
    ) {

        return res.status(403).json({
            success: false,
            message:
                "Manager access required"
        });

    }

    next();
};


// ==========================================
// ADMIN ONLY
// ==========================================

const requireAdmin = (
    req,
    res,
    next
) => {

    if (
        !req.user ||
        req.user.role !== "admin"
    ) {

        return res.status(403).json({
            success: false,
            message:
                "Admin access required"
        });

    }

    next();
};


// ==========================================
// EMPLOYEE ONLY
// ==========================================

const requireEmployee = (
    req,
    res,
    next
) => {

    if (
        !req.user ||
        req.user.role !== "employee"
    ) {

        return res.status(403).json({
            success: false,
            message:
                "Employee access required"
        });

    }

    next();
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    authenticate,
    requireManager,
    requireAdmin,
    requireEmployee
};