const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home', // Set default tab based on URL path
            username: sessionStorage.getItem('username') || '', // Get username from sessionStorage
            points: sessionStorage.getItem('points') || 0,
            uid: sessionStorage.getItem('uid') || 0,
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
