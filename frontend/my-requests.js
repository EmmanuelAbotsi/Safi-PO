const API_URL = "http://localhost:5001";

const tableBody = document.getElementById("requestsTableBody");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

const totalRequests = document.getElementById("totalRequests");
const pendingRequests = document.getElementById("pendingRequests");
const actionRequests = document.getElementById("actionRequests");

// =====================================================
// CHECK LOGIN
// =====================================================

const token = localStorage.getItem("token");
const userData = localStorage.getItem("user");

if (!token || !userData) {
    window.location.href = "login.html";
}

// =====================================================
// LOGOUT
// =====================================================

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");

    window.location.href = "login.html";
}

// Attach logout to the sidebar logout button
const logoutButton = document.querySelector(".logout");

if (logoutButton) {
    logoutButton.style.cursor = "pointer";

    logoutButton.addEventListener("click", logout);
}

// =====================================================
// LOAD MY REQUESTS
// =====================================================

async function loadRequests() {

    loadingMessage.style.display = "block";
    errorMessage.style.display = "none";

    tableBody.innerHTML = "";

    try {

        const response = await fetch(
            `${API_URL}/api/purchase-requests/my`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const contentType =
            response.headers.get("content-type") || "";

        let result;

        if (contentType.includes("application/json")) {

            result = await response.json();

        } else {

            const text = await response.text();

            throw new Error(
                text ||
                `Server returned HTTP ${response.status}`
            );
        }

        // =================================================
        // AUTHENTICATION ERROR
        // =================================================

        if (response.status === 401) {

            logout();

            return;
        }

        // =================================================
        // REQUEST FAILED
        // =================================================

        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Unable to load purchase requests."
            );
        }

        const requests = result.data || [];

        // =================================================
        // STATISTICS
        // =================================================

        totalRequests.textContent =
            requests.length;

        const pending =
            requests.filter(
                request =>
                    !request.status ||
                    request.status.toLowerCase() === "pending"
            );

        const action =
            requests.filter(
                request =>
                    request.status &&
                    request.status.toLowerCase() === "requires action"
            );

        pendingRequests.textContent =
            pending.length;

        actionRequests.textContent =
            action.length;

        // =================================================
        // NO REQUESTS
        // =================================================

        if (requests.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No purchase requests found.
                    </td>
                </tr>
            `;

            return;
        }

        // =================================================
        // DISPLAY REQUESTS
        // =================================================

        requests.forEach(request => {

            const row =
                document.createElement("tr");

            const status =
                request.status || "Pending";

            const normalizedStatus =
                status.toLowerCase();

            // =================================================
            // STATUS COLOUR
            // =================================================

            let statusClass = "pending";

            if (
                normalizedStatus === "approved"
            ) {
                statusClass = "approved";
            }

            if (
                normalizedStatus === "rejected"
            ) {
                statusClass = "rejected";
            }

            if (
                normalizedStatus === "requires action"
            ) {
                statusClass = "action";
            }

            // Approved workflow statuses stay GREEN
            if (
                normalizedStatus === "in procurement" ||
                normalizedStatus === "completed"
            ) {
                statusClass = "approved";
            }

            // =================================================
            // DATE
            // =================================================

            const date = request.createdAt
                ? new Date(
                    request.createdAt
                ).toLocaleDateString(
                    "en-GH",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                )
                : "—";

            // =================================================
            // TABLE ROW
            // =================================================

            row.innerHTML = `

                <td>
                    <strong class="request-number">
                        ${escapeMyRequestsHtml(request.requestNumber || "—")}
                    </strong>
                </td>

                <td>
                    ${escapeMyRequestsHtml(request.itemDescription || "—")}
                </td>

                <td>
                    ${escapeMyRequestsHtml(request.department || "—")}
                </td>

                <td>
                    ${escapeMyRequestsHtml(request.quantity || 0)}
                </td>

                <td>
                    GHS ${Number(
                        request.estimatedCost || 0
                    ).toLocaleString(
                        "en-GH",
                        {
                            minimumFractionDigits: 2
                        }
                    )}
                </td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeMyRequestsHtml(status)}
                    </span>
                </td>

                <td>
                    ${date}
                </td>

            `;

            tableBody.appendChild(row);

        });

    } catch (error) {

        console.error(
            "Error loading my requests:",
            error
        );

        errorMessage.textContent =
            `Unable to load requests: ${error.message}`;

        errorMessage.style.display =
            "block";

    } finally {

        loadingMessage.style.display =
            "none";
    }
}

function escapeMyRequestsHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =====================================================
// LOAD REQUESTS WHEN PAGE OPENS
// =====================================================

loadRequests();