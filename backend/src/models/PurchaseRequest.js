const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
    {
        requestNumber: {
            type: String,
            unique: true,
            trim: true
        },

        requesterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        requesterName: {
            type: String,
            required: true,
            trim: true
        },

        department: {
            type: String,
            required: true,
            trim: true
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

        estimatedCost: {
            type: Number,
            required: true,
            min: 0
        },

        justification: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected",
                "In Procurement",
                "Completed"
            ],
            default: "Pending"
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },

        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        rejectedAt: {
            type: Date,
            default: null
        },

        rejectionReason: {
            type: String,
            trim: true,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const PurchaseRequest = mongoose.model(
    "PurchaseRequest",
    purchaseRequestSchema
);

module.exports = PurchaseRequest;