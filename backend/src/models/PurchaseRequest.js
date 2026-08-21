const mongoose = require("mongoose");
const purchaseRequestSchema = new mongoose.Schema(
    {

        // ==========================================
        // REQUEST IDENTIFICATION
        // ==========================================

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
            trim: true,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },

        department: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },


        // ==========================================
        // PURCHASE INFORMATION
        // ==========================================

        itemDescription: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        // Quantity is NOT collected by the current HTML form.
        // Default to 1 so the old database requirement
        // does not break new submissions.
        quantity: {
            type: Number,
            min: 1,
            default: 1
        },

        budgetCategory: {
            type: String,
            required: true,
            enum: [
                "Operational",
                "Capital Expenditure",
                "Project",
                "Programme",
                "Other"
            ]
        },

        projectDonor: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        accountable: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        accountable2: {
            type: String,
            trim: true,
            default: "",
            maxlength: 200
        },

        accountable3: {
            type: String,
            trim: true,
            default: "",
            maxlength: 200
        },

        projectReference: {
            type: String,
            trim: true,
            default: "",
            maxlength: 200
        },

        estimatedCost: {
            type: Number,
            required: true,
            min: 0
        },


        // ==========================================
        // BUDGET
        // ==========================================

        budgetConfirmed: {
            type: Boolean,
            required: true,
            default: false
        },


        // ==========================================
        // SUPPLIER INFORMATION
        // ==========================================

        preferredSupplier: {
            type: String,
            required: true,
            enum: [
                "Yes",
                "No"
            ]
        },

        preferredSupplierName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 200
        },

        newSupplierName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 200
        },


        // ==========================================
        // COMMENTS / JUSTIFICATION
        // ==========================================

        additionalComments: {
            type: String,
            trim: true,
            default: "",
            maxlength: 3000
        },

        justification: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },


        // ==========================================
        // PROCUREMENT
        // ==========================================

        procurementMethod: {
            type: String,
            trim: true,
            default: ""
        },

        requiredQuotations: {
            type: Number,
            default: 0,
            min: 0
        },

        quotationsAttached: {
            type: Boolean,
            required: true,
            default: false
        },


        // ==========================================
        // UPLOADED DOCUMENTS
        // ==========================================

        documents: [
            {
                originalName: {
                    type: String,
                    trim: true
                },

                filename: {
                    type: String,
                    trim: true
                },

                path: {
                    type: String,
                    trim: true
                },

                mimetype: {
                    type: String,
                    trim: true
                },

                size: {
                    type: Number,
                    min: 0
                },

                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],


        // ==========================================
        // WORKFLOW STATUS
        // ==========================================

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


        // ==========================================
        // APPROVAL
        // ==========================================

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },


        // ==========================================
        // REJECTION
        // ==========================================

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
            default: null,
            maxlength: 2000
        }

    },

    {
        timestamps: true
    }
);


// ==========================================
// INDEXES
// ==========================================

purchaseRequestSchema.index({
    requesterId: 1,
    createdAt: -1
});

purchaseRequestSchema.index({
    status: 1,
    createdAt: -1
});

purchaseRequestSchema.index({
    department: 1,
    createdAt: -1
});


// ==========================================
// MODEL
// ==========================================

const PurchaseRequest = mongoose.model(
    "PurchaseRequest",
    purchaseRequestSchema
);

module.exports = PurchaseRequest;
