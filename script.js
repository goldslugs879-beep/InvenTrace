// --- INITIAL STATE & DATA PERSISTENCE ---
let inventory = JSON.parse(localStorage.getItem('pantryData')) || {};
let logs = JSON.parse(localStorage.getItem('pantryLogs')) || [];
let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts')) || {};
let isSystemActive = true;
let activeStaffName = "";
const MASTER_PIN = "1234"; 

// --- AUTHENTICATION & SECURITY ---
function openSecurity() { document.getElementById('security-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('security-modal').style.display = 'none'; document.getElementById('pin-input').value = ''; }

function validatePIN() {
    if (document.getElementById('pin-input').value === MASTER_PIN) {
        switchView('manager');
        closeModal();
    } else { alert("Incorrect Security Code!"); }
}

// --- STAFF MANAGEMENT ---
function createStaffAccount() {
    const id = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const gender = document.getElementById('new-staff-gender').value;

    if (!id || !name || !gender) return alert("Fill Name, ID, and Gender.");
    if (staffAccounts[id]) return alert("ID already exists!");

    staffAccounts[id] = { name: name, gender: gender };
    localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
    
    renderStaffDirectory();
    alert(`Registered: ${name}`);
    
    document.getElementById('new-staff-id').value = '';
    document.getElementById('new-staff-name').value = '';
    document.getElementById('new-staff-gender').selectedIndex = 0;
}

function renderStaffDirectory() {
    const body = document.getElementById('staff-directory-body');
    body.innerHTML = "";
    for (let id in staffAccounts) {
        body.innerHTML += `
            <tr>
                <td><code>${id}</code></td>
                <td>${staffAccounts[id].name}</td>
                <td><span class="gender-tag">${staffAccounts[id].gender}</span></td>
                <td><button onclick="deleteStaff('${id}')" class="btn-remove-small">Delete</button></td>
            </tr>`;
    }
}

function deleteStaff(id) {
    if (confirm("Delete this account?")) {
        delete staffAccounts[id];
        localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
        renderStaffDirectory();
    }
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
    document.getElementById('staff-login-area').style.display = 'block';
    document.getElementById('staff-action-area').style.display = 'none';
}
// --- DATA EXPORT (CSV Format for Excel) ---
function exportData() {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header Row
    csvContent += "Item Name,Category,Quantity,Last Modified By\n";
    
    // Data Rows
    for (let item in inventory) {
        const row = `${item},${inventory[item].category},${inventory[item].quantity},${inventory[item].lastBy}`;
        csvContent += row + "\n";
    }

    // Create a hidden link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pantry_Backup_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- FULL SYSTEM RESET ---
function resetSystem() {
    const confirmation = confirm("WARNING: This will delete ALL items, staff accounts, and logs. This cannot be undone. Proceed?");
    
    if (confirmation) {
        const finalPin = prompt("Enter Master PIN to confirm full wipe:");
        if (finalPin === MASTER_PIN) {
            localStorage.clear();
            location.reload(); // Refreshes the app to a clean state
        } else {
            alert("Incorrect PIN. Reset aborted.");
        }
    }
}

// --- CORE TRANSACTION ENGINE ---
function toggleSystemState() {
    isSystemActive = !isSystemActive;
    const badge = document.getElementById('system-status');
    badge.innerText = isSystemActive ? "SYSTEM ACTIVE" : "SYSTEM INACTIVE";
    badge.className = `status-pill ${isSystemActive ? 'active' : 'inactive'}`;
}

function processTransaction(type) {
    if (!isSystemActive) return alert("System is currently INACTIVE (Grey Light).");

    const item = type === 'add' ? document.getElementById('mgr-item').value : document.getElementById('staff-item-list').value;
    const qty = parseInt(type === 'add' ? document.getElementById('mgr-qty').value : document.getElementById('staff-qty').value);
    const actor = type === 'add' ? "Manager" : activeStaffName;

    if (!item || isNaN(qty) || qty <= 0) return alert("Invalid inputs.");

    if (type === 'add') {
        const cat = document.getElementById('mgr-cat').value || "General";
        if (!inventory[item]) inventory[item] = { quantity: 0, category: cat };
        inventory[item].quantity += qty;
        inventory[item].lastBy = "Manager";
    } else {
        if (!inventory[item] || inventory[item].quantity < qty) return alert("Stock unavailable!");
        inventory[item].quantity -= qty;
        inventory[item].lastBy = actor;
    }

    logs.unshift(`[${new Date().toLocaleTimeString()}] ${actor} ${type.toUpperCase()}ED ${qty} ${item}`);
    saveAndRefresh();
}

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
    staffSelect.innerHTML = "";
    
    for (let key in inventory) {
        total += inventory[key].quantity;
        table.innerHTML += `<tr><td>${key}</td><td>${inventory[key].category}</td><td>${inventory[key].quantity}</td><td>${inventory[key].lastBy}</td></tr>`;
        staffSelect.innerHTML += `<option value="${key}">${key}</option>`;
    }

    logBox.innerHTML = logs.map(l => `<div class="log-entry">> ${l}</div>`).join('');
    document.getElementById('grand-total').innerText = total;
}

function switchView(view) {
    document.getElementById('staff-section').style.display = view === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = view === 'manager' ? 'block' : 'none';
    if (view === 'manager') renderStaffDirectory();
    document.getElementById('tab-staff').classList.toggle('active-tab', view === 'staff');
    document.getElementById('tab-manager').classList.toggle('active-tab', view === 'manager');
}

function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

window.onload = renderApp;