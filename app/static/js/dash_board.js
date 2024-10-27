// Initialize Firebase
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


const dashboardApp = Vue.createApp({
    data() {
        return {
            totalUsers: 0, // Temporarily set to see if it displays
        };
    },
    methods: {
        async countUsers() {
            try {
                console.log("Counting users...");
                const usersRef = db.collection('users');
                const snapshot = await usersRef.get();
                
                this.totalUsers = snapshot.size; // Updates totalUsers with the count of users
                console.log("Total users:", this.totalUsers); // To check the count in console
            } catch (error) {
                console.error("Error counting users:", error);
                this.totalUsers = 0; // In case of error, totalUsers is set to 0
            }
        }
    },
    mounted() {
        console.log("Vue instance mounted successfully."); // Confirm that the instance is mounted
        this.countUsers();
    }
});

// Change the mount point to '#app'
dashboardApp.mount('#app');

