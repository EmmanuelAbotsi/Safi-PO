console.log("Email service loaded");

const nodemailer = require("nodemailer");

const emailEnabled = Boolean(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD
);

// ==========================================
// EMAIL TRANSPORTER
// ==========================================
//
// The Safisana sender account uses Microsoft 365.
// Recipients can be Gmail, Microsoft, Outlook,
// Safisana, or other valid email providers.
// ==========================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.office365.com",

    port: Number(
        process.env.EMAIL_PORT || 587
    ),

    secure: false,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },

    tls: {
        minVersion: "TLSv1.2"
    }
});


// ==========================================
// VERIFY EMAIL CONNECTION
// ==========================================

if (emailEnabled) {
    transporter.verify((error) => {

        if (error) {

            console.error(
                "Email service connection failed:"
            );

            console.error(
                error.message
            );

        } else {

            console.log(
                "Email service connected successfully"
            );

            console.log(
                `Email account: ${process.env.EMAIL_USER}`
            );

        }

    });
} else {
    console.warn(
        "Email service disabled: EMAIL_USER and EMAIL_PASSWORD are not configured."
    );
}


// ==========================================
// FORMAT CURRENCY
// ==========================================

const formatCurrency = (amount) => {

    return Number(amount || 0).toLocaleString(
        "en-GH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

};


// ==========================================
// FORMAT DATE
// ==========================================

const formatDate = (date) => {

    if (!date) {
        return "—";
    }

    return new Date(date).toLocaleString(
        "en-GH"
    );

};


// ==========================================
// SEND NEW REQUEST EMAIL TO MANAGER
// ==========================================

const sendNewRequestEmail = async ({
    manager,
    request
}) => {

    if (!emailEnabled) {
        throw new Error(
            "Email service is disabled because SMTP credentials are not configured"
        );
    }

    if (!manager || !manager.email) {

        throw new Error(
            "Manager email address is missing"
        );

    }

    if (!request) {

        throw new Error(
            "Purchase request is missing"
        );

    }

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to:
            manager.email,

        subject:
            `New Purchase Request - ${request.requestNumber}`,

        html: `

            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: 0 auto;
                color: #333;
            ">

                <h2 style="
                    color: #1f6feb;
                ">
                    New Purchase Request
                </h2>

                <p>
                    Hello ${manager.name || "Manager"},
                </p>

                <p>
                    A new purchase request has been
                    submitted and is awaiting your review.
                </p>

                <div style="
                    background: #f6f8fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                ">

                    <p>
                        <strong>Request Number:</strong>
                        ${request.requestNumber || "—"}
                    </p>

                    <p>
                        <strong>Requester:</strong>
                        ${request.requesterName || "—"}
                    </p>

                    <p>
                        <strong>Department:</strong>
                        ${request.department || "—"}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription || "—"}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity || "—"}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${formatCurrency(
                            request.estimatedCost
                        )}
                    </p>

                    <p>
                        <strong>Justification:</strong>
                        ${request.justification || "—"}
                    </p>

                </div>

                <p>
                    Please log in to the Safisana
                    Purchase Ordering System to review
                    and take action on this request.
                </p>

                <p>
                    Regards,<br>
                    <strong>
                        Safisana Purchase Ordering System
                    </strong>
                </p>

            </div>

        `
    };

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        `New request email sent to ${manager.email}`
    );

    console.log(
        `Message ID: ${info.messageId}`
    );

    return info;
};


// ==========================================
// SEND APPROVAL EMAIL TO EMPLOYEE
// ==========================================

const sendApprovedEmail = async ({
    employee,
    request,
    manager
}) => {

    if (!emailEnabled) {
        throw new Error(
            "Email service is disabled because SMTP credentials are not configured"
        );
    }

    if (!employee || !employee.email) {

        throw new Error(
            "Employee email address is missing"
        );

    }

    if (!request) {

        throw new Error(
            "Purchase request is missing"
        );

    }

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to:
            employee.email,

        subject:
            `Purchase Request Approved - ${request.requestNumber}`,

        html: `

            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: 0 auto;
                color: #333;
            ">

                <h2 style="
                    color: #198754;
                ">
                    Purchase Request Approved
                </h2>

                <p>
                    Hello ${employee.name || "Employee"},
                </p>

                <p>
                    Your purchase request has been
                    <strong style="color: #198754;">
                        approved
                    </strong>.
                </p>

                <div style="
                    background: #f0fff4;
                    border-left: 5px solid #198754;
                    padding: 20px;
                    border-radius: 6px;
                    margin: 20px 0;
                ">

                    <p>
                        <strong>Request Number:</strong>
                        ${request.requestNumber || "—"}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription || "—"}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity || "—"}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${formatCurrency(
                            request.estimatedCost
                        )}
                    </p>

                    <p>
                        <strong>Approved By:</strong>
                        ${
                            manager && manager.name
                                ? manager.name
                                : "Manager"
                        }
                    </p>

                    <p>
                        <strong>Approval Date:</strong>
                        ${formatDate(
                            request.approvedAt
                        )}
                    </p>

                </div>

                <p>
                    You can log in to the Safisana
                    Purchase Ordering System to track
                    the progress of your request.
                </p>

                <p>
                    Regards,<br>
                    <strong>
                        Safisana Purchase Ordering System
                    </strong>
                </p>

            </div>

        `
    };

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        `Approval email sent to ${employee.email}`
    );

    console.log(
        `Message ID: ${info.messageId}`
    );

    return info;
};


// ==========================================
// SEND REJECTION EMAIL TO EMPLOYEE
// ==========================================

const sendRejectedEmail = async ({
    employee,
    request,
    manager
}) => {

    if (!emailEnabled) {
        throw new Error(
            "Email service is disabled because SMTP credentials are not configured"
        );
    }

    if (!employee || !employee.email) {

        throw new Error(
            "Employee email address is missing"
        );

    }

    if (!request) {

        throw new Error(
            "Purchase request is missing"
        );

    }

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to:
            employee.email,

        subject:
            `Purchase Request Rejected - ${request.requestNumber}`,

        html: `

            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: 0 auto;
                color: #333;
            ">

                <h2 style="
                    color: #dc3545;
                ">
                    Purchase Request Rejected
                </h2>

                <p>
                    Hello ${employee.name || "Employee"},
                </p>

                <p>
                    Your purchase request has been
                    <strong style="color: #dc3545;">
                        rejected
                    </strong>.
                </p>

                <div style="
                    background: #fff5f5;
                    border-left: 5px solid #dc3545;
                    padding: 20px;
                    border-radius: 6px;
                    margin: 20px 0;
                ">

                    <p>
                        <strong>Request Number:</strong>
                        ${request.requestNumber || "—"}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription || "—"}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity || "—"}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${formatCurrency(
                            request.estimatedCost
                        )}
                    </p>

                    <p>
                        <strong>Rejected By:</strong>
                        ${
                            manager && manager.name
                                ? manager.name
                                : "Manager"
                        }
                    </p>

                    <p>
                        <strong>Reason:</strong>
                        ${
                            request.rejectionReason ||
                            "No reason was provided."
                        }
                    </p>

                    <p>
                        <strong>Rejection Date:</strong>
                        ${formatDate(
                            request.rejectedAt
                        )}
                    </p>

                </div>

                <p>
                    Please log in to the Safisana
                    Purchase Ordering System to review
                    the request details.
                </p>

                <p>
                    Regards,<br>
                    <strong>
                        Safisana Purchase Ordering System
                    </strong>
                </p>

            </div>

        `
    };

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        `Rejection email sent to ${employee.email}`
    );

    console.log(
        `Message ID: ${info.messageId}`
    );

    return info;
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    sendNewRequestEmail,

    sendApprovedEmail,

    sendRejectedEmail

};