import { auth, db } from '../js/firebaseConfig.js'; // Adjust the path according to your structure

const profile = Vue.createApp({
    data() {
        return {
            username: sessionStorage.getItem('username') || 'username',
            profiledesc: sessionStorage.getItem('profiledesc') || 'No Description',
            email: sessionStorage.getItem('email') || 'email',
            uid: sessionStorage.getItem('uid'),
            // Temporary properties for the modal form
            tempUsername: '',
            tempProfiledesc: ''
        };
    },
    created() {
        this.checkAuthStatus();
    },
    methods: {
        checkAuthStatus() {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    this.uid = user.uid;
                    this.email = user.email;
                    sessionStorage.setItem('email', this.email);
                    this.startRealTimeListener();
                } else {
                    window.location.href = '/login';
                }
            });
        },
        startRealTimeListener() {
            const userRef = db.collection('users').doc(this.uid);

            // Listen for real-time updates
            userRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.username = data.username || 'username';
                    this.profiledesc = data.profiledesc || 'No Description';

                    // Cache updated data in sessionStorage
                    sessionStorage.setItem('username', this.username);
                    sessionStorage.setItem('profiledesc', this.profiledesc);
                }
            });
        },
        openEditModal() {
            // Populate temporary fields with current data
            this.tempUsername = this.username;
            this.tempProfiledesc = this.profiledesc;
        },
        saveChanges() {
            // Update the main data properties only when saving
            this.username = this.tempUsername;
            this.profiledesc = this.tempProfiledesc;

            // Reference to the user's document
            const userRef = db.collection('users').doc(this.uid);

            // Update the Firestore document with new values from the modal
            userRef.update({
                username: this.username,
                profiledesc: this.profiledesc,
            })
            .then(() => {
                console.log("Profile successfully updated!");
                // Update sessionStorage immediately after saving
                sessionStorage.setItem('username', this.username);
                sessionStorage.setItem('profiledesc', this.profiledesc);
            })
            .catch((error) => {
                console.error("Error updating profile: ", error);
            });
        }
    }
});

// Mount the Vue instance to #profile
profile.mount('#profile');
