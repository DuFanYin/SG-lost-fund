// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyAUZYEkqQSsEVM7rMCLqaEKoibGPiP_YJI",
    authDomain: "wad2project-db69b.firebaseapp.com",
    databaseURL: "https://wad2project-db69b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wad2project-db69b",
    storageBucket: "wad2project-db69b.appspot.com",
    messagingSenderId: "262163048895",
    appId: "1:262163048895:web:5ab7dd89cf3bc6daaad90a",
    measurementId: "G-PKT1RMGB01"
  };

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebaseApp.firestore();

// Now you can use db.collection() in your Vue app


const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home', // Set default tab based on URL path
            username: sessionStorage.getItem('username') || '', // Get username from sessionStorage
            points: sessionStorage.getItem('points') || 0,
            uid: sessionStorage.getItem('uid') || 0,
            showSpinner: false // Control visibility of the loading spinner overlay
        };
    },
    computed: {
        isLoggedIn() {
            // Check login status from session storage
            return sessionStorage.getItem('loggedIn') === 'true';
        }
    },
    methods: {
        logout() {
            sessionStorage.clear(); // Clear session storage on logout
            window.location.href = '/login'; // Redirect to login page
        },
        setActiveTab(tab) {
            this.activeTab = tab; // Set active tab for dynamic styling
        },
        
        setupRealTimeListener() {
            const userId = sessionStorage.getItem('uid'); // Assuming you store the user ID in session storage
            if (!userId) {
                console.error("User ID not found in session storage");
                return;
            }
    
            db.collection('users').doc(userId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        console.log("Received updated data:", userData);
                        sessionStorage.setItem('points', userData.points);
                        this.points = userData.points;
                    } else {
                        console.error("Document does not exist");
                    }
                }); // Close onSnapshot correctly here
        },
        setActiveTabWithEvent(tab, event) {  // Renamed to avoid conflict with the existing setActiveTab
            if (tab === 'listing' && !this.isLoggedIn) {
                event.preventDefault(); // Prevent default navigation behavior
                // Show the modal if the user is not logged in
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } else {
                this.activeTab = tab; // Set active tab for dynamic styling
            }
        },
        startRedirectToLogin() {
            this.showSpinner = true; // Show the full-screen overlay with spinner
            setTimeout(this.redirectToLogin, 2000); // Wait for 2 seconds, then redirect
        },
        redirectToLogin() {
            window.location.href = '/login'; // Redirect to login page
        }
    },
    mounted() {
        console.log("Navbar mounted, isLoggedIn:", this.isLoggedIn);
        console.log("Username:", this.username); 
        console.log("Points:", this.points)
        console.log("uid:", this.uid)

        if (this.isLoggedIn) {
            this.setupRealTimeListener(); // Automatically call it here when the component mounts
        }
    }
});

// Fetch the navbar HTML and mount Vue after loading
fetch('/navbar')
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        app.mount('#navbar-placeholder'); 
    })
    .catch(error => console.error('Error loading navbar:', error));