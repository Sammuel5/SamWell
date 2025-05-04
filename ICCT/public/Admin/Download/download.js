import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, child, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

function retrieveAllOrders() {
    // Reference to the root of the database
    const dbRef = ref(db); 

    // Use child() to get the "orders" path
    get(child(dbRef, 'orders')).then((snapshot) => {
    if(snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const orderData = childSnapshot.val();
            console.log("Order Data:", orderData);
        });
    } else {
        console.log("No data available");
    }
    }).catch((error) => {
        console.error("Error retrieving data:", error);
    });
} 

document.getElementById('downloadBtn').addEventListener('click', (event) => {
    event.preventDefault();
    retrieveAllOrders();
});
