// Initialize Firebase
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
firebase.initializeApp(firebaseConfig);

// Vue instance
Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            confirmPassword: '',
            errorMessage: '',
            successMessage: ''
        };
    },
    methods: {
        async signUp() {
            this.errorMessage = '';  // Clear previous error message
            this.successMessage = '';  // Clear previous success message

            // Validate if password and confirmPassword match
            if (this.password !== this.confirmPassword) {
                this.errorMessage = "Passwords do not match";
                return;
            }

            try {
                // Create user with email and password in Firebase
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password);
                const idToken = await userCredential.user.getIdToken();

                // Send the ID token and email to the backend
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + idToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: this.email })
                });

                if (response.ok) {
                    this.successMessage = 'User registered successfully!';
                    this.email = '';
                    this.password = '';
                    this.confirmPassword = '';
                } else {
                    const errorData = await response.json();
                    this.errorMessage = errorData.error || 'Error registering user';
                }
            } catch (error) {
                console.error('Error signing up:', error);
                this.errorMessage = 'Error signing up: ' + error.message;
            }
        }
    }
}).mount('#app');