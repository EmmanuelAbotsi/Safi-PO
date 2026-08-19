const API_URL = "http://localhost:5001"; // Update this to your backend API URL
 
let allRequests = [];

// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    checkManagerAccess();
});

// =====================================================
// CHECK MANAGER ACCESS
// =====================================================

function checkManagerAccess() {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    // No login information
    if (!token || !userData) {
        window.location.href = "index.html";
        return;
    }

    let user;

    try {
        user = JSON.parse(userData);
    } catch (error) {
        console.error("User data error:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "index.html";
        return;
    }

    // =================================================
    // ONLY MANAGERS CAN ACCESS APPROVAL PAGE
    // =================================================

    const role =
        String(user.role || "")
            .toLowerCase();

    if (role !== "manager") {
        alert("Manager access required.");
        window.location.href = "index.html";
        return;
    }

    displayManager(user);
    setupEvents();
    loadRequests();
}

// =====================================================
// DISPLAY MANAGER
// =====================================================

function displayManager(user) {
    const name = "Safi PO";
    const department = user.department || "Management";
    const initials = getInitials(name);

    const sidebarName =
        document.getElementById("sidebarName");

    const sidebarDepartment =
        document.getElementById("sidebarDepartment");

    const sidebarAvatar =
        document.getElementById("sidebarAvatar");

    const topName =
        document.getElementById("topName");

    const topDepartment =
        document.getElementById("topDepartment");

    const topAvatar =
        document.getElementById("topAvatar");

    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (sidebarDepartment) {
        sidebarDepartment.textContent = department;
    }

    if (sidebarAvatar) {
        sidebarAvatar.textContent = initials;
    }

    if (topName) {
        topName.textContent = name;
    }

    if (topDepartment) {
        topDepartment.textContent = department;
    }

    if (topAvatar) {
        topAvatar.textContent = initials;
    }
}

// =====================================================
// EVENTS
// =====================================================

function setupEvents() {
    const searchInput =
        document.getElementById("searchInput");

    const statusFilter =
        document.getElementById("statusFilter");

    const refreshButton =
        document.getElementById("refreshButton");

    const logoutButton =
        document.getElementById("logoutButton");

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            filterRequests
        );
    }

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            filterRequests
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadRequests
        );
    }

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }

    const modal =
        document.getElementById("requestModal");

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeRequestModal();
            }
        });
    }
}

// =====================================================
// LOAD REQUESTS
// =====================================================

async function loadRequests() {
    const tableBody =
        document.getElementById(
            "requestsTableBody"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                Loading purchase requests...
            </td>
        </tr>
    `;

    const token =
        localStorage.getItem("token");

    if (!token) {
        logout();
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/purchase-requests`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            alert(
                "You do not have permission to access purchase approvals."
            );

            window.location.href =
                "index.html";

            return;
        }

        let result;

        try {
            result = await response.json();
        } catch (jsonError) {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to load purchase requests."
            );
        }

        allRequests =
            Array.isArray(result.data)
                ? result.data
                : [];

        updateStatistics(
            allRequests
        );

        filterRequests();

    } catch (error) {
        console.error(
            "Load requests error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    <div class="empty-icon">
                        ⚠
                    </div>

                    <strong>
                        Unable to load requests
                    </strong>

                    <span>
                        ${escapeHtml(
                            error.message
                        )}
                    </span>

                    <button
                        class="action-btn view-btn"
                        onclick="loadRequests()"
                        style="margin-top: 12px;"
                    >
                        Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}

// =====================================================
// UPDATE STATISTICS
// =====================================================

function updateStatistics(requests) {
    const pending =
        requests.filter(
            request =>
                request.status === "Pending"
        ).length;

    const approved =
        requests.filter(
            request =>
                request.status === "Approved"
        ).length;

    const rejected =
        requests.filter(
            request =>
                request.status === "Rejected"
        ).length;

    const pendingElement =
        document.getElementById(
            "pendingRequests"
        );

    const approvedElement =
        document.getElementById(
            "approvedRequests"
        );

    const rejectedElement =
        document.getElementById(
            "rejectedRequests"
        );

    const pendingBadge =
        document.getElementById(
            "pendingBadge"
        );

    if (pendingElement) {
        pendingElement.textContent =
            pending;
    }

    if (approvedElement) {
        approvedElement.textContent =
            approved;
    }

    if (rejectedElement) {
        rejectedElement.textContent =
            rejected;
    }

    if (pendingBadge) {
        pendingBadge.textContent =
            pending;
    }
}

// =====================================================
// FILTER REQUESTS
// =====================================================

function filterRequests() {
    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const status =
        statusFilter
            ? statusFilter.value
            : "Pending";

    const filtered =
        allRequests.filter(
            request => {

                const requestNumber =
                    String(
                        request.requestNumber ||
                        ""
                    ).toLowerCase();

                const requester =
                    String(
                        request.requesterName ||
                        ""
                    ).toLowerCase();

                const department =
                    String(
                        request.department ||
                        ""
                    ).toLowerCase();

                const item =
                    String(
                        request.itemDescription ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    requestNumber.includes(
                        search
                    ) ||
                    requester.includes(
                        search
                    ) ||
                    department.includes(
                        search
                    ) ||
                    item.includes(
                        search
                    );

                const matchesStatus =
                    status === "All" ||
                    request.status === status;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    renderRequests(filtered);
}

// =====================================================
// RENDER REQUESTS
// =====================================================

function renderRequests(requests) {
    const tableBody =
        document.getElementById(
            "requestsTableBody"
        );

    if (!tableBody) {
        return;
    }

    if (!requests.length) {
        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    <div class="empty-icon">
                        ✓
                    </div>

                    <strong>
                        No requests found
                    </strong>

                    <span>
                        There are no requests matching your current filter.
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        requests.map(
            request => {

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

                const date =
                    request.createdAt
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

                return `
                    <tr>

                        <td>
                            <button
                                class="request-id"
                                onclick="viewRequest('${request._id}')"
                            >
                                ${escapeHtml(
                                    request.requestNumber ||
                                    "REQUEST"
                                )}
                            </button>
                        </td>

                        <td>
                            <div class="requester">

                                <div class="requester-avatar">
                                    ${getInitials(
                                        request.requesterName
                                    )}
                                </div>

                                <div>

                                    <div class="requester-name">
                                        ${escapeHtml(
                                            request.requesterName ||
                                            "Unknown"
                                        )}
                                    </div>

                                    <span class="requester-department">
                                        ${escapeHtml(
                                            request.department ||
                                            "—"
                                        )}
                                    </span>

                                </div>

                            </div>
                        </td>

                        <td>

                            <div class="item-name">
                                ${escapeHtml(
                                    request.itemDescription ||
                                    "—"
                                )}
                            </div>

                            <span class="item-quantity">
                                Quantity:
                                ${escapeHtml(
                                    request.quantity ||
                                    "—"
                                )}
                            </span>

                        </td>

                        <td>
                            <span class="amount">
                                GHS ${cost}
                            </span>
                        </td>

                        <td>
                            ${date}
                        </td>

                        <td>
                            <span
                                class="status ${getStatusClass(
                                    request.status
                                )}"
                            >
                                ${escapeHtml(
                                    request.status ||
                                    "Unknown"
                                )}
                            </span>
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="action-btn view-btn"
                                    onclick="viewRequest('${request._id}')"
                                >
                                    View
                                </button>

                                ${
                                    request.status === "Pending"
                                        ? `
                                            <button
                                                class="action-btn approve-btn"
                                                onclick="approveRequest('${request._id}')"
                                                title="Approve"
                                            >
                                                ✓
                                            </button>

                                            <button
                                                class="action-btn reject-btn"
                                                onclick="rejectRequest('${request._id}')"
                                                title="Reject"
                                            >
                                                ×
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </td>

                    </tr>
                `;
            }
        ).join("");
}

// =====================================================
// VIEW REQUEST
// =====================================================

function viewRequest(id) {
    const request =
        allRequests.find(
            item => item._id === id
        );

    if (!request) {
        return;
    }

    const modal =
        document.getElementById(
            "requestModal"
        );

    const content =
        document.getElementById(
            "modalContent"
        );

    if (!modal || !content) {
        return;
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

    const date =
        request.createdAt
            ? new Date(
                request.createdAt
            ).toLocaleString(
                "en-GH"
            )
            : "—";

    content.innerHTML = `

        <div class="modal-top">

            <div>

                <small>
                    PURCHASE REQUEST
                </small>

                <h2>
                    ${escapeHtml(
                        request.requestNumber ||
                        "Request"
                    )}
                </h2>

            </div>

            <button
                class="close-modal"
                onclick="closeRequestModal()"
            >
                ×
            </button>

        </div>

        <div class="modal-body">

            <div class="detail-grid">

                <div class="detail-item">

                    <span>
                        Requester
                    </span>

                    <strong>
                        ${escapeHtml(
                            request.requesterName ||
                            "—"
                        )}
                    </strong>

                </div>

                <div class="detail-item">

                    <span>
                        Department
                    </span>

                    <strong>
                        ${escapeHtml(
                            request.department ||
                            "—"
                        )}
                    </strong>

                </div>

                <div class="detail-item">

                    <span>
                        Item / Service
                    </span>

                    <strong>
                        ${escapeHtml(
                            request.itemDescription ||
                            "—"
                        )}
                    </strong>

                </div>

                <div class="detail-item">

                    <span>
                        Quantity
                    </span>

                    <strong>
                        ${escapeHtml(
                            request.quantity ||
                            "—"
                        )}
                    </strong>

                </div>

                <div class="detail-item">

                    <span>
                        Estimated Cost
                    </span>

                    <strong>
                        GHS ${cost}
                    </strong>

                </div>

                <div class="detail-item">

                    <span>
                        Status
                    </span>

                    <strong>
                        ${escapeHtml(
                            request.status ||
                            "—"
                        )}
                    </strong>

                </div>

                <div class="detail-item full">

                    <span>
                        Date Submitted
                    </span>

                    <strong>
                        ${escapeHtml(date)}
                    </strong>

                </div>

            </div>

            <div class="justification">

                <span>
                    BUSINESS JUSTIFICATION
                </span>

                <p>
                    ${escapeHtml(
                        request.justification ||
                        "No justification provided."
                    )}
                </p>

            </div>

        </div>

        ${
            request.status === "Pending"
                ? `
                    <div class="modal-actions">

                        <button
                            class="modal-action modal-reject"
                            onclick="rejectFromModal('${request._id}')"
                        >
                            Reject
                        </button>

                        <button
                            class="modal-action modal-approve"
                            onclick="approveFromModal('${request._id}')"
                        >
                            ✓ Approve Request
                        </button>

                    </div>
                `
                : ""
        }

    `;

    modal.classList.add("show");
}

// =====================================================
// APPROVE FROM MODAL
// =====================================================

async function approveFromModal(id) {
    closeRequestModal();

    await approveRequest(id);
}

// =====================================================
// REJECT FROM MODAL
// =====================================================

async function rejectFromModal(id) {
    closeRequestModal();

    await rejectRequest(id);
}

// =====================================================
// APPROVE REQUEST
// =====================================================

async function approveRequest(id) {
    const request =
        allRequests.find(
            item => item._id === id
        );

    if (!request) {
        return;
    }

    const confirmed =
        confirm(
            `Approve purchase request ${request.requestNumber}?`
        );

    if (!confirmed) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        logout();
        return;
    }

    try {
        const response =
            await fetch(
                `${API_URL}/api/purchase-requests/${id}/approve`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage(
                "error",
                "You do not have permission to approve this request."
            );

            return;
        }

        let result;

        try {
            result =
                await response.json();
        } catch (jsonError) {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to approve request."
            );
        }

        showMessage(
            "success",
            "✓ Purchase request approved successfully."
        );

        await loadRequests();

    } catch (error) {
        console.error(
            "Approval error:",
            error
        );

        showMessage(
            "error",
            error.message
        );
    }
}

// =====================================================
// REJECT REQUEST
// =====================================================

async function rejectRequest(id) {
    const request =
        allRequests.find(
            item => item._id === id
        );

    if (!request) {
        return;
    }

    const confirmed =
        confirm(
            `Reject purchase request ${request.requestNumber}?`
        );

    if (!confirmed) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        logout();
        return;
    }

    try {
        const response =
            await fetch(
                `${API_URL}/api/purchase-requests/${id}/reject`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

        if (response.status === 401) {
            logout();
            return;
        }

        if (response.status === 403) {
            showMessage(
                "error",
                "You do not have permission to reject this request."
            );

            return;
        }

        let result;

        try {
            result =
                await response.json();
        } catch (jsonError) {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to reject request."
            );
        }

        showMessage(
            "success",
            "Purchase request rejected."
        );

        await loadRequests();

    } catch (error) {
        console.error(
            "Rejection error:",
            error
        );

        showMessage(
            "error",
            error.message
        );
    }
}

// =====================================================
// CLOSE MODAL
// =====================================================

function closeRequestModal() {
    const modal =
        document.getElementById(
            "requestModal"
        );

    if (modal) {
        modal.classList.remove(
            "show"
        );
    }
}

// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {
    switch (status) {

        case "Pending":
            return "pending";

        case "Approved":
            return "approved";

        case "Rejected":
            return "rejected";

        case "In Procurement":
            return "procurement";

        case "Completed":
            return "completed";

        default:
            return "";
    }
}

// =====================================================
// GET INITIALS
// =====================================================

function getInitials(name) {
    if (!name) {
        return "U";
    }

    return String(name)
        .trim()
        .split(/\s+/)
        .map(
            part =>
                part.charAt(0)
        )
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(type, text) {
    const message =
        document.getElementById(
            "approvalMessage"
        );

    if (!message) {
        return;
    }

    message.className =
        `message ${type}`;

    message.textContent =
        text;

    setTimeout(
        () => {
            message.className =
                "message";

            message.textContent =
                "";
        },
        5000
    );
}

// =====================================================
// LOGOUT
// =====================================================

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href =
        "index.html";
}