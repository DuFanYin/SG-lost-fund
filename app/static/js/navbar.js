const app = Vue.createApp({
    data() {
        return {};
    },
    computed: {
        isLoggedIn() {
            // Dynamically check sessionStorage for 'loggedIn' status
            return sessionStorage.getItem('loggedIn') === 'true';
        }
    },
    methods: {
        logout() {
            sessionStorage.clear();
            window.location.href = '/login';
        }
    },
    mounted() {
        console.log("Navbar mounted, isLoggedIn:", this.isLoggedIn);
    }
});

// Fetch and load the navbar content, then mount Vue
fetch('/navbar')
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        app.mount('#navbar-placeholder');
    })
    .catch(error => console.error('Error loading navbar:', error));
