const app = Vue.createApp({
    data() {
        return {
            isLoggedIn: sessionStorage.getItem('loggedIn') === 'true' // Check login status from sessionStorage
        };
    },
    methods: {
        logout() {
            // Clear session storage on logout
            sessionStorage.clear();
            this.isLoggedIn = false; // Update Vue state
            window.location.href = '/login'; // Redirect to login page
        },
        checkLoginStatus() {
            // Check login status from session storage
            this.isLoggedIn = sessionStorage.getItem('loggedIn') === 'true';
        }
    },
    mounted() {
        this.checkLoginStatus(); // Check login status when component mounts
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
