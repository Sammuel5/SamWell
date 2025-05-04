import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyChwf1uvm4YwSTElg9J6CQ21b6xivES890",
    authDomain: "icct-antipolocampus.firebaseapp.com",
    projectId: "icct-antipolocampus",
    storageBucket: "icct-antipolocampus.appspot.com",
    messagingSenderId: "599283704994",
    appId: "1:599283704994:web:ebe48bb856531b28bf63fb",
    measurementId: "G-S5NKWMN8DB"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentOrderId = "";

// Get modal elements
const modal = document.getElementById("paymentModal");
modal.style.display = "none";  // Ensure modal is hidden on page load
const closeBtn = document.getElementsByClassName("close")[0];
const confirmPaymentBtn = document.getElementById("confirmPayment");

// Close modal when clicking on X
closeBtn.onclick = function() {
    modal.style.display = "none";
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Function to generate reference number
function generateReferenceNumber() {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return "ICCT" + timestamp + random;
}

function calculateTotalAmount() {
    const nstp = parseInt(document.getElementById('NSTPQty').value) || 0;
    const uniformPE = parseInt(document.getElementById('UNIFORMPEQty').value) || 0;
    const jogger = parseInt(document.getElementById('JoggerpantsQty').value) || 0;
    
    return (nstp * 350) + (uniformPE * 150) + (jogger * 300);
}

// Update total amount on the order form
window.updateTotalAmount = function() {
    const totalAmount = calculateTotalAmount();
    document.getElementById('totalAmount').textContent = totalAmount.toFixed(2);
}

function createOrderSummary() {
    const nstp = parseInt(document.getElementById('NSTPQty').value) || 0;
    const nstpSize = document.getElementById('NSTPSize').value;
    const uniformPE = parseInt(document.getElementById('UNIFORMPEQty').value) || 0;
    const uniformPESize = document.getElementById('UNIFORMPESize').value;
    const jogger = parseInt(document.getElementById('JoggerpantsQty').value) || 0;
    const joggerSize = document.getElementById('JoggerpantsSize').value;
    
    let summary = "<ul>";
    
    if (nstp > 0) {
        summary += `<li>NSTP: ${nstp} × ₱350.00 = ₱${(nstp * 350).toFixed(2)} (${nstpSize})</li>`;
    }
    
    if (uniformPE > 0) {
        summary += `<li>Uniform PE: ${uniformPE} × ₱150.00 = ₱${(uniformPE * 150).toFixed(2)} (${uniformPESize})</li>`;
    }
    
    if (jogger > 0) {
        summary += `<li>Jogger Pants: ${jogger} × ₱300.00 = ₱${(jogger * 300).toFixed(2)} (${joggerSize})</li>`;
    }
    
    summary += "</ul>";
    
    return summary;
}

function showPaymentModal() {
    // Set reference number
    const refNumber = generateReferenceNumber();
    document.getElementById('referenceNumber').textContent = refNumber;
    
    // Set total amount
    const totalAmount = calculateTotalAmount();
    document.getElementById('modalTotalAmount').textContent = totalAmount.toFixed(2);
    
    // Set order summary
    document.getElementById('orderSummaryContent').innerHTML = createOrderSummary();
    
    // Show modal
    modal.style.display = "block";
    
    return refNumber;
}

function saveOrderToFirebase(order) {
    // Generate a unique order ID
    const orderId = Math.random().toString(36).substr(2, 9);
    currentOrderId = orderId;

    // Show payment modal and get reference number
    const refNumber = showPaymentModal();
    order.referenceNumber = refNumber;
    
    // Add additional data for payment tracking
    order.payment = {
        status: "pending",
        referenceNumber: refNumber,
        amount: order.totalAmount,
        timestamp: null
    };
    
    order.orderDate = serverTimestamp();
    order.orderStatus = "pending";
    
    set(ref(db, 'orders/' + orderId), order)
        .then(() => {
            console.log("Order saved successfully");
            // Update reference number in Firebase
            set(ref(db, `orders/${orderId}/payment/referenceNumber`), refNumber);
        })
        .catch((error) => {
            console.error("Error saving order: ", error);
            alert("Error submitting order. Please try again.");
        });
}

function collectOrderData() {
    const totalAmount = calculateTotalAmount();
    
    const orderData = {
        user: {
            username: document.getElementById('full-name').value,
            gmail: document.getElementById('email').value,
            cellphone: document.getElementById('cellphone').value,
            studentNumber: document.getElementById('student-number').value,
            campus: document.getElementById('campus').value
        },
        NSTP: {
            qty: document.getElementById('NSTPQty').value,
            size: document.getElementById('NSTPSize').value,
            price: 350,
            subtotal: parseInt(document.getElementById('NSTPQty').value) * 350 || 0
        },
        UniformPE: {
            qty: document.getElementById('UNIFORMPEQty').value,
            size: document.getElementById('UNIFORMPESize').value,
            price: 150,
            subtotal: parseInt(document.getElementById('UNIFORMPEQty').value) * 150 || 0
        },
        Joggerpants: {
            qty: document.getElementById('JoggerpantsQty').value,
            size: document.getElementById('JoggerpantsSize').value,
            price: 300,
            subtotal: parseInt(document.getElementById('JoggerpantsQty').value) * 300 || 0
        },
        totalAmount: totalAmount,
        referenceNumber: "", // Will be set when payment modal is shown
    };

    return orderData;
}

// When user confirms payment
confirmPaymentBtn.addEventListener('click', function() {
    if (currentOrderId) {
        // Update payment status to pending verification in Firebase
        set(ref(db, `orders/${currentOrderId}/orderStatus`), "payment_submitted")
            .then(() => {
                // Update payment timestamp
                return set(ref(db, `orders/${currentOrderId}/payment/timestamp`), serverTimestamp());
            })
            .then(() => {
                modal.style.display = "none";
                alert("Thank you! Your payment has been submitted and is being verified.");
                
                // Reset form
                resetForm();
                showTab('personal-info');
            })
            .catch((error) => {
                console.error("Error updating payment status: ", error);
                alert("Error updating payment status. Please contact support.");
            });
    }
});

window.showTab = function(tabId) {
    // Check if fields are filled before proceeding
    if (tabId === 'uniform-order' && !validatePersonalInfo()) {
        alert("Please fill out all required fields in the Personal Information tab.");
        return;
    }

    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove 'active' from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show the selected tab content and activate the button
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
};

// Function to validate personal information
function validatePersonalInfo() {
    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const cellphone = document.getElementById('cellphone').value.trim();
    const studentNumber = document.getElementById('student-number').value.trim();
    const campus = document.getElementById('campus').value;

    return fullName && email && cellphone && studentNumber && campus;
}

// Function to reset form fields
function resetForm() {
    document.getElementById('full-name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('cellphone').value = '';
    document.getElementById('student-number').value = '';
    document.getElementById('campus').value = '';

    // Reset quantities and sizes for uniforms
    document.getElementById('NSTPQty').value = 0;
    document.getElementById('NSTPSize').value = '';
    
    document.getElementById('UNIFORMPEQty').value = 0;
    document.getElementById('UNIFORMPESize').value = '';

    document.getElementById('JoggerpantsQty').value = 0;
    document.getElementById('JoggerpantsSize').value = '';
    
    // Reset total amount
    document.getElementById('totalAmount').textContent = "0.00";
    
    currentOrderId = "";
}

document.getElementById('submitOrder').addEventListener('click', () => {
    const order = collectOrderData();

    // Check if at least one uniform is ordered
    const hasOrder = parseInt(order.NSTP.qty) > 0 || parseInt(order.UniformPE.qty) > 0 || parseInt(order.Joggerpants.qty) > 0;

    if (!hasOrder) {
        alert("Please order at least one uniform.");
        return; // Stop the submission if no uniforms are ordered
    }

    saveOrderToFirebase(order);
});

// Initialize total amount on page load
updateTotalAmount();