const API_URL = "https://safi-po.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

let allPurchaseOrders = [];

// ==========================================
// LOAD PURCHASE ORDERS
// ==========================================
async function loadPurchaseOrders() {
    const tableBody = document.getElementById("poTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                Loading purchase orders...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `${API_URL}/api/purchase-orders`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to retrieve purchase orders."
            );
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(
                result.message ||
                "Failed to load purchase orders."
            );
        }

        allPurchaseOrders = result.data || [];

        updateStatistics(allPurchaseOrders);
        renderPurchaseOrders(allPurchaseOrders);

        hideMessage();

    } catch (error) {
        console.error(
            "Load purchase orders error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    Unable to load purchase orders.
                </td>
            </tr>
        `;

        showMessage(
            "error",
            `⚠ ${error.message}`
        );
    }
}


// ==========================================
// UPDATE STATISTICS
// ==========================================
function updateStatistics(orders) {
    const total = orders.length;

    const draft = orders.filter(
        order => order.status === "Draft"
    ).length;

    const issued = orders.filter(
        order => order.status === "Issued"
    ).length;

    const completed = orders.filter(
        order => order.status === "Completed"
    ).length;

    const totalElement =
        document.getElementById("totalPOs");

    const draftElement =
        document.getElementById("draftPOs");

    const issuedElement =
        document.getElementById("issuedPOs");

    const completedElement =
        document.getElementById("completedPOs");

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (draftElement) {
        draftElement.textContent = draft;
    }

    if (issuedElement) {
        issuedElement.textContent = issued;
    }

    if (completedElement) {
        completedElement.textContent = completed;
    }
}


// ==========================================
// RENDER PURCHASE ORDERS
// ==========================================
function renderPurchaseOrders(orders) {
    const tableBody =
        document.getElementById("poTableBody");

    if (!orders.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    No purchase orders found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = orders.map(order => {

        const formattedTotal = Number(
            order.totalAmount || 0
        ).toLocaleString("en-GH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const statusClass =
            getStatusClass(order.status);

        const requestNumber =
            order.purchaseRequest?.requestNumber ||
            "N/A";

        return `
            <tr>

                <!-- PO NUMBER -->
                <td>
                    <button
                        class="po-number"
                        onclick="viewPurchaseOrder('${order._id}')"
                    >
                        ${escapeHtml(
                            order.poNumber || "N/A"
                        )}
                    </button>
                </td>

                <!-- SUPPLIER -->
                <td>
                    <div class="supplier-cell">

                        <strong>
                            ${escapeHtml(
                                order.supplierName ||
                                "Not assigned"
                            )}
                        </strong>

                        <small>
                            Purchase Supplier
                        </small>

                    </div>
                </td>

                <!-- REQUEST -->
                <td>
                    <span class="request-reference">
                        ${escapeHtml(requestNumber)}
                    </span>
                </td>

                <!-- ITEM -->
                <td>
                    <div class="item-cell">

                        <strong>
                            ${escapeHtml(
                                order.itemDescription ||
                                "N/A"
                            )}
                        </strong>

                        <small>
                            Qty:
                            ${escapeHtml(
                                order.quantity ?? "-"
                            )}
                        </small>

                    </div>
                </td>

                <!-- TOTAL -->
                <td>
                    <strong>
                        GHS ${formattedTotal}
                    </strong>
                </td>

                <!-- STATUS -->
                <td>
                    <span
                        class="po-status ${statusClass}"
                    >
                        ${escapeHtml(
                            order.status || "Draft"
                        )}
                    </span>
                </td>

                <!-- ACTION -->
                <td>
                    ${getActionButtons(order)}
                </td>

            </tr>
        `;

    }).join("");
}


// ==========================================
// ACTION BUTTONS
// ==========================================
function getActionButtons(order) {

    const viewButton = `
        <button
            class="po-action po-view"
            onclick="viewPurchaseOrder('${order._id}')"
        >
            View
        </button>
    `;


    // Draft → Issue
    if (order.status === "Draft") {
        return `
            ${viewButton}

            <button
                class="po-action po-view"
                onclick="issuePurchaseOrder('${order._id}')"
            >
                Issue
            </button>
        `;
    }


    // Issued / Delivered → Complete / Cancel
    if (
        order.status === "Issued" ||
        order.status === "Delivered"
    ) {
        return `
            ${viewButton}

            <button
                class="po-action po-complete"
                onclick="completePurchaseOrder('${order._id}')"
            >
                ✓ Complete
            </button>

            <button
                class="po-action"
                style="
                    background:#edf3ee;
                    color:#496052;
                "
                onclick="cancelPurchaseOrder('${order._id}')"
            >
                Cancel
            </button>
        `;
    }


    // Completed
    if (order.status === "Completed") {
        return viewButton;
    }


    // Cancelled
    if (order.status === "Cancelled") {
        return viewButton;
    }


    return viewButton;
}


// ==========================================
// VIEW PURCHASE ORDER
// ==========================================
function viewPurchaseOrder(id) {

    const order =
        allPurchaseOrders.find(
            item => item._id === id
        );

    if (!order) {
        return;
    }


    const modal =
        document.getElementById("poModal");

    const title =
        document.getElementById("poModalTitle");

    const body =
        document.getElementById("poModalBody");


    const formattedTotal = Number(
        order.totalAmount || 0
    ).toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    const createdDate = order.createdAt
        ? new Date(
            order.createdAt
        ).toLocaleString("en-GH")
        : "N/A";


    const requestNumber =
        order.purchaseRequest?.requestNumber ||
        "N/A";


    const requesterName =
        order.purchaseRequest?.requesterName ||
        "N/A";


    const department =
        order.purchaseRequest?.department ||
        "N/A";


    title.textContent =
        order.poNumber ||
        "Purchase Order";


    body.innerHTML = `
        <div class="po-detail-grid">

            <div class="po-detail">
                <span>PO Number</span>

                <strong>
                    ${escapeHtml(
                        order.poNumber || "N/A"
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Status</span>

                <strong>
                    ${escapeHtml(
                        order.status || "Draft"
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Supplier</span>

                <strong>
                    ${escapeHtml(
                        order.supplierName ||
                        "Not assigned"
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Request Number</span>

                <strong>
                    ${escapeHtml(
                        requestNumber
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Requester</span>

                <strong>
                    ${escapeHtml(
                        requesterName
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Department</span>

                <strong>
                    ${escapeHtml(
                        department
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Item / Service</span>

                <strong>
                    ${escapeHtml(
                        order.itemDescription ||
                        "N/A"
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Quantity</span>

                <strong>
                    ${escapeHtml(
                        order.quantity ?? "N/A"
                    )}
                </strong>
            </div>


            <div class="po-detail">
                <span>Total Amount</span>

                <strong>
                    GHS ${formattedTotal}
                </strong>
            </div>


            <div class="po-detail">
                <span>Date Created</span>

                <strong>
                    ${escapeHtml(
                        createdDate
                    )}
                </strong>
            </div>

        </div>
    `;


    modal.classList.add("show");
}


// ==========================================
// ISSUE PURCHASE ORDER
// ==========================================
async function issuePurchaseOrder(id) {

    const confirmed = confirm(
        "Issue this purchase order?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/purchase-orders/${id}/issue`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to issue purchase order."
            );
        }


        showMessage(
            "success",
            "✓ Purchase order issued successfully."
        );


        await loadPurchaseOrders();


    } catch (error) {

        console.error(
            "Issue PO error:",
            error
        );


        showMessage(
            "error",
            `⚠ ${error.message}`
        );
    }
}


// ==========================================
// COMPLETE PURCHASE ORDER
// ==========================================
async function completePurchaseOrder(id) {

    const confirmed = confirm(
        "Mark this purchase order as completed?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/purchase-orders/${id}/complete`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to complete purchase order."
            );
        }


        showMessage(
            "success",
            "✓ Purchase order completed successfully."
        );


        await loadPurchaseOrders();


    } catch (error) {

        console.error(
            "Complete PO error:",
            error
        );


        showMessage(
            "error",
            `⚠ ${error.message}`
        );
    }
}


// ==========================================
// CANCEL PURCHASE ORDER
// ==========================================
async function cancelPurchaseOrder(id) {

    const confirmed = confirm(
        "Cancel this purchase order?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/purchase-orders/${id}/cancel`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Unable to cancel purchase order."
            );
        }


        showMessage(
            "success",
            "✓ Purchase order cancelled successfully."
        );


        await loadPurchaseOrders();


    } catch (error) {

        console.error(
            "Cancel PO error:",
            error
        );


        showMessage(
            "error",
            `⚠ ${error.message}`
        );
    }
}


// ==========================================
// CLOSE MODAL
// ==========================================
function closePOModal(event) {

    if (
        event &&
        event.target &&
        event.target.id !== "poModal"
    ) {
        return;
    }


    const modal =
        document.getElementById("poModal");


    modal.classList.remove("show");
}


// ==========================================
// SEARCH AND FILTER
// ==========================================
function filterPurchaseOrders() {

    const searchInput =
        document.getElementById("poSearch");

    const statusFilter =
        document.getElementById(
            "poStatusFilter"
        );


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const status =
        statusFilter.value;


    const filtered =
        allPurchaseOrders.filter(order => {

            const poNumber =
                String(
                    order.poNumber || ""
                ).toLowerCase();


            const supplier =
                String(
                    order.supplierName || ""
                ).toLowerCase();


            const requestNumber =
                String(
                    order.purchaseRequest?.requestNumber ||
                    ""
                ).toLowerCase();


            const item =
                String(
                    order.itemDescription || ""
                ).toLowerCase();


            const matchesSearch =
                poNumber.includes(search) ||
                supplier.includes(search) ||
                requestNumber.includes(search) ||
                item.includes(search);


            const matchesStatus =
                status === "All" ||
                order.status === status;


            return (
                matchesSearch &&
                matchesStatus
            );
        });


    renderPurchaseOrders(filtered);
}


// ==========================================
// STATUS CLASS
// ==========================================
function getStatusClass(status) {

    switch (status) {

        case "Draft":
            return "po-status-draft";

        case "Issued":
            return "po-status-issued";

        case "Delivered":
            return "po-status-delivered";

        case "Completed":
            return "po-status-completed";

        case "Cancelled":
            return "po-status-cancelled";

        default:
            return "po-status-draft";
    }
}


// ==========================================
// ESCAPE HTML
// ==========================================
function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// SHOW MESSAGE
// ==========================================
function showMessage(type, text) {

    const message =
        document.getElementById(
            "poMessage"
        );


    if (!message) {
        return;
    }


    message.className =
        `po-message show ${type}`;


    message.textContent =
        text;


    setTimeout(() => {
        hideMessage();
    }, 5000);
}


// ==========================================
// HIDE MESSAGE
// ==========================================
function hideMessage() {

    const message =
        document.getElementById(
            "poMessage"
        );


    if (!message) {
        return;
    }


    message.className =
        "po-message";


    message.textContent = "";
}


// ==========================================
// EVENT LISTENERS
// ==========================================
document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadPurchaseOrders();


        const search =
            document.getElementById(
                "poSearch"
            );


        const statusFilter =
            document.getElementById(
                "poStatusFilter"
            );


        if (search) {

            search.addEventListener(
                "input",
                filterPurchaseOrders
            );
        }


        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                filterPurchaseOrders
            );
        }
    }
);

