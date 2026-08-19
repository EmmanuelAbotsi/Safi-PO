const API_URL = "http://localhost:5001";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

// ==========================================
// LOGIN FORM
// ==========================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Reset message
    loginMessage.className = "message";
    loginMessage.textContent = "";
    loginMessage.style.display = "none";

    // Disable button
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    // ==========================================
    // GET FORM VALUES
    // ==========================================

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!email || !password) {

        loginMessage.className = "message error";
        loginMessage.textContent =
            "Please enter your email and password.";
        loginMessage.style.display = "block";

        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";

        return;
    }

    // ==========================================
    // LOGIN
    // ==========================================

    try {

        const response = await fetch(
            `${API_URL}/api/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const result = await response.json();

        console.log("Login response:", result);

        // ==========================================
        // LOGIN FAILED
        // ==========================================

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "Login failed."
            );
        }

        // ==========================================
        // CHECK TOKEN
        // ==========================================

        if (!result.token) {

            throw new Error(
                "Login succeeded but no authentication token was returned."
            );
        }

        // ==========================================
        // CLEAR OLD LOGIN DATA
        // ==========================================

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");

        // ==========================================
        // SAVE NEW JWT TOKEN
        // ==========================================

        localStorage.setItem(
            "token",
            result.token
        );

        // ==========================================
        // SAVE USER INFORMATION
        // ==========================================

        if (result.user) {

            localStorage.setItem(
                "user",
                JSON.stringify(result.user)
            );

        }

        console.log(
            "Logged in user:",
            result.user
        );

        // ==========================================
        // GET USER ROLE
        // ==========================================

        const role =
            result.user &&
            result.user.role
                ? result.user.role
                : "";

        console.log(
            "User role:",
            role
        );

        // ==========================================
        // SUCCESS MESSAGE
        // ==========================================

        loginMessage.className =
            "message success";

        loginMessage.textContent =
            "Login successful. Redirecting...";

        loginMessage.style.display = "block";

        // ==========================================
        // ROLE-BASED REDIRECT
        // ==========================================

        setTimeout(function () {

            // --------------------------------------
            // ADMIN
            // --------------------------------------

            if (role === "admin") {

                window.location.href =
                    "admin.html";

                return;
            }

            // --------------------------------------
            // MANAGER
            // --------------------------------------

            if (role === "manager") {

                window.location.href =
                    "approvals.html";

                return;
            }

            // --------------------------------------
            // EMPLOYEE
            // --------------------------------------

            if (role === "employee") {

                window.location.href =
                    "index.html";

                return;
            }

            // --------------------------------------
            // UNKNOWN ROLE
            // --------------------------------------

            console.warn(
                "Unknown user role:",
                role
            );

            window.location.href =
                "index.html";

        }, 500);

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        loginMessage.className =
            "message error";

        loginMessage.textContent =
            error.message ||
            "Unable to login. Please try again.";

        loginMessage.style.display = "block";

        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
    }

});