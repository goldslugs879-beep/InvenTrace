// --- 1. INITIAL STATE & DATA PERSISTENCE ---
let inventory = JSON.parse(localStorage.getItem('pantryData')) || {};
let logs = JSON.parse(localStorage.getItem('pantryLogs')) || [];
let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts')) || {};
let isSystemActive = true;
let activeStaffName = "";
const MASTER_PIN = "1234"; 

// --- 2. AUTHENTICATION & SECURITY ---
function openSecurity() { document.getElementById('security-modal').style.display = 'flex'; }
function closeModal() { 
    document.getElementById('security-modal').style.display = 'none'; 
    document.getElementById('pin-input').value = ''; 
}

function validatePIN() {
    if (document.getElementById('pin-input').value === MASTER_PIN) {
        switchView('manager');
        closeModal();
    } else { 
        alert("Incorrect Security Code!"); 
    }
}

// --- 3. EDIT & DELETE LOGIC ---
function editItem(itemName) {
    const item = inventory[itemName];
    const newQty = prompt(`Edit Quantity for ${itemName}:`, item.quantity);
    const newCat = prompt(`Edit Category for ${itemName}:`, item.category);

    if (newQty !== null && newCat !== null) {
        inventory[itemName].quantity = parseInt(newQty);
        inventory[itemName].category = newCat;
        inventory[itemName].lastBy = "Manager (Edited)";
        saveAndRefresh();
        alert(`✅ Updated ${itemName} successfully!`);
    }
}

function deleteItem(itemName) {
    if (confirm(`⚠️ Are you sure you want to delete ${itemName}?`)) {
        delete inventory[itemName];
        saveAndRefresh();
    }
}

function deleteStaff(id) {
    if (confirm("Delete this staff account?")) {
        delete staffAccounts[id];
        localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
        renderStaffDirectory();
    }
}

// --- 4. DATA SYNC & RENDERING ---
function saveAndRefresh() {
    localStorage.setItem('pantryData', JSON.stringify(inventory));
    localStorage.setItem('pantryLogs', JSON.stringify(logs));
    renderApp();
}

function renderApp() {
    const table = document.getElementById('inventory-body');
    const staffSelect = document.getElementById('staff-item-list');
    const logBox = document.getElementById('audit-log');
    let total = 0;

    table.innerHTML = "";
    // Check if staffSelect exists before trying to update it
    if (staffSelect) staffSelect.innerHTML = '<option value="" disabled selected>Select Item...</option>';
    
    for (let key in inventory) {
        const item = inventory[key];
        total += item.quantity;
        
        // This row now correctly includes your Edit and Delete buttons
        table.innerHTML += `
            <tr>
                <td><strong>${key}</strong></td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>${item.lastBy}</td>
                <td>
                    <button onclick="editItem('${key}')" class="btn-edit-small">Edit</button>
                    <button onclick="deleteItem('${key}')" class="btn-del-small">Delete</button>
                </td>
            </tr>`;
        
        if (staffSelect) staffSelect.innerHTML += `<option value="${key}">${key}</option>`;
    }

    if (logBox) logBox.innerHTML = logs.map(l => `<div class="log-entry">> ${l}</div>`).join('');
    document.getElementById('grand-total').innerText = total;
}

// --- 5. TRANSACTION ENGINE ---
function processTransaction(type) {
    if (!isSystemActive && type === 'remove') return alert("System is currently INACTIVE.");

    const itemInput = type === 'add' ? document.getElementById('mgr-item') : document.getElementById('staff-item-list');
    const qtyInput = type === 'add' ? document.getElementById('mgr-qty') : document.getElementById('staff-qty');
    
    const item = itemInput.value;
    const qty = qtyInput.value;
    const actor = type === 'add' ? "Manager" : activeStaffName;

    if (!item || isNaN(qty) || qty <= 0) return alert("Please enter valid details.");

    if (type === 'add') {
        const cat = document.getElementById('mgr-cat').value || "General";
        if (!inventory[item]) inventory[item] = { quantity: 0, category: cat };
        inventory[item].quantity += qty;
        inventory[item].lastBy = "Manager";
        // Clear inputs
        itemInput.value = ""; qtyInput.value = ""; document.getElementById('mgr-cat').value = "";
    } else {
        if (!inventory[item] || inventory[item].quantity < qty) return alert("❌ Stock unavailable!");
        inventory[item].quantity -= qty;
        inventory[item].lastBy = actor;
        alert(`✅ Successfully removed ${qty} ${item}.`);
        logoutStaff();
    }

    logs.unshift(`[${new Date().toLocaleTimeString()}] ${actor} ${type.toUpperCase()}ED ${qty} ${item}`);
    saveAndRefresh();
}

// --- 6. VIEW & STAFF HELPERS ---
function switchView(view) {
    document.getElementById('staff-section').style.display = view === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = view === 'manager' ? 'block' : 'none';
    if (view === 'manager') renderStaffDirectory();
    document.getElementById('tab-staff').classList.toggle('active-tab', view === 'staff');
    document.getElementById('tab-manager').classList.toggle('active-tab', view === 'manager');
}

function staffLogin() {
    const id = document.getElementById('staff-id-entry').value.trim();
    if (staffAccounts[id]) {
        activeStaffName = staffAccounts[id].name;
        document.getElementById('staff-login-area').style.display = 'none';
        document.getElementById('staff-action-area').style.display = 'block';
        document.getElementById('greeting').innerText = `Welcome, ${activeStaffName}`;
    } else { alert("Access Denied: ID not found."); }
}

function logoutStaff() {
    activeStaffName = "";
    document.getElementById('staff-id-entry').value = "";
    document.getElementById('staff-login-area').style.display = 'block';
    document.getElementById('staff-action-area').style.display = 'none';
}

function renderStaffDirectory() {
    const body = document.getElementById('staff-directory-body');
    if (!body) return;
    body.innerHTML = "";
    for (let id in staffAccounts) {
        body.innerHTML += `
            <tr>
                <td><code>${id}</code></td>
                <td>${staffAccounts[id].name}</td>
                <td>${staffAccounts[id].gender}</td>
                <td>${staffAccounts[id].contact || 'N/A'}</td>
                <td><button onclick="deleteStaff('${id}')" class="btn-del-small">Delete</button></td>
            </tr>`;
    }
}

function createStaffAccount() {
    const id = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const contact = document.getElementById('new-staff-contact').value.trim();
    const gender = document.getElementById('new-staff-gender').value;

    if (id && name && contact && gender) {
        staffAccounts[id] = { name, contact, gender };
        localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
        renderStaffDirectory();
        document.getElementById('new-staff-id').value = '';
        document.getElementById('new-staff-name').value = '';
        document.getElementById('new-staff-contact').value = '';
        document.getElementById('new-staff-gender').value = '';
        alert("Staff account created successfully!");
    }
}
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    
    // Optional: Save preference so it stays dark when you refresh
    localStorage.setItem('theme', newTheme);
}

// Add this to your window.onload to remember the choice
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
});
// --- CLEAR ONLY THE HISTORY LOGS ---
function clearAuditLogs() {
    if (confirm("Are you sure you want to clear the entire history log?")) {
        logs = []; // Empty the array
        localStorage.setItem('pantryLogs', JSON.stringify(logs)); // Save empty list
        renderApp(); // Refresh the UI
        alert("History logs have been cleared.");
    }
}

// --- FULL SYSTEM WIPE (Use with caution!) ---
function masterReset() {
    const confirmation = confirm("WARNING: This will delete ALL inventory items and ALL history. Proceed?");
    if (confirmation) {
        const pin = prompt("Enter Master PIN to confirm reset:");
        if (pin === MASTER_PIN) {
            localStorage.removeItem('pantryData');
            localStorage.removeItem('pantryLogs');
            inventory = {};
            logs = [];
            renderApp();
            alert("System has been fully reset.");
        } else {
            alert("Incorrect PIN. Reset cancelled.");
        }
    }
}

window.onload = renderApp;
