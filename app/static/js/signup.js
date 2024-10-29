// Firebase Configuration
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

// // Initialize Firebase services
// const auth = firebase.auth();
// const db = firebase.firestore();

import { app, auth, db } from '../js/firebaseConfig.js'; // Adjust the path according to your file structure

Vue.createApp({
    data() {
        return {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            errorMessage: '',
            isPasswordInvalid: false,
            passwordvalidation: [],
            isConfirmPasswordInvalid: false,
            isEmailInvalid: false,
            emailErrorMessage: ''
        };
    },
    methods: {
        checkPasswordCriteria() {
            this.passwordvalidation = [];
            this.isPasswordInvalid = false;

            if (this.password === "") {
                return;
            }

            // Validation checks
            if (this.password.length < 8) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must be at least 8 characters long.');
            }
            if (!/\d/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one digit.');
            }
            if (!/[a-z]/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one lowercase letter.');
            }
            if (!/[A-Z]/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one uppercase letter.');
            }
        },

        checkConfirmPassword() {
            this.isConfirmPasswordInvalid = false;

            if (this.confirmPassword === "") {
                return;
            }

            if (this.confirmPassword !== this.password) {
                this.isConfirmPasswordInvalid = true;
            }
        },

        checkEmail() {
            this.isEmailInvalid = false;
            this.emailErrorMessage = '';

            if (this.email === "") {
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(this.email)) {
                this.isEmailInvalid = true;
            }
        },


        async signUp() {
            this.errorMessage = '';

            // Check password criteria
            this.checkPasswordCriteria();

            // Validate confirm password
            this.checkConfirmPassword();
            if (this.isConfirmPasswordInvalid) {
                return;
            }

            // Validate email
            this.checkEmail();
            if (this.isEmailInvalid) {
                return;
            }

            try {
                // Create user with email and password
                const userCredential = await auth.createUserWithEmailAndPassword(this.email, this.password);
                const user = userCredential.user;

                // Save the username, email, and UID to Firestore
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,  // Storing UID
                    username: this.username,
                    email: this.email,
                    points: 200,
                });

                const modal = new bootstrap.Modal(document.getElementById('successModal'));
                modal.show();

                // Redirect to the login page after a brief delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);

                // Redirect to the login page
                // alert('Sign up successful! Redirecting to login...');
                // window.location.href = '/login'; // Adjust the path according to your routing setup

            } catch (error) {
                // Handle errors here
                this.errorMessage = error.message;
            }
        }
    }
}).mount('#app');


// // Initialize Firebase
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
// firebase.initializeApp(firebaseConfig);

// // Vue component
// Vue.createApp({
//     data() {
//         return {
//             email: '',
//             password: '',
//             confirmPassword: '',
//             username: '',
//             errorMessage: '',
//             successMessage: ''
//         };
//     },
//     methods: {
//         async signUp() {
//             this.errorMessage = '';  // Clear any previous error messages
//             this.successMessage = '';  // Clear any previous success messages

//             // Check if password and confirmPassword match
//             if (this.password !== this.confirmPassword) {
//                 this.errorMessage = "Passwords do not match";
//                 return;
//             }

//             try {
//                 // Ensure Firebase Auth persistence
//                 await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

//                 // Create user with email and password in Firebase
//                 const userCredential = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password);

//                 // Retrieve the ID token
//                 const idToken = await userCredential.user.getIdToken();

//                 // Send the ID token and user data to the backend
//                 const response = await fetch('/signup', {
//                     method: 'POST',
//                     headers: {
//                         'Authorization': 'Bearer ' + idToken,
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ username: this.username, email: this.email })
//                 });

//                 if (response.ok) {
//                     const data = await response.json();
//                     this.successMessage = 'User registered successfully!';
//                     console.log('User registered successfully:', data);
//                     alert('User registered successfully!');

//                     window.location.href = '/login'

//                     // Optionally, reset form fields
//                     this.email = '';
//                     this.password = '';
//                     this.confirmPassword = '';
//                     this.username = '';
//                 } else {
//                     const errorData = await response.json();
//                     this.errorMessage = 'Error registering user: ' + (errorData.error || 'Unknown error');
//                     console.error('Error registering user:', errorData);
//                 }
//             } catch (error) {
//                 console.error('Error signing up:', error);
//                 this.errorMessage = 'Error signing up: ' + error.message;
//             }
//         }
//     }
// }).mount('#app');

