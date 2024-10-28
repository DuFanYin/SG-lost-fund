const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home', // Set default tab based on URL path
            username: sessionStorage.getItem('username') || '' // Get username from sessionStorage
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
        }
    },
    mounted() {
        console.log("Navbar mounted, isLoggedIn:", this.isLoggedIn);
        console.log("Username:", this.username); 
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
