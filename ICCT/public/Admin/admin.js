// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyChwf1uvm4YwSTElg9J6CQ21b6xivES890",
    authDomain: "icct-antipolocampus.firebaseapp.com",
    projectId: "icct-antipolocampus",
    storageBucket: "icct-antipolocampus.appspot.com",
    messagingSenderId: "599283704994",
    appId: "1:599283704994:web:ebe48bb856531b28bf63fb",
    measurementId: "G-S5NKWMN8DB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Global state
let orders = {};
let filteredOrders = {};
let activeTab = "dashboard";
let inventoryData = {
    NSTP: { S: 50, M: 45, L: 30 },
    UniformPE: { S: 60, M: 55, L: 40 },
    Joggerpants: { S: 40, M: 35, L: 25 }
};

// DOM Elements
const tabButtons = document.querySelectorAll('.sidebar-btn');
const tabContents = document.querySelectorAll('.tab-content');
const orderSearchInput = document.getElementById('order-search');
const statusFilterSelect = document.getElementById('status-filter');
const toast = document.getElementById('toast');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Set up tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Set up search and filter
    if (orderSearchInput) {
        orderSearchInput.addEventListener('input', filterOrders);
    }
    
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener('change', filterOrders);
    }

    // Set up export buttons
    const exportButtons = document.querySelectorAll('.primary-btn');
    exportButtons.forEach(button => {
        if (button.textContent.includes('Export')) {
            button.addEventListener('click', () => {
                if (activeTab === 'orders') {
                    exportOrdersToExcel();
                } else if (activeTab === 'inventory') {
                    exportInventoryToExcel();
                } else if (activeTab === 'reports') {
                    exportReportsToExcel();
                }
            });
        }
    });

    // Fetch orders from Firebase
    fetchOrders();

    // Initialize inventory display
    updateInventoryDisplay();
});

// Switch between tabs
function switchTab(tabName) {
    activeTab = tabName;
    
    // Update active class on buttons
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Show active tab content
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Fetch orders from Firebase
function fetchOrders() {
    const ordersRef = ref(database, "orders");
    
    onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Process the data
            orders = {};
            
            Object.entries(data).forEach(([key, value]) => {
                // Ensure quantities are numbers
                const nstpQty = Number(value.NSTP.qty || 0);
                const peQty = Number(value.UniformPE.qty || 0);
                const joggerQty = Number(value.Joggerpants.qty || 0);
                
                // Calculate total amount if not present
                let totalAmount = value.totalAmount || 0;
                if (!totalAmount) {
                    totalAmount = nstpQty * 350 + peQty * 150 + joggerQty * 300;
                }
                
                // Generate a date if not present
                const date = value.date || new Date().toISOString();
                
                // Set a default status if not present
                const status = value.status || "Pending";
                
                // Generate a reference number if not present
                const reference = value.reference || `REF-${Math.floor(Math.random() * 10000)}`;
                
                orders[key] = {
                    ...value,
                    id: key,
                    totalAmount,
                    date,
                    status,
                    reference,
                    NSTP: {
                        ...value.NSTP,
                        qty: nstpQty
                    },
                    UniformPE: {
                        ...value.UniformPE,
                        qty: peQty
                    },
                    Joggerpants: {
                        ...value.Joggerpants,
                        qty: joggerQty
                    }
                };
            });
            
            filteredOrders = { ...orders };
            
            // Update the UI
            updateDashboardMetrics();
            updateRecentOrdersTable();
            updateOrdersTable();
            updateReportsMetrics();
            updateCharts();
            
            // Show toast notification
            showToast();
        }
    });
}

// Show toast notification
function showToast() {
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Update dashboard metrics
function updateDashboardMetrics() {
    const todaySales = calculateTodaySales();
    const ordersToday = calculateOrdersToday();
    const pendingPayments = calculatePendingPayments();
    const completedOrders = calculateCompletedOrders();
    
    document.getElementById('today-sales').textContent = `₱${todaySales.toFixed(2)}`;
    document.getElementById('orders-today').textContent = ordersToday;
    document.getElementById('pending-payments').textContent = pendingPayments;
    document.getElementById('completed-orders').textContent = completedOrders;
}

// Calculate today's sales
function calculateTodaySales() {
    return Object.values(orders).reduce((total, order) => {
        const orderDate = new Date(order.date);
        const today = new Date();
        if (orderDate.toDateString() === today.toDateString()) {
            return total + order.totalAmount;
        }
        return total;
    }, 0);
}

// Calculate orders today
function calculateOrdersToday() {
    return Object.values(orders).filter(order => {
        const orderDate = new Date(order.date);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
    }).length;
}

// Calculate pending payments
function calculatePendingPayments() {
    return Object.values(orders).filter(order => order.status === "Pending").length;
}

// Calculate completed orders
function calculateCompletedOrders() {
    return Object.values(orders).filter(order => order.status === "Completed").length;
}

// Update recent orders table
function updateRecentOrdersTable() {
    const tableBody = document.querySelector('#recent-orders-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Get the 5 most recent orders
    const recentOrders = Object.values(orders)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${order.reference}</td>
            <td>${order.user.username}</td>
            <td>${order.user.studentNumber}</td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>
                <span class="badge ${order.status === 'Completed' ? 'badge-success' : 'badge-warning'}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td>
                <button class="btn outline-btn view-btn" data-id="${order.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.getAttribute('data-id');
            viewOrderDetails(orderId);
        });
    });
}

// Update orders table
function updateOrdersTable() {
    const tableBody = document.querySelector('#orders-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    Object.values(filteredOrders).forEach(order => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${order.reference}</td>
            <td>${order.user.username}</td>
            <td>${order.user.studentNumber}</td>
            <td>${order.user.gmail}</td>
            <td>
                ${order.NSTP.qty > 0 ? `NSTP: ${order.NSTP.qty} (${order.NSTP.size})<br>` : ''}
                ${order.UniformPE.qty > 0 ? `PE: ${order.UniformPE.qty} (${order.UniformPE.size})<br>` : ''}
                ${order.Joggerpants.qty > 0 ? `Jogger: ${order.Joggerpants.qty} (${order.Joggerpants.size})` : ''}
            </td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>
                <span class="badge ${order.status === 'Completed' ? 'badge-success' : 'badge-warning'}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td>
                <button class="btn outline-btn action-btn" data-id="${order.id}">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            showActionDropdown(button);
        });
    });
}

// Show action dropdown
function showActionDropdown(button) {
    // Remove any existing dropdowns
    document.querySelectorAll('.action-dropdown:not(#action-dropdown-template)').forEach(dropdown => {
        dropdown.remove();
    });
    
    const orderId = button.getAttribute('data-id');
    const buttonRect = button.getBoundingClientRect();
    
    // Clone the template
    const dropdown = document.getElementById('action-dropdown-template').cloneNode(true);
    dropdown.style.display = 'block';
    dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
    dropdown.style.left = `${buttonRect.left + window.scrollX - 120}px`;
    
    // Add event listeners
    dropdown.querySelector('.view-details').addEventListener('click', (e) => {
        e.preventDefault();
        viewOrderDetails(orderId);
        dropdown.remove();
    });
    
    dropdown.querySelector('.mark-completed').addEventListener('click', (e) => {
        e.preventDefault();
        updateOrderStatus(orderId, 'Completed');
        dropdown.remove();
    });
    
    dropdown.querySelector('.mark-pending').addEventListener('click', (e) => {
        e.preventDefault();
        updateOrderStatus(orderId, 'Pending');
        dropdown.remove();
    });
    
    document.body.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== button) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// View order details
function viewOrderDetails(orderId) {
    const order = orders[orderId];
    if (!order) return;
    
    alert(`
        Order Details:
        Reference: ${order.reference}
        Student: ${order.user.username}
        Student Number: ${order.user.studentNumber}
        Email: ${order.user.gmail}
        Phone: ${order.user.cellphone}
        Campus: ${order.user.campus}
        
        Items:
        NSTP: ${order.NSTP.qty} (${order.NSTP.size})
        PE Uniform: ${order.UniformPE.qty} (${order.UniformPE.size})
        Jogger Pants: ${order.Joggerpants.qty} (${order.Joggerpants.size})
        
        Total Amount: ₱${order.totalAmount.toFixed(2)}
        Status: ${order.status}
        Date: ${new Date(order.date).toLocaleDateString()}
    `);
}

// Update order status
function updateOrderStatus(orderId, newStatus) {
    const orderRef = ref(database, `orders/${orderId}`);
    
    update(orderRef, { status: newStatus })
        .then(() => {
            // Update local state
            orders[orderId].status = newStatus;
            filteredOrders = { ...orders };
            
            // Filter orders again if needed
            filterOrders();
            
            // Update UI
            updateDashboardMetrics();
            updateRecentOrdersTable();
            updateOrdersTable();
            updateReportsMetrics();
        })
        .catch(error => {
            console.error("Error updating order status:", error);
            alert("Failed to update order status. Please try again.");
        });
}

// Filter orders based on search term and status
function filterOrders() {
    const searchTerm = orderSearchInput ? orderSearchInput.value.toLowerCase() : '';
    const statusFilter = statusFilterSelect ? statusFilterSelect.value.toLowerCase() : 'all';
    
    filteredOrders = { ...orders };
    
    // Filter by search term
    if (searchTerm) {
        filteredOrders = Object.fromEntries(
            Object.entries(filteredOrders).filter(([_, order]) => {
                return (
                    order.user.username.toLowerCase().includes(searchTerm) ||
                    order.user.studentNumber.toLowerCase().includes(searchTerm) ||
                    order.reference.toLowerCase().includes(searchTerm)
                );
            })
        );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
        filteredOrders = Object.fromEntries(
            Object.entries(filteredOrders).filter(([_, order]) => {
                return order.status.toLowerCase() === statusFilter;
            })
        );
    }
    
    // Update orders table
    updateOrdersTable();
}

// Update inventory display
function updateInventoryDisplay() {
    // NSTP
    document.getElementById('nstp-s').textContent = `${inventoryData.NSTP.S} pcs`;
    document.getElementById('nstp-m').textContent = `${inventoryData.NSTP.M} pcs`;
    document.getElementById('nstp-l').textContent = `${inventoryData.NSTP.L} pcs`;
    document.getElementById('nstp-total').textContent = `${inventoryData.NSTP.S + inventoryData.NSTP.M + inventoryData.NSTP.L} pcs`;
    
    // PE Uniform
    document.getElementById('pe-s').textContent = `${inventoryData.UniformPE.S} pcs`;
    document.getElementById('pe-m').textContent = `${inventoryData.UniformPE.M} pcs`;
    document.getElementById('pe-l').textContent = `${inventoryData.UniformPE.L} pcs`;
    document.getElementById('pe-total').textContent = `${inventoryData.UniformPE.S + inventoryData.UniformPE.M + inventoryData.UniformPE.L} pcs`;
    
    // Jogger Pants
    document.getElementById('jogger-s').textContent = `${inventoryData.Joggerpants.S} pcs`;
    document.getElementById('jogger-m').textContent = `${inventoryData.Joggerpants.M} pcs`;
    document.getElementById('jogger-l').textContent = `${inventoryData.Joggerpants.L} pcs`;
    document.getElementById('jogger-total').textContent = `${inventoryData.Joggerpants.S + inventoryData.Joggerpants.M + inventoryData.Joggerpants.L} pcs`;
}

// Update reports metrics
function updateReportsMetrics() {
    // Calculate total revenue
    const totalRevenue = Object.values(orders).reduce((total, order) => total + order.totalAmount, 0);
    document.getElementById('total-revenue').textContent = `₱${totalRevenue.toFixed(2)}`;
    
    // Calculate total orders
    document.getElementById('total-orders').textContent = Object.values(orders).length;
    
    // Calculate unique students
    const uniqueStudents = new Set(Object.values(orders).map(order => order.user.studentNumber)).size;
    document.getElementById('total-students').textContent = uniqueStudents;
    
    // Calculate items sold - FIXED: Ensure we're using numbers, not strings
    const itemsSold = Object.values(orders).reduce(
        (total, order) => {
            // Make sure we're adding numbers, not concatenating strings
            return total + Number(order.NSTP.qty || 0) + Number(order.UniformPE.qty || 0) + Number(order.Joggerpants.qty || 0);
        },
        0
    );
    document.getElementById('items-sold').textContent = itemsSold;
}

// Update charts
function updateCharts() {
    updateDailySalesChart();
    updateItemDistributionChart();
}

// Update daily sales chart
function updateDailySalesChart() {
    const chartContainer = document.getElementById('daily-sales-chart');
    if (!chartContainer) return;
    
    // Get daily sales for the last 7 days
    const salesByDay = getDailySales();
    
    // Create chart HTML
    let chartHTML = '<div class="bar-chart">';
    
    Object.entries(salesByDay).forEach(([day, amount]) => {
        const maxAmount = Math.max(...Object.values(salesByDay)) || 1;
        const height = Math.max(10, (amount / maxAmount) * 150);
        
        chartHTML += `
            <div class="chart-item">
                <div class="chart-bar" style="height: ${height}px;"></div>
                <div class="chart-label">${day}</div>
                <div class="chart-value">₱${amount.toFixed(2)}</div>
            </div>
        `;
    });
    
    chartHTML += '</div>';
    
    chartContainer.innerHTML = chartHTML;
}

// Get daily sales for the last 7 days
function getDailySales() {
    const salesByDay = {};
    const today = new Date();
    
    // Initialize the last 7 days with 0 sales
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toLocaleDateString('en-US', { weekday: 'short' });
        salesByDay[dateString] = 0;
    }
    
    // Add sales data
    Object.values(orders).forEach(order => {
        const orderDate = new Date(order.date);
        // Check if order is within the last 7 days
        const diffTime = Math.abs(today.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
            const dateString = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
            salesByDay[dateString] = (salesByDay[dateString] || 0) + order.totalAmount;
        }
    });
    
    return salesByDay;
}

// Update item distribution chart
function updateItemDistributionChart() {
    const chartContainer = document.getElementById('item-distribution-chart');
    if (!chartContainer) return;
    
    // Get item distribution
    const distribution = getItemDistribution();
    
    // Create chart HTML
    let chartHTML = '<div class="bar-chart">';
    
    Object.entries(distribution).forEach(([item, count]) => {
        const maxCount = Math.max(...Object.values(distribution)) || 1;
        const height = Math.max(10, (count / maxCount) * 150);
        
        chartHTML += `
            <div class="chart-item">
                <div class="chart-bar" style="height: ${height}px;"></div>
                <div class="chart-label">${item}</div>
                <div class="chart-value">${count} sold</div>
            </div>
        `;
    });
    
    chartHTML += '</div>';
    
    chartContainer.innerHTML = chartHTML;
}

// Get item distribution
function getItemDistribution() {
    const distribution = {
        NSTP: 0,
        UniformPE: 0,
        Joggerpants: 0
    };
    
    Object.values(orders).forEach(order => {
        // Ensure we're adding numbers, not strings
        distribution.NSTP += Number(order.NSTP.qty || 0);
        distribution.UniformPE += Number(order.UniformPE.qty || 0);
        distribution.Joggerpants += Number(order.Joggerpants.qty || 0);
    });
    
    return distribution;
}

// Export orders to Excel
function exportOrdersToExcel() {
    // Create a worksheet from the orders data
    const worksheet = [];
    
    // Add header row
    worksheet.push([
        'Order ID', 
        'Student', 
        'Student Number', 
        'Email', 
        'Items', 
        'Amount', 
        'Status', 
        'Date'
    ]);
    
    // Add data rows
    Object.values(filteredOrders).forEach(order => {
        const items = [];
        if (order.NSTP.qty > 0) items.push(`NSTP: ${order.NSTP.qty} (${order.NSTP.size})`);
        if (order.UniformPE.qty > 0) items.push(`PE: ${order.UniformPE.qty} (${order.UniformPE.size})`);
        if (order.Joggerpants.qty > 0) items.push(`Jogger: ${order.Joggerpants.qty} (${order.Joggerpants.size})`);
        
        worksheet.push([
            order.reference,
            order.user.username,
            order.user.studentNumber,
            order.user.gmail,
            items.join(', '),
            `₱${order.totalAmount.toFixed(2)}`,
            order.status,
            new Date(order.date).toLocaleDateString()
        ]);
    });
    
    // Convert to CSV
    const csv = convertToCSV(worksheet);
    
    // Download the file
    downloadCSV(csv, 'ICCT_Uniform_Orders.csv');
}

// Export inventory to Excel
function exportInventoryToExcel() {
    // Create a worksheet from the inventory data
    const worksheet = [];
    
    // Add header row
    worksheet.push(['Item', 'Size', 'Quantity']);
    
    // Add data rows
    worksheet.push(['NSTP Uniform', 'Small', inventoryData.NSTP.S]);
    worksheet.push(['NSTP Uniform', 'Medium', inventoryData.NSTP.M]);
    worksheet.push(['NSTP Uniform', 'Large', inventoryData.NSTP.L]);
    worksheet.push(['PE Uniform', 'Small', inventoryData.UniformPE.S]);
    worksheet.push(['PE Uniform', 'Medium', inventoryData.UniformPE.M]);
    worksheet.push(['PE Uniform', 'Large', inventoryData.UniformPE.L]);
    worksheet.push(['Jogger Pants', 'Small', inventoryData.Joggerpants.S]);
    worksheet.push(['Jogger Pants', 'Medium', inventoryData.Joggerpants.M]);
    worksheet.push(['Jogger Pants', 'Large', inventoryData.Joggerpants.L]);
    
    // Convert to CSV
    const csv = convertToCSV(worksheet);
    
    // Download the file
    downloadCSV(csv, 'ICCT_Uniform_Inventory.csv');
}

// Export reports to Excel
function exportReportsToExcel() {
    // Create a worksheet from the reports data
    const worksheet = [];
    
    // Add header row for summary
    worksheet.push(['Summary']);
    worksheet.push(['Metric', 'Value']);
    
    // Add summary data
    const totalRevenue = Object.values(orders).reduce((total, order) => total + order.totalAmount, 0);
    const totalOrders = Object.values(orders).length;
    const uniqueStudents = new Set(Object.values(orders).map(order => order.user.studentNumber)).size;
    const itemsSold = Object.values(orders).reduce(
        (total, order) => total + Number(order.NSTP.qty || 0) + Number(order.UniformPE.qty || 0) + Number(order.Joggerpants.qty || 0),
        0
    );
    
    worksheet.push(['Total Revenue', `₱${totalRevenue.toFixed(2)}`]);
    worksheet.push(['Total Orders', totalOrders]);
    worksheet.push(['Total Students', uniqueStudents]);
    worksheet.push(['Items Sold', itemsSold]);
    
    // Add empty row
    worksheet.push([]);
    
    // Add header row for monthly sales
    worksheet.push(['Monthly Sales Report']);
    worksheet.push(['Month', 'Orders', 'NSTP Sold', 'PE Uniform Sold', 'Jogger Pants Sold', 'Revenue']);
    
    // Add monthly sales data (example data)
    worksheet.push(['January', 24, 18, 32, 15, '₱15,450.00']);
    worksheet.push(['February', 31, 25, 40, 22, '₱20,750.00']);
    worksheet.push(['March', 28, 20, 35, 18, '₱17,900.00']);
    
    // Convert to CSV
    const csv = convertToCSV(worksheet);
    
    // Download the file
    downloadCSV(csv, 'ICCT_Uniform_Reports.csv');
}

// Convert array to CSV
function convertToCSV(arr) {
    return arr.map(row => 
        row.map(value => 
            typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value
        ).join(',')
    ).join('\n');
}

// Download CSV file
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Append to the document
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}