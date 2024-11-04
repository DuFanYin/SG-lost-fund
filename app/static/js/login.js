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
            errorMessage: '',
            passwordVisible: false
        };
    },
    methods: {
        togglePasswordVisibility() {
            this.passwordVisible = !this.passwordVisible;
        },

        async logIn() {
            this.errorMessage = ''; // Reset error message

            try {

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
                    sessionStorage.setItem('email', userData.email); // Ensure this line is executed

                    // Display the username in the success modal
                    document.getElementById('username-display').textContent = userData.username;
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
        },

        // Google sign up
        async signInWithGoogle() {
            this.errorMessage = ''; // Reset any previous error messages

            // Use GoogleAuthProvider from firebase.auth namespace
            const provider = new firebase.auth.GoogleAuthProvider();

            try {
                // Sign in with a popup and Google provider
                const result = await auth.signInWithPopup(provider);

                // Get or create user document in Firestore
                const userRef = db.collection('users').doc(result.user.uid);
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    // Create a new document if it doesn't exist with default fields
                    await userRef.set({
                        email: result.user.email,
                        points: 200, // Default points
                        profiledesc: "", // Empty profile description
                        uid: result.user.uid,
                        username: result.user.displayName || result.user.email.split('@')[0] // Use display name or derive from email
                    });
                }

                // Retrieve data from Firestore after creation or verification
                const userData = (await userRef.get()).data();

                // Store user data in sessionStorage
                sessionStorage.setItem('loggedIn', 'true');
                sessionStorage.setItem('username', userData.username);
                sessionStorage.setItem('points', userData.points);
                sessionStorage.setItem('uid', userData.uid);
                sessionStorage.setItem('profiledesc', userData.profiledesc);
                sessionStorage.setItem('email', userData.email);

                // Display the username in the success modal
                document.getElementById('username-display').textContent = userData.username;
                
                // Show success modal
                new bootstrap.Modal(document.getElementById('successModal')).show();

                // Redirect after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } catch (error) {
                console.error('Error logging in with Google:', error);
                const errorMessages = {
                    "auth/popup-closed-by-user": "The popup was closed before completing the sign-in.",
                    "auth/cancelled-popup-request": "The popup was cancelled. Please try again.",
                };
                this.errorMessage = errorMessages[error.code] || "An error occurred. Please try again.";
            }
        }
    }
}).mount('#app');