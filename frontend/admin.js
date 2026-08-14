const API_URL = "http://localhost:5001";

let allUsers = [];
let allRequests = [];


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    checkAdminAccess();

});


// =====================================================
// CHECK ADMIN ACCESS
// =====================================================

function checkAdminAccess() {

    const token =
        localStorage.getItem("token");

    const userData =
        localStorage.getItem("user");


    if (!token || !userData) {

        window.location.href =
            "login.html";

        return;

    }


    let user;

    try {

        user =
            JSON.parse(userData);

    } catch (error) {

        console.error(
            "User data error:",
            error
        );

        logout();

        return;

    }


    if (user.role !== "Admin") {

        alert(
            "Administrator access required."
        );


        if (user.role === "Manager") {

            window.location.href =
                "approvals.html";

        } else if (
            user.role === "Employee"
        ) {

            window.location.href =
                "index.html";

        } else {

            logout();

        }

        return;

    }


    displayAdmin(user);

    setupEvents();

    loadAdminSummary();

    loadUsers();

    loadPurchaseRequests();

}


// =====================================================
// DISPLAY ADMIN
// =====================================================

function displayAdmin(user) {

    const name =
        user.name || "Admin";

    const department =
        user.department ||
        "Administrator";

    const initials =
        getInitials(name);


    setText(
        "sidebarUserName",
        name
    );

    setText(
        "sidebarDepartment",
        department
    );

    setText(
        "sidebarAvatar",
        initials
    );

    setText(
        "topUserName",
        name
    );

    setText(
        "topUserDepartment",
        department
    );

    setText(
        "topAvatar",
        initials
    );

}


// =====================================================
// EVENTS
// =====================================================

function setupEvents() {

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }


    const createUserForm =
        document.getElementById(
            "createUserForm"
        );


    if (createUserForm) {

        createUserForm.addEventListener(
            "submit",
            createUser
        );

    }


    const refreshRequests =
        document.getElementById(
            "refreshRequests"
        );


    if (refreshRequests) {

        refreshRequests.addEventListener(
            "click",
            loadPurchaseRequests
        );

    }


    const openCreateUser =
        document.getElementById(
            "openCreateUser"
        );


    if (openCreateUser) {

        openCreateUser.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "create-user"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }
        );

    }


    setupNavigation(
        "requestsNav",
        "requests"
    );

    setupNavigation(
        "usersNav",
        "users"
    );

    setupNavigation(
        "createUserNav",
        "create-user"
    );


    const settingsNav =
        document.getElementById(
            "settingsNav"
        );


    if (settingsNav) {

        settingsNav.addEventListener(
            "click",
            event => {

                event.preventDefault();

                alert(
                    "System settings will be available here."
                );

            }
        );

    }


    createEditUserModal();

}


// =====================================================
// NAVIGATION
// =====================================================

function setupNavigation(
    buttonId,
    targetId
) {

    const button =
        document.getElementById(
            buttonId
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            document
                .getElementById(
                    targetId
                )
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

}


// =====================================================
// AUTH HEADERS
// =====================================================

function getAuthHeaders() {

    const token =
        localStorage.getItem(
            "token"
        );


    return {

        "Authorization":
            `Bearer ${token}`,

        "Content-Type":
            "application/json"

    };

}


// =====================================================
// LOAD ADMIN SUMMARY
// =====================================================

async function loadAdminSummary() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/summary`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        if (
            response.status === 403
        ) {

            alert(
                "Administrator access required."
            );

            window.location.href =
                "index.html";

            return;

        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load admin summary."
            );

        }


        const data =
            result.data || {};


        setText(
            "totalUsers",
            data.totalUsers ?? 0
        );

        setText(
            "activeUsers",
            data.activeUsers ?? 0
        );

        setText(
            "totalRequests",
            data.totalRequests ?? 0
        );

        setText(
            "pendingRequests",
            data.pendingRequests ?? 0
        );

        setText(
            "approvedRequests",
            data.approvedRequests ?? 0
        );

        setText(
            "rejectedRequests",
            data.rejectedRequests ?? 0
        );

        setText(
            "procurementRequests",
            data.procurementRequests ?? 0
        );

        setText(
            "completedRequests",
            data.completedRequests ?? 0
        );

    } catch (error) {

        console.error(
            "Admin summary error:",
            error
        );

        showAdminMessage(
            "error",
            error.message
        );

    }

}


// =====================================================
// LOAD USERS
// =====================================================

async function loadUsers() {

    const tableBody =
        document.getElementById(
            "usersTableBody"
        );


    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                Loading users...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/users`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        if (
            response.status === 403
        ) {

            alert(
                "Administrator access required."
            );

            window.location.href =
                "index.html";

            return;

        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load users."
            );

        }


        allUsers =
            Array.isArray(result.data)
                ? result.data
                : [];


        renderUsers();

    } catch (error) {

        console.error(
            "Load users error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">

                    <div class="empty-icon">
                        ⚠
                    </div>

                    <strong>
                        Unable to load users
                    </strong>

                    <span>
                        ${escapeHtml(
                            error.message
                        )}
                    </span>

                </td>
            </tr>
        `;

    }

}


// =====================================================
// RENDER USERS
// =====================================================

function renderUsers() {

    const tableBody =
        document.getElementById(
            "usersTableBody"
        );


    if (!tableBody) {

        return;

    }


    if (!allUsers.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    <strong>
                        No users found
                    </strong>
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        allUsers.map(
            user => {

                const statusClass =
                    user.active
                        ? "approved"
                        : "rejected";


                const statusText =
                    user.active
                        ? "Active"
                        : "Inactive";


                const actionText =
                    user.active
                        ? "Deactivate"
                        : "Activate";


                return `
                    <tr>

                        <td>

                            <div class="requester">

                                <div
                                    class="requester-avatar"
                                >
                                    ${getInitials(
                                        user.name
                                    )}
                                </div>

                                <div>

                                    <div
                                        class="requester-name"
                                    >
                                        ${escapeHtml(
                                            user.name ||
                                            "Unknown"
                                        )}
                                    </div>

                                </div>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                user.email ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                user.department ||
                                "—"
                            )}
                        </td>


                        <td>

                            <span
                                class="status ${getRoleClass(
                                    user.role
                                )}"
                            >
                                ${escapeHtml(
                                    user.role ||
                                    "Employee"
                                )}
                            </span>

                        </td>


                        <td>

                            <span
                                class="status ${statusClass}"
                            >
                                ${statusText}
                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="action-btn view-btn"
                                onclick="openEditUser('${user._id}')"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="action-btn ${
                                    user.active
                                        ? "reject-btn"
                                        : "approve-btn"
                                }"
                                onclick="toggleUserStatus(
                                    '${user._id}',
                                    ${!user.active}
                                )"
                                style="margin-left:6px;"
                            >
                                ${actionText}
                            </button>

                        </td>

                    </tr>
                `;

            }
        ).join("");

}


// =====================================================
// ROLE CLASS
// =====================================================

function getRoleClass(role) {

    if (role === "Admin") {

        return "approved";

    }


    if (role === "Manager") {

        return "pending";

    }


    return "procurement";

}


// =====================================================
// CREATE USER
// =====================================================

async function createUser(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "userName"
        ).value.trim();


    const email =
        document.getElementById(
            "userEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "userPassword"
        ).value;


    const role =
        document.getElementById(
            "userRole"
        ).value;


    const department =
        document.getElementById(
            "userDepartment"
        ).value.trim();


    const button =
        document.getElementById(
            "createUserBtn"
        );


    if (
        !name ||
        !email ||
        !password
    ) {

        showUserMessage(
            "error",
            "Please complete all required fields."
        );

        return;

    }


    if (button) {

        button.disabled = true;

        button.innerHTML =
            "<span>Creating...</span><b>→</b>";

    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/users`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body:
                        JSON.stringify({
                            name,
                            email,
                            password,
                            role,
                            department
                        })
                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to create user."
            );

        }


        showUserMessage(
            "success",
            "✓ User created successfully."
        );


        document
            .getElementById(
                "createUserForm"
            )
            .reset();


        await loadUsers();

        await loadAdminSummary();

    } catch (error) {

        console.error(
            "Create user error:",
            error
        );

        showUserMessage(
            "error",
            error.message
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                "<span>Create User</span><b>→</b>";

        }

    }

}


// =====================================================
// CREATE EDIT USER MODAL
// =====================================================

function createEditUserModal() {

    if (
        document.getElementById(
            "editUserModal"
        )
    ) {

        return;

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "editUserModal";

    modal.className =
        "modal";


    modal.innerHTML = `

        <div
            class="modal-content"
            style="
                max-width:600px;
                padding:28px;
            "
        >

            <div class="modal-top">

                <div>

                    <small>
                        USER MANAGEMENT
                    </small>

                    <h2>
                        Edit User
                    </h2>

                </div>

                <button
                    type="button"
                    class="close-modal"
                    onclick="closeEditUser()"
                >
                    ×
                </button>

            </div>


            <div class="modal-body">

                <form
                    id="editUserForm"
                >

                    <input
                        type="hidden"
                        id="editUserId"
                    >


                    <div class="form-grid">

                        <div class="form-group">

                            <label for="editUserName">
                                Full Name
                            </label>

                            <input
                                type="text"
                                id="editUserName"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="editUserEmail">
                                Email Address
                            </label>

                            <input
                                type="email"
                                id="editUserEmail"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="editUserDepartment">
                                Department
                            </label>

                            <input
                                type="text"
                                id="editUserDepartment"
                            >

                        </div>


                        <div class="form-group">

                            <label for="editUserRole">
                                User Role
                            </label>

                            <select
                                id="editUserRole"
                                required
                            >

                                <option value="Employee">
                                    Employee
                                </option>

                                <option value="Manager">
                                    Manager
                                </option>

                                <option value="Admin">
                                    Admin
                                </option>

                            </select>

                        </div>

                    </div>


                    <div
                        id="editUserMessage"
                        class="message"
                    >
                    </div>


                    <div
                        class="form-actions"
                        style="margin-top:20px;"
                    >

                        <button
                            type="button"
                            class="dashboard-link"
                            onclick="closeEditUser()"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            class="submit-btn"
                            id="saveEditUserBtn"
                        >

                            <span>
                                Save Changes
                            </span>

                            <b>
                                ✓
                            </b>

                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const form =
        document.getElementById(
            "editUserForm"
        );


    form.addEventListener(
        "submit",
        saveEditedUser
    );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeEditUser();

            }

        }
    );

}


// =====================================================
// OPEN EDIT USER
// =====================================================

function openEditUser(id) {

    const user =
        allUsers.find(
            item =>
                item._id === id
        );


    if (!user) {

        return;

    }


    document.getElementById(
        "editUserId"
    ).value =
        user._id;


    document.getElementById(
        "editUserName"
    ).value =
        user.name || "";


    document.getElementById(
        "editUserEmail"
    ).value =
        user.email || "";


    document.getElementById(
        "editUserDepartment"
    ).value =
        user.department || "";


    document.getElementById(
        "editUserRole"
    ).value =
        user.role || "Employee";


    document.getElementById(
        "editUserMessage"
    ).textContent =
        "";


    document.getElementById(
        "editUserModal"
    ).classList.add(
        "show"
    );

}


// =====================================================
// CLOSE EDIT USER
// =====================================================

function closeEditUser() {

    const modal =
        document.getElementById(
            "editUserModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// =====================================================
// SAVE EDITED USER
// =====================================================

async function saveEditedUser(event) {

    event.preventDefault();


    const id =
        document.getElementById(
            "editUserId"
        ).value;


    const name =
        document.getElementById(
            "editUserName"
        ).value.trim();


    const email =
        document.getElementById(
            "editUserEmail"
        ).value.trim();


    const department =
        document.getElementById(
            "editUserDepartment"
        ).value.trim();


    const role =
        document.getElementById(
            "editUserRole"
        ).value;


    const button =
        document.getElementById(
            "saveEditUserBtn"
        );


    if (
        !id ||
        !name ||
        !email
    ) {

        showEditUserMessage(
            "error",
            "Name and email are required."
        );

        return;

    }


    if (button) {

        button.disabled = true;

        button.innerHTML =
            "<span>Saving...</span><b>...</b>";

    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/users/${id}`,
                {
                    method: "PATCH",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({

                            name,
                            email,
                            department,
                            role

                        })

                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to update user."
            );

        }


        showEditUserMessage(
            "success",
            "✓ User updated successfully."
        );


        await loadUsers();

        await loadAdminSummary();


        setTimeout(
            () => {

                closeEditUser();

            },
            800
        );

    } catch (error) {

        console.error(
            "Edit user error:",
            error
        );


        showEditUserMessage(
            "error",
            error.message
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                "<span>Save Changes</span><b>✓</b>";

        }

    }

}


// =====================================================
// EDIT USER MESSAGE
// =====================================================

function showEditUserMessage(
    type,
    text
) {

    const message =
        document.getElementById(
            "editUserMessage"
        );


    if (!message) {

        return;

    }


    message.className =
        `message ${type}`;


    message.textContent =
        text;

}


// =====================================================
// ACTIVATE / DEACTIVATE USER
// =====================================================

async function toggleUserStatus(
    id,
    active
) {

    const user =
        allUsers.find(
            item =>
                item._id === id
        );


    if (!user) {

        return;

    }


    const action =
        active
            ? "activate"
            : "deactivate";


    const confirmed =
        confirm(
            `${action.charAt(0).toUpperCase() +
            action.slice(1)} ${user.name}'s account?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/users/${id}/status`,
                {
                    method: "PATCH",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({
                            active
                        })
                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to update user status."
            );

        }


        showAdminMessage(
            "success",
            result.message ||
            "User status updated successfully."
        );


        await loadUsers();

        await loadAdminSummary();

    } catch (error) {

        console.error(
            "User status error:",
            error
        );

        showAdminMessage(
            "error",
            error.message
        );

    }

}


// =====================================================
// LOAD PURCHASE REQUESTS
// =====================================================

async function loadPurchaseRequests() {

    const tableBody =
        document.getElementById(
            "requestsTableBody"
        );


    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = `
        <tr>
            <td colspan="7">
                Loading purchase requests...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/purchase-requests`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (
            response.status === 401
        ) {

            logout();

            return;

        }


        if (
            response.status === 403
        ) {

            alert(
                "Administrator access required."
            );

            window.location.href =
                "index.html";

            return;

        }


        const result =
            await response.json();


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


        renderPurchaseRequests();

    } catch (error) {

        console.error(
            "Load purchase requests error:",
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
                        type="button"
                        class="action-btn view-btn"
                        onclick="loadPurchaseRequests()"
                        style="margin-top:12px;"
                    >
                        Try Again
                    </button>

                </td>
            </tr>
        `;

    }

}


// =====================================================
// RENDER PURCHASE REQUESTS
// =====================================================

function renderPurchaseRequests() {

    const tableBody =
        document.getElementById(
            "requestsTableBody"
        );


    if (!tableBody) {

        return;

    }


    if (!allRequests.length) {

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
                        No purchase requests found
                    </strong>

                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        allRequests.map(
            request => {

                const requester =
                    request.requesterId &&
                    typeof request.requesterId ===
                        "object"
                        ? request.requesterId
                        : null;


                const requesterName =
                    requester?.name ||
                    request.requesterName ||
                    "Unknown";


                const department =
                    requester?.department ||
                    request.department ||
                    "—";


                const cost =
                    Number(
                        request.estimatedCost ||
                        0
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

                            <button
                                type="button"
                                class="request-id"
                                onclick="viewRequest(
                                    '${request._id}'
                                )"
                            >

                                ${escapeHtml(
                                    request.requestNumber ||
                                    "REQUEST"
                                )}

                            </button>

                        </td>


                        <td>

                            <div class="requester">

                                <div
                                    class="requester-avatar"
                                >
                                    ${getInitials(
                                        requesterName
                                    )}
                                </div>

                                <div>

                                    <div
                                        class="requester-name"
                                    >
                                        ${escapeHtml(
                                            requesterName
                                        )}
                                    </div>

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
                            ${escapeHtml(
                                department
                            )}
                        </td>


                        <td>

                            <span class="amount">

                                GHS ${cost}

                            </span>

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

                            <button
                                type="button"
                                class="action-btn view-btn"
                                onclick="viewRequest(
                                    '${request._id}'
                                )"
                            >
                                View
                            </button>

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
            item =>
                item._id === id
        );


    if (!request) {

        return;

    }


    let modal =
        document.getElementById(
            "requestModal"
        );


    let content =
        document.getElementById(
            "modalContent"
        );


    if (!modal || !content) {

        return;

    }


    const requester =
        request.requesterId &&
        typeof request.requesterId ===
            "object"
            ? request.requesterId
            : null;


    const requesterName =
        requester?.name ||
        request.requesterName ||
        "Unknown";


    const department =
        requester?.department ||
        request.department ||
        "—";


    const cost =
        Number(
            request.estimatedCost ||
            0
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


    const approvedBy =
        request.approvedBy &&
        typeof request.approvedBy ===
            "object"
            ? request.approvedBy.name
            : "—";


    const rejectedBy =
        request.rejectedBy &&
        typeof request.rejectedBy ===
            "object"
            ? request.rejectedBy.name
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
                type="button"
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
                            requesterName
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Department
                    </span>

                    <strong>
                        ${escapeHtml(
                            department
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
                        ${escapeHtml(
                            date
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Approved By
                    </span>

                    <strong>
                        ${escapeHtml(
                            approvedBy
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Rejected By
                    </span>

                    <strong>
                        ${escapeHtml(
                            rejectedBy
                        )}
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
    `;


    modal.classList.add(
        "show"
    );

}


// =====================================================
// CLOSE REQUEST MODAL
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
// INITIALS
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
// SET TEXT
// =====================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

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
// USER MESSAGE
// =====================================================

function showUserMessage(
    type,
    text
) {

    const message =
        document.getElementById(
            "userMessage"
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
// ADMIN MESSAGE
// =====================================================

function showAdminMessage(
    type,
    text
) {

    const message =
        document.getElementById(
            "adminMessage"
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

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );


    window.location.href =
        "login.html";

}