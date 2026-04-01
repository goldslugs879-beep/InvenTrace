// --- 1. INITIAL STATE & DATA PERSISTENCE ---
// Using || {} ensures the app doesn't crash on the first run
let inventory = JSON.parse(localStorage.getItem('pantryData')) || {};
let logs = JSON.parse(localStorage.getItem('pantryLogs')) || [];
let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts')) || {};
let isSystemActive = true;
let activeStaffName = "";
const MASTER_PIN = "1234"; 

// --- 2. AUTHENTICATION & THEME ---
function openSecurity() { document.getElementById('security-modal').style.display = 'flex'; }
function closeModal() { 
    document.getElementById('security-modal').style.display = 'none'; 
    document.getElementById('pin-input').value = ''; 
}

function validatePIN() {
    if (document.getElementById('pin-input').value === MASTER_PIN) {
        switchView('manager');
        closeModal();
    } else { alert("Incorrect Security Code!"); }
}

function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('pantryTheme', newTheme);
}

// --- 3. CORE TRANSACTION ENGINE (Updated for Alphanumeric Qty) ---
function processTransaction(type) {
    if (!isSystemActive && type === 'remove') return alert("System is currently INACTIVE.");

    const itemInput = type === 'add' ? document.getElementById('mgr-item') : document.getElementById('staff-item-list');
    const qtyInput = type === 'add' ? document.getElementById('mgr-qty') : document.getElementById('staff-qty');
    
    const item = itemInput.value;
    const qtyText = qtyInput.value.trim(); // Accepts "10kg", "5 boxes", etc.
    const actor = type === 'add' ? "Manager" : activeStaffName;

    if (!item || !qtyText) return alert("Please fill in all fields.");

    if (type === 'add') {
        const cat = document.getElementById('mgr-cat').value || "General";
        inventory[item] = { 
            quantity: qtyText, 
            category: cat, 
            lastBy: "Manager" 
        };
        // Clear inputs
        itemInput.value = ""; qtyInput.value = "";
    } else {
        // Log the deduction as a status update
        inventory[item].quantity = `Updated: ${qtyText} taken`;
        inventory[item].lastBy = actor;
        alert(`Action Logged: ${qtyText} removed from ${item}`);
        logoutStaff();
    }

    logs.unshift(`[${new Date().toLocaleTimeString()}] ${actor} processed ${qtyText} of ${item}`);
    saveAndRefresh();
}

// --- 4. MANAGER CONTROLS (Edit, Delete, Reset) ---
function editItem(itemName) {
    const item = inventory[itemName];
    const newQty = prompt(`Update Quantity/Units for ${itemName}:`, item.quantity);
    const newCat = prompt(`Update Category:`, item.category);

    if (newQty !== null && newCat !== null) {
        inventory[itemName].quantity = newQty;
        inventory[itemName].category = newCat;
        inventory[itemName].lastBy = "Manager (Edit)";
        saveAndRefresh();
    }
}

function deleteItem(itemName) {
    if (confirm(`Permanently remove ${itemName} from inventory?`)) {
        delete inventory[itemName];
        saveAndRefresh();
    }
}

function clearAuditLogs() {
    if (confirm("Wipe all transaction history?")) {
        logs = [];
        saveAndRefresh();
    }
}

function masterReset() {
    if (confirm("WARNING: This wipes ALL data. Continue?")) {
        const pin = prompt("Enter PIN to confirm wipe:");
        if (pin === MASTER_PIN) {
            localStorage.clear();
            location.reload();
        } else { alert("Wrong PIN!"); }
    }
}

// --- 5. STAFF MANAGEMENT (With Contacts) ---
function createStaffAccount() {
    const id = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const contact = document.getElementById('new-staff-contact').value.trim();
    const gender = document.getElementById('new-staff-gender').value;

    if (!id || !name || !contact) return alert("Missing details!");

    staffAccounts[id] = { name, contact, gender };
    localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
    renderStaffDirectory();
    
    // Clear inputs
    document.getElementById('new-staff-id').value = '';
    document.getElementById('new-staff-name').value = '';
    document.getElementById('new-staff-contact').value = '';
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
                <td>${staffAccounts[id].contact}</td>
                <td><button onclick="deleteStaff('${id}')" class="btn-del-small">Remove</button></td>
            </tr>`;
    }
}

function deleteStaff(id) {
    if (confirm("Delete this staff member?")) {
        delete staffAccounts[id];
        localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
        renderStaffDirectory();
    }
}

// --- 6. DATA EXPORT (Excel/CSV) ---
function exportData() {
    let csv = "Item,Category,Quantity,Last User\n";
    for (let key in inventory) {
        csv += `${key},${inventory[key].category},${inventory[key].quantity},${inventory[key].lastBy}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USTED_Pantry_${new Date().toLocaleDateString()}.csv`;
    a.click();
}

// --- 7. UI RENDERING & VIEWS ---
function saveAndRefresh() {
    localStorage.setItem('pantryData', JSON.stringify(inventory));
    localStorage.setItem('pantryLogs', JSON.stringify(logs));
    renderApp();
}

function renderApp() {
    const table = document.getElementById('inventory-body');
    const staffSelect = document.getElementById('staff-item-list');
    const logBox = document.getElementById('audit-log');
    let itemCount = 0;

    table.innerHTML = "";
    if (staffSelect) staffSelect.innerHTML = '<option value="" disabled selected>Select Item...</option>';
    
    for (let key in inventory) {
        itemCount++;
        const item = inventory[key];
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
    document.getElementById('grand-total').innerText = itemCount; // Now counts unique items
}

function switchView(view) {
    document.getElementById('staff-section').style.display = view === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = view === 'manager' ? 'block' : 'none';
    if (view === 'manager') renderStaffDirectory();
}

// Initialize on Load
window.onload = () => {
    const savedTheme = localStorage.getItem('pantryTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    renderApp();
};
