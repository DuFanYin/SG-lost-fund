// Clear session storage on login page load to start fresh
sessionStorage.clear();


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



            // Check if the email is empty
            if (!this.email) {
                this.errorMessage = 'Please enter your email.';
                return;
            }

            // Check if the email format is valid using a regular expression
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(this.email)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }

            if (!this.password) {
                this.errorMessage = 'Please enter your password.';
                return;
            }



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

                    sessionStorage.setItem('profileImageURL', userData.profileImageURL || "https://firebasestorage.googleapis.com/v0/b/wad2project-db69b.firebasestorage.app/o/profile_images%2Fprofile-icon.jpg?alt=media&token=54252fe9-e3f0-4cd3-b97c-dc8bc19dd85b"); // Set a default if it doesn't exist

                    // Cache selectedBorder and selectedBackground in localStorage
                    localStorage.setItem('selectedBorder', userData.selectedborder || '');
                    localStorage.setItem('selectedBackground', userData.selectedbackground || '');

                    // Display the username in the success modal
                    document.getElementById('username-display').textContent = userData.username;

                    
                // Show success modal
                new bootstrap.Modal(document.getElementById('successModal')).show();

                // Redirect after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000); // 2 seconds delay
                }
                else {
                    this.errorMessage = 'User data not found in Firestore.';
                }



                // Redirect to dashboard or other page
                // window.location.href = '/dash_board';
            } catch (error) {
                if (error.code) {
                    console.info('Firebase authentication error:', error.code, error.message);
                }

                const errorMessages = {
                    "auth/user-not-found": "No account found with this email.",
                    "auth/missing-password": "Please enter your password.",
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
                        username: result.user.displayName || result.user.email.split('@')[0], // Use display name or derive from email
                        border1: false,
                        border2: false,
                        border3: false,
                        border4: false,
                        background1: false,
                        background2: false,
                        selectedbackground: '',
                        profileImageURL: 'https://firebasestorage.googleapis.com/v0/b/wad2project-db69b.firebasestorage.app/o/profile_images%2Fprofile-icon.jpg?alt=media&token=54252fe9-e3f0-4cd3-b97c-dc8bc19dd85b',
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
                console.log('Error logging in with Google:', error);
                const errorMessages = {
                    "auth/popup-closed-by-user": "The popup was closed before completing the sign-in.",
                    "auth/cancelled-popup-request": "The popup was cancelled. Please try again.",
                };
                this.errorMessage = errorMessages[error.code] || "An error occurred. Please try again.";
            }
        }
    }
}).mount('#app');