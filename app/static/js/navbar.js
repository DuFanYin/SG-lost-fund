const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home', // Set default tab based on URL path
            username: sessionStorage.getItem('username') || '', // Get username from sessionStorage
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
        setActiveTab(tab, event) {
            if (tab === 'listing' && !this.isLoggedIn) {
                event.preventDefault(); // Prevent default navigation behavior
                // Show the modal if the user is not logged in
                var loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
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