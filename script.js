// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    databaseURL: "https://your-app-default-rtdb.firebaseio.com",
    projectId: "your-app",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:12345:web:6789"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State Variables
let inventory = {};
let staffAccounts = {};
let activeStaffName = "";
const MASTER_PIN = "1234";

// --- 2. THE REACTIVE LISTENER ---
// This is the heart of the "Concurrent" update
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    // Sync local memory with Cloud data
    inventory = data.inventory || {};
    staffAccounts = data.staffAccounts || {};

    // Trigger UI Updates immediately and concurrently
    renderInventoryTable();
    renderStaffDirectory();
    updateGrandTotal();
});

// --- 3. RENDER FUNCTIONS ---

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;

    tbody.innerHTML = ""; // Clear existing rows to prevent duplicates

    // Use Object.keys to handle the data loop
    Object.keys(inventory).forEach(itemName => {
        const item = inventory[itemName];
        const isMgr = document.getElementById('manager-section').style.display === 'block';

        const row = `
            <tr>
                <td><strong>${itemName}</strong></td>
                <td><span class="badge">${item.category}</span></td>
                <td>${item.quantity}</td>
                <td>${item.lastBy || '---'}</td>
                <td class="mgr-action-cell" style="display: ${isMgr ? 'table-cell' : 'none'}">
                    <button onclick="editItem('${itemName}')" class="btn-edit-small">Edit</button>
                    <button onclick="deleteItem('${itemName}')" class="btn-del-small">X</button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function renderStaffDirectory() {
    const tbody = document.getElementById('staff-directory-body');
    if (!tbody) return;

    tbody.innerHTML = ""; 

    Object.keys(staffAccounts).forEach(id => {
        const staff = staffAccounts[id];
        const row = `
            <tr>
                <td><code>${id}</code></td>
                <td>${staff.name}</td>
                <td>${staff.gender}</td>
                <td>
                    <button onclick="deleteStaff('${id}')" class="btn-del-small">Remove</button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function updateGrandTotal() {
    let total = 0;
    Object.values(inventory).forEach(item => {
        total += parseInt(item.quantity || 0);
    });
    const totalEl = document.getElementById('grand-total');
    if (totalEl) totalEl.innerText = total;
}

// --- 4. ACTION FUNCTIONS ---

function processTransaction(type) {
    const itemInput = type === 'add' ? document.getElementById('mgr-item') : document.getElementById('staff-item-list');
    const qtyInput = type === 'add' ? document.getElementById('mgr-qty') : document.getElementById('staff-qty');
    
    const itemName = itemInput.value.trim();
    const qty = parseInt(qtyInput.value);
    const actor = type === 'add' ? "Manager" : activeStaffName;

    if (!itemName || isNaN(qty) || qty <= 0) return alert("Enter valid details.");

    if (type === 'add') {
        const cat = document.getElementById('mgr-cat').value || "General";
        db.ref(`inventory/${itemName}`).set({
            quantity: qty,
            category: cat,
            lastBy: "Manager"
        });
        // Clear inputs
        itemInput.value = ""; qtyInput.value = ""; document.getElementById('mgr-cat').value = "";
    } else {
        if (!inventory[itemName] || inventory[itemName].quantity < qty) return alert("Low Stock!");
        
        const newQty = inventory[itemName].quantity - qty;
        db.ref(`inventory/${itemName}/quantity`).set(newQty);
        db.ref(`inventory/${itemName}/lastBy`).set(actor);
        
        alert("Deduction successful. Logging out...");
        logoutStaff();
    }
}

function createStaffAccount() {
    const id = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const gen = document.getElementById('new-staff-gender').value;

    if (id && name && gen) {
        db.ref(`staffAccounts/${id}`).set({ name, gender: gen });
        document.getElementById('new-staff-id').value = "";
        document.getElementById('new-staff-name').value = "";
    } else {
        alert("Please fill all staff fields.");
    }
}

// --- 5. UI UTILITIES ---

function switchView(v) {
    document.getElementById('staff-section').style.display = v === 'staff' ? 'block' : 'none';
    document.getElementById('manager-section').style.display = v === 'manager' ? 'block' : 'none';

    document.getElementById('tab-staff').classList.toggle('active-tab', v === 'staff');
    document.getElementById('tab-manager').classList.toggle('active-tab', v === 'manager');
    
    // Refresh table to show/hide Admin column
    renderInventoryTable();
}

function logoutStaff() {
    activeStaffName = "";
    document.getElementById('staff-id-entry').value = "";
    document.getElementById('staff-login-area').style.display = 'block';
    document.getElementById('staff-action-area').style.display = 'none';
}

function deleteStaff(id) {
    if (confirm(`Remove ${staffAccounts[id].name}?`)) {
        db.ref(`staffAccounts/${id}`).remove();
    }
}

function deleteItem(name) {
    if (confirm(`Delete ${name} from inventory?`)) {
        db.ref(`inventory/${name}`).remove();
    }
}


// --- 8. RENDERING ---
function renderApp() {
    const table = document.getElementById('inventory-body');
    const staffSelect = document.getElementById('staff-item-list');
    const isMgr = document.getElementById('manager-section').style.display === 'block';
    
    document.querySelectorAll('.mgr-action-head').forEach(el => el.style.display = isMgr ? 'table-cell' : 'none');

    let total = 0;
    table.innerHTML = ""; 
    staffSelect.innerHTML = '<option value="" disabled selected>Select Item...</option>';
    
    for (let key in inventory) {
        total += inventory[key].quantity;
        let row = `<tr>
            <td>${key}</td>
            <td>${inventory[key].category}</td>
            <td>${inventory[key].quantity}</td>
            <td>${inventory[key].lastBy || '-'}</td>`;
        
        if (isMgr) {
            row += `<td>
                <button onclick="editItem('${key}')" class="btn-edit-small">Edit</button>
                <button onclick="deleteItem('${key}')" class="btn-del-small">X</button>
            </td>`;
        }
        row += `</tr>`;
        table.innerHTML += row;
        staffSelect.innerHTML += `<option value="${key}">${key}</option>`;
    }
    document.getElementById('audit-log').innerHTML = logs.map(l => `<div class="log-entry">${l}</div>`).join('');
    document.getElementById('grand-total').innerText = total;
}

function renderStaffDirectory() {
    const b = document.getElementById('staff-directory-body');
    b.innerHTML = "";
    for (let id in staffAccounts) {
        b.innerHTML += `<tr>
            <td>${id}</td>
            <td>${staffAccounts[id].name}</td>
            <td>${staffAccounts[id].gender}</td>
            <td><button onclick="deleteStaff('${id}')" class="btn-del-small">X</button></td>
        </tr>`;
    }
}

// Security Helpers
function openSecurity() { document.getElementById('security-modal').style.display='flex'; }
function closeModal() { document.getElementById('security-modal').style.display='none'; }
function validatePIN() {
    if(document.getElementById('pin-input').value === MASTER_PIN) {
        switchView('manager');
        closeModal();
        document.getElementById('pin-input').value = "";
    } else {
        alert("Incorrect Security PIN.");
    }
}

function updateStatusUI() {
    const b = document.getElementById('system-status');
    b.innerText = isSystemActive ? "SYSTEM ACTIVE" : "SYSTEM INACTIVE";
    b.className = `status-pill ${isSystemActive ? 'active' : 'inactive'}`;
}

function searchInventory() {
    let q = document.getElementById('search-bar').value.toLowerCase();
    document.querySelectorAll('#inventory-body tr').forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function toggleTheme() {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
}

function editItem(key) {
    const itm = inventory[key];
    document.getElementById('mgr-item').value = key;
    document.getElementById('mgr-cat').value = itm.category;
    document.getElementById('mgr-qty').value = itm.quantity;
    document.querySelector('.mgr-grid').scrollIntoView({ behavior: 'smooth' });
}

window.onload = renderApp;
