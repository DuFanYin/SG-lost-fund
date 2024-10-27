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

// Vue component
Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            confirmPassword: '',
            username: '',
            errorMessage: '',
            successMessage: ''
        };
    },
    methods: {
        async signUp() {
            this.errorMessage = '';  // Clear any previous error messages
            this.successMessage = '';  // Clear any previous success messages

            // Check if password and confirmPassword match
            if (this.password !== this.confirmPassword) {
                this.errorMessage = "Passwords do not match";
                return;
            }

            try {
                // Ensure Firebase Auth persistence
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

                // Create user with email and password in Firebase
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password);

                // Retrieve the ID token
                const idToken = await userCredential.user.getIdToken();

                // Send the ID token and user data to the backend
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + idToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username: this.username, email: this.email })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.successMessage = 'User registered successfully!';
                    console.log('User registered successfully:', data);
                    alert('User registered successfully!');

                    window.location.href = '/login'

                    // Optionally, reset form fields
                    this.email = '';
                    this.password = '';
                    this.confirmPassword = '';
                    this.username = '';
                } else {
                    const errorData = await response.json();
                    this.errorMessage = 'Error registering user: ' + (errorData.error || 'Unknown error');
                    console.error('Error registering user:', errorData);
                }
            } catch (error) {
                console.error('Error signing up:', error);
                this.errorMessage = 'Error signing up: ' + error.message;
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

// // Vue instance
// Vue.createApp({
//     data() {
//         return {
//             username: '',
//             email: '',
//             password: '',
//             confirmPassword: '',
//             errorMessage: '',
//             successMessage: ''
//         };
//     },
//     methods: {
//         async signUp() {
//             this.errorMessage = '';  // Clear previous error message
//             this.successMessage = '';  // Clear previous success message

//             // // Validate if password and confirmPassword match
//             // if (this.password !== this.confirmPassword) {
//             //     this.errorMessage = "Passwords do not match";
//             //     return;
//             // }

//             try {
//                 // Create user with email and password in Firebase
//                 const userCredential = await firebase.auth().createUserWithEmailAndPassword(this.email, this.password);
//                 const idToken = await userCredential.user.getIdToken();
//                 console.log("ID Token:", idToken);  // Add this to check if the token is generated correctly


//                 // Send the ID token and email to the backend
//                 const response = await fetch('/signup', {
//                     method: 'POST',
//                     headers: {
//                         'Authorization': 'Bearer ' + idToken,
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ username: this.username, email: this.email })
//                 });

//                 if (response.ok) {
//                     this.successMessage = 'User registered successfully!';

//                     // alert
//                     alert(`Welcome ${this.username} to the SG Lost & Found Website!`);

//                     // redirect user to home page
//                     setTimeout(() => {
//                         location.assign('/user_profile');
//                     }, 100);

//                     this.username = '';
//                     this.email = '';
//                     this.password = '';
//                     this.confirmPassword = '';
//                 } else {
//                     const errorData = await response.json();
//                     this.errorMessage = errorData.error || 'Error registering user';
//                 }

//             } catch (error) {
//                 console.error('Error signing up:', error);
//                 this.errorMessage = 'Error signing up: ' + error.message;
//             }
//         }
//     }
// }).mount('#app');