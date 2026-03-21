// --- INITIAL STATE ---
let inventory = {
    "Milk": { quantity: 12, category: "Dairy", lastBy: "System" },
    "Bread": { quantity: 5, category: "Produce", lastBy: "System" }
};
let logs = [];
let isSystemActive = true;
const MASTER_PIN = "1234";

// --- THEME & VIEWS ---
function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    document.getElementById('theme-btn').innerText = next === 'dark' ? "🌙 Dark Mode" : "☀️ Light Mode";
}

function requestManagerAccess() {
    document.getElementById('security-modal').style.display = 'flex';
}


function validatePIN() {
    const pin = document.getElementById('pin-input').value;
    if (pin === MASTER_PIN) {
        switchView('manager');
        closeModal();
    } else {
        alert("Incorrect Security Code!");
    }
}

function switchView(view) {
    document.getElementById('staff-section').style.display = view === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = view === 'manager' ? 'block' : 'none';
    document.getElementById('tab-staff').className = view === 'staff' ? 'active-tab' : '';
    document.getElementById('tab-manager').className = view === 'manager' ? 'active-tab' : '';
}

function closeModal() {
    document.getElementById('security-modal').style.display = 'none';
    document.getElementById('pin-input').value = '';
}
function toggleSystemState() {
    isSystemActive = !isSystemActive;
    const badge = document.getElementById('system-status');
    const toggleBtn = document.getElementById('state-toggle-btn');

    // Update Text
    badge.innerText = isSystemActive ? "SYSTEM ACTIVE" : "SYSTEM INACTIVE";
    
    // Update Class for CSS Colors
    badge.className = `status-pill ${isSystemActive ? 'active' : 'inactive'}`;
    
    // Update the button label
    toggleBtn.innerText = isSystemActive ? "Deactivate System" : "Activate System";
    
    // Optional: Log the system state change for high integrity
    const time = new Date().toLocaleTimeString();
    logs.unshift(`[${time}] SYSTEM STATE CHANGED TO: ${isSystemActive ? 'ACTIVE' : 'INACTIVE'}`);
    renderApp();
}
function addInventory() {
    if (!isSystemActive) {
        alert("ACCESS DENIED: System is currently INACTIVE (Grey Light).");
        return;
    }

    const managerName = document.getElementById('mgr-name').value.trim();
    const itemName = document.getElementById('mgr-item').value.trim();
    const category = document.getElementById('mgr-cat').value.trim();
    const quantity = parseInt(document.getElementById('mgr-qty').value);

    // Validation for High Integrity
    if (!managerName || !itemName || !category || isNaN(quantity) || quantity <= 0) {
        alert("ERROR: All fields are required to stock inventory.");
        return;
    }

    // Update Inventory Object
    if (inventory[itemName]) {
        inventory[itemName].quantity += quantity;
        inventory[itemName].lastBy = managerName;
    } else {
        inventory[itemName] = {
            quantity: quantity,
            category: category,
            lastBy: managerName
        };
    }

    // Log the "Added" event with precise metadata
    const timeStamp = new Date().toLocaleString();
    const logMessage = `[${timeStamp}] STOCK ADDED: ${managerName} added ${quantity} units to ${itemName} (${category})`;
    logs.unshift(logMessage);

    // Refresh the User Interface
    renderApp();
    clearManagerInputs();
}

function clearManagerInputs() {
    document.getElementById('mgr-item').value = '';
    document.getElementById('mgr-qty').value = '';
}

// --- CORE ENGINE ---
function toggleSystemState() {
    isSystemActive = !isSystemActive;
    const badge = document.getElementById('system-status');
    badge.innerText = isSystemActive ? "SYSTEM ACTIVE" : "SYSTEM INACTIVE";
    badge.className = `status-pill ${isSystemActive ? 'active' : 'inactive'}`;
    document.getElementById('state-toggle-btn').innerText = isSystemActive ? "Deactivate System" : "Activate System";
}

function processTransaction(type) {
    if (!isSystemActive) return alert("System is currently INACTIVE.");

    const name = type === 'add' ? document.getElementById('mgr-name').value : document.getElementById('staff-name').value;
    const item = type === 'add' ? document.getElementById('mgr-item').value : document.getElementById('staff-item-list').value;
    const qty = parseInt(type === 'add' ? document.getElementById('mgr-qty').value : document.getElementById('staff-qty').value);
    const category = type === 'add' ? document.getElementById('mgr-cat').value : "";

    if (!name || !item || isNaN(qty)) return alert("Missing data!");

    if (type === 'add') {
        if (!inventory[item]) inventory[item] = { quantity: 0, category: category };
        inventory[item].quantity += qty;
        inventory[item].lastBy = name;
    } else {
        if (inventory[item].quantity < qty) return alert("Insufficient Stock!");
        inventory[item].quantity -= qty;
        inventory[item].lastBy = name;
    }

    // High Integrity Logging
    const log = `[${new Date().toLocaleTimeString()}] ${name} ${type.toUpperCase()}ED ${qty} units of ${item}`;
    logs.unshift(log);
    renderApp();
}

function renderApp() {
    const table = document.getElementById('inventory-body');
    const staffSelect = document.getElementById('staff-item-list');
    const logBox = document.getElementById('audit-log');
    let grandTotal = 0;

    table.innerHTML = "";
    staffSelect.innerHTML = "";
    
    for (let key in inventory) {
        grandTotal += inventory[key].quantity;
        table.innerHTML += `<tr><td>${key}</td><td>${inventory[key].category}</td><td>${inventory[key].quantity}</td><td>${inventory[key].lastBy}</td></tr>`;
        staffSelect.innerHTML += `<option value="${key}">${key}</option>`;
    }

    logBox.innerHTML = logs.map(l => `<div class="log-entry">> ${l}</div>`).join('');
    document.getElementById('grand-total').innerText = grandTotal;
}

function searchInventory() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const rows = document.querySelectorAll('#inventory-body tr');
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none");
}

window.onload = renderApp;