// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAUZYEkqQSsEVM7rMCLqaEKoibGPiP_YJI",
    authDomain: "wad2project-db69b.firebaseapp.com",
    projectId: "wad2project-db69b",
    storageBucket: "wad2project-db69b.appspot.com",
    messagingSenderId: "262163048895",
    appId: "1:262163048895:web:5ab7dd89cf3bc6daaad90a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Vue Application
const dashboardApp = Vue.createApp({
    data() {
        return {
            totalUsers: 0,
            lostItemReports: 0,
            recoveredItems: 0
        };
    },
    methods: {
        async countUsers() {
            try {
                console.log("Counting users...");
                const usersRef = db.collection('users');
                const snapshot = await usersRef.get();
                
                this.totalUsers = snapshot.size; // Update totalUsers
                console.log("Total users found:", this.totalUsers); // Log to confirm count
            } catch (error) {
                console.error("Error counting users:", error);
                this.totalUsers = 0; // Set to 0 in case of error
            }
        }
    },
    mounted() {
        console.log("Vue instance mounted successfully."); // Confirmation message
        this.countUsers();
    }
});

// Mount the Vue app to #app
dashboardApp.mount('#app');
