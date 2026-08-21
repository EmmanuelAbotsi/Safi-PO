const express = require("express");
const mongoose = require("mongoose");

const PurchaseRequest = require("../models/PurchaseRequest");
const User = require("../models/User");

const {
    authenticate,
    requireManager,
    requireAdmin
} = require("../middleware/auth");

// ==========================================
// EMAIL SERVICE
// ==========================================

const {
    sendNewRequestEmail,
    sendApprovedEmail,
    sendRejectedEmail
} = require("../email.service");

const router = express.Router();

// ==========================================
// CREATE PURCHASE REQUEST
// POST /api/purchase-requests
//
// Handles:
// - All purchase-request form fields
// - Multiple document uploads
// - Authentication
// - User verification
// - Procurement threshold information
// ==========================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// UPLOAD CONFIGURATION
// ==========================================

const uploadDirectory =
    path.join(__dirname, "../uploads/purchase-requests");

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

// Store files on disk
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            uploadDirectory
        );

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const baseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9-_]/g,
                    "_"
                );

        const uniqueName =
            `${Date.now()}-${Math.round(
                Math.random() * 1E9
            )}-${baseName}${extension}`;

        cb(
            null,
            uniqueName
        );

    }

});


// ==========================================
// ALLOWED FILE TYPES
// ==========================================

const allowedFileTypes = [

    "application/pdf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "image/jpeg",

    "image/png"

];

const fileSignatures = {
    "application/pdf": buffer =>
        buffer.subarray(0, 5).toString() === "%PDF-",
    "image/jpeg": buffer =>
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,
    "image/png": buffer =>
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4e, 0x47,
                0x0d, 0x0a, 0x1a, 0x0a
            ])
        ),
    "application/msword": buffer =>
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0xd0, 0xcf, 0x11, 0xe0,
                0xa1, 0xb1, 0x1a, 0xe1
            ])
        ),
    "application/vnd.ms-excel": buffer =>
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0xd0, 0xcf, 0x11, 0xe0,
                0xa1, 0xb1, 0x1a, 0xe1
            ])
        ),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": buffer =>
        buffer[0] === 0x50 && buffer[1] === 0x4b &&
        buffer[2] === 0x03 && buffer[3] === 0x04,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": buffer =>
        buffer[0] === 0x50 && buffer[1] === 0x4b &&
        buffer[2] === 0x03 && buffer[3] === 0x04
};

const removeUploadedFiles = files => {
    for (const file of files || []) {
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
};

const uploadedFilesMatchSignatures = files => {
    return files.every(file => {
        const signatureCheck = fileSignatures[file.mimetype];

        if (!signatureCheck) {
            return false;
        }

        const header = fs.readFileSync(file.path).subarray(0, 8);
        return signatureCheck(header);
    });
};


// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({

    storage,

    limits: {

        // Maximum 10 files
        files: 10,

        // Maximum 10 MB per file
        fileSize:
            10 * 1024 * 1024

    },

    fileFilter: function (
        req,
        file,
        cb
    ) {

        if (
            allowedFileTypes.includes(
                file.mimetype
            )
        ) {

            cb(
                null,
                true
            );

        } else {

            cb(
                new Error(
                    "Unsupported file type. Please upload PDF, Word, Excel, JPG or PNG files."
                )
            );

        }

    }

});


// ==========================================
// CREATE REQUEST
// ==========================================

router.post(
    "/",
    authenticate,

    upload.array(
        "documents",
        10
    ),

    async (req, res) => {

        try {

            // ==========================================
            // VERIFY AUTHENTICATED USER
            // ==========================================

            if (
                !req.user ||
                !req.user.id
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authenticated user could not be identified"

                });

            }


            // ==========================================
            // VALIDATE USER ID
            // ==========================================

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.user.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            // ==========================================
            // GET USER FROM DATABASE
            //
            // Never trust requester identity
            // information from the browser.
            // ==========================================

            const user =
                await User.findById(
                    req.user.id
                );

            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authenticated user account could not be found"

                });

            }


            // ==========================================
            // CHECK ACCOUNT STATUS
            // ==========================================

            if (user.isActive === false) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your account is inactive"

                });

            }


            // ==========================================
            // READ FORM DATA
            //
            // Because this request is multipart/form-data,
            // fields are available through req.body.
            // ==========================================

            const {

                email,

                requesterName,

                department,

                itemDescription,

                quantity,

                budgetCategory,

                projectDonor,

                accountable,

                accountable2,

                accountable3,

                projectReference,

                estimatedCost,

                budgetConfirmed,

                preferredSupplier,

                preferredSupplierName,

                newSupplierName,

                additionalComments,

                justification,

                quotationsAttached

            } = req.body;


            // ==========================================
            // REQUIRED FIELD VALIDATION
            // ==========================================

            if (
                !email ||
                !requesterName ||
                !department ||
                !itemDescription ||
                !budgetCategory ||
                !projectDonor ||
                !accountable ||
                estimatedCost === undefined ||
                estimatedCost === null ||
                !justification
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please complete all required purchase request fields."

                });

            }


            // ==========================================
            // VALIDATE EMAIL
            // ==========================================

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailPattern.test(
                    normalizedEmail
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid email address."

                });

            }


            // ==========================================
            // VALIDATE ESTIMATED COST
            // ==========================================

            const numericCost =
                Number(
                    estimatedCost
                );

            const numericQuantity =
                quantity === undefined || quantity === null || quantity === ""
                    ? undefined
                    : Number(quantity);

            if (
                numericQuantity !== undefined &&
                (!Number.isInteger(numericQuantity) ||
                numericQuantity < 1)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity must be a whole number greater than or equal to 1."
                });

            }

            if (
                !Number.isFinite(
                    numericCost
                ) ||
                numericCost < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Indicative PO amount must be a valid number greater than or equal to zero."

                });

            }

            const normalizedAccountable =
                String(accountable).trim().toLowerCase();

            const expectedAccountable = numericCost <= 15000
                ? "francis.owusu@safisana.org"
                : numericCost <= 30000
                ? "berend@safisana.org"
                : "aart@safisana.org";

            if (normalizedAccountable !== expectedAccountable) {
                return res.status(400).json({
                    success: false,
                    message: "The accountable person does not match the indicative PO amount."
                });
            }

            const normalizedAccountable3 = accountable3
                ? String(accountable3).trim().toLowerCase()
                : "";

            if (numericCost > 30000 &&
                normalizedAccountable3 !== "aart@safisana.org") {
                return res.status(400).json({
                    success: false,
                    message: "aart@safisana.org must be selected as Accountable 3 for amounts above GHS 30,000."
                });
            }


            // ==========================================
            // BUDGET CONFIRMATION
            // ==========================================

            if (
                budgetConfirmed !== "Yes"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You must confirm that budget availability has been confirmed by the Finance Manager."

                });

            }


            // ==========================================
            // QUOTATION CONFIRMATION
            // ==========================================

            if (
                quotationsAttached !== "Yes"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You must confirm that the required quotations have been uploaded."

                });

            }


            // ==========================================
            // SUPPLIER VALIDATION
            // ==========================================

            if (
                preferredSupplier !== "Yes" &&
                preferredSupplier !== "No"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please specify whether the supplier is a preferred supplier."

                });

            }


            // ==========================================
            // PREFERRED SUPPLIER LOGIC
            // ==========================================

            let finalPreferredSupplierName =
                null;

            let finalNewSupplierName =
                null;


            if (
                preferredSupplier === "Yes"
            ) {

                if (
                    !preferredSupplierName ||
                    !String(
                        preferredSupplierName
                    ).trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Please provide the preferred supplier name."

                    });

                }

                finalPreferredSupplierName =
                    String(
                        preferredSupplierName
                    ).trim();

            }


            if (
                preferredSupplier === "No"
            ) {

                if (
                    !newSupplierName ||
                    !String(
                        newSupplierName
                    ).trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Please provide the one-time / new supplier name."

                    });

                }

                finalNewSupplierName =
                    String(
                        newSupplierName
                    ).trim();

            }


            // ==========================================
            // PROCUREMENT THRESHOLD
            // ==========================================

            let procurementMethod =
                "Quotation";

            let requiredQuotations =
                2;


            if (
                numericCost > 50000
            ) {

                procurementMethod =
                    "Formal Tender";

                requiredQuotations =
                    3;

            }

            else if (
                numericCost > 15000
            ) {

                procurementMethod =
                    "Three Quotations";

                requiredQuotations =
                    3;

            }

            else {

                procurementMethod =
                    "Two Quotations";

                requiredQuotations =
                    2;

            }


            // ==========================================
            // PREFERRED SUPPLIER OVERRIDE
            // ==========================================

            if (
                preferredSupplier === "Yes"
            ) {

                requiredQuotations =
                    1;

                procurementMethod =
                    numericCost > 50000
                        ? "Formal Tender - Preferred Supplier"
                        : "Preferred Supplier - One Quotation";

            }


            // ==========================================
            // PROCESS UPLOADED FILES
            // ==========================================

            const uploadedDocuments =
                Array.isArray(
                    req.files
                )
                    ? req.files.map(
                        file => ({

                            originalName:
                                file.originalname,

                            filename:
                                file.filename,

                            path:
                                file.path,

                            mimetype:
                                file.mimetype,

                            size:
                                file.size,

                            uploadedAt:
                                new Date()

                        })
                    )
                    : [];

            if (
                !uploadedFilesMatchSignatures(req.files || [])
            ) {
                removeUploadedFiles(req.files || []);

                return res.status(400).json({
                    success: false,
                    message:
                        "One or more uploaded files do not match their declared file type."
                });

            }


            // ==========================================
            // CHECK DOCUMENT COUNT
            // ==========================================
            //
            // Your HTML says quotations must be uploaded.
            // Require at least one document here.
            //
            // You can increase this later to enforce
            // exactly 2 or 3 quotations.
            // ==========================================

            if (
                uploadedDocuments.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload the required quotation or procurement documents."

                });

            }


            // ==========================================
            // CREATE REQUEST NUMBER
            // ==========================================

            const requestNumber =
                `PR-${Date.now()}`;


            // ==========================================
            // CREATE PURCHASE REQUEST
            // ==========================================

            const purchaseRequest =
                await PurchaseRequest.create({

                    requestNumber,

                    requesterId:
                        user._id,

                    // IMPORTANT:
                    // These are taken from the database
                    // rather than trusting the browser.

                    requesterName:
                        user.name,

                    department:
                        user.department ||
                        String(
                            department
                        ).trim(),

                    // ======================================
                    // NEW FORM FIELDS
                    // ======================================

                    email:
                        normalizedEmail,

                    itemDescription:
                        String(
                            itemDescription
                        ).trim(),

                    quantity:
                        numericQuantity === undefined
                            ? 1
                            : numericQuantity,

                    budgetCategory:
                        String(
                            budgetCategory
                        ).trim(),

                    projectDonor:
                        String(
                            projectDonor
                        ).trim(),

                    accountable:
                        String(
                            accountable
                        ).trim(),

                    accountable2:
                        accountable2
                            ? String(
                                accountable2
                            ).trim()
                            : null,

                    accountable3:
                        normalizedAccountable3,

                    projectReference:
                        projectReference
                            ? String(projectReference).trim()
                            : "",

                    estimatedCost:
                        numericCost,

                    budgetConfirmed:
                        true,

                    preferredSupplier:
                        preferredSupplier,

                    preferredSupplierName:
                        finalPreferredSupplierName,

                    newSupplierName:
                        finalNewSupplierName,

                    additionalComments:
                        additionalComments
                            ? String(
                                additionalComments
                            ).trim()
                            : "",

                    justification:
                        String(
                            justification
                        ).trim(),

                    quotationsAttached:
                        true,

                    // ======================================
                    // PROCUREMENT INFORMATION
                    // ======================================

                    procurementMethod:
                        procurementMethod,

                    requiredQuotations:
                        requiredQuotations,

                    documents:
                        uploadedDocuments

                });


            // ==========================================
            // LOG
            // ==========================================

            console.log(
                `Purchase request created: ${purchaseRequest.requestNumber} by ${user.email}`
            );

            console.log(
                `Documents uploaded: ${uploadedDocuments.length}`
            );


            // ==========================================
            // FIND ACTIVE MANAGERS
            // ==========================================

            const managers =
                await User.find({

                    role:
                        "manager",

                    isActive:
                        true

                });


            console.log(
                `Active managers found: ${managers.length}`
            );


            // ==========================================
            // SEND EMAIL TO MANAGERS
            // ==========================================

            if (
                managers.length > 0
            ) {

                for (
                    const manager of managers
                ) {

                    try {

                        await sendNewRequestEmail({

                            manager,

                            request:
                                purchaseRequest

                        });

                    }

                    catch (
                        emailError
                    ) {

                        console.error(

                            `❌ Failed to send new request email to ${manager.email}:`,

                            emailError

                        );

                    }

                }

            }

            else {

                console.warn(
                    "⚠️ No active managers found. New request email was not sent."
                );

            }


            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(201).json({

                success:
                    true,

                message:
                    "Purchase request created successfully",

                data:
                    purchaseRequest

            });


        }

        catch (error) {

            console.error(
                "Purchase request error:",
                error
            );


            // ==========================================
            // CLEAN UP UPLOADED FILES IF DB SAVE FAILED
            // ==========================================

            if (
                req.files &&
                Array.isArray(
                    req.files
                )
            ) {

                for (
                    const file of req.files
                ) {

                    try {

                        if (
                            fs.existsSync(
                                file.path
                            )
                        ) {

                            fs.unlinkSync(
                                file.path
                            );

                        }

                    }

                    catch (
                        cleanupError
                    ) {

                        console.error(
                            "Failed to remove uploaded file:",
                            cleanupError
                        );

                    }

                }

            }


            // ==========================================
            // MULTER ERRORS
            // ==========================================

            if (
                error instanceof multer.MulterError
            ) {

                if (
                    error.code ===
                    "LIMIT_FILE_SIZE"
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Each uploaded file must be 10 MB or smaller."

                    });

                }


                if (
                    error.code ===
                    "LIMIT_FILE_COUNT"
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "You can upload a maximum of 10 files."

                    });

                }


                return res.status(400).json({

                    success:
                        false,

                    message:
                        error.message

                });

            }


            // ==========================================
            // OTHER UPLOAD ERRORS
            // ==========================================

            if (
                error &&
                error.message &&
                error.message.includes(
                    "Unsupported file type"
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        error.message

                });

            }


            // ==========================================
            // GENERAL SERVER ERROR
            // ==========================================

            return res.status(500).json({

                success:
                    false,

                message:
                    "Failed to create purchase request"

            });

        }

    }
);
 
// ==========================================
// GET PURCHASE REQUESTS
// GET /api/purchase-requests
//
// EMPLOYEE:
//   Own requests only
//
// MANAGER:
//   All requests
//
// ADMIN:
//   All requests
// ==========================================

router.get(
    "/",
    authenticate,
    async (req, res) => {

        try {

            if (!req.user || !req.user.id) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user could not be identified"
                });

            }

            let query = {};

            // ==========================================
            // EMPLOYEE
            // ==========================================

            if (req.user.role === "employee") {

                query = {
                    requesterId: req.user.id
                };

            } else if (
                req.user.role !== "manager" &&
                req.user.role !== "admin"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account does not have permission to view purchase requests"
                });

            }

            // ==========================================
            // MANAGER / ADMIN
            // ==========================================
            //
            // Managers and Admins can see all requests.
            // ==========================================

            const requests =
                await PurchaseRequest
                    .find(query)
                    .populate(
                        "requesterId",
                        "name email role department"
                    )
                    .populate(
                        "approvedBy",
                        "name email"
                    )
                    .populate(
                        "rejectedBy",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });

            return res.json({

                success: true,

                count:
                    requests.length,

                data:
                    requests

            });

        } catch (error) {

            console.error(
                "Get purchase requests error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve purchase requests"

            });

        }

    }
);


// ==========================================
// GET MY PURCHASE REQUESTS
// GET /api/purchase-requests/my
// ==========================================

router.get(
    "/my",
    authenticate,
    async (req, res) => {

        try {

            if (!req.user || !req.user.id) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user could not be identified"
                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.user.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });

            }

            const requests =
                await PurchaseRequest
                    .find({
                        requesterId:
                            req.user.id
                    })
                    .sort({
                        createdAt: -1
                    });

            return res.json({

                success: true,

                count:
                    requests.length,

                data:
                    requests

            });

        } catch (error) {

            console.error(
                "Get my purchase requests error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve your purchase requests"

            });

        }

    }
);


// ==========================================
// GET SINGLE PURCHASE REQUEST
// GET /api/purchase-requests/:id
//
// EMPLOYEE:
//   Own request only
//
// MANAGER / ADMIN:
//   Any request
// ==========================================

router.get(
    "/:id",
    authenticate,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                )
                .populate(
                    "requesterId",
                    "name email role department"
                )
                .populate(
                    "approvedBy",
                    "name email"
                )
                .populate(
                    "rejectedBy",
                    "name email"
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            if (
                req.user.role !== "employee" &&
                req.user.role !== "manager" &&
                req.user.role !== "admin"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account does not have permission to view purchase requests"
                });

            }

            // ==========================================
            // EMPLOYEE OWNERSHIP CHECK
            // ==========================================

            if (req.user.role === "employee") {

                if (
                    !request.requesterId ||
                    request.requesterId._id.toString() !==
                        req.user.id
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "You are not authorized to view this purchase request"
                    });

                }

            }

            return res.json({

                success: true,

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Get purchase request error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve purchase request"

            });

        }

    }
);


// ==========================================
// REPAIR OLD REQUEST
// ADMIN ONLY
//
// PATCH
// /api/purchase-requests/:id/repair-requester
// ==========================================

router.patch(
    "/:id/repair-requester",
    authenticate,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                email
            } = req.body;

            if (!email) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Employee email is required"
                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            const user =
                await User.findOne({
                    email:
                        email.toLowerCase().trim()
                });

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee with that email was not found"
                });

            }

            request.requesterId =
                user._id;

            request.requesterName =
                user.name;

            if (user.department) {

                request.department =
                    user.department;

            }

            await request.save();

            return res.json({

                success: true,

                message:
                    "Purchase request requester repaired successfully",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Repair requester error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to repair purchase request"

            });

        }

    }
);


// ==========================================
// APPROVE PURCHASE REQUEST
// PATCH /api/purchase-requests/:id/approve
// ==========================================

router.patch(
    "/:id/approve",
    authenticate,
    requireManager,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            // ==========================================
            // REQUESTER ID CHECK
            // ==========================================

            if (!request.requesterId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This purchase request has no requester ID. Please repair the request before approving it."
                });

            }

            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                request.status !== "Pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Request cannot be approved because it is currently ${request.status}`
                });

            }

            // ==========================================
            // FIND EMPLOYEE
            // ==========================================

            const employee =
                await User.findById(
                    request.requesterId
                );

            if (!employee) {

                return res.status(400).json({
                    success: false,
                    message:
                        "The requester associated with this purchase request could not be found."
                });

            }

            // ==========================================
            // FIND MANAGER
            // ==========================================

            const manager =
                await User.findById(
                    req.user.id
                );

            if (!manager || manager.isActive === false) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be verified."
                });

            }

            // ==========================================
            // APPROVE REQUEST
            // ==========================================

            request.status =
                "Approved";

            request.approvedBy =
                req.user.id;

            request.approvedAt =
                new Date();

            request.rejectedBy =
                null;

            request.rejectedAt =
                null;

            request.rejectionReason =
                null;

            await request.save();

            console.log(
                `Request ${request.requestNumber} approved by ${manager.email}`
            );

            // ==========================================
            // SEND APPROVAL EMAIL
            // ==========================================

            try {

                await sendApprovedEmail({

                    employee,

                    request,

                    manager

                });

                console.log(
                    `📧 Approval email sent to ${employee.email}`
                );

            } catch (emailError) {

                console.error(
                    "❌ Approval email failed:",
                    emailError
                );

            }

            return res.json({

                success: true,

                message:
                    "Purchase request approved successfully",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Approval error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to approve purchase request"

            });

        }

    }
);


// ==========================================
// REJECT PURCHASE REQUEST
// PATCH /api/purchase-requests/:id/reject
// ==========================================

router.patch(
    "/:id/reject",
    authenticate,
    requireManager,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            if (!request.requesterId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This purchase request has no requester ID and must be repaired first."
                });

            }

            if (
                request.status !== "Pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Request cannot be rejected because it is currently ${request.status}`
                });

            }

            // ==========================================
            // FIND EMPLOYEE
            // ==========================================

            const employee =
                await User.findById(
                    request.requesterId
                );

            if (!employee) {

                return res.status(400).json({
                    success: false,
                    message:
                        "The requester associated with this purchase request could not be found."
                });

            }

            // ==========================================
            // FIND MANAGER
            // ==========================================

            const manager =
                await User.findById(
                    req.user.id
                );

            if (!manager || manager.isActive === false) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Manager account could not be verified."
                });

            }

            // ==========================================
            // REJECT REQUEST
            // ==========================================

            request.status =
                "Rejected";

            request.rejectedBy =
                req.user.id;

            request.rejectedAt =
                new Date();

            request.rejectionReason =
                req.body &&
                req.body.rejectionReason
                    ? String(
                        req.body.rejectionReason
                    ).trim()
                    : null;

            request.approvedBy =
                null;

            request.approvedAt =
                null;

            await request.save();

            console.log(
                `Request ${request.requestNumber} rejected by ${manager.email}`
            );

            // ==========================================
            // SEND REJECTION EMAIL
            // ==========================================

            try {

                await sendRejectedEmail({

                    employee,

                    request,

                    manager

                });

                console.log(
                    `📧 Rejection email sent to ${employee.email}`
                );

            } catch (emailError) {

                console.error(
                    "❌ Rejection email failed:",
                    emailError
                );

            }

            return res.json({

                success: true,

                message:
                    "Purchase request rejected",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Rejection error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to reject purchase request"

            });

        }

    }
);


// ==========================================
// SEND TO PROCUREMENT
// PATCH /api/purchase-requests/:id/procurement
//
// MANAGER / ADMIN ONLY
// ==========================================

router.patch(
    "/:id/procurement",
    authenticate,
    async (req, res) => {

        try {

            // ==========================================
            // AUTHORIZATION
            // ==========================================

            if (
                !req.user ||
                (
                    req.user.role !== "manager" &&
                    req.user.role !== "admin"
                )
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Manager or Admin access required"
                });

            }

            // ==========================================
            // VALIDATE ID
            // ==========================================

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid purchase request ID"
                });

            }

            const request =
                await PurchaseRequest.findById(
                    req.params.id
                );

            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase request not found"
                });

            }

            // ==========================================
            // STATUS CHECK
            // ==========================================

            if (
                request.status !== "Approved"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only approved requests can be sent to procurement"
                });

            }

            request.status =
                "In Procurement";

            await request.save();

            return res.json({

                success: true,

                message:
                    "Request sent to procurement",

                data:
                    request

            });

        } catch (error) {

            console.error(
                "Procurement status error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send request to procurement"

            });

        }

    }
);


module.exports = router;
