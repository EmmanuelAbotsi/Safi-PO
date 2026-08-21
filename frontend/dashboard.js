const API_URL = "https://safi-po.onrender.com";

// ==========================================
// CHECK LOGIN
// ==========================================

const token = localStorage.getItem("token");
const storedUser = localStorage.getItem("user");

if (!token) {
    window.location.href = "login.html";
}


// ==========================================
// USER INFORMATION
// ==========================================

let user = null;

try {
    user = storedUser ? JSON.parse(storedUser) : null;
} catch (error) {
    console.error("User data error:", error);
}


// ==========================================
// GET USER INITIALS
// ==========================================

function getInitials(name) {

    if (!name) {
        return "U";
    }

    return name
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();
}


// ==========================================
// DISPLAY USER INFORMATION
// ==========================================

if (user) {

    const initials = getInitials(user.name);

    const sidebarAvatar =
        document.getElementById("sidebarAvatar");

    const topAvatar =
        document.getElementById("topAvatar");

    const sidebarUserName =
        document.getElementById("sidebarUserName");

    const topUserName =
        document.getElementById("topUserName");

    const sidebarDepartment =
        document.getElementById("sidebarDepartment");

    const topUserDepartment =
        document.getElementById("topUserDepartment");


    if (sidebarAvatar) {
        sidebarAvatar.textContent = initials;
    }

    if (topAvatar) {
        topAvatar.textContent = initials;
    }

    if (sidebarUserName) {
        sidebarUserName.textContent =
            user.name || "User";
    }

    if (topUserName) {
        topUserName.textContent =
            user.name || "User";
    }

    if (sidebarDepartment) {
        sidebarDepartment.textContent =
            user.department ||
            user.role ||
            "Department";
    }

    if (topUserDepartment) {
        topUserDepartment.textContent =
            user.department ||
            user.role ||
            "Department";
    }
}


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_URL}/api/dashboard/summary`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );


        const result = await response.json();

        console.log(
            "Dashboard response:",
            result
        );


        // ==========================================
        // CHECK TOKEN
        // ==========================================

        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href = "login.html";

            return;
        }


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Failed to load dashboard"
            );
        }


        const data = result.data;


        // ==========================================
        // DASHBOARD STATISTICS
        // ==========================================

        const totalRequests =
            document.getElementById("totalRequests");

        const pendingRequests =
            document.getElementById("pendingRequests");

        const approvedRequests =
            document.getElementById("approvedRequests");

        const rejectedRequests =
            document.getElementById("rejectedRequests");


        if (totalRequests) {

            totalRequests.textContent =
                data.totalRequests ?? 0;
        }


        if (pendingRequests) {

            pendingRequests.textContent =
                data.pendingApproval ?? 0;
        }


        if (approvedRequests) {

            approvedRequests.textContent =
                data.approved ?? 0;
        }


        if (rejectedRequests) {

            rejectedRequests.textContent =
                data.requiresAction ?? 0;
        }


        // ==========================================
        // LOAD RECENT REQUESTS
        // ==========================================

        await loadRecentRequests();


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        const message =
            document.getElementById(
                "dashboardMessage"
            );


        if (message) {

            message.className =
                "message error";

            message.textContent =
                error.message;
        }
    }
}


// ==========================================
// LOAD RECENT PURCHASE REQUESTS
// ==========================================

async function loadRecentRequests() {

    try {

        const response = await fetch(
            `${API_URL}/api/purchase-requests`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );


        const result =
            await response.json();


        console.log(
            "Purchase requests:",
            result
        );


        // ==========================================
        // CHECK TOKEN
        // ==========================================

        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href =
                "login.html";

            return;
        }


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Failed to load purchase requests"
            );
        }


        const requests =
            result.data || [];


        const tableBody =
            document.getElementById(
                "requestsTableBody"
            );


        if (!tableBody) {
            return;
        }


        // ==========================================
        // NO REQUESTS
        // ==========================================

        if (requests.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No purchase requests found.
                    </td>
                </tr>
            `;

            return;
        }


        // ==========================================
        // SHOW LATEST 5 REQUESTS
        // ==========================================

        const recentRequests =
            requests.slice(0, 5);


        tableBody.innerHTML =
            recentRequests
                .map(request => {

                    const status =
                        request.status ||
                        "Pending";


                    let statusClass =
                        "pending";


                    if (status === "Approved") {

                        statusClass =
                            "approved";
                    }


                    else if (status === "Rejected") {

                        statusClass =
                            "rejected";
                    }


                    else if (
                        status === "In Procurement"
                    ) {

                        statusClass =
                            "procurement";
                    }


                    else if (
                        status === "Completed"
                    ) {

                        statusClass =
                            "completed";
                    }


                    const cost =
                        Number(
                            request.estimatedCost || 0
                        ).toLocaleString(
                            "en-GH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeDashboardHtml(request.requestNumber || "-")}
                            </td>

                            <td>
                                ${escapeDashboardHtml(request.itemDescription || "-")}
                            </td>

                            <td>
                                ${escapeDashboardHtml(request.department || "-")}
                            </td>

                            <td>
                                GHS ${cost}
                            </td>

                            <td>
                                <span class="status-badge ${statusClass}">
                                    ${escapeDashboardHtml(status)}
                                </span>
                            </td>

                        </tr>
                    `;

                })
                .join("");


    } catch (error) {

        console.error(
            "Recent requests error:",
            error
        );


        const tableBody =
            document.getElementById(
                "requestsTableBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load purchase requests.
                    </td>
                </tr>
            `;
        }
    }
}

function escapeDashboardHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            localStorage.removeItem("token");

            localStorage.removeItem("user");

            window.location.href =
                "login.html";
        }
    );
}


// ==========================================
// START DASHBOARD
// ==========================================

loadDashboard();