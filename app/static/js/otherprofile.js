import { auth, db, storage } from '../js/firebaseConfig.js';



const otherProfile = Vue.createApp({
    data() {
        const defaultProfileURL = document.getElementById("profile").getAttribute("data-default-profile-url");
        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get('uid');  // Retrieve the UID from URL


        return {
            username: 'username',
            profiledesc: 'No Description',
            email: 'email',
            uid: uid,  // Use the UID from the query parameter
            profileImageURL: defaultProfileURL, // Set default profile image
            selectedBorder: '',
            selectedBackground: '',
            foundItems: [],
            lostItems: [],
            currentPage: 1,
            itemsPerPage: 6,
            currentPageLost: 1,
            loading: true,
        };
    },
    created() {
        this.fetchUserData();
        this.fetchItems();
    },
    computed: {
        expandedCardBackgroundStyle() {
            return (item) => {
                switch (item.item_type) {
                    case 'Electronics':
                        return { backgroundColor: '#ffcccc' }; // Light red for Electronics
                    case 'Clothing':
                        return { backgroundColor: '#cce6ff' }; // Light blue for Clothing
                    case 'Furniture':
                        return { backgroundColor: '#fff2cc' }; // Light yellow for Furniture
                    case 'Books':
                        return { backgroundColor: '#e6ffe6' }; // Light green for Books
                    case 'Jewelry':
                        return { backgroundColor: '#f5e6ff' }; // Light purple for Jewelry
                    default:
                        return { backgroundColor: '#f2f2f2' }; // Light grey for Others
                }
            };
        },
        itemBackgroundStyle() {
            return (item) => {
                switch (item.item_type) {
                    case 'Electronics':
                        return { backgroundImage: 'linear-gradient(0deg, #e75d5d, #ca0d33)' }; // Red gradient
                    case 'Clothing':
                        return { backgroundImage: 'linear-gradient(0deg, #4a90e2, #0033cc)' }; // Blue gradient
                    case 'Furniture':
                        return { backgroundImage: 'linear-gradient(0deg, #f2c94c, #e6b800)' }; // Yellow gradient
                    case 'Books':
                        return { backgroundImage: 'linear-gradient(0deg, #6fcf97, #33cc33)' }; // Green gradient
                    case 'Jewelry':
                        return { backgroundImage: 'linear-gradient(0deg, #bb6bd9, #9900cc)' }; // Purple gradient
                    default:
                        return { backgroundImage: 'linear-gradient(0deg, #b3b3b3, #808080)' }; // Grey gradient for others
                }
            };
        },
        backgroundStyle() {
            console.log("Background Style:", this.selectedBackground); // Check the value here
            return {
                backgroundImage: this.selectedBackground ? `url(${this.selectedBackground})` : '',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        },
        paginatedItems() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.foundItems.slice(start, end);
        },
        paginatedLostItems() {
            const start = (this.currentPageLost - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.lostItems.slice(start, end);
        },
    },
    mounted() {
        this.updateBodyBackground();
    },
    watch: {
        selectedBackground() {
            this.updateBodyBackground();
        }
    },
    
    methods: {
        updateBodyBackground() {
            if (this.selectedBackground) {
                document.body.style.backgroundImage = `url(${this.selectedBackground})`;
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
            } else {
                document.body.style.backgroundImage = '';
            }
        },
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
        toggleExpand(item) {
            item.expanded = !item.expanded; // Toggle the expanded state
        },
        fetchUserData() {
            const userRef = db.collection('users').doc(this.uid);
            userRef.get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.username = data.username || 'username';
                    this.email = data.email;
                    this.profiledesc = data.profiledesc || 'No Description';
                    this.profileImageURL = data.profileImageURL || this.profileImageURL; // Update profile image URL if it exists
                    this.selectedBorder = data.selectedborder || '';
                    this.selectedBackground = data.selectedbackground;
                    console.log("Selected background retrieved in fetchUserData:", data.selectedbackground);
                    console.log("User data updated.");
                }
            }).catch((error) => {
                console.error("Error fetching user data:", error);
            });
        },
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
        fetchItems() {
            const listingsRef = db.collection('listings');
            this.loading = true; // Set loading to true when starting to fetch items
            listingsRef
                .where('uid', '==', this.uid)
                .get()
                .then(async (querySnapshot) => {
                    this.foundItems = [];
                    this.lostItems = [];

                    // Use Promise.all to fetch user data asynchronously for all listings
                    const items = await Promise.all(querySnapshot.docs.map(async (doc) => {
                        const item = { ...doc.data(), id: doc.id, expanded: false }; // Spread data and include document ID

                        console.log("Fetching profile image for UID:", item.uid);

                        // Fetch the profileImageURL for each user based on the listing's uid
                        if (item.uid) { // Ensure uid is available
                            const userDoc = await db.collection('users').doc(item.uid).get();
                            if (userDoc.exists) {
                                item.profileImageURL = userDoc.data().profileImageURL || this.defaultProfileURL;
                                console.log("Fetched profileImageURL:", item.profileImageURL);
                            } else {
                                item.profileImageURL = this.defaultProfileURL; // Fallback to default profile URL if user doesn't exist
                                console.log("User document not found. Using default profile image.");
                            }
                        } else {
                            item.profileImageURL = this.defaultProfileURL; // Fallback for missing uid
                            console.log("UID missing. Using default profile image.");
                        }
                        console.log("Profile Image URL:", item.profileImageURL);
                        return item;
                    }));

                    // Separate found and lost items based on the report type
                    items.forEach(item => {
                        if (item.report_type === 'Found' && !item.archived) {
                            this.foundItems.push(item);
                        } else if (item.report_type === 'Lost' && !item.archived) {
                            this.lostItems.push(item);
                        }
                    });
                    this.loading = false; // Set loading to false once items are loaded
                })
                .catch((error) => {
                    console.error("Error fetching items:", error);
                    this.loading = false; // Ensure loading is set to false even if there's an error
                });
        },
        startRealTimeListener() {
            const userRef = db.collection('users').doc(this.uid);

            // Listen for real-time updates
            userRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log("Real-time listener data:", data);
                    this.username = data.username || 'username';
                    this.profiledesc = data.profiledesc || 'No Description';
                    this.selectedBorder = data.selectedborder || ''; // Update the selected border
                    this.selectedBackground = data.selectedbackground || ''; // Set background image URL
                    console.log("Selected Border retrieved in real-time:", this.selectedBorder);
                    // Fetch found items after setting the user data
                    this.fetchItems();
                }
            });
        },
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
    }
});

// Mount the Vue instance to #profile
otherProfile.mount('#profile');
