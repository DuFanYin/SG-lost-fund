// Clear session storage on login page load to start fresh
sessionStorage.clear();

// Firebase Configuration
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

// Initialize Firebase app
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = firebase.auth();

// Initialize Firestore
const db = firebase.firestore();  // Add this line to initialize Firestore

Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            errorMessage: ''
        };
    },
    methods: {
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
                    sessionStorage.setItem('contantnum', userData.contantnum);  // Ensure this line is executed
                }

                // Redirect to dashboard or other page
                window.location.href = '/dash_board';
            } catch (error) {
                console.error('Error logging in:', error);
                this.errorMessage = 'Error logging in: ' + error.message;
            }
        }
    }
}).mount('#app');



// // Clear session storage on login page load to start fresh
// sessionStorage.clear();

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

// // Vue instance for handling login
// Vue.createApp({
//     data() {
//         return {
//             email: '',
//             password: '',
//             errorMessage: ''
//         };
//     },
//     methods: {
//         async logIn() {
//             this.errorMessage = '';  // Reset error message

//             try {
//                 // Sign out the user to clear any existing session or cache
//                 await firebase.auth().signOut();

//                 // Sign in the user with Firebase Authentication
//                 const userCredential = await firebase.auth().signInWithEmailAndPassword(this.email, this.password);
//                 const idToken = await userCredential.user.getIdToken();
//                 console.log("ID Token:", idToken);  // Add this to check if the token is generated correctly

//                 // const idToken = await userCredential.user.getIdToken(true);  // force refresh


//                 // Send ID token to backend for verification
//                 const response = await fetch('/login', {
//                     method: 'POST',
//                     headers: {
//                         'Authorization': 'Bearer ' + idToken,
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ email: this.email })
//                 });

//                 if (response.ok) {
//                     // const data = await response.json();
//                     sessionStorage.setItem('loggedIn', 'true');  // Store logged-in status
//                     window.location.reload(); // Force page reload to update navbar

//                     // console.log('User logged in successfully:', data);
//                     console.log('User logged in successfully:');
//                     alert('Login successful!');
//                     // Redirect to dashboard or other page
//                     window.location.href = '/dash_board';
//                 } else {
//                     const errorData = await response.json();
//                     this.errorMessage = errorData.error || 'Error logging in.';
//                 }
//             } catch (error) {
//                 console.error('Error logging in:', error);
//                 this.errorMessage = 'Login failed: ' + error.message;
//             }
//         }
//     }
// }).mount('#app');