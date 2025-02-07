import { db } from '../js/firebaseConfig.js'; // Adjust the path according to your structure

const app = Vue.createApp({
    data() {
        return {
            activeTab: window.location.pathname.replace('/', '') || 'home', // Set default tab based on URL path
            username: sessionStorage.getItem('username') || '', // Get username from sessionStorage
            points: sessionStorage.getItem('points') || 0,
            uid: sessionStorage.getItem('uid') || 0,
            showSpinner: false, // Control visibility of the loading spinner overlay
            userItems: {}, // Store the user's purchase status
            unreadCount: 0,
            notifications: [], // Store the list of notifications
            borderItems: [
                { name: 'Flower SG border', points: 100, image: '../static/img/border1.png', field: 'border1', selected: false },
                { name: 'Rainbow SG border', points: 100, image: '../static/img/border2.png', field: 'border2', selected: false },
                { name: 'Cat border', points: 100, image: '../static/img/border3.png', field: 'border3', selected: false },
                { name: 'Dog border', points: 100, image: '../static/img/border4.png', field: 'border4', selected: false },
            ],
            backgroundItems: [
                { name: 'SG background 1', points: 200, image: '../static/img/background1.webp', field: 'background1', selected: false },
                { name: 'SG background 2', points: 200, image: '../static/img/background2.webp', field: 'background2', selected: false }
            ],
            confirmationMessage: '', // Message to show in the confirmation modal
        };
    },
    computed: {
        isLoggedIn() {
            // Check login status from session storage
            return sessionStorage.getItem('loggedIn') === 'true';
        }
    },
    methods: {
        
        async fetchNotifications() {
            const userId = sessionStorage.getItem('uid');
            if (!userId) return;

            db.collection('users').doc(userId).onSnapshot(
                (snapshot) => {
                    const userDoc = snapshot;
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        this.notifications = userData.notifications || [];

                        // Count the number of unread notifications
                        this.unreadCount = (this.notifications || []).filter(n => !n.read).length;
                        console.log("Notifications loaded:", this.notifications);
                    } else {
                        console.log("User document does not exist.");
                        this.notifications = [];
                    }
                },
                (error) => {
                    // Error handling callback for onSnapshot
                    console.log("Error listening to notifications:", error);
                    this.notifications = []; // Ensure it's an empty array on error
                }
            );

            // try {
            //     const userDoc = await db.collection('users').doc(userId).get();
            //     if (userDoc.exists) {
            //         const userData = userDoc.data();
            //         this.notifications = userData.notifications || [];

            //         // Count the number of unread notifications
            //         // this.unreadCount = this.notifications.filter(n => !n.read).length;
            //         this.unreadCount = (this.notifications || []).filter(n => !n.read).length;
            //         console.log("Notifications loaded:", this.notifications);
            //     }
            //     else {
            //         this.notifications = [];
            //     }
            // } catch (error) {
            //     console.error("Error fetching notifications:", error);
            //     this.notifications = []; // Ensure it's an empty array on error
            // }
        },

        async markNotificationAsRead(index) {
            const userId = sessionStorage.getItem('uid');
            if (!userId) return;

            // Update the notification read status
            this.notifications[index].read = true;
            this.unreadCount = this.notifications.filter(n => !n.read).length;

            try {
                // Update Firestore with the updated notifications list
                await db.collection('users').doc(userId).update({
                    notifications: this.notifications,
                });
            } catch (error) {
                console.log("Error updating notifications:", error);
            }
        },
        async deleteNotification(index) {
            const userId = sessionStorage.getItem('uid');
            if (!userId) {
                console.log("User ID not found in session storage");
                return;
            }

            try {
                // Remove the notification from Vue's state
                const notificationToDelete = this.notifications[index];
                this.notifications.splice(index, 1);

                // Update the unread count
                this.unreadCount = this.notifications.filter(n => !n.read).length;

                // Remove the notification from Firestore
                await db.collection('users').doc(userId).update({
                    notifications: firebase.firestore.FieldValue.arrayRemove(notificationToDelete),
                });

                console.log("Notification deleted successfully");
            } catch (error) {
                console.log("Error deleting notification:", error);
            }
        },

        showNotifications() {
            // const dropdownElement = document.getElementById('notificationDropdown');
            // const dropdown = new bootstrap.Dropdown(dropdownElement);
            // dropdown.toggle();
            const dropdownElement = document.getElementById('notificationDropdown');
            if (dropdownElement) {
                const dropdown = bootstrap.Dropdown.getOrCreateInstance(dropdownElement);
                // dropdown.toggle();
                dropdownElement.addEventListener('click', () => dropdown.toggle());
            } else {
                console.log("Notification dropdown element not found.");
            }
        },

        logout() {
            sessionStorage.clear(); // Clear session storage on logout
            window.location.href = '/login'; // Redirect to login page
        },
        setActiveTab(tab) {
            this.activeTab = tab; // Set active tab for dynamic styling
        },

        setupRealTimeListener() {
            const userId = sessionStorage.getItem('uid'); // Assuming you store the user ID in session storage
            if (!userId) {
                console.log("User ID not found in session storage");
                return;
            }

            db.collection('users').doc(userId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        console.log("Received updated data:", userData);
                        sessionStorage.setItem('points', userData.points);
                        this.points = userData.points;
                        sessionStorage.setItem('username', userData.username);
                        this.username = userData.username;

                        this.borderItems.forEach(item => {
                            item.purchased = userData[item.field] || false;
                        });

                        // Update background items' purchase status
                        this.backgroundItems.forEach(item => {
                            item.purchased = userData[item.field] || false;
                        });
                    } else {
                        console.log("Document does not exist");
                    }
                }); // Close onSnapshot correctly here
        },
        setActiveTab(tab, event) {  // Renamed to avoid conflict with the existing setActiveTab
            if (tab === 'listing' && !this.isLoggedIn) {
                event.preventDefault(); // Prevent default navigation behavior
                // Show the modal if the user is not logged in
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } else {
                this.activeTab = tab; // Set active tab for dynamic styling
            }
        },
        startRedirectToLogin() {
            this.showSpinner = true; // Show the full-screen overlay with spinner
            setTimeout(this.redirectToLogin, 2000); // Wait for 2 seconds, then redirect
        },
        redirectToLogin() {
            window.location.href = '/login'; // Redirect to login page
        },
        async fetchUserItems() {
            const userId = sessionStorage.getItem('uid'); // Assuming user ID is stored in session storage
            if (!userId) return;

            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    this.userItems = userDoc.data();

                    // Set the purchased status for each item
                    this.borderItems.forEach(item => {
                        item.purchased = this.userItems[item.field] || false;
                    });
                    this.backgroundItems.forEach(item => {
                        item.purchased = this.userItems[item.field] || false;
                    });

                    // Check if selectedborder exists and set the selected item
                    if (this.userItems.selectedborder) {
                        const selectedBorderImage = this.userItems.selectedborder;
                        this.borderItems.forEach(item => {
                            if (item.image === selectedBorderImage) {
                                item.selected = true; // Set the selected property to true
                            }
                        });
                    }

                    // Similarly, check for selectedbackground if needed
                    if (this.userItems.selectedbackground) {
                        const selectedBackgroundImage = this.userItems.selectedbackground;
                        this.backgroundItems.forEach(item => {
                            if (item.image === selectedBackgroundImage) {
                                item.selected = true; // Set the selected property to true
                            }
                        });
                    }

                }
            } catch (error) {
                console.log("Error fetching user items:", error);
            }
        },
        toggleElementVisibility() {
            const elementToHide = document.getElementById("toggle-panel-button");
            const infoPanel = document.getElementById('info-panel');
            if (elementToHide && (infoPanel == null || infoPanel.style.display == 'none' )) {
                elementToHide.classList.toggle("hidden"); // Toggle the 'hidden' class
                console.log("Toggle applied to element.");
            } else {
                console.log("Element to toggle not found.");
            }
        },
        async purchaseItem(item) {
            const userId = sessionStorage.getItem('uid');

            if (this.points >= item.points && !item.purchased) {
                // Deduct points and mark the item as purchased in Vue data
                this.points -= item.points;
                item.purchased = true;

                // Update Firestore to mark the item as purchased
                try {
                    await db.collection('users').doc(userId).set({
                        [item.field]: true,
                        points: this.points  // Save the updated points back to Firestore
                    }, { merge: true });

                    // Update session storage with the new points value
                    sessionStorage.setItem('points', this.points);

                    this.confirmationMessage = `You have successfully purchased ${item.name}!`;

                    const purchaseConfirmationModal = new bootstrap.Modal(document.getElementById('purchaseConfirmationModal'));
                    purchaseConfirmationModal.show();

                    console.log(`Purchased ${item.name} for ${item.points} points`);
                } catch (error) {
                    console.log("Error updating Firestore:", error);
                }
            } else if (item.purchased) {
                console.log(`Selected ${item.name}`);
            } else {
                const insufficientPointsModal = new bootstrap.Modal(document.getElementById('insufficientPointsModal'));
                insufficientPointsModal.show();
                console.log("Not enough points to purchase this item");
            }
        },
        async selectItem(item) {
            const userId = sessionStorage.getItem('uid');
            if (!userId) {
                console.log("User ID not found in session storage");
                return;
            }

            // Determine if it's a border or background selection
            const updateField = this.borderItems.includes(item) ? 'selectedborder' : 'selectedbackground';

            // Check if the item is already selected to toggle selection
            const isCurrentlySelected = item.selected;

            try {
                if (isCurrentlySelected) {
                    // Deselect the item if it's already selected
                    await db.collection('users').doc(userId).update({
                        [updateField]: firebase.firestore.FieldValue.delete()
                    });
        
                    console.log(`Deselected ${item.name} as ${updateField}`);
        
                    // Deselect all items in the category
                    if (updateField === 'selectedborder') {
                        this.borderItems.forEach(borderItem => {
                            borderItem.selected = false;
                        });
                    } else if (updateField === 'selectedbackground') {
                        this.backgroundItems.forEach(backgroundItem => {
                            backgroundItem.selected = false;
                        });
                    }
                } else {
                    // Select the item
                    await db.collection('users').doc(userId).set({
                        [updateField]: item.image
                    }, { merge: true });
        
                    console.log(`Selected ${item.name} as ${updateField} with image ${item.image}`);
        
                    // Update the selected status in Vue data
                    if (updateField === 'selectedborder') {
                        // Set the selected state only for the chosen border
                        this.borderItems.forEach(borderItem => {
                            borderItem.selected = (borderItem === item);
                        });
                    } else if (updateField === 'selectedbackground') {
                        // Set the selected state only for the chosen background
                        this.backgroundItems.forEach(backgroundItem => {
                            backgroundItem.selected = (backgroundItem === item);
                        });
                    }
                }

            } catch (error) {
                console.log("Error updating selected item in Firestore:", error);
            }
        },


        showPointShop() {
            const modalElement = document.getElementById('pointShopModal');
            const pointShopModal = new bootstrap.Modal(modalElement);
            pointShopModal.show();
        }
    },
    mounted() {
        console.log("Navbar mounted, isLoggedIn:", this.isLoggedIn);
        console.log("Username:", this.username);
        console.log("Points:", this.points)
        console.log("uid:", this.uid)
        console.log("Border Items:", this.borderItems);
        console.log("Background Items:", this.backgroundItems);

        this.fetchUserItems(); // Fetch purchase status when component is mounted

        // Make sure uid, username, and points are set in session storage when component mounts
        if (!this.uid) {
            this.uid = sessionStorage.getItem('uid'); // Retrieve uid if missing
        }

        if (this.isLoggedIn) {
            this.setupRealTimeListener(); // Automatically call it here when the component mounts
            this.fetchNotifications();
        }

        window.addEventListener('storage', (event) => {
            if (event.key === 'username') {
                this.username = event.newValue;
            }
        });
    }
});

// Fetch the navbar HTML and mount Vue after loading
fetch('/navbar')
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        app.mount('#navbar-placeholder');
    })
    .catch(error => console.log('Error loading navbar:', error));