const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home' // Set default tab based on URL path
        };
    },
    computed: {
        isLoggedIn() {
            // Dynamically check login status
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
    }
});

// Fetch the navbar HTML and mount Vue after loading
fetch('/navbar')
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        app.mount('#navbar-placeholder'); // Mount Vue app to the navbar placeholder
    })
    .catch(error => console.error('Error loading navbar:', error));
