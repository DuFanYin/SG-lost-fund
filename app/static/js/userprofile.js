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

const profile = Vue.createApp({
    data() {
        return {
            username: '',
            profiledesc: '',
            contactNumber: '',
            email: '',
        }
    },
    created() {
        // Fetch data from sessionStorage and assign to Vue data properties
        this.username = sessionStorage.getItem('username') || 'username';
        this.profiledesc = sessionStorage.getItem('profiledesc') || 'Profile Description';
        this.contactNumber = sessionStorage.getItem('contantnum') || 'Contact information';
        this.email = sessionStorage.getItem('email') || 'email';
    }
});

profile.mount('#profile');