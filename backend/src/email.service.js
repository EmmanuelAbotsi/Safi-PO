console.log("📧 email.service.js loaded");

const nodemailer = require("nodemailer");

// ==========================================
// EMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ==========================================
// VERIFY EMAIL CONNECTION
// ==========================================

transporter.verify((error, success) => {

    if (error) {

        console.error("❌ Email service connection failed:");
        console.error(error);

    } else {

        console.log("✅ Email service connected successfully");
        console.log(`📧 Email account: ${process.env.EMAIL_USER}`);

    }

});

// ==========================================
// SEND NEW REQUEST EMAIL TO MANAGER
// ==========================================

const sendNewRequestEmail = async ({
    manager,
    request
}) => {

    const mailOptions = {

        from: `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to: manager.email,

        subject:
            `New Purchase Request - ${request.requestNumber}`,

        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: auto;
            ">

                <h2 style="color: #1f6feb;">
                    New Purchase Request
                </h2>

                <p>Hello ${manager.name},</p>

                <p>
                    A new purchase request has been submitted
                    and is awaiting your review.
                </p>

                <div style="
                    background: #f6f8fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                ">

                    <p>
                        <strong>Request Number:</strong>
                        ${request.requestNumber}
                    </p>

                    <p>
                        <strong>Requester:</strong>
                        ${request.requesterName}
                    </p>

                    <p>
                        <strong>Department:</strong>
                        ${request.department}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${Number(
                            request.estimatedCost
                        ).toLocaleString(
                            "en-GH",
                            {
                                minimumFractionDigits: 2
                            }
                        )}
                    </p>

                    <p>
                        <strong>Justification:</strong>
                        ${request.justification}
                    </p>

                </div>

                <p>
                    Please log in to Safisana Purchase Ordering System
                    to review and take action on this request.
                </p>

                <p>
                    Regards,<br>
                    <strong>Safisana Purchase Ordering System</strong>
                </p>

            </div>
        `
    };

    const info =
        await transporter.sendMail(mailOptions);

    console.log(
        `📧 New request email sent to ${manager.email}`
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

    const mailOptions = {

        from: `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to: employee.email,

        subject:
            `Purchase Request Approved - ${request.requestNumber}`,

        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: auto;
            ">

                <h2 style="color: #198754;">
                    Purchase Request Approved
                </h2>

                <p>Hello ${employee.name},</p>

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
                        ${request.requestNumber}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${Number(
                            request.estimatedCost
                        ).toLocaleString(
                            "en-GH",
                            {
                                minimumFractionDigits: 2
                            }
                        )}
                    </p>

                    <p>
                        <strong>Approved By:</strong>
                        ${manager.name}
                    </p>

                    <p>
                        <strong>Approval Date:</strong>
                        ${
                            request.approvedAt
                                ? new Date(
                                    request.approvedAt
                                ).toLocaleString("en-GH")
                                : "—"
                        }
                    </p>

                </div>

                <p>
                    You can log in to Safisana Purchase Ordering System
                    to track the progress of your request.
                </p>

                <p>
                    Regards,<br>
                    <strong>Safisana Purchase Ordering System</strong>
                </p>

            </div>
        `
    };

    const info =
        await transporter.sendMail(mailOptions);

    console.log(
        `📧 Approval email sent to ${employee.email}`
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

    const mailOptions = {

        from: `"Safisana Purchase Ordering System" <${process.env.EMAIL_USER}>`,

        to: employee.email,

        subject:
            `Purchase Request Rejected - ${request.requestNumber}`,

        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 650px;
                margin: auto;
            ">

                <h2 style="color: #dc3545;">
                    Purchase Request Rejected
                </h2>

                <p>Hello ${employee.name},</p>

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
                        ${request.requestNumber}
                    </p>

                    <p>
                        <strong>Item / Service:</strong>
                        ${request.itemDescription}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${request.quantity}
                    </p>

                    <p>
                        <strong>Estimated Cost:</strong>
                        GHS ${Number(
                            request.estimatedCost
                        ).toLocaleString(
                            "en-GH",
                            {
                                minimumFractionDigits: 2
                            }
                        )}
                    </p>

                    <p>
                        <strong>Rejected By:</strong>
                        ${manager.name}
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
                        ${
                            request.rejectedAt
                                ? new Date(
                                    request.rejectedAt
                                ).toLocaleString("en-GH")
                                : "—"
                        }
                    </p>

                </div>

                <p>
                    Please log in to Safisana Purchase Ordering System
                    to review the request details.
                </p>

                <p>
                    Regards,<br>
                    <strong>Safisana Purchase Ordering System</strong>
                </p>

            </div>
        `
    };

    const info =
        await transporter.sendMail(mailOptions);

    console.log(
        `📧 Rejection email sent to ${employee.email}`
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