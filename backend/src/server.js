const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./config/database");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

// ==========================================
// REQUIRED ENVIRONMENT VARIABLES
// ==========================================

const requiredEnv = [
    "MONGODB_URI",
    "JWT_SECRET"
];

const missingEnv = requiredEnv.filter(
    (key) => !process.env[key]
);

if (missingEnv.length > 0) {
    console.error(
        `Missing required environment variables: ${missingEnv.join(", ")}`
    );

    process.exit(1);
}

// ==========================================
// ROUTES
// ==========================================

const dashboardRoutes =
    require("./routes/dashboard.routes");

const purchaseRequestRoutes =
    require("./routes/purchaseRequest.routes");

const purchaseOrderRoutes =
    require("./routes/purchaseOrder.routes");

const authRoutes =
    require("./routes/auth.routes");

const adminRoutes =
    require("./routes/admin.routes");

// ==========================================
// APP
// ==========================================

const app = express();

const PORT =
    process.env.PORT || 5001;

// ==========================================
// SECURITY HEADERS
// ==========================================

app.use(
    helmet()
);

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
];

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header
            // such as curl/Postman/server-to-server requests.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("CORS policy: Origin not allowed")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

// ==========================================
// REQUEST SIZE LIMIT
// ==========================================

app.use(
    express.json({
        limit: "100kb"
    })
);

// ==========================================
// GENERAL API RATE LIMIT
// ==========================================

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use(
    "/api",
    apiLimiter
);

// ==========================================
// AUTHENTICATION RATE LIMIT
// ==========================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many authentication attempts. Please try again later."
    }
});

// ==========================================
// ROUTES
// ==========================================

app.use(
    "/api/auth",
    authLimiter,
    authRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/purchase-requests",
    purchaseRequestRoutes
);

app.use(
    "/api/purchase-orders",
    purchaseOrderRoutes
);

app.use(
    "/api/dashboard",
    dashboardRoutes
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
    "/api/health",
    (req, res) => {

        res.status(200).json({
            success: true,
            message:
                "Procurement Management System API is running"
        });

    }
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use(
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "Route not found"
        });

    }
);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(
    (error, req, res, next) => {

        console.error(
            "API error:",
            error.message
        );

        if (
            error.message &&
            error.message.startsWith("CORS policy")
        ) {

            return res.status(403).json({
                success: false,
                message: "Origin not allowed"
            });

        }

        res.status(
            error.status || 500
        ).json({
            success: false,
            message:
                error.status
                    ? error.message
                    : "Internal server error"
        });

    }
);

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
    await connectDB();

    app.listen(
        PORT,
        () => {

            console.log(
                `Procurement API listening on port ${PORT}`
            );

        }
    );
};

startServer();