/* =========================================================
   STARDOM COLLEGE OF SCIENCE
   COMPLETE SCRIPT.JS
   Frontend/TrebEdit Version
   ========================================================= */

"use strict";

/* =========================================================
   DATABASE
   ========================================================= */

const DB_KEY = "STARDOM_COLLEGE_DATABASE";
const SESSION_KEY = "STARDOM_COLLEGE_SESSION";

const DEFAULT_DATABASE = {
    students: [],
    staff: [],
    management: [],
    counters: {
        student: 0
    }
};

let db = loadDatabase();
let currentSession = loadSession();
let currentStaffStudent = null;

/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    createDefaultManagementAccounts();

    setupForms();

    updateManagementSignupUI();

    restoreSession();

    showPage(
        currentSession
            ? getDashboardPage(currentSession.role)
            : "landingPage"
    );
});

/* =========================================================
   DATABASE FUNCTIONS
   ========================================================= */

function loadDatabase() {

    try {

        const saved = localStorage.getItem(DB_KEY);

        if (!saved) {
            return structuredClone(DEFAULT_DATABASE);
        }

        const parsed = JSON.parse(saved);

        return normalizeDatabase(parsed);

    } catch (error) {

        console.error("Database load error:", error);

        return structuredClone(DEFAULT_DATABASE);
    }
}


function normalizeDatabase(data) {

    if (!data || typeof data !== "object") {
        data = {};
    }

    if (!Array.isArray(data.students)) {
        data.students = [];
    }

    if (!Array.isArray(data.staff)) {
        data.staff = [];
    }

    if (!Array.isArray(data.management)) {
        data.management = [];
    }

    if (!data.counters || typeof data.counters !== "object") {
        data.counters = {};
    }

    if (!Number.isInteger(data.counters.student)) {
        data.counters.student = data.students.length;
    }

    return data;
}


function saveDatabase() {

    try {

        const cleanDB = createStorageSafeDatabase();

        localStorage.setItem(
            DB_KEY,
            JSON.stringify(cleanDB)
        );

        db = cleanDB;

        return true;

    } catch (error) {

        console.error("Database save error:", error);

        if (
            error &&
            (
                error.name === "QuotaExceededError" ||
                error.code === 22
            )
        ) {

            try {

                localStorage.removeItem(DB_KEY);

                const emergencyDB = {
                    students: db.students || [],
                    staff: db.staff || [],
                    management: db.management || [],
                    counters: db.counters || { student: 0 }
                };

                localStorage.setItem(
                    DB_KEY,
                    JSON.stringify(emergencyDB)
                );

                db = emergencyDB;

                showToast(
                    "Storage was full. Large image data was removed. Please upload smaller images.",
                    "warning"
                );

                return true;

            } catch (secondError) {

                console.error(secondError);

                showToast(
                    "Browser storage is full. Clear site data and try again.",
                    "error"
                );

                return false;
            }
        }

        showToast(
            "Unable to save data.",
            "error"
        );

        return false;
    }
}


/*
    Remove extremely large image data before storage.
    Passport/receipt images are resized before reaching here.
*/

function createStorageSafeDatabase() {

    const copy = JSON.parse(JSON.stringify(db));

    const MAX_IMAGE_LENGTH = 350000;

    copy.students = (copy.students || []).map(student => {

        if (
            student.passport &&
            typeof student.passport === "string" &&
            student.passport.length > MAX_IMAGE_LENGTH
        ) {
            student.passport = "";
        }

        if (
            student.payment &&
            student.payment.receipt &&
            typeof student.payment.receipt === "string" &&
            student.payment.receipt.length > MAX_IMAGE_LENGTH
        ) {
            student.payment.receipt = "";
            student.payment.receiptTooLarge = true;
        }

        return student;
    });

    copy.staff = (copy.staff || []).map(staff => {

        if (
            staff.passport &&
            typeof staff.passport === "string" &&
            staff.passport.length > MAX_IMAGE_LENGTH
        ) {
            staff.passport = "";
        }

        return staff;
    });

    return copy;
}


/* =========================================================
   DEFAULT MANAGEMENT ACCOUNTS
   ========================================================= */

function createDefaultManagementAccounts() {

    let changed = false;

    if (!Array.isArray(db.management)) {
        db.management = [];
    }

    const accounts = [
        {
            username: "management1",
            password: "Stardom@123",
            name: "School Management 1"
        },
        {
            username: "management2",
            password: "Stardom@456",
            name: "School Management 2"
        }
    ];

    accounts.forEach(account => {

        const exists = db.management.some(
            m =>
                String(m.username).toLowerCase() ===
                account.username.toLowerCase()
        );

        if (!exists && db.management.length < 2) {

            db.management.push({
                id: createID("MGT"),
                name: account.name,
                username: account.username,
                password: account.password,
                role: "management",
                status: "approved",
                createdAt: new Date().toISOString()
            });

            changed = true;
        }
    });

    if (changed) {
        saveDatabase();
    }
}


/* =========================================================
   SESSION
   ========================================================= */

function saveSession(session) {

    try {

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );

        currentSession = session;

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to create login session.",
            "error"
        );
    }
}


function loadSession() {

    try {

        const saved = sessionStorage.getItem(SESSION_KEY);

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch (error) {

        return null;
    }
}


function clearSession() {

    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {}

    currentSession = null;
}


function getDashboardPage(role) {

    if (role === "student") {
        return "studentDashboard";
    }

    if (role === "staff") {
        return "staffDashboard";
    }

    if (role === "management") {
        return "managementDashboard";
    }

    return "landingPage";
}


function restoreSession() {

    if (!currentSession) {
        return;
    }

    if (currentSession.role === "student") {

        const student = db.students.find(
            s => s.id === currentSession.id
        );

        if (!student) {
            clearSession();
            return;
        }

        openStudentDashboard(student);

    } else if (currentSession.role === "staff") {

        const staff = db.staff.find(
            s => s.id === currentSession.id
        );

        if (!staff || staff.status !== "approved") {
            clearSession();
            return;
        }

        openStaffDashboard(staff);

    } else if (currentSession.role === "management") {

        const manager = db.management.find(
            m => m.id === currentSession.id
        );

        if (!manager) {
            clearSession();
            return;
        }

        openManagementDashboard();
    }
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageID) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageID);

    if (!page) {
        console.warn("Page not found:", pageID);
        return;
    }

    page.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (pageID === "managementRegister") {
        updateManagementSignupUI();
    }

    if (pageID === "managementDashboard") {
        refreshManagementDashboard();
    }
}


function toggleSidebar() {

    const sidebar =
        document.querySelector(".sidebar");

    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}


/* =========================================================
   LOGIN TYPE
   ========================================================= */

function setLoginType(type) {

    const loginType =
        document.getElementById("loginType");

    const username =
        document.getElementById("loginUsername");

    const label =
        document.getElementById("loginUsernameLabel");

    if (!loginType || !username || !label) {
        return;
    }

    loginType.value = type;

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    const buttons =
        document.querySelectorAll(".tab-btn");

    if (type === "student") {

        if (buttons[0]) {
            buttons[0].classList.add("active");
        }

        label.textContent = "SC Registration Number";

        username.placeholder =
            "Example: SC26-SCI-SS3-218";

    } else if (type === "staff") {

        if (buttons[1]) {
            buttons[1].classList.add("active");
        }

        label.textContent = "Staff Email Address";

        username.placeholder =
            "Enter your staff email";

    } else {

        if (buttons[2]) {
            buttons[2].classList.add("active");
        }

        label.textContent = "Management Username";

        username.placeholder =
            "Example: management1";
    }
}


/* =========================================================
   FORM SETUP
   ========================================================= */

function setupForms() {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    const studentForm =
        document.getElementById("studentForm");

    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            handleStudentRegistration
        );
    }


    const staffForm =
        document.getElementById("staffForm");

    if (staffForm) {

        staffForm.addEventListener(
            "submit",
            handleStaffRegistration
        );
    }


    const managementForm =
        document.getElementById("managementForm");

    if (managementForm) {

        managementForm.addEventListener(
            "submit",
            handleManagementRegistration
        );
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

function handleLogin(event) {

    event.preventDefault();

    const type =
        document.getElementById("loginType").value;

    const username =
        document.getElementById("loginUsername").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    if (!username || !password) {

        showToast(
            "Enter your login details.",
            "error"
        );

        return;
    }


    /* STUDENT */

    if (type === "student") {

        const student =
            db.students.find(
                s =>
                    String(s.registrationNumber).toLowerCase() ===
                    username.toLowerCase()
            );

        if (!student) {

            showToast(
                "Student registration number not found.",
                "error"
            );

            return;
        }

        if (student.password !== password) {

            showToast(
                "Incorrect student password.",
                "error"
            );

            return;
        }

        if (student.status === "rejected") {

            showToast(
                "Your student application was rejected.",
                "error"
            );

            return;
        }

        saveSession({
            role: "student",
            id: student.id
        });

        openStudentDashboard(student);

        showToast(
            "Student login successful.",
            "success"
        );

        return;
    }


    /* STAFF */

    if (type === "staff") {

        const staff =
            db.staff.find(
                s =>
                    String(s.email).toLowerCase() ===
                    username.toLowerCase()
            );

        if (!staff) {

            showToast(
                "Staff email not found.",
                "error"
            );

            return;
        }

        if (staff.password !== password) {

            showToast(
                "Incorrect staff password.",
                "error"
            );

            return;
        }

        if (staff.status === "pending") {

            showToast(
                "Your staff application is still waiting for Management approval.",
                "warning"
            );

            return;
        }

        if (staff.status === "rejected") {

            showToast(
                "Your staff application was rejected.",
                "error"
            );

            return;
        }

        saveSession({
            role: "staff",
            id: staff.id
        });

        openStaffDashboard(staff);

        showToast(
            "Staff login successful.",
            "success"
        );

        return;
    }


    /* MANAGEMENT */

    if (type === "management") {

        const manager =
            db.management.find(
                m =>
                    String(m.username).toLowerCase() ===
                    username.toLowerCase()
            );

        if (!manager) {

            showToast(
                "Management username not found.",
                "error"
            );

            return;
        }

        if (manager.password !== password) {

            showToast(
                "Incorrect Management password.",
                "error"
            );

            return;
        }

        saveSession({
            role: "management",
            id: manager.id
        });

        openManagementDashboard();

        showToast(
            "Management login successful.",
            "success"
        );
    }
}


/* =========================================================
   STUDENT REGISTRATION
   ========================================================= */

async function handleStudentRegistration(event) {

    event.preventDefault();

    const surname =
        value("surname");

    const firstName =
        value("firstName");

    const middleName =
        value("middleName");

    const dob =
        value("dob");

    const sex =
        value("sex");

    const studentClass =
        value("studentClass");

    const address =
        value("address");

    const email =
        value("studentEmail");

    const password =
        value("studentPassword");

    const option =
        value("studentOption");

    const passportInput =
        document.getElementById("studentPassport");


    if (
        !surname ||
        !firstName ||
        !dob ||
        !sex ||
        !studentClass ||
        !address ||
        !email ||
        !password
    ) {

        showToast(
            "Please complete all required student fields.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showToast(
            "Student password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (
        ["SS1", "SS2", "SS3"].includes(studentClass) &&
        !option
    ) {

        showToast(
            "Select Science or Art for SS students.",
            "error"
        );

        return;
    }


    if (
        db.students.some(
            s =>
                String(s.email).toLowerCase() ===
                email.toLowerCase()
        )
    ) {

        showToast(
            "A student account already uses this email.",
            "error"
        );

        return;
    }


    if (
        !passportInput ||
        !passportInput.files ||
        !passportInput.files[0]
    ) {

        showToast(
            "Please select a passport photograph.",
            "error"
        );

        return;
    }


    showToast(
        "Processing registration...",
        "info"
    );


    try {

        const passport =
            await compressImage(
                passportInput.files[0],
                500,
                0.65
            );


        const registrationNumber =
            generateStudentRegistrationNumber(
                studentClass,
                option
            );


        const student = {

            id: createID("STU"),

            registrationNumber,

            surname,
            firstName,
            middleName,

            dob,
            sex,

            address,

            email,

            password,

            class: studentClass,

            option:
                ["SS1", "SS2", "SS3"].includes(studentClass)
                    ? option
                    : "N/A",

            passport,

            status: "pending",

            payment: {
                receipt: "",
                status: "not_submitted",
                submittedAt: null,
                approvedAt: null
            },

            scores: [],

            createdAt:
                new Date().toISOString()
        };


        db.students.push(student);

        if (!saveDatabase()) {
            return;
        }


        document
            .getElementById("studentForm")
            .reset();

        const preview =
            document.getElementById("studentPreview");

        if (preview) {
            preview.innerHTML =
                "<span>📷</span><small>Select Passport</small>";
        }


        alert(
            "Student registration successful!\n\n" +
            "Your Registration Number:\n" +
            registrationNumber +
            "\n\nUse this number and your password to login."
        );


        showPage("loginPage");

        setLoginType("student");

        const loginUsername =
            document.getElementById("loginUsername");

        if (loginUsername) {
            loginUsername.value =
                registrationNumber;
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Student registration failed. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   STAFF REGISTRATION
   ========================================================= */

async function handleStaffRegistration(event) {

    event.preventDefault();


    const name =
        value("staffName");

    const phone =
        value("staffPhone");

    const address =
        value("staffAddress");

    const email =
        value("staffEmail");

    const password =
        value("staffPassword");

    const qualification =
        value("staffQualification");

    const passportInput =
        document.getElementById("staffPassport");


    if (
        !name ||
        !phone ||
        !address ||
        !email ||
        !password ||
        !qualification
    ) {

        showToast(
            "Please complete all required staff fields.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showToast(
            "Staff password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (
        db.staff.some(
            s =>
                String(s.email).toLowerCase() ===
                email.toLowerCase()
        )
    ) {

        showToast(
            "A staff application already uses this email.",
            "error"
        );

        return;
    }


    if (
        !passportInput ||
        !passportInput.files ||
        !passportInput.files[0]
    ) {

        showToast(
            "Please select a passport photograph.",
            "error"
        );

        return;
    }


    showToast(
        "Submitting staff application...",
        "info"
    );


    try {

        const passport =
            await compressImage(
                passportInput.files[0],
                500,
                0.65
            );


        const staff = {

            id: createID("STAFF"),

            name,

            phone,

            address,

            email,

            password,

            qualification,

            passport,

            status: "pending",

            createdAt:
                new Date().toISOString(),

            approvedAt: null
        };


        db.staff.push(staff);


        if (!saveDatabase()) {
            return;
        }


        document
            .getElementById("staffForm")
            .reset();


        const preview =
            document.getElementById("staffPreview");

        if (preview) {
            preview.innerHTML =
                "<span>📷</span><small>Select Passport</small>";
        }


        alert(
            "Staff application submitted successfully.\n\n" +
            "Your application is now WAITING FOR MANAGEMENT APPROVAL.\n\n" +
            "After approval, login with your email and password."
        );


        showPage("loginPage");

        setLoginType("staff");

    } catch (error) {

        console.error(error);

        showToast(
            "Staff application failed.",
            "error"
        );
    }
}


/* =========================================================
   MANAGEMENT REGISTRATION
   ========================================================= */

function handleManagementRegistration(event) {

    event.preventDefault();


    if (db.management.length >= 2) {

        showToast(
            "Management registration is closed. The maximum of 2 accounts has been reached.",
            "error"
        );

        updateManagementSignupUI();

        return;
    }


    const name =
        value("managementName");

    const username =
        value("managementUsername");

    const password =
        value("managementPassword");


    if (!name || !username || !password) {

        showToast(
            "Complete all Management fields.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showToast(
            "Management password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (
        db.management.some(
            m =>
                String(m.username).toLowerCase() ===
                username.toLowerCase()
        )
    ) {

        showToast(
            "Management username already exists.",
            "error"
        );

        return;
    }


    const manager = {

        id: createID("MGT"),

        name,

        username,

        password,

        role: "management",

        status: "approved",

        createdAt:
            new Date().toISOString()
    };


    db.management.push(manager);


    if (!saveDatabase()) {
        return;
    }


    document
        .getElementById("managementForm")
        .reset();


    updateManagementSignupUI();


    alert(
        "Management account created successfully.\n\n" +
        "Username: " +
        username +
        "\n\n" +
        "You can now login."
    );


    showPage("loginPage");

    setLoginType("management");
}


/* =========================================================
   MANAGEMENT SIGNUP STATUS
   ========================================================= */

function updateManagementSignupUI() {

    const form =
        document.getElementById("managementForm");

    if (!form) {
        return;
    }


    if (db.management.length >= 2) {

        form.innerHTML = `
            <div class="notice warning">
                <strong>Management Signup Closed</strong>
                <p>
                    The maximum of 2 Management accounts
                    has already been created.
                </p>
            </div>

            <button
                type="button"
                class="btn secondary full"
                onclick="showPage('loginPage'); setLoginType('management')">
                Go to Management Login
            </button>
        `;

    } else {

        /*
           Rebuild original form if signup is still open.
        */

        form.innerHTML = `
            <div class="input-group">
                <label>Full Name *</label>
                <input type="text" id="managementName" required>
            </div>

            <div class="input-group">
                <label>Username *</label>
                <input type="text" id="managementUsername" required>
            </div>

            <div class="input-group">
                <label>Password *</label>

                <div class="password-box">
                    <input
                        type="password"
                        id="managementPassword"
                        minlength="6"
                        required
                    >

                    <button
                        type="button"
                        onclick="togglePassword('managementPassword')">
                        👁
                    </button>
                </div>
            </div>

            <button
                class="btn primary full"
                type="submit">
                Create Management Account
            </button>
        `;
    }
}


/* =========================================================
   STUDENT DASHBOARD
   ========================================================= */

function openStudentDashboard(student) {

    showPage("studentDashboard");


    setText(
        "studentWelcome",
        "Welcome " + student.firstName
    );

    setText(
        "studentRegDisplay",
        student.registrationNumber
    );

    setText(
        "studentDashName",
        fullStudentName(student)
    );

    setText(
        "studentDashClass",
        student.class
    );

    setText(
        "studentDashReg",
        student.registrationNumber
    );

    setText(
        "studentDashEmail",
        student.email
    );

    setText(
        "studentDashOption",
        student.option || "N/A"
    );


    const image =
        document.getElementById("studentDashPhoto");

    if (image) {

        image.src =
            student.passport ||
            "";

        image.onerror = function () {
            this.style.display = "none";
        };
    }


    updateStudentPaymentDisplay(student);

    updateStudentResultDisplay(student);
}


function updateStudentPaymentDisplay(student) {

    const element =
        document.getElementById("studentPaymentStatus");

    if (!element) {
        return;
    }


    if (
        !student.payment ||
        student.payment.status === "not_submitted"
    ) {

        element.textContent =
            "No payment submitted.";

        return;
    }


    if (student.payment.status === "pending") {

        element.textContent =
            "Payment receipt submitted. Waiting for Management approval.";

        return;
    }


    if (student.payment.status === "approved") {

        element.textContent =
            "Payment approved by Management.";

        return;
    }


    if (student.payment.status === "rejected") {

        element.textContent =
            "Payment receipt was rejected. Please upload a valid receipt.";
    }
}


function updateStudentResultDisplay(student) {

    const element =
        document.getElementById("studentResultStatus");

    if (!element) {
        return;
    }


    if (
        !student.scores ||
        student.scores.length === 0
    ) {

        element.textContent =
            "No result available.";

        return;
    }


    element.textContent =
        student.scores.length +
        " subject result(s) available.";
}


/* =========================================================
   STAFF DASHBOARD
   ========================================================= */

function openStaffDashboard(staff) {

    showPage("staffDashboard");


    setText(
        "staffWelcome",
        "Welcome " + staff.name
    );

    setText(
        "staffRoleDisplay",
        staff.qualification || "Staff Member"
    );

    setText(
        "staffStatusText",
        "Status: Approved"
    );
}


/* =========================================================
   MANAGEMENT DASHBOARD
   ========================================================= */

function openManagementDashboard() {

    showPage("managementDashboard");

    refreshManagementDashboard();

    showManagementSection("overview");
}


function refreshManagementDashboard() {

    setText(
        "statStudents",
        db.students.length
    );

    setText(
        "statStaff",
        db.staff.length
    );


    const pending =
        db.students.filter(
            s => s.status === "pending"
        ).length
        +
        db.staff.filter(
            s => s.status === "pending"
        ).length;


    setText(
        "statPending",
        pending
    );


    const payments =
        db.students.filter(
            s =>
                s.payment &&
                s.payment.status === "pending"
        ).length;


    setText(
        "statPayments",
        payments
    );


    renderPendingStaff();

    renderPendingStudents();

    renderStudentsTable();

    renderStaffTable();

    renderPaymentsTable();
}


/* =========================================================
   MANAGEMENT SECTIONS
   ========================================================= */

function showManagementSection(section) {

    document
        .querySelectorAll(".management-section")
        .forEach(item => {
            item.classList.remove("active");
        });


    document
        .querySelectorAll(".management-nav button")
        .forEach(button => {
            button.classList.remove("active");
        });


    const target =
        document.getElementById(
            "management" +
            capitalize(section)
        );


    if (target) {
        target.classList.add("active");
    }


    document
        .querySelectorAll(".management-nav button")
        .forEach(button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();

            if (text === section.toLowerCase()) {
                button.classList.add("active");
            }
        });


    refreshManagementDashboard();
}

if (loginType === "management") {

    const managementStaff =
        loginManagementStaff(
            username,
            password
        );

    if (managementStaff) {

        currentSession =
            managementStaff;

        sessionStorage.setItem(
            "STARDOM_COLLEGE_SESSION",
            JSON.stringify(
                currentSession
            )
        );

        showPage(
            "managementDashboard"
        );

        
    }
}

/* =========================================================
   PENDING STAFF
   ========================================================= */

function renderPendingStaff() {

    const container =
        document.getElementById("pendingStaffList");

    if (!container) {
        return;
    }


    const pending =
        db.staff.filter(
            staff => staff.status === "pending"
        );


    if (pending.length === 0) {

        container.innerHTML =
            "<p>No pending staff application.</p>";

        return;
    }


    container.innerHTML =
        pending.map(staff => `

            <div class="management-item">

                <strong>${escapeHTML(staff.name)}</strong>

                <small>
                    ${escapeHTML(staff.email)}
                </small>

                <small>
                    ${escapeHTML(staff.qualification)}
                </small>

                <div class="item-actions">

                    <button
                        class="btn primary"
                        onclick="approveStaff('${staff.id}')">
                        Approve
                    </button>

                    <button
                        class="btn danger"
                        onclick="rejectStaff('${staff.id}')">
                        Reject
                    </button>

                </div>

            </div>

        `).join("");
}


function approveStaff(id) {

    const staff =
        db.staff.find(
            s => s.id === id
        );

    if (!staff) {

        showToast(
            "Staff record not found.",
            "error"
        );

        return;
    }


    staff.status = "approved";

    staff.approvedAt =
        new Date().toISOString();


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Staff application approved.",
        "success"
    );
}


function rejectStaff(id) {

    const staff =
        db.staff.find(
            s => s.id === id
        );

    if (!staff) {
        return;
    }


    staff.status = "rejected";


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Staff application rejected.",
        "warning"
    );
}


/* =========================================================
   PENDING STUDENTS
   ========================================================= */

function renderPendingStudents() {

    const container =
        document.getElementById("pendingStudentList");

    if (!container) {
        return;
    }


    const pending =
        db.students.filter(
            student => student.status === "pending"
        );


    if (pending.length === 0) {

        container.innerHTML =
            "<p>No pending student application.</p>";

        return;
    }


    container.innerHTML =
        pending.map(student => `

            <div class="management-item">

                <strong>
                    ${escapeHTML(fullStudentName(student))}
                </strong>

                <small>
                    ${escapeHTML(student.registrationNumber)}
                </small>

                <small>
                    ${escapeHTML(student.class)}
                </small>

                <div class="item-actions">

                    <button
                        class="btn primary"
                        onclick="approveStudent('${student.id}')">
                        Approve
                    </button>

                    <button
                        class="btn danger"
                        onclick="rejectStudent('${student.id}')">
                        Reject
                    </button>

                </div>

            </div>

        `).join("");
}


function approveStudent(id) {

    const student =
        db.students.find(
            s => s.id === id
        );

    if (!student) {
        return;
    }


    student.status = "approved";

    student.approvedAt =
        new Date().toISOString();


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Student approved.",
        "success"
    );
}


function rejectStudent(id) {

    const student =
        db.students.find(
            s => s.id === id
        );

    if (!student) {
        return;
    }


    student.status = "rejected";


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Student rejected.",
        "warning"
    );
}


/* =========================================================
   STUDENT TABLE
   ========================================================= */

function renderStudentsTable() {

    const body =
        document.getElementById("studentsTableBody");

    if (!body) {
        return;
    }


    const searchElement =
        document.getElementById(
            "studentManagementSearch"
        );


    const search =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    const students =
        db.students.filter(student => {

            const text =
                (
                    fullStudentName(student) +
                    " " +
                    student.registrationNumber +
                    " " +
                    student.class +
                    " " +
                    student.email
                ).toLowerCase();

            return text.includes(search);
        });


    if (students.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        students.map(student => `

            <tr>

                <td>
                    ${
                        student.passport
                            ? `<img
                                src="${student.passport}"
                                style="width:45px;height:45px;object-fit:cover;border-radius:8px;"
                              >`
                            : "—"
                    }
                </td>

                <td>
                    ${escapeHTML(student.registrationNumber)}
                </td>

                <td>
                    ${escapeHTML(fullStudentName(student))}
                </td>

                <td>
                    ${escapeHTML(student.class)}
                </td>

                <td>
                    ${escapeHTML(student.option || "N/A")}
                </td>

                <td>
                    ${statusBadge(student.status)}
                </td>

                <td>

                    <button
                        class="btn secondary"
                        onclick="viewStudent('${student.id}')">
                        View
                    </button>

                    <button
                        class="btn primary"
                        onclick="editStudent('${student.id}')">
                        Edit
                    </button>

                    ${
                        student.status === "pending"
                            ? `
                                <button
                                    class="btn primary"
                                    onclick="approveStudent('${student.id}')">
                                    Approve
                                </button>
                            `
                            : ""
                    }

                </td>

            </tr>

        `).join("");
}


/* =========================================================
   STAFF TABLE
   ========================================================= */

function renderStaffTable() {

    const body =
        document.getElementById("staffTableBody");

    if (!body) {
        return;
    }


    if (db.staff.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    No staff application.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        db.staff.map(staff => `

            <tr>

                <td>
                    ${
                        staff.passport
                            ? `<img
                                src="${staff.passport}"
                                style="width:45px;height:45px;object-fit:cover;border-radius:8px;"
                              >`
                            : "—"
                    }
                </td>

                <td>
                    ${escapeHTML(staff.name)}
                </td>

                <td>
                    ${escapeHTML(staff.phone)}
                </td>

                <td>
                    ${escapeHTML(staff.email)}
                </td>

                <td>
                    ${escapeHTML(staff.qualification)}
                </td>

                <td>
                    ${statusBadge(staff.status)}
                </td>

                <td>

                    <button
                        class="btn secondary"
                        onclick="viewStaff('${staff.id}')">
                        View
                    </button>

                    <button
                        class="btn primary"
                        onclick="editStaff('${staff.id}')">
                        Edit
                    </button>

                    ${
                        staff.status === "pending"
                            ? `
                                <button
                                    class="btn primary"
                                    onclick="approveStaff('${staff.id}')">
                                    Approve
                                </button>

                                <button
                                    class="btn danger"
                                    onclick="rejectStaff('${staff.id}')">
                                    Reject
                                </button>
                            `
                            : ""
                    }

                </td>

            </tr>

        `).join("");
}


/* =========================================================
   PAYMENTS
   ========================================================= */

function uploadStudentReceipt(input) {

    if (!currentSession ||
        currentSession.role !== "student"
    ) {

        showToast(
            "Please login as a student first.",
            "error"
        );

        return;
    }


    const file =
        input.files &&
        input.files[0];


    if (!file) {
        return;
    }


    if (
        file.type !== "application/pdf" &&
        !file.type.startsWith("image/")
    ) {

        showToast(
            "Please select an image or PDF receipt.",
            "error"
        );

        input.value = "";

        return;
    }


    const student =
        db.students.find(
            s => s.id === currentSession.id
        );


    if (!student) {
        return;
    }


    if (file.type === "application/pdf") {

        if (file.size > 500000) {

            showToast(
                "PDF receipt is too large. Please use a smaller file.",
                "error"
            );

            return;
        }

        const reader =
            new FileReader();

        reader.onload = function () {

            student.payment = {

                receipt: reader.result,

                status: "pending",

                submittedAt:
                    new Date().toISOString(),

                approvedAt: null,

                fileName: file.name
            };


            if (!saveDatabase()) {
                return;
            }


            updateStudentPaymentDisplay(student);

            showToast(
                "Payment receipt submitted.",
                "success"
            );
        };


        reader.readAsDataURL(file);

        return;
    }


    compressImage(
        file,
        700,
        0.6
    ).then(receipt => {

        student.payment = {

            receipt,

            status: "pending",

            submittedAt:
                new Date().toISOString(),

            approvedAt: null,

            fileName: file.name
        };


        if (!saveDatabase()) {
            return;
        }


        updateStudentPaymentDisplay(student);

        showToast(
            "Payment receipt submitted.",
            "success"
        );

    }).catch(error => {

        console.error(error);

        showToast(
            "Could not process receipt.",
            "error"
        );
    });
}


function renderPaymentsTable() {

    const body =
        document.getElementById(
            "paymentsTableBody"
        );

    if (!body) {
        return;
    }


    const payments =
        db.students.filter(
            student =>
                student.payment &&
                student.payment.status !==
                "not_submitted"
        );


    if (payments.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    No payment submitted.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        payments.map(student => `

            <tr>

                <td>
                    ${escapeHTML(student.registrationNumber)}
                </td>

                <td>
                    ${escapeHTML(fullStudentName(student))}
                </td>

                <td>

                    ${
                        student.payment.receipt
                            ? `
                                <button
                                    class="btn secondary"
                                    onclick="viewReceipt('${student.id}')">
                                    View Receipt
                                </button>
                              `
                            : "Unavailable"
                    }

                </td>

                <td>
                    ${statusBadge(student.payment.status)}
                </td>

                <td>

                    ${
                        student.payment.status === "pending"
                            ? `
                                <button
                                    class="btn primary"
                                    onclick="approvePayment('${student.id}')">
                                    Approve
                                </button>

                                <button
                                    class="btn danger"
                                    onclick="rejectPayment('${student.id}')">
                                    Reject
                                </button>
                              `
                            : ""
                    }

                </td>

            </tr>

        `).join("");
}


function approvePayment(studentID) {

    const student =
        db.students.find(
            s => s.id === studentID
        );

    if (!student || !student.payment) {
        return;
    }


    student.payment.status =
        "approved";

    student.payment.approvedAt =
        new Date().toISOString();


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Payment approved.",
        "success"
    );
}


function rejectPayment(studentID) {

    const student =
        db.students.find(
            s => s.id === studentID
        );

    if (!student || !student.payment) {
        return;
    }


    student.payment.status =
        "rejected";


    if (!saveDatabase()) {
        return;
    }


    refreshManagementDashboard();

    showToast(
        "Payment rejected.",
        "warning"
    );
}


function viewReceipt(studentID) {

    const student =
        db.students.find(
            s => s.id === studentID
        );

    if (
        !student ||
        !student.payment ||
        !student.payment.receipt
    ) {

        showToast(
            "Receipt not available.",
            "error"
        );

        return;
    }


    const content =
        document.getElementById(
            "editModalContent"
        );

    if (!content) {
        return;
    }


    const receipt =
        student.payment.receipt;


    let html = `
        <h3>
            Payment Receipt
        </h3>

        <p>
            <strong>Student:</strong>
            ${escapeHTML(fullStudentName(student))}
        </p>

        <p>
            <strong>SC Number:</strong>
            ${escapeHTML(student.registrationNumber)}
        </p>
    `;


    if (
        receipt.startsWith(
            "data:image/"
        )
    ) {

        html += `
            <img
                src="${receipt}"
                style="max-width:100%;border-radius:10px;"
            >
        `;

    } else if (
        receipt.startsWith(
            "data:application/pdf"
        )
    ) {

        html += `
            <iframe
                src="${receipt}"
                style="width:100%;height:500px;border:0;">
            </iframe>
        `;

    } else {

        html +=
            "<p>Receipt format cannot be displayed.</p>";
    }


    content.innerHTML = html;

    openModal("editModal");
}


/* =========================================================
   STAFF STUDENT SEARCH
   ========================================================= */

function staffFindStudent() {

    const search =
        value("staffStudentSearch")
            .toUpperCase();


    const result =
        document.getElementById(
            "staffStudentResult"
        );


    if (!result) {
        return;
    }


    if (!search) {

        result.innerHTML =
            "<p>Enter a student SC number.</p>";

        return;
    }


    const student =
        db.students.find(
            s =>
                String(s.registrationNumber)
                    .toUpperCase() ===
                search
        );


    if (!student) {

        currentStaffStudent = null;

        result.innerHTML =
            "<p>Student not found.</p>";

        return;
    }


    currentStaffStudent = student;


    result.innerHTML = `

        <div class="management-item">

            ${
                student.passport
                    ? `
                        <img
                            src="${student.passport}"
                            style="width:80px;height:80px;object-fit:cover;border-radius:10px;">
                      `
                    : ""
            }

            <h3>
                ${escapeHTML(fullStudentName(student))}
            </h3>

            <p>
                <strong>SC Number:</strong>
                ${escapeHTML(student.registrationNumber)}
            </p>

            <p>
                <strong>Class:</strong>
                ${escapeHTML(student.class)}
            </p>

            <p>
                <strong>Option:</strong>
                ${escapeHTML(student.option || "N/A")}
            </p>

            <p>
                <strong>Status:</strong>
                ${statusBadge(student.status)}
            </p>

            <button
                class="btn primary"
                onclick="openScoreModalForStudent('${student.registrationNumber}')">
                Enter Score
            </button>

        </div>

    `;
}


/* =========================================================
   SCORE SYSTEM
   ========================================================= */

function openScoreModal() {

    const modal =
        document.getElementById(
            "scoreModal"
        );

    if (!modal) {
        return;
    }


    if (
        currentStaffStudent &&
        document.getElementById("scoreRegNo")
    ) {

        document.getElementById(
            "scoreRegNo"
        ).value =
            currentStaffStudent.registrationNumber;
    }


    openModal("scoreModal");
}


function openScoreModalForStudent(regNo) {

    const input =
        document.getElementById("scoreRegNo");

    if (input) {
        input.value = regNo;
    }


    openModal("scoreModal");
}


function saveScore() {

    if (
        !currentSession ||
        currentSession.role !== "staff"
    ) {

        showToast(
            "Only approved staff can enter scores.",
            "error"
        );

        return;
    }


    const regNo =
        value("scoreRegNo")
            .toUpperCase();


    const subject =
        value("scoreSubject");


    const ca =
        Number(value("caScore"));


    const exam =
        Number(value("examScore"));


    if (!regNo || !subject) {

        showToast(
            "Enter registration number and subject.",
            "error"
        );

        return;
    }


    if (
        Number.isNaN(ca) ||
        ca < 0 ||
        ca > 40
    ) {

        showToast(
            "CA score must be between 0 and 40.",
            "error"
        );

        return;
    }


    if (
        Number.isNaN(exam) ||
        exam < 0 ||
        exam > 60
    ) {

        showToast(
            "Exam score must be between 0 and 60.",
            "error"
        );

        return;
    }


    const student =
        db.students.find(
            s =>
                String(s.registrationNumber)
                    .toUpperCase() ===
                regNo
        );


    if (!student) {

        showToast(
            "Student not found.",
            "error"
        );

        return;
    }


    const total =
        ca + exam;


    let grade = "F";


    if (total >= 70) {
        grade = "A";
    } else if (total >= 60) {
        grade = "B";
    } else if (total >= 50) {
        grade = "C";
    } else if (total >= 45) {
        grade = "D";
    } else if (total >= 40) {
        grade = "E";
    }


    if (!Array.isArray(student.scores)) {
        student.scores = [];
    }


    const existing =
        student.scores.find(
            score =>
                String(score.subject).toLowerCase() ===
                subject.toLowerCase()
        );


    const scoreRecord = {

        subject,

        ca,

        exam,

        total,

        grade,

        enteredBy:
            currentSession.id,

        updatedAt:
            new Date().toISOString()
    };


    if (existing) {

        Object.assign(
            existing,
            scoreRecord
        );

    } else {

        student.scores.push(
            scoreRecord
        );
    }


    if (!saveDatabase()) {
        return;
    }


    const calculation =
        document.getElementById(
            "scoreCalculation"
        );


    if (calculation) {

        calculation.innerHTML = `

            <div class="notice">

                <strong>
                    Score Submitted
                </strong>

                <p>
                    CA: ${ca}/40
                </p>

                <p>
                    Exam: ${exam}/60
                </p>

                <p>
                    Total: <strong>${total}/100</strong>
                </p>

                <p>
                    Grade: <strong>${grade}</strong>
                </p>

            </div>

        `;
    }


    showToast(
        "Score saved successfully.",
        "success"
    );


    updateStudentResultDisplay(student);
}


/* =========================================================
   STUDENT RESULT
   ========================================================= */

function viewStudentResult() {

    if (
        !currentSession ||
        currentSession.role !== "student"
    ) {
        return;
    }


    const student =
        db.students.find(
            s => s.id === currentSession.id
        );


    if (!student) {
        return;
    }


    const content =
        document.getElementById(
            "resultContent"
        );


    if (!content) {
        return;
    }


    if (
        !student.scores ||
        student.scores.length === 0
    ) {

        content.innerHTML = `
            <h2>Academic Result</h2>
            <p>No result available yet.</p>
        `;

        openModal("resultModal");

        return;
    }


    const total =
        student.scores.reduce(
            (sum, score) =>
                sum + Number(score.total || 0),
            0
        );


    const average =
        total /
        student.scores.length;


    content.innerHTML = `

        <h2>Academic Result</h2>

        <p>
            <strong>
                ${escapeHTML(fullStudentName(student))}
            </strong>
        </p>

        <p>
            ${escapeHTML(student.registrationNumber)}
        </p>

        <div class="table-container">

            <table>

                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>CA</th>
                        <th>Exam</th>
                        <th>Total</th>
                        <th>Grade</th>
                    </tr>
                </thead>

                <tbody>

                    ${student.scores.map(score => `

                        <tr>

                            <td>
                                ${escapeHTML(score.subject)}
                            </td>

                            <td>
                                ${score.ca}
                            </td>

                            <td>
                                ${score.exam}
                            </td>

                            <td>
                                ${score.total}
                            </td>

                            <td>
                                ${score.grade}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

        <div class="notice">

            <strong>
                Average:
                ${average.toFixed(2)}%
            </strong>

        </div>

    `;


    openModal("resultModal");
}


/* =========================================================
   VIEW STUDENT
   ========================================================= */

function viewStudent(id) {

    const student =
        db.students.find(
            s => s.id === id
        );

    if (!student) {
        return;
    }


    const content =
        document.getElementById(
            "editModalContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="profile-details">

            ${
                student.passport
                    ? `
                        <img
                            src="${student.passport}"
                            style="width:120px;height:120px;object-fit:cover;border-radius:12px;">
                      `
                    : ""
            }

            <h3>
                ${escapeHTML(fullStudentName(student))}
            </h3>

            <p>
                <strong>SC Number:</strong>
                ${escapeHTML(student.registrationNumber)}
            </p>

            <p>
                <strong>Date of Birth:</strong>
                ${escapeHTML(student.dob)}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHTML(student.sex)}
            </p>

            <p>
                <strong>Class:</strong>
                ${escapeHTML(student.class)}
            </p>

            <p>
                <strong>Option:</strong>
                ${escapeHTML(student.option || "N/A")}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHTML(student.email)}
            </p>

            <p>
                <strong>Address:</strong>
                ${escapeHTML(student.address)}
            </p>

            <p>
                <strong>Status:</strong>
                ${statusBadge(student.status)}
            </p>

        </div>

    `;


    openModal("editModal");
}


/* =========================================================
   VIEW STAFF
   ========================================================= */

function viewStaff(id) {

    const staff =
        db.staff.find(
            s => s.id === id
        );

    if (!staff) {
        return;
    }


    const content =
        document.getElementById(
            "editModalContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="profile-details">

            ${
                staff.passport
                    ? `
                        <img
                            src="${staff.passport}"
                            style="width:120px;height:120px;object-fit:cover;border-radius:12px;">
                      `
                    : ""
            }

            <h3>
                ${escapeHTML(staff.name)}
            </h3>

            <p>
                <strong>Phone:</strong>
                ${escapeHTML(staff.phone)}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHTML(staff.email)}
            </p>

            <p>
                <strong>Qualification:</strong>
                ${escapeHTML(staff.qualification)}
            </p>

            <p>
                <strong>Address:</strong>
                ${escapeHTML(staff.address)}
            </p>

            <p>
                <strong>Status:</strong>
                ${statusBadge(staff.status)}
            </p>

        </div>

    `;


    openModal("editModal");
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(id) {

    const student =
        db.students.find(
            s => s.id === id
        );

    if (!student) {
        return;
    }


    const content =
        document.getElementById(
            "editModalContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="input-group">
            <label>First Name</label>
            <input
                id="editStudentFirst"
                value="${escapeAttribute(student.firstName)}">
        </div>

        <div class="input-group">
            <label>Surname</label>
            <input
                id="editStudentSurname"
                value="${escapeAttribute(student.surname)}">
        </div>

        <div class="input-group">
            <label>Middle Name</label>
            <input
                id="editStudentMiddle"
                value="${escapeAttribute(student.middleName || "")}">
        </div>

        <div class="input-group">
            <label>Email</label>
            <input
                type="email"
                id="editStudentEmail"
                value="${escapeAttribute(student.email)}">
        </div>

        <div class="input-group">
            <label>Address</label>
            <textarea id="editStudentAddress">${escapeHTML(student.address)}</textarea>
        </div>

        <button
            class="btn primary full"
            onclick="saveStudentEdit('${student.id}')">
            Save Changes
        </button>

    `;


    openModal("editModal");
}


function saveStudentEdit(id) {

    const student =
        db.students.find(
            s => s.id === id
        );

    if (!student) {
        return;
    }


    student.firstName =
        value("editStudentFirst");

    student.surname =
        value("editStudentSurname");

    student.middleName =
        value("editStudentMiddle");

    student.email =
        value("editStudentEmail");

    student.address =
        value("editStudentAddress");


    if (!student.firstName ||
        !student.surname ||
        !student.email
    ) {

        showToast(
            "Complete required fields.",
            "error"
        );

        return;
    }


    if (!saveDatabase()) {
        return;
    }


    closeModal("editModal");

    refreshManagementDashboard();

    showToast(
        "Student record updated.",
        "success"
    );
}


/* =========================================================
   EDIT STAFF
   ========================================================= */

function editStaff(id) {

    const staff =
        db.staff.find(
            s => s.id === id
        );

    if (!staff) {
        return;
    }


    const content =
        document.getElementById(
            "editModalContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="input-group">
            <label>Name</label>
            <input
                id="editStaffName"
                value="${escapeAttribute(staff.name)}">
        </div>

        <div class="input-group">
            <label>Phone</label>
            <input
                id="editStaffPhone"
                value="${escapeAttribute(staff.phone)}">
        </div>

        <div class="input-group">
            <label>Email</label>
            <input
                type="email"
                id="editStaffEmail"
                value="${escapeAttribute(staff.email)}">
        </div>

        <div class="input-group">
            <label>Qualification</label>
            <input
                id="editStaffQualification"
                value="${escapeAttribute(staff.qualification)}">
        </div>

        <div class="input-group">
            <label>Address</label>
            <textarea id="editStaffAddress">${escapeHTML(staff.address)}</textarea>
        </div>

        <button
            class="btn primary full"
            onclick="saveStaffEdit('${staff.id}')">
            Save Changes
        </button>

    `;


    openModal("editModal");
}


function saveStaffEdit(id) {

    const staff =
        db.staff.find(
            s => s.id === id
        );

    if (!staff) {
        return;
    }


    staff.name =
        value("editStaffName");

    staff.phone =
        value("editStaffPhone");

    staff.email =
        value("editStaffEmail");

    staff.qualification =
        value("editStaffQualification");

    staff.address =
        value("editStaffAddress");


    if (
        !staff.name ||
        !staff.phone ||
        !staff.email ||
        !staff.qualification
    ) {

        showToast(
            "Complete required fields.",
            "error"
        );

        return;
    }


    if (!saveDatabase()) {
        return;
    }


    closeModal("editModal");

    refreshManagementDashboard();

    showToast(
        "Staff record updated.",
        "success"
    );
}


/* =========================================================
   MANAGEMENT ACCOUNT CHANGE
   ========================================================= */

function showManagementAccountSettings() {

    const content =
        document.getElementById(
            "editModalContent"
        );


    if (!content) {
        return;
    }


    const manager =
        getCurrentManagement();


    if (!manager) {
        return;
    }


    content.innerHTML = `

        <h3>Change Management Login</h3>

        <div class="input-group">
            <label>Current Password</label>
            <input
                type="password"
                id="currentManagementPassword">
        </div>

        <div class="input-group">
            <label>New Username</label>
            <input
                type="text"
                id="newManagementUsername"
                value="${escapeAttribute(manager.username)}">
        </div>

        <div class="input-group">
            <label>New Password</label>
            <input
                type="password"
                id="newManagementPassword">
        </div>

        <div class="input-group">
            <label>Confirm New Password</label>
            <input
                type="password"
                id="confirmManagementPassword">
        </div>

        <button
            class="btn primary full"
            onclick="changeManagementAccount()">
            Save Login Changes
        </button>

    `;


    openModal("editModal");
}


function changeManagementAccount() {

    const manager =
        getCurrentManagement();


    if (!manager) {
        return;
    }


    const currentPassword =
        value("currentManagementPassword");

    const username =
        value("newManagementUsername");

    const newPassword =
        value("newManagementPassword");

    const confirmPassword =
        value("confirmManagementPassword");


    if (
        currentPassword !==
        manager.password
    ) {

        showToast(
            "Current password is incorrect.",
            "error"
        );

        return;
    }


    if (!username) {

        showToast(
            "Username is required.",
            "error"
        );

        return;
    }


    if (
        db.management.some(
            m =>
                m.id !== manager.id &&
                String(m.username).toLowerCase() ===
                username.toLowerCase()
        )
    ) {

        showToast(
            "That username is already being used.",
            "error"
        );

        return;
    }


    if (newPassword) {

        if (newPassword.length < 6) {

            showToast(
                "New password must contain at least 6 characters.",
                "error"
            );

            return;
        }


        if (newPassword !== confirmPassword) {

            showToast(
                "New passwords do not match.",
                "error"
            );

            return;
        }


        manager.password =
            newPassword;
    }


    manager.username =
        username;


    if (!saveDatabase()) {
        return;
    }


    closeModal("editModal");


    showToast(
        "Management login details updated.",
        "success"
    );
}


function getCurrentManagement() {

    if (
        !currentSession ||
        currentSession.role !== "management"
    ) {
        return null;
    }


    return db.management.find(
        m =>
            m.id === currentSession.id
    ) || null;
}


/* =========================================================
   PRINTING
   ========================================================= */

function printStudentRecord() {

    if (
        !currentSession ||
        currentSession.role !== "student"
    ) {
        return;
    }


    const student =
        db.students.find(
            s => s.id === currentSession.id
        );


    if (!student) {
        return;
    }


    printHTML(
        "Student Record",
        `
            <h1>STARDOM COLLEGE OF SCIENCE</h1>
            <h2>Student Record</h2>

            <p>
                <strong>Registration Number:</strong>
                ${escapeHTML(student.registrationNumber)}
            </p>

            <p>
                <strong>Name:</strong>
                ${escapeHTML(fullStudentName(student))}
            </p>

            <p>
                <strong>Date of Birth:</strong>
                ${escapeHTML(student.dob)}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHTML(student.sex)}
            </p>

            <p>
                <strong>Class:</strong>
                ${escapeHTML(student.class)}
            </p>

            <p>
                <strong>Option:</strong>
                ${escapeHTML(student.option || "N/A")}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHTML(student.email)}
            </p>

            <p>
                <strong>Address:</strong>
                ${escapeHTML(student.address)}
            </p>
        `
    );
}


function printAllStudents() {

    const rows =
        db.students.map(student => `

            <tr>

                <td>
                    ${escapeHTML(student.registrationNumber)}
                </td>

                <td>
                    ${escapeHTML(fullStudentName(student))}
                </td>

                <td>
                    ${escapeHTML(student.class)}
                </td>

                <td>
                    ${escapeHTML(student.option || "N/A")}
                </td>

                <td>
                    ${escapeHTML(student.status)}
                </td>

            </tr>

        `).join("");


    printHTML(
        "Student List",
        `
            <h1>STARDOM COLLEGE OF SCIENCE</h1>
            <h2>Student List</h2>

            <table border="1" cellpadding="8" cellspacing="0">

                <tr>
                    <th>SC Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Option</th>
                    <th>Status</th>
                </tr>

                ${rows}

            </table>
        `
    );
}


function printAllStaff() {

    const rows =
        db.staff.map(staff => `

            <tr>

                <td>
                    ${escapeHTML(staff.name)}
                </td>

                <td>
                    ${escapeHTML(staff.phone)}
                </td>

                <td>
                    ${escapeHTML(staff.email)}
                </td>

                <td>
                    ${escapeHTML(staff.qualification)}
                </td>

                <td>
                    ${escapeHTML(staff.status)}
                </td>

            </tr>

        `).join("");


    printHTML(
        "Staff List",
        `
            <h1>STARDOM COLLEGE OF SCIENCE</h1>
            <h2>Staff List</h2>

            <table border="1" cellpadding="8" cellspacing="0">

                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Qualification</th>
                    <th>Status</th>
                </tr>

                ${rows}

            </table>
        `
    );
}


function printPaymentReport() {

    const rows =
        db.students
            .filter(
                s =>
                    s.payment &&
                    s.payment.status !==
                    "not_submitted"
            )
            .map(student => `

                <tr>

                    <td>
                        ${escapeHTML(student.registrationNumber)}
                    </td>

                    <td>
                        ${escapeHTML(fullStudentName(student))}
                    </td>

                    <td>
                        ${escapeHTML(student.payment.status)}
                    </td>

                </tr>

            `).join("");


    printHTML(
        "Payment Report",
        `
            <h1>STARDOM COLLEGE OF SCIENCE</h1>
            <h2>Payment Report</h2>

            <table border="1" cellpadding="8" cellspacing="0">

                <tr>
                    <th>SC Number</th>
                    <th>Student</th>
                    <th>Status</th>
                </tr>

                ${rows}

            </table>
        `
    );
}


function printSchoolReport() {

    printHTML(
        "School Report",
        `
            <h1>STARDOM COLLEGE OF SCIENCE</h1>

            <h2>School Report</h2>

            <p>
                Total Students:
                <strong>${db.students.length}</strong>
            </p>

            <p>
                Total Staff:
                <strong>${db.staff.length}</strong>
            </p>

            <p>
                Pending Students:
                <strong>
                    ${
                        db.students.filter(
                            s => s.status === "pending"
                        ).length
                    }
                </strong>
            </p>

            <p>
                Pending Staff:
                <strong>
                    ${
                        db.staff.filter(
                            s => s.status === "pending"
                        ).length
                    }
                </strong>
            </p>

            <p>
                Pending Payments:
                <strong>
                    ${
                        db.students.filter(
                            s =>
                                s.payment &&
                                s.payment.status ===
                                "pending"
                        ).length
                    }
                </strong>
            </p>
        `
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("active");
}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("active");
}


/* =========================================================
   PASSWORD
   ========================================================= */

function togglePassword(id) {

    const input =
        document.getElementById(id);

    if (!input) {
        return;
    }


    input.type =
        input.type === "password"
            ? "text"
            : "password";
}


/* =========================================================
   CLASS OPTION
   ========================================================= */

function handleClassChange() {

    const classValue =
        value("studentClass");

    const optionGroup =
        document.getElementById(
            "optionGroup"
        );

    const option =
        document.getElementById(
            "studentOption"
        );


    if (!optionGroup || !option) {
        return;
    }


    const isSS =
        ["SS1", "SS2", "SS3"]
            .includes(classValue);


    if (isSS) {

        optionGroup.classList.remove(
            "hidden"
        );

        option.required = true;

    } else {

        optionGroup.classList.add(
            "hidden"
        );

        option.required = false;

        option.value = "";
    }
}


/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

function previewImage(input, previewID) {

    const preview =
        document.getElementById(
            previewID
        );


    if (!preview) {
        return;
    }


    if (
        !input.files ||
        !input.files[0]
    ) {

        preview.innerHTML =
            "<span>📷</span><small>Select Passport</small>";

        return;
    }


    const file =
        input.files[0];


    if (!file.type.startsWith("image/")) {

        preview.innerHTML =
            "<span>❌</span><small>Image required</small>";

        return;
    }


    const reader =
        new FileReader();


    reader.onload = function () {

        preview.innerHTML = `
            <img
                src="${reader.result}"
                alt="Preview"
                style="max-width:100%;max-height:180px;object-fit:cover;border-radius:10px;">
        `;
    };


    reader.readAsDataURL(file);
}


/* =========================================================
   IMAGE COMPRESSION
   ========================================================= */

function compressImage(
    file,
    maxWidth = 600,
    quality = 0.65
) {

    return new Promise(
        (resolve, reject) => {

            if (
                !file ||
                !file.type.startsWith("image/")
            ) {

                reject(
                    new Error(
                        "Invalid image file."
                    )
                );

                return;
            }


            const reader =
                new FileReader();


            reader.onerror = function () {

                reject(
                    new Error(
                        "Unable to read image."
                    )
                );
            };


            reader.onload = function () {

                const image =
                    new Image();


                image.onerror =
                    function () {

                        reject(
                            new Error(
                                "Invalid image."
                            )
                        );
                    };


                image.onload =
                    function () {

                        let width =
                            image.width;

                        let height =
                            image.height;


                        if (
                            width >
                            maxWidth
                        ) {

                            const ratio =
                                maxWidth /
                                width;

                            width =
                                maxWidth;

                            height =
                                Math.round(
                                    height *
                                    ratio
                                );
                        }


                        const canvas =
                            document.createElement(
                                "canvas"
                            );


                        canvas.width =
                            width;

                        canvas.height =
                            height;


                        const context =
                            canvas.getContext(
                                "2d"
                            );


                        context.drawImage(
                            image,
                            0,
                            0,
                            width,
                            height
                        );


                        const result =
                            canvas.toDataURL(
                                "image/jpeg",
                                quality
                            );


                        resolve(result);
                    };


                image.src =
                    reader.result;
            };


            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    clearSession();

    currentStaffStudent = null;

    showPage("landingPage");

    showToast(
        "You have been logged out.",
        "success"
    );
}


/* =========================================================
   ID GENERATOR
   ========================================================= */

function createID(prefix) {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    ).toUpperCase();
}


/* =========================================================
   STUDENT REGISTRATION NUMBER
   ========================================================= */

function generateStudentRegistrationNumber(
    studentClass,
    option
) {

    const year =
        String(
            new Date().getFullYear()
        ).slice(-2);


    let classCode =
        studentClass
            .replace(/\s+/g, "")
            .toUpperCase();


    if (
        ["SS1", "SS2", "SS3"]
            .includes(studentClass)
    ) {

        classCode =
            option === "SCI"
                ? "SCI"
                : "ART";
    }


    db.counters.student =
        Number(
            db.counters.student || 0
        ) + 1;


    const number =
        String(
            db.counters.student
        ).padStart(3, "0");


    return (
        "SC" +
        year +
        "-" +
        classCode +
        "-" +
        number
    );
}


/* =========================================================
   HELPERS
   ========================================================= */

function value(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    ).trim();
}


function setText(id, text) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            text == null
                ? ""
                : text;
    }
}


function fullStudentName(student) {

    return [
        student.surname,
        student.firstName,
        student.middleName
    ]
        .filter(Boolean)
        .join(" ");
}


function capitalize(text) {

    if (!text) {
        return "";
    }

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


function statusBadge(status) {

    const clean =
        String(
            status || "unknown"
        );


    return `
        <span class="status-badge">
            ${escapeHTML(
                clean.charAt(0).toUpperCase() +
                clean.slice(1)
            )}
        </span>
    `;
}


/* =========================================================
   SECURITY / HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

    return String(
        value == null
            ? ""
            : value
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "info"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        alert(message);
        return;
    }


    toast.textContent =
        message;


    toast.className =
        "toast " +
        type;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.__toastTimer
    );


    window.__toastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );
}


/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHTML(
    title,
    content
) {

    const printWindow =
        window.open(
            "",
            "_blank"
        );


    if (!printWindow) {

        showToast(
            "Please allow popups to print.",
            "warning"
        );

        return;
    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                ${escapeHTML(title)}
            </title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #111;
                }

                h1, h2 {
                    text-align: center;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    border: 1px solid #333;
                    padding: 8px;
                    text-align: left;
                }

            </style>

        </head>

        <body>

            ${content}

        </body>

        </html>

    `);


    printWindow.document.close();

    printWindow.focus();

    setTimeout(
        function () {

            printWindow.print();

        },
        500
    );
}

/* =========================================================
   FIX: VIEW / EDIT / SCORE BUTTONS
   ========================================================= */

function forceOpenModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        alert("Modal not found: " + id);
        return;
    }

    modal.style.display = "flex";
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}


function forceCloseModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.style.display = "none";
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}


/* =========================
   VIEW STUDENT
   ========================= */

function viewStudent(id) {

    const student = db.students.find(
        s => String(s.id) === String(id)
    );

    if (!student) {
        alert("Student record not found.");
        return;
    }

    const content =
        document.getElementById("editModalContent");

    if (!content) {
        alert("Edit modal content was not found.");
        return;
    }

    content.innerHTML = `
        <div style="text-align:center;">

            ${
                student.passport
                ? `
                    <img
                        src="${student.passport}"
                        alt="Student Passport"
                        style="
                            width:120px;
                            height:120px;
                            object-fit:cover;
                            border-radius:12px;
                            margin-bottom:15px;
                        "
                    >
                `
                : `
                    <div style="font-size:60px;">
                        👤
                    </div>
                `
            }

            <h3>
                ${escapeHTML(fullStudentName(student))}
            </h3>

            <p>
                <strong>SC Number:</strong>
                ${escapeHTML(student.registrationNumber)}
            </p>

            <p>
                <strong>Class:</strong>
                ${escapeHTML(student.class)}
            </p>

            <p>
                <strong>Option:</strong>
                ${escapeHTML(student.option || "N/A")}
            </p>

            <p>
                <strong>Date of Birth:</strong>
                ${escapeHTML(student.dob)}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHTML(student.sex)}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHTML(student.email)}
            </p>

            <p>
                <strong>Address:</strong>
                ${escapeHTML(student.address)}
            </p>

            <p>
                <strong>Status:</strong>
                ${student.status}
            </p>

        </div>
    `;

    forceOpenModal("editModal");
}


/* =========================
   EDIT STUDENT
   ========================= */

function editStudent(id) {

    const student = db.students.find(
        s => String(s.id) === String(id)
    );

    if (!student) {
        alert("Student record not found.");
        return;
    }

    const content =
        document.getElementById("editModalContent");

    if (!content) {
        alert("Edit modal content was not found.");
        return;
    }

    content.innerHTML = `

        <h3>Edit Student</h3>

        <div class="input-group">
            <label>Surname</label>
            <input
                type="text"
                id="editStudentSurname"
                value="${escapeAttribute(student.surname)}"
            >
        </div>

        <div class="input-group">
            <label>First Name</label>
            <input
                type="text"
                id="editStudentFirst"
                value="${escapeAttribute(student.firstName)}"
            >
        </div>

        <div class="input-group">
            <label>Middle Name</label>
            <input
                type="text"
                id="editStudentMiddle"
                value="${escapeAttribute(student.middleName || "")}"
            >
        </div>

        <div class="input-group">
            <label>Email</label>
            <input
                type="email"
                id="editStudentEmail"
                value="${escapeAttribute(student.email)}"
            >
        </div>

        <div class="input-group">
            <label>Address</label>
            <textarea
                id="editStudentAddress"
                rows="4"
            >${escapeHTML(student.address)}</textarea>
        </div>

        <button
            type="button"
            class="btn primary full"
            onclick="saveStudentEdit('${student.id}')"
        >
            Save Changes
        </button>
    `;

    forceOpenModal("editModal");
}


function saveStudentEdit(id) {

    const student = db.students.find(
        s => String(s.id) === String(id)
    );

    if (!student) {
        alert("Student not found.");
        return;
    }

    const surname =
        value("editStudentSurname");

    const firstName =
        value("editStudentFirst");

    const middleName =
        value("editStudentMiddle");

    const email =
        value("editStudentEmail");

    const address =
        value("editStudentAddress");


    if (!surname || !firstName || !email || !address) {

        alert(
            "Please complete all required fields."
        );

        return;
    }


    const emailUsed =
        db.students.some(
            s =>
                s.id !== student.id &&
                String(s.email).toLowerCase() ===
                email.toLowerCase()
        );


    if (emailUsed) {

        alert(
            "This email is already used by another student."
        );

        return;
    }


    student.surname =
        surname;

    student.firstName =
        firstName;

    student.middleName =
        middleName;

    student.email =
        email;

    student.address =
        address;


    if (!saveDatabase()) {
        return;
    }


    forceCloseModal("editModal");

    renderStudentsTable();

    renderPendingStudents();

    showToast(
        "Student details updated successfully.",
        "success"
    );
}


/* =========================================================
   SCORE MODAL
   ========================================================= */

function openScoreModal() {

    const modal =
        document.getElementById("scoreModal");

    if (!modal) {
        alert("Score modal not found.");
        return;
    }

    const regInput =
        document.getElementById("scoreRegNo");

    if (
        currentStaffStudent &&
        regInput
    ) {
        regInput.value =
            currentStaffStudent.registrationNumber;
    }

    const subject =
        document.getElementById("scoreSubject");

    const ca =
        document.getElementById("caScore");

    const exam =
        document.getElementById("examScore");

    const calculation =
        document.getElementById("scoreCalculation");


    if (subject) subject.value = "";
    if (ca) ca.value = "";
    if (exam) exam.value = "";

    if (calculation) {
        calculation.innerHTML = "";
    }

    forceOpenModal("scoreModal");
}


function openScoreModalForStudent(regNo) {

    const input =
        document.getElementById("scoreRegNo");

    if (input) {
        input.value = regNo;
    }

    forceOpenModal("scoreModal");
}


/* =========================================================
   SAVE SCORE - FIXED
   ========================================================= */

function saveScore() {

    if (
        !currentSession ||
        currentSession.role !== "staff"
    ) {

        alert(
            "Only approved staff can enter scores."
        );

        return;
    }


    const regNo =
        value("scoreRegNo")
            .toUpperCase();

    const subject =
        value("scoreSubject");

    const ca =
        Number(value("caScore"));

    const exam =
        Number(value("examScore"));


    if (!regNo) {

        alert(
            "Enter the student's SC Registration Number."
        );

        return;
    }


    if (!subject) {

        alert(
            "Enter the subject."
        );

        return;
    }


    if (
        !Number.isFinite(ca) ||
        ca < 0 ||
        ca > 40
    ) {

        alert(
            "CA must be between 0 and 40."
        );

        return;
    }


    if (
        !Number.isFinite(exam) ||
        exam < 0 ||
        exam > 60
    ) {

        alert(
            "Exam must be between 0 and 60."
        );

        return;
    }


    const student =
        db.students.find(
            s =>
                String(
                    s.registrationNumber
                ).toUpperCase() === regNo
        );


    if (!student) {

        alert(
            "Student with this SC number was not found."
        );

        return;
    }


    if (!Array.isArray(student.scores)) {
        student.scores = [];
    }


    const total =
        ca + exam;


    let grade = "F";


    if (total >= 70) {
        grade = "A";
    } else if (total >= 60) {
        grade = "B";
    } else if (total >= 50) {
        grade = "C";
    } else if (total >= 45) {
        grade = "D";
    } else if (total >= 40) {
        grade = "E";
    }


    const existing =
        student.scores.find(
            s =>
                String(s.subject)
                    .toLowerCase() ===
                subject.toLowerCase()
        );


    const scoreData = {

        subject: subject,

        ca: ca,

        exam: exam,

        total: total,

        grade: grade,

        enteredBy:
            currentSession.id,

        updatedAt:
            new Date().toISOString()
    };


    if (existing) {

        Object.assign(
            existing,
            scoreData
        );

    } else {

        student.scores.push(
            scoreData
        );
    }


    if (!saveDatabase()) {
        return;
    }


    const calculation =
        document.getElementById(
            "scoreCalculation"
        );


    if (calculation) {

        calculation.innerHTML = `
            <div class="notice">

                <strong>
                    Score Successfully Submitted
                </strong>

                <p>
                    Subject:
                    ${escapeHTML(subject)}
                </p>

                <p>
                    CA:
                    ${ca}/40
                </p>

                <p>
                    Exam:
                    ${exam}/60
                </p>

                <p>
                    Total:
                    <strong>${total}/100</strong>
                </p>

                <p>
                    Grade:
                    <strong>${grade}</strong>
                </p>

            </div>
        `;
    }


    if (
        currentStaffStudent &&
        currentStaffStudent.id === student.id
    ) {
        currentStaffStudent = student;
    }


    showToast(
        "Score saved successfully.",
        "success"
    );


    setTimeout(
        function () {
            forceCloseModal("scoreModal");
        },
        1200
    );
}


/* =========================================================
   CLOSE BUTTON FIX
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target.classList.contains(
                "modal-close"
            )
        ) {

            const modal =
                event.target.closest(".modal");

            if (modal) {

                modal.style.display =
                    "none";

                modal.classList.remove(
                    "active"
                );
            }
        }

    }
);

/* =========================================================
   STARDOM COLLEGE - MENU FIX
   ========================================================= */

function toggleSidebar() {
    const menu = document.querySelector(".menu-btn");

    let sidebar = document.getElementById("schoolSidebar");

    /* Create sidebar automatically if it does not exist */
    if (!sidebar) {

        sidebar = document.createElement("aside");

        sidebar.id = "schoolSidebar";

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div>
                    <strong>STARDOM COLLEGE</strong>
                    <small>OF SCIENCE</small>
                </div>

                <button
                    type="button"
                    class="sidebar-close"
                    onclick="toggleSidebar()">
                    ×
                </button>
            </div>

            <nav class="sidebar-nav">

                <button
                    type="button"
                    onclick="menuGo('landingPage')">
                    🏠 Home
                </button>

                <button
                    type="button"
                    onclick="menuGo('studentRegister')">
                    🎓 Student Registration
                </button>

                <button
                    type="button"
                    onclick="menuGo('staffRegister')">
                    👨‍🏫 Apply as Staff
                </button>

                <button
                    type="button"
                    onclick="menuGo('loginPage')">
                    🔐 Login
                </button>

                <button
                    type="button"
                    onclick="menuGo('managementRegister')">
                    🏫 Management
                </button>

                <hr>

                <button
                    type="button"
                    onclick="menuLogout()">
                    🚪 Logout
                </button>

            </nav>
        `;

        document.body.appendChild(sidebar);

        /* Overlay */
        const overlay =
            document.createElement("div");

        overlay.id = "sidebarOverlay";

        overlay.onclick = function () {
            closeSidebar();
        };

        document.body.appendChild(overlay);
    }

    if (
        sidebar.classList.contains("open")
    ) {
        closeSidebar();
    } else {
        openSidebar();
    }
}


/* =========================
   OPEN SIDEBAR
   ========================= */

function openSidebar() {

    const sidebar =
        document.getElementById(
            "schoolSidebar"
        );

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (sidebar) {
        sidebar.classList.add("open");
    }

    if (overlay) {
        overlay.classList.add("show");
    }

    document.body.classList.add(
        "menu-open"
    );
}


/* =========================
   CLOSE SIDEBAR
   ========================= */

function closeSidebar() {

    const sidebar =
        document.getElementById(
            "schoolSidebar"
        );

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    if (overlay) {
        overlay.classList.remove("show");
    }

    document.body.classList.remove(
        "menu-open"
    );
}


/* =========================
   MENU NAVIGATION
   ========================= */

function menuGo(pageId) {

    closeSidebar();

    if (
        typeof showPage === "function"
    ) {
        showPage(pageId);
    } else {

        document
            .querySelectorAll(".page")
            .forEach(function(page) {
                page.classList.remove("active");
            });

        const page =
            document.getElementById(pageId);

        if (page) {
            page.classList.add("active");
        }
    }
}


/* =========================
   MENU LOGOUT
   ========================= */

function menuLogout() {

    closeSidebar();

    if (
        typeof logout === "function"
    ) {
        logout();
        return;
    }

    localStorage.removeItem(
        "STARDOM_COLLEGE_SESSION"
    );

    location.reload();
}


/* =========================================================
   END MENU JAVASCRIPT
   ========================================================= */

/* =========================================================
   STARDOM COLLEGE
   MANAGEMENT STAFF SYSTEM
   ========================================================= */


/* =========================
   CHECK CURRENT MANAGEMENT
   ========================= */

function isManagementUser() {

    if (!currentSession) {
        return false;
    }

    return (
        currentSession.role === "Management" ||
        currentSession.role === "management"
    );
}


/* =========================
   OPEN ADD MANAGEMENT STAFF
   ========================= */

function openAddManagementStaff() {

    if (!isManagementUser()) {

        alert(
            "Only Management can add Management Staff."
        );

        return;
    }


    const modal =
        document.getElementById(
            "managementStaffModal"
        );


    if (!modal) {

        alert(
            "Management Staff modal was not found."
        );

        return;
    }


    const form =
        document.getElementById(
            "managementStaffForm"
        );


    if (form) {
        form.reset();
    }


    modal.style.display = "flex";
    modal.classList.add("active");
}


/* =========================
   CREATE MANAGEMENT STAFF
   ========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const form =
            document.getElementById(
                "managementStaffForm"
            );


        if (!form) return;


        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!isManagementUser()) {

                    alert(
                        "Only Management can create Management Staff."
                    );

                    return;
                }


                const name =
                    document
                    .getElementById(
                        "managementStaffName"
                    )
                    .value
                    .trim();


                const username =
                    document
                    .getElementById(
                        "managementStaffUsername"
                    )
                    .value
                    .trim()
                    .toLowerCase();


                const email =
                    document
                    .getElementById(
                        "managementStaffEmail"
                    )
                    .value
                    .trim()
                    .toLowerCase();


                const password =
                    document
                    .getElementById(
                        "managementStaffPassword"
                    )
                    .value;


                if (
                    !name ||
                    !username ||
                    !email ||
                    !password
                ) {

                    alert(
                        "Please complete all fields."
                    );

                    return;
                }


                if (password.length < 6) {

                    alert(
                        "Password must contain at least 6 characters."
                    );

                    return;
                }


                if (!Array.isArray(db.managementStaff)) {

                    db.managementStaff = [];
                }


                const usernameExists =
                    db.management.some(
                        account =>
                            String(
                                account.username
                            )
                            .toLowerCase() ===
                            username
                    )
                    ||
                    db.managementStaff.some(
                        account =>
                            String(
                                account.username
                            )
                            .toLowerCase() ===
                            username
                    );


                if (usernameExists) {

                    alert(
                        "This username is already in use."
                    );

                    return;
                }


                const emailExists =
                    db.managementStaff.some(
                        account =>
                            String(
                                account.email
                            )
                            .toLowerCase() ===
                            email
                    );


                if (emailExists) {

                    alert(
                        "This email is already registered."
                    );

                    return;
                }


                const managementStaff = {

                    id:
                        "MS-" +
                        Date.now() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .substring(2, 8),

                    name: name,

                    username: username,

                    email: email,

                    password: password,

                    role: "Management Staff",

                    status: "Active",

                    createdAt:
                        new Date()
                        .toISOString(),

                    createdBy:
                        currentSession.id
                };


                db.managementStaff.push(
                    managementStaff
                );


                if (
                    typeof saveDatabase ===
                    "function"
                ) {

                    const saved =
                        saveDatabase();

                    if (saved === false) {
                        return;
                    }

                } else if (
                    typeof saveDB ===
                    "function"
                ) {

                    saveDB();

                } else {

                    localStorage.setItem(
                        "STARDOM_COLLEGE_DATABASE",
                        JSON.stringify(db)
                    );
                }


                form.reset();


                closeModal(
                    "managementStaffModal"
                );


                renderManagementStaff();


                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Management Staff created successfully.",
                        "success"
                    );

                } else {

                    alert(
                        "Management Staff created successfully."
                    );
                }

            }
        );

    }
);


/* =========================================================
   RENDER MANAGEMENT STAFF
   ========================================================= */

function renderManagementStaff() {

    const container =
        document.getElementById(
            "managementStaffList"
        );


    if (!container) return;


    if (
        !Array.isArray(
            db.managementStaff
        )
    ) {

        db.managementStaff = [];
    }


    if (
        db.managementStaff.length === 0
    ) {

        container.innerHTML = `
            <div class="notice">
                No Management Staff account has been created yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        db.managementStaff
        .map(
            staff => `

                <div class="card"
                     style="margin-bottom:15px;">

                    <h3>
                        ${escapeHTML(
                            staff.name
                        )}
                    </h3>

                    <p>
                        <strong>
                            Username:
                        </strong>

                        ${escapeHTML(
                            staff.username
                        )}
                    </p>

                    <p>
                        <strong>
                            Email:
                        </strong>

                        ${escapeHTML(
                            staff.email
                        )}
                    </p>

                    <p>
                        <strong>
                            Role:
                        </strong>

                        Management Staff
                    </p>

                    <p>
                        <strong>
                            Status:
                        </strong>

                        ${escapeHTML(
                            staff.status
                        )}
                    </p>


                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                        ">

                        <button
                            class="btn secondary"
                            onclick="
                                viewManagementStaff(
                                    '${staff.id}'
                                )
                            ">
                            View
                        </button>


                        <button
                            class="btn primary"
                            onclick="
                                editManagementStaff(
                                    '${staff.id}'
                                )
                            ">
                            Edit
                        </button>


                        <button
                            class="btn secondary"
                            onclick="
                                toggleManagementStaff(
                                    '${staff.id}'
                                )
                            ">
                            ${
                                staff.status ===
                                "Active"
                                ? "Disable"
                                : "Enable"
                            }
                        </button>


                        <button
                            class="btn danger"
                            onclick="
                                deleteManagementStaff(
                                    '${staff.id}'
                                )
                            ">
                            Delete
                        </button>

                    </div>

                </div>

            `
        )
        .join("");
}


/* =========================================================
   VIEW MANAGEMENT STAFF
   ========================================================= */

function viewManagementStaff(id) {

    if (!isManagementUser()) {

        alert(
            "Only Management can view this section."
        );

        return;
    }


    const staff =
        db.managementStaff.find(
            s =>
                String(s.id) ===
                String(id)
        );


    if (!staff) {

        alert(
            "Management Staff account not found."
        );

        return;
    }


    alert(
        "Name: " + staff.name +
        "\nUsername: " + staff.username +
        "\nEmail: " + staff.email +
        "\nRole: " + staff.role +
        "\nStatus: " + staff.status
    );
}


/* =========================================================
   EDIT MANAGEMENT STAFF
   ========================================================= */

function editManagementStaff(id) {

    if (!isManagementUser()) {

        alert(
            "Only Management can edit Management Staff."
        );

        return;
    }


    const staff =
        db.managementStaff.find(
            s =>
                String(s.id) ===
                String(id)
        );


    if (!staff) {

        alert(
            "Management Staff not found."
        );

        return;
    }


    const newName =
        prompt(
            "Enter new full name:",
            staff.name
        );


    if (newName === null) {
        return;
    }


    const newEmail =
        prompt(
            "Enter new email:",
            staff.email
        );


    if (newEmail === null) {
        return;
    }


    staff.name =
        newName.trim();

    staff.email =
        newEmail.trim()
        .toLowerCase();


    if (
        typeof saveDatabase ===
        "function"
    ) {

        if (
            saveDatabase() ===
            false
        ) {
            return;
        }

    } else {

        localStorage.setItem(
            "STARDOM_COLLEGE_DATABASE",
            JSON.stringify(db)
        );
    }


    renderManagementStaff();


    if (
        typeof showToast ===
        "function"
    ) {

        showToast(
            "Management Staff updated.",
            "success"
        );

    } else {

        alert(
            "Management Staff updated."
        );
    }
}


/* =========================================================
   ENABLE / DISABLE
   ========================================================= */

function toggleManagementStaff(id) {

    if (!isManagementUser()) {

        alert(
            "Only Management can change this account."
        );

        return;
    }


    const staff =
        db.managementStaff.find(
            s =>
                String(s.id) ===
                String(id)
        );


    if (!staff) return;


    if (
        staff.status ===
        "Active"
    ) {

        staff.status =
            "Disabled";

    } else {

        staff.status =
            "Active";
    }


    if (
        typeof saveDatabase ===
        "function"
    ) {

        saveDatabase();

    } else {

        localStorage.setItem(
            "STARDOM_COLLEGE_DATABASE",
            JSON.stringify(db)
        );
    }


    renderManagementStaff();
}


/* =========================================================
   DELETE MANAGEMENT STAFF
   ========================================================= */

function deleteManagementStaff(id) {

    if (!isManagementUser()) {

        alert(
            "Only Management can delete Management Staff."
        );

        return;
    }


    const index =
        db.managementStaff.findIndex(
            s =>
                String(s.id) ===
                String(id)
        );


    if (index === -1) {

        alert(
            "Management Staff not found."
        );

        return;
    }


    const staff =
        db.managementStaff[index];


    const confirmed =
        confirm(
            "Delete Management Staff account for " +
            staff.name +
            "?"
        );


    if (!confirmed) {
        return;
    }


    db.managementStaff.splice(
        index,
        1
    );


    if (
        typeof saveDatabase ===
        "function"
    ) {

        saveDatabase();

    } else {

        localStorage.setItem(
            "STARDOM_COLLEGE_DATABASE",
            JSON.stringify(db)
        );
    }


    renderManagementStaff();


    if (
        typeof showToast ===
        "function"
    ) {

        showToast(
            "Management Staff deleted.",
            "success"
        );

    } else {

        alert(
            "Management Staff deleted."
        );
    }
}


/* =========================================================
   LOGIN SUPPORT FOR MANAGEMENT STAFF
   ========================================================= */

function loginManagementStaff(
    username,
    password
) {

    if (
        !Array.isArray(
            db.managementStaff
        )
    ) {
        return null;
    }


    const staff =
        db.managementStaff.find(
            account =>

                String(
                    account.username
                )
                .toLowerCase() ===
                String(username)
                .toLowerCase()

                &&

                account.password ===
                password
        );


    if (!staff) {
        return null;
    }


    if (
        staff.status !==
        "Active"
    ) {

        alert(
            "This Management Staff account is disabled."
        );

        return null;
    }


    return {

        id: staff.id,

        name: staff.name,

        username: staff.username,

        role: "Management Staff",

        type: "managementStaff"
    };
}


/* =========================================================
   AUTO RENDER
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setTimeout(
            function () {

                if (
                    typeof renderManagementStaff ===
                    "function"
                ) {

                    renderManagementStaff();
                }

            },
            300
        );
    }
);

/* =========================================================
   END
   ========================================================= */
   
   