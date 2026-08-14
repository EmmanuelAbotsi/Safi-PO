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
        document.getElementById(
            "purchaseRequestForm"
        );

    if (purchaseRequestForm) {

        purchaseRequestForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const submitButton =
                    document.getElementById(
                        "submitBtn"
                    );

                const message =
                    document.getElementById(
                        "message"
                    );

                const requesterName =
                    document
                        .getElementById(
                            "requesterName"
                        )
                        .value
                        .trim();

                const department =
                    document
                        .getElementById(
                            "department"
                        )
                        .value;

                const itemDescription =
                    document
                        .getElementById(
                            "itemDescription"
                        )
                        .value
                        .trim();

                const quantity =
                    document
                        .getElementById(
                            "quantity"
                        )
                        .value;

                const estimatedCost =
                    document
                        .getElementById(
                            "estimatedCost"
                        )
                        .value;

                const justification =
                    document
                        .getElementById(
                            "justification"
                        )
                        .value
                        .trim();

                // =================================================
                // VALIDATION
                // =================================================

                if (
                    !requesterName ||
                    !department ||
                    !itemDescription ||
                    !quantity ||
                    !estimatedCost ||
                    !justification
                ) {

                    if (message) {
                        message.className =
                            "message error";

                        message.textContent =
                            "Please complete all required fields.";
                    }

                    return;
                }

                // Make sure we have a logged-in user
                if (!user || !user.id) {

                    if (message) {
                        message.className =
                            "message error";

                        message.textContent =
                            "Your user session is invalid. Please log in again.";
                    }

                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    setTimeout(() => {
                        window.location.href =
                            "login.html";
                    }, 1000);

                    return;
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
                        "";
                }

                // =================================================
                // SEND REQUEST TO API
                // =================================================

                try {

                    const response =
                        await fetch(
                            `${API_URL}/api/purchase-requests`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Authorization":
                                        `Bearer ${token}`
                                },

                                body:
                                    JSON.stringify({

                                        // Requester information
                                        requesterId:
                                            user.id,

                                        requesterName:
                                            requesterName,

                                        department:
                                            department,

                                        // Purchase information
                                        itemDescription:
                                            itemDescription,

                                        quantity:
                                            Number(
                                                quantity
                                            ),

                                        estimatedCost:
                                            Number(
                                                estimatedCost
                                            ),

                                        justification:
                                            justification
                                    })
                            }
                        );

                    // =================================================
                    // READ RESPONSE SAFELY
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

                    // Clear form
                    purchaseRequestForm.reset();

                    // Restore logged-in employee details
                    if (user) {

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

                            const departmentExists =
                                Array.from(
                                    departmentInput.options
                                ).some(option =>
                                    option.value ===
                                        user.department ||
                                    option.textContent ===
                                        user.department
                                );

                            if (
                                departmentExists
                            ) {

                                departmentInput.value =
                                    user.department;
                            }
                        }
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