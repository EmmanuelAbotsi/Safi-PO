const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

dotenv.config();

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
const app = express();

const PORT =
    process.env.PORT || 5001;


connectDB();


app.use(cors());

app.use(express.json());


// ==========================================
// ROUTES
// ==========================================

app.use(
    "/api/auth",
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

        res.json({
            success: true,
            message:
                "Procurement Management System API is running"
        });

    }
);


app.listen(
    PORT,
    () => {

        console.log(
            `Procurement API listening on port ${PORT}`
        );

    }
);