import { auth, db } from '../js/firebaseConfig.js';

const profile = Vue.createApp({
    data() {
        return {
            username: sessionStorage.getItem('username') || 'username',
            profiledesc: sessionStorage.getItem('profiledesc') || 'No Description',
            email: sessionStorage.getItem('email') || 'email',
            uid: sessionStorage.getItem('uid'),
            // Temporary properties for the modal form
            tempUsername: '',
            tempProfiledesc: '',
            selectedItemType: "", // New filter for item type
            foundItems: [],
            lostItems: [], // Array for lost items
            currentPage: 1, // Current page for pagination
            itemsPerPage: 6, // Number of items to display per page
            currentPageLost: 1 // Current page for pagination of lost items
        };
    },
    created() {
        this.checkAuthStatus();
    },

    // Pagination Controls
    computed: {
        paginatedItems() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.foundItems.slice(start, end);
        },
        paginatedLostItems() {
            const start = (this.currentPageLost - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.lostItems.slice(start, end);
        }
    },
    methods: {

        // Pagination Controls
        nextPage() {
            if (this.currentPage * this.itemsPerPage < this.foundItems.length) {
                this.currentPage++;
            }
        },
        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },
        nextPageLost() {
            if (this.currentPageLost * this.itemsPerPage < this.lostItems.length) {
                this.currentPageLost++;
            }
        },
        previousPageLost() {
            if (this.currentPageLost > 1) {
                this.currentPageLost--;
            }
        },

        // Date formatting
        formatTimestamp(timestamp) {
            // Convert Firebase Timestamp to JavaScript Date object
            const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);

            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true,
                timeZoneName: 'short'
            };
            return date.toLocaleString('en-US', options);
        },

        // Check authentication
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

                    // Fetch found items after setting the user data
                    this.fetchItems();
                }
            });
        },

        // Display all found and lost items based on the current UID
        fetchItems() {
            const listingsRef = db.collection('listings');
            listingsRef
                .where('uid', '==', this.uid)
                .get()
                .then((querySnapshot) => {
                    this.foundItems = [];
                    this.lostItems = [];
                    querySnapshot.forEach((doc) => {
                        const item = doc.data();
                        if (item.report_type === 'Found') {
                            this.foundItems.push(item);
                        } else if (item.report_type === 'Lost') {
                            this.lostItems.push(item);
                        }
                    });
                })
                .catch((error) => {
                    console.error("Error fetching items: ", error);
                });
        },

        openEditModal() {
            this.tempUsername = this.username;
            this.tempProfiledesc = this.profiledesc;
        },
        saveChanges() {
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
