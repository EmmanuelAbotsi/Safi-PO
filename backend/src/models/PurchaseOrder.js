const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
    {
        poNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        supplierName: {
            type: String,
            required: true,
            trim: true
        },

        purchaseRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PurchaseRequest",
            required: true
        },

        itemDescription: {
            type: String,
            required: true,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "Draft",
                "Issued",
                "Delivered",
                "Completed",
                "Cancelled"
            ],
            default: "Draft"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "PurchaseOrder",
    purchaseOrderSchema
);
