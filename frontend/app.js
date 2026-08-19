const API_URL = "http://localhost:5001";

document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // CHECK LOGIN
    // =====================================================

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    // index.html = NEW REQUEST page
    // login.html = LOGIN page
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    let user = null;

    try {
        user = userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error("User data error:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "login.html";
        return;
    }

    // =====================================================
    // DISPLAY USER INFORMATION
    // =====================================================

    if (user) {

        const userNameElements =
            document.querySelectorAll(".user-details strong");

        const userDepartmentElements =
            document.querySelectorAll(".user-details span");

        const topUserName =
            document.querySelector(".top-user strong");

        const topUserDepartment =
            document.querySelector(".top-user span");

        userNameElements.forEach(element => {
            element.textContent =
                user.name || "User";
        });

        userDepartmentElements.forEach(element => {
            element.textContent =
                user.department ||
                user.role ||
                "Employee";
        });

        if (topUserName) {
            topUserName.textContent =
                user.name || "User";
        }

        if (topUserDepartment) {
            topUserDepartment.textContent =
                user.department ||
                user.role ||
                "Employee";
        }

        // Generate initials
        const initials =
            (user.name || "User")
                .split(" ")
                .filter(Boolean)
                .map(word =>
                    word.charAt(0)
                )
                .join("")
                .substring(0, 2)
                .toUpperCase();

        document
            .querySelectorAll(".avatar")
            .forEach(avatar => {
                avatar.textContent = initials;
            });

        // Automatically fill requester information
        const requesterNameInput =
            document.getElementById("requesterName");

        if (
            requesterNameInput &&
            user.name
        ) {
            requesterNameInput.value =
                user.name;
        }

        // Automatically fill department
        const departmentInput =
            document.getElementById("department");

        if (
            departmentInput &&
            user.department
        ) {

            const departmentExists =
                Array.from(
                    departmentInput.options
                ).some(option =>
                    option.value ===
                        user.department ||
                    option.textContent ===
                        user.department
                );

            if (departmentExists) {
                departmentInput.value =
                    user.department;
            }
        }
    }
 
// =====================================================
// PURCHASE REQUEST SUBMISSION
// =====================================================

const purchaseRequestForm =
    document.getElementById("purchaseRequestForm");

if (purchaseRequestForm) {

    purchaseRequestForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const submitButton =
                document.getElementById("submitBtn");

            const message =
                document.getElementById("message");

            // =================================================
            // GET FORM VALUES
            // =================================================

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const requesterName =
                document
                    .getElementById("requesterName")
                    .value
                    .trim();

            const department =
                document
                    .getElementById("department")
                    .value;

            const itemDescription =
                document
                    .getElementById("itemDescription")
                    .value
                    .trim();

            const quantity =
                document
                    .getElementById("quantity")
                    .value;    

            const budgetCategory =
                document
                    .getElementById("budgetCategory")
                    .value;

            const projectDonor =
                document
                    .getElementById("projectDonor")
                    .value
                    .trim();

            const accountable =
                document
                    .getElementById("accountable")
                    .value;

            const accountable2 =
                document
                    .getElementById("accountable2")
                    .value;

            const projectReference =
                document
                    .getElementById("projectReference")
                    .value
                    .trim();

            const estimatedCost =
                document
                    .getElementById("estimatedCost")
                    .value;

            const budgetConfirmed =
                document
                    .getElementById("budgetConfirmed")
                    .checked;

            const preferredSupplier =
                document
                    .getElementById("preferredSupplier")
                    .value;

            const preferredSupplierName =
                document
                    .getElementById("preferredSupplierName")
                    .value
                    .trim();

            const newSupplierName =
                document
                    .getElementById("newSupplierName")
                    .value
                    .trim();

            const additionalComments =
                document
                    .getElementById("additionalComments")
                    .value
                    .trim();

            const justification =
                document
                    .getElementById("justification")
                    .value
                    .trim();

            const quotationsAttached =
                document
                    .getElementById("quotationsAttached")
                    .checked;

            const documentsInput =
                document.getElementById("documents");

            // =================================================
            // VALIDATION
            // =================================================

            if (
                !email ||
                !requesterName ||
                !department ||
                !itemDescription ||
                !quantity ||
                !budgetCategory ||
                !projectDonor ||
                !accountable ||
                !projectReference ||
                !estimatedCost ||
                !justification ||
                !preferredSupplier ||
                !budgetConfirmed ||
                !quotationsAttached
            ) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Please complete all required fields and confirmations.";

                }

                return;
            }

            // =================================================
            // VALIDATE EMAIL
            // =================================================

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Please enter a valid email address.";

                }

                return;
            }

            // =================================================
            // VALIDATE AMOUNT
            // =================================================

            const cost =
                Number(estimatedCost);

            if (
                Number.isNaN(cost) ||
                cost <= 0
            ) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Please enter a valid indicative PO amount.";

                }

                return;
            }
            const requestedQuantity = Number(quantity);

            if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity < 1
            ) {

        if (message) {

            message.className =
            "message error";

            message.textContent =
            "Please enter a valid quantity of at least 1.";

                }

    return;
}

            // =================================================
            // VALIDATE SUPPLIER INFORMATION
            // =================================================

            if (
                preferredSupplier === "Yes" &&
                !preferredSupplierName
            ) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Please provide the preferred supplier name.";

                }

                return;
            }

            if (
                preferredSupplier === "No" &&
                !newSupplierName
            ) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Please provide the one-time / new supplier name.";

                }

                return;
            }

            // =================================================
            // CHECK LOGGED-IN USER
            // =================================================

            if (!user || !user.id) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "Your user session is invalid. Please log in again.";

                }

                localStorage.removeItem("token");
                localStorage.removeItem("user");

                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1000);

                return;
            }

            // =================================================
            // VALIDATE FILES
            // =================================================

            const files =
                documentsInput
                    ? Array.from(documentsInput.files)
                    : [];

            const maxFiles = 10;

            const maxFileSize =
                10 * 1024 * 1024; // 10 MB

            const allowedExtensions = [
                "pdf",
                "doc",
                "docx",
                "xls",
                "xlsx",
                "jpg",
                "jpeg",
                "png"
            ];

            if (files.length > maxFiles) {

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        "You can upload a maximum of 10 files.";

                }

                return;
            }

            for (const file of files) {

                const extension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();

                if (
                    !allowedExtensions.includes(
                        extension
                    )
                ) {

                    if (message) {

                        message.className =
                            "message error";

                        message.textContent =
                            `Unsupported file type: ${file.name}`;

                    }

                    return;
                }

                if (
                    file.size >
                    maxFileSize
                ) {

                    if (message) {

                        message.className =
                            "message error";

                        message.textContent =
                            `${file.name} is larger than 10 MB.`;

                    }

                    return;
                }
            }

            // =================================================
            // DISABLE SUBMIT BUTTON
            // =================================================

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.innerHTML =
                    "<span>Submitting...</span><b>→</b>";

            }

            if (message) {

                message.className =
                    "message";

                message.textContent =
                    "Submitting purchase request...";

            }

            // =================================================
            // CREATE FORMDATA
            // =================================================

            const formData =
                new FormData();

            // User information
            formData.append(
                "requesterId",
                user.id
            );

            formData.append(
                "email",
                email
            );

            formData.append(
                "requesterName",
                requesterName
            );

            formData.append(
                "department",
                department
            );

            // Purchase information
            formData.append(
                "itemDescription",
                itemDescription
            );
            
            formData.append(
                "quantity",
                requestedQuantity
            );
            formData.append(
                "budgetCategory",
                budgetCategory
            );

            formData.append(
                "projectDonor",
                projectDonor
            );

            formData.append(
                "accountable",
                accountable
            );

            formData.append(
                "accountable2",
                accountable2
            );

            formData.append(
                "projectReference",
                projectReference
            );

            formData.append(
                "estimatedCost",
                cost
            );

            // Supplier information
            formData.append(
                "budgetConfirmed",
                budgetConfirmed ? "Yes" : "No"
            );

            formData.append(
                "preferredSupplier",
                preferredSupplier
            );

            formData.append(
                "preferredSupplierName",
                preferredSupplierName
            );

            formData.append(
                "newSupplierName",
                newSupplierName
            );

            // Additional information
            formData.append(
                "additionalComments",
                additionalComments
            );

            formData.append(
                "justification",
                justification
            );

            formData.append(
                "quotationsAttached",
                quotationsAttached ? "Yes" : "No"
            );

            // =================================================
            // ADD DOCUMENTS
            // =================================================

            files.forEach(file => {

                formData.append(
                    "documents",
                    file
                );

            });

            // =================================================
            // SEND REQUEST
            // =================================================

            try {

                const response =
                    await fetch(
                        `${API_URL}/api/purchase-requests`,
                        {
                            method: "POST",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: formData
                        }
                    );

                // IMPORTANT:
                // Do NOT manually set
                // Content-Type when using FormData.
                // The browser creates the multipart
                // boundary automatically.

                // =================================================
                // READ RESPONSE
                // =================================================

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                let result;

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    result =
                        await response.json();

                } else {

                    const text =
                        await response.text();

                    throw new Error(
                        text ||
                        `Server returned HTTP ${response.status}`
                    );
                }

                console.log(
                    "Purchase request response:",
                    result
                );

                // =================================================
                // AUTHENTICATION ERROR
                // =================================================

                if (
                    response.status === 401
                ) {

                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    window.location.href =
                        "login.html";

                    return;
                }

                // =================================================
                // REQUEST FAILED
                // =================================================

                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        "Failed to submit purchase request."
                    );
                }

                // =================================================
                // SUCCESS
                // =================================================

                if (message) {

                    message.className =
                        "message success";

                    message.textContent =
                        "Purchase request submitted successfully.";

                }

                // =================================================
                // RESET FORM
                // =================================================

                purchaseRequestForm.reset();

                // =================================================
                // RESTORE USER INFORMATION
                // =================================================

                if (user) {

                    const emailInput =
                        document.getElementById(
                            "email"
                        );

                    if (
                        emailInput &&
                        user.email
                    ) {

                        emailInput.value =
                            user.email;

                    }

                    const requesterNameInput =
                        document.getElementById(
                            "requesterName"
                        );

                    if (
                        requesterNameInput &&
                        user.name
                    ) {

                        requesterNameInput.value =
                            user.name;

                    }

                    const departmentInput =
                        document.getElementById(
                            "department"
                        );

                    if (
                        departmentInput &&
                        user.department
                    ) {

                        const matchingOption =
                            Array.from(
                                departmentInput.options
                            ).find(
                                option =>
                                    option.value
                                        .toLowerCase() ===
                                    String(
                                        user.department
                                    ).toLowerCase()
                            );

                        if (matchingOption) {

                            departmentInput.value =
                                matchingOption.value;

                        }

                    }

                }

                // =================================================
                // RESET SUPPLIER FIELDS
                // =================================================

                const preferredSupplierNameInput =
                    document.getElementById(
                        "preferredSupplierName"
                    );

                const newSupplierNameInput =
                    document.getElementById(
                        "newSupplierName"
                    );

                if (preferredSupplierNameInput) {

                    preferredSupplierNameInput.disabled =
                        false;

                }

                if (newSupplierNameInput) {

                    newSupplierNameInput.disabled =
                        false;

                }

            } catch (error) {

                console.error(
                    "Purchase request error:",
                    error
                );

                if (message) {

                    message.className =
                        "message error";

                    message.textContent =
                        error.message ||
                        "Unable to submit purchase request. Please try again.";

                }

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        "<span>Submit Purchase Request</span><b>→</b>";

                }

            }

        }
    );
}
    // =====================================================
    // LOAD DASHBOARD DATA
    // =====================================================

    async function loadDashboard() {

        const dashboardStats =
            document.querySelectorAll(
                ".stat-card"
            );

        // Only run where dashboard statistics exist
        if (!dashboardStats.length) {
            return;
        }

        try {

            const response =
                await fetch(
                    `${API_URL}/api/dashboard/summary`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            let result;

            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                result =
                    await response.json();

            } else {

                throw new Error(
                    `Server returned HTTP ${response.status}`
                );
            }

            if (
                !response.ok ||
                !result.success
            ) {

                if (
                    response.status === 401
                ) {

                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    window.location.href =
                        "login.html";

                    return;
                }

                throw new Error(
                    result.message ||
                    "Unable to load dashboard"
                );
            }

            const data =
                result.data || {};

            // =================================================
            // UPDATE DASHBOARD STATISTICS
            // =================================================

            const statCards =
                document.querySelectorAll(
                    ".stat-card"
                );

            if (
                statCards.length >= 3
            ) {

                const firstValue =
                    statCards[0].querySelector(
                        "strong"
                    );

                const secondValue =
                    statCards[1].querySelector(
                        "strong"
                    );

                const thirdValue =
                    statCards[2].querySelector(
                        "strong"
                    );

                if (firstValue) {
                    firstValue.textContent =
                        data.myRequests ?? 0;
                }

                if (secondValue) {
                    secondValue.textContent =
                        data.pendingApproval ?? 0;
                }

                if (thirdValue) {
                    thirdValue.textContent =
                        data.requiresAction ?? 0;
                }
            }

            // =================================================
            // APPROVAL BADGE
            // =================================================

            const approvalBadge =
                document.querySelector(
                    ".badge"
                );

            if (approvalBadge) {
                approvalBadge.textContent =
                    data.pendingApproval ?? 0;
            }

            console.log(
                "Dashboard data loaded:",
                data
            );

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );
        }
    }

    // Run dashboard loading
    await loadDashboard();

    // =====================================================
    // LOGOUT
    // =====================================================

    const logoutButton =
        document.querySelector(
            ".logout"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                window.location.href =
                    "login.html";
            }
        );
    }

    // =====================================================
    // NAVIGATION
    // =====================================================

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            event => {

                event.preventDefault();

                const text =
                    item.textContent
                        .trim()
                        .replace(
                            /\s+/g,
                            " "
                        );

                // Dashboard
                if (
                    text.includes(
                        "Dashboard"
                    )
                ) {

                    window.location.href =
                        "dashboard.html";
                }

                // New Request
                else if (
                    text.includes(
                        "New Request"
                    )
                ) {

                    window.location.href =
                        "index.html";
                }

                // My Requests
                else if (
                    text.includes(
                        "My Requests"
                    )
                ) {

                    window.location.href =
                        "my-requests.html";
                }

                // Approvals
                else if (
                    text.includes(
                        "Approvals"
                    )
                ) {

                    window.location.href =
                        "approvals.html";
                }

                // Purchase Orders
                else if (
                    text.includes(
                        "Purchase Orders"
                    )
                ) {

                    window.location.href =
                        "purchase-orders.html";
                }

                // Suppliers
                else if (
                    text.includes(
                        "Suppliers"
                    )
                ) {

                    alert(
                        "Supplier management will be available soon."
                    );
                }

                // Settings
                else if (
                    text.includes(
                        "Settings"
                    )
                ) {

                    alert(
                        "Settings will be available soon."
                    );
                }
            }
        );
    });

    // =====================================================
    // POLICY BUTTON
    // =====================================================

    const policyButton =
        document.querySelector(
            ".red-card button"
        );

    if (policyButton) {

        policyButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                alert(
                    "Procurement policy information will be available here."
                );
            }
        );
    }

});