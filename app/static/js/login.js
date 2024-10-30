// Clear session storage on login page load to start fresh
sessionStorage.clear();

// // Firebase Configuration
// const firebaseConfig = {
//     apiKey: "AIzaSyAUZYEkqQSsEVM7rMCLqaEKoibGPiP_YJI",
//     authDomain: "wad2project-db69b.firebaseapp.com",
//     databaseURL: "https://wad2project-db69b-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "wad2project-db69b",
//     storageBucket: "wad2project-db69b.appspot.com",
//     messagingSenderId: "262163048895",
//     appId: "1:262163048895:web:5ab7dd89cf3bc6daaad90a",
//     measurementId: "G-PKT1RMGB01"
// };

// // Initialize Firebase app
// firebase.initializeApp(firebaseConfig);

// // Initialize Firebase Authentication
// const auth = firebase.auth();

// // Initialize Firestore
// const db = firebase.firestore();  // Add this line to initialize Firestore

import { app, auth, db } from '../js/firebaseConfig.js'; // Adjust the path according to your file structure


Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            errorMessage: ''
        };
    },
    methods: {
        // validateEmailFormat(email) {
        //     const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        //     return emailPattern.test(email);
        // },

        async logIn() {
            this.errorMessage = ''; // Reset error message

            // Check if email or password fields are empty
            // if (!this.email) {
            //     this.errorMessage = "Please enter your email.";
            //     return;
            // }

            // // Validate email format
            // if (!this.validateEmailFormat(this.email)) {
            //     this.errorMessage = "Please enter a valid email address.";
            //     return;
            // }

            // if (!this.password) {
            //     this.errorMessage = "Please enter your password.";
            //     return;
            // }

            try {
                // Check if the email exists in Firestore before trying to log in
                // const userQuery = await db.collection('users').where("email", "==", this.email).get();

                // if (userQuery.empty) {
                //     // If no user found with the email in Firestore
                //     this.errorMessage = "No account found with this email.";
                //     return;
                // }

                // Sign in the user with Firebase Authentication
                const userCredential = await auth.signInWithEmailAndPassword(this.email, this.password);
                console.log('User logged in successfully:', userCredential.user);

                // Fetch the user's details from Firestore
                const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // Store username and login status in sessionStorage
                    sessionStorage.setItem('loggedIn', 'true');
                    sessionStorage.setItem('username', userData.username);  // Ensure this line is executed
                    sessionStorage.setItem('points', userData.points);  // Ensure this line is executed
                    sessionStorage.setItem('uid', userData.uid);  // Ensure this line is executed
                    sessionStorage.setItem('profiledesc', userData.profiledesc);  // Ensure this line is executed
                    sessionStorage.setItem('contantnum', userData.contantnum);  // Ensure this line is executed
                }
                else {
                    this.errorMessage = 'User data not found in Firestore.';
                    return;
                }

                // Show success modal
                new bootstrap.Modal(document.getElementById('successModal')).show();

                // Redirect after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000); // 2 seconds delay


                // Redirect to dashboard or other page
                // window.location.href = '/dash_board';
            } catch (error) {
                console.error('Error logging in:', error);
                console.log('Firebase error code:', error.code); // Log error code for debugging

                // this.errorMessage = 'Error logging in: ' + error.message;
                const errorMessages = {
                    "auth/user-not-found": "No account found with this email.",
                    "auth/missing-password": "Please fill in your password.",
                    "auth/wrong-password": "Incorrect password.",
                    "auth/invalid-email": "The email address is not valid.",
                    "auth/invalid-login-credentials": "Invalid credentials. Please check your email and password."
                };

                this.errorMessage = errorMessages[error.code] || "An error occurred. Please try again.";
            }
        }
    }
}).mount('#app');