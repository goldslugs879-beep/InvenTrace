// --- 1. INITIAL STATE & DATA PERSISTENCE ---
let inventory = JSON.parse(localStorage.getItem('pantryData')) || {};
let logs = JSON.parse(localStorage.getItem('pantryLogs')) || [];
let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts')) || {};
let isSystemActive = true;
let activeStaffName = "";
let activeStaffId = "";
const MASTER_PIN = "1234";

// --- 2. AUTHENTICATION & THEME ---
function openSecurity() { 
    document.getElementById('security-modal').style.display = 'flex'; 
}

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
        document.getElementById('pin-input').value = '';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('pantryTheme', newTheme);
}

// --- 3. STAFF LOGIN/LOGOUT ---
function staffLogin() {
    const staffId = document.getElementById('staff-id-entry').value.trim();
    
    if (!staffId) return alert("Please enter your ID.");
    
    if (!staffAccounts[staffId]) return alert("Staff ID not found. Please contact manager.");
    
    if (!isSystemActive) return alert("System is currently INACTIVE. Contact manager.");
    
    activeStaffId = staffId;
    activeStaffName = staffAccounts[staffId].name;
    
    // Hide login, show action area
    document.getElementById('staff-login-area').style.display = 'none';
    document.getElementById('staff-action-area').style.display = 'block';
    document.getElementById('greeting').innerText = `Welcome, ${activeStaffName}!`;
    document.getElementById('staff-id-entry').value = '';
    
    renderApp();
}

function logoutStaff() {
    activeStaffId = "";
    activeStaffName = "";
    
    document.getElementById('staff-login-area').style.display = 'block';
    document.getElementById('staff-action-area').style.display = 'none';
    document.getElementById('staff-id-entry').value = '';
    document.getElementById('staff-qty').value = '';
}

// --- 4. CORE TRANSACTION ENGINE ---
function processTransaction(type) {
    if (!isSystemActive && type === 'remove') {
        return alert("System is currently INACTIVE.");
    }

    const itemInput = type === 'add' ? document.getElementById('mgr-item') : document.getElementById('staff-item-list');
    const qtyInput = type === 'add' ? document.getElementById('mgr-qty') : document.getElementById('staff-qty');
    
    const item = itemInput.value.trim();
    const qtyText = qtyInput.value.trim();
    const actor = type === 'add' ? "Manager" : activeStaffName;

    if (!item || !qtyText) return alert("Please fill in all fields.");

    if (type === 'add') {
        const cat = document.getElementById('mgr-cat').value.trim() || "General";
        inventory[item] = { 
            quantity: qtyText, 
            category: cat, 
            lastBy: "Manager",
            lastUpdated: new Date().toLocaleString()
        };
        document.getElementById('mgr-item').value = "";
        document.getElementById('mgr-qty').value = "";
        document.getElementById('mgr-cat').value = "";
        alert(`✓ Item added: ${item} (${qtyText})`);
    } else {
        if (!inventory[item]) return alert("Item not found in inventory.");
        
        inventory[item].quantity = `${qtyText} removed`;
        inventory[item].lastBy = activeStaffName;
        inventory[item].lastUpdated = new Date().toLocaleString();
        document.getElementById('staff-qty').value = '';
        alert(`✓ Action logged: ${qtyText} removed from ${item}`);
        logoutStaff();
    }

    const timestamp = new Date().toLocaleString();
    logs.unshift(`[${timestamp}] ${actor} processed ${qtyText} of ${item}`);
    saveAndRefresh();
}

// --- 5. SEARCH FUNCTIONALITY ---
function searchInventory() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const tableRows = document.querySelectorAll('#inventory-body tr');
    
    tableRows.forEach(row => {
        const itemName = row.cells[0].textContent.toLowerCase();
        const category = row.cells[1].textContent.toLowerCase();
        
        if (itemName.includes(searchTerm) || category.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// --- 6. SYSTEM STATE TOGGLE ---
function toggleSystemState() {
    isSystemActive = !isSystemActive;
    const statusPill = document.getElementById('system-status');
    const btn = document.getElementById('state-toggle-btn');
    
    if (isSystemActive) {
        statusPill.classList.remove('inactive');
        statusPill.classList.add('active');
        statusPill.innerText = 'SYSTEM ACTIVE';
        btn.innerText = 'Toggle System';
        logs.unshift(`[${new Date().toLocaleString()}] Manager ACTIVATED system`);
    } else {
        statusPill.classList.remove('active');
        statusPill.classList.add('inactive');
        statusPill.innerText = 'SYSTEM INACTIVE';
        btn.innerText = 'Reactivate System';
        logs.unshift(`[${new Date().toLocaleString()}] Manager DEACTIVATED system`);
    }
    saveAndRefresh();
}

// --- 7. MANAGER CONTROLS ---
function editItem(itemName) {
    const item = inventory[itemName];
    const newQty = prompt(`Update Quantity/Units for ${itemName}:`, item.quantity);
    
    if (newQty !== null && newQty.trim() !== '') {
        const newCat = prompt(`Update Category:`, item.category);
        if (newCat !== null) {
            inventory[itemName].quantity = newQty.trim();
            inventory[itemName].category = newCat.trim();
            inventory[itemName].lastBy = "Manager (Edit)";
            inventory[itemName].lastUpdated = new Date().toLocaleString();
            logs.unshift(`[${new Date().toLocaleString()}] Manager edited ${itemName}`);
            saveAndRefresh();
        }
    }
}

function deleteItem(itemName) {
    if (confirm(`Permanently remove ${itemName} from inventory?`)) {
        delete inventory[itemName];
        logs.unshift(`[${new Date().toLocaleString()}] Manager deleted ${itemName}`);
        saveAndRefresh();
    }
}

function clearAuditLogs() {
    if (confirm("Wipe all transaction history?")) {
        logs = [];
        saveAndRefresh();
        alert("Audit logs cleared.");
    }
}

function masterReset() {
    if (confirm("WARNING: This wipes ALL data (inventory, staff, logs). Continue?")) {
        const pin = prompt("Enter PIN to confirm wipe:");
        if (pin === MASTER_PIN) {
            localStorage.clear();
            location.reload();
        } else { 
            alert("Wrong PIN!");
        }
    }
}

// --- 8. STAFF MANAGEMENT ---
function createStaffAccount() {
    const id = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const contact = document.getElementById('new-staff-contact').value.trim();
    const gender = document.getElementById('new-staff-gender').value;

    if (!id || !name || !contact || !gender) {
        return alert("Missing details!");
    }

    if (staffAccounts[id]) {
        return alert("Staff ID already exists!");
    }

    staffAccounts[id] = { name, contact, gender };
    localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
    renderStaffDirectory();
    
    document.getElementById('new-staff-id').value = '';
    document.getElementById('new-staff-name').value = '';
    document.getElementById('new-staff-contact').value = '';
    document.getElementById('new-staff-gender').value = '';
    
    alert(`✓ Staff member ${name} registered successfully!`);
}

function renderStaffDirectory() {
    const body = document.getElementById('staff-directory-body');
    if (!body) return;
    
    body.innerHTML = "";
    
    if (Object.keys(staffAccounts).length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No staff members registered</td></tr>';
        return;
    }
    
    for (let id in staffAccounts) {
        const staff = staffAccounts[id];
        const genderInitial = staff.gender.charAt(0).toUpperCase();
        body.innerHTML += `
            <tr>
                <td><code>${id}</code></td>
                <td>${staff.name}</td>
                <td>${genderInitial}</td>
                <td>${staff.contact}</td>
                <td><button onclick="deleteStaff('${id}')" class="btn-del-small">Remove</button></td>
            </tr>`;
    }
}

function deleteStaff(id) {
    if (confirm(`Delete staff member ${staffAccounts[id].name}?`)) {
        const deletedName = staffAccounts[id].name;
        delete staffAccounts[id];
        localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
        logs.unshift(`[${new Date().toLocaleString()}] Manager deleted staff: ${deletedName}`);
        saveAndRefresh();
    }
}

// --- 9. DATA EXPORT ---
function exportData() {
    let csv = "Item,Category,Quantity,Last User,Last Updated\n";
    
    for (let key in inventory) {
        const item = inventory[key];
        csv += `"${key}","${item.category}","${item.quantity}","${item.lastBy}","${item.lastUpdated}"\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INVENTRACE_Inventory_${new Date().toLocaleDateString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// --- 10. UI RENDERING ---
function saveAndRefresh() {
    try {
        localStorage.setItem('pantryData', JSON.stringify(inventory));
        localStorage.setItem('pantryLogs', JSON.stringify(logs));
        localStorage.setItem('systemActive', JSON.stringify(isSystemActive));
    } catch (e) {
        console.error('Storage error:', e);
    }
    renderApp();
}

function renderApp() {
    const table = document.getElementById('inventory-body');
    const staffSelect = document.getElementById('staff-item-list');
    const logBox = document.getElementById('audit-log');
    let itemCount = 0;

    if (!table) return;
    
    table.innerHTML = "";
    if (staffSelect) staffSelect.innerHTML = '<option value="" disabled selected>Select Item...</option>';
    
    if (Object.keys(inventory).length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items in inventory</td></tr>';
    } else {
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
    }

    if (logBox) {
        if (logs.length === 0) {
            logBox.innerHTML = '<div class="log-entry">No transactions yet</div>';
        } else {
            logBox.innerHTML = logs.map(l => `<div class="log-entry">> ${l}</div>`).join('');
        }
    }
    
    document.getElementById('grand-total').innerText = itemCount;
}

function switchView(view) {
    document.getElementById('staff-section').style.display = view === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = view === 'manager' ? 'block' : 'none';
    
    if (view === 'manager') {
        renderStaffDirectory();
    }
}

// --- 11. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('pantryTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Restore system state
    const savedSystemState = localStorage.getItem('systemActive');
    if (savedSystemState !== null) {
        isSystemActive = JSON.parse(savedSystemState);
        const statusPill = document.getElementById('system-status');
        if (isSystemActive) {
            statusPill.classList.add('active');
            statusPill.classList.remove('inactive');
            statusPill.innerText = 'SYSTEM ACTIVE';
        } else {
            statusPill.classList.remove('active');
            statusPill.classList.add('inactive');
            statusPill.innerText = 'SYSTEM INACTIVE';
        }
    }
    
    renderApp();
});
