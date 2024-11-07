import { auth, db, storage} from '../js/firebaseConfig.js';

const profile = Vue.createApp({
    data() {
        const defaultProfileURL = document.getElementById("profile").getAttribute("data-default-profile-url");

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
            currentPageLost: 1,// Current page for pagination of lost items
            selectedBorder: localStorage.getItem('selectedBorder') || '',  // Use cached value on load
            selectedBackground: localStorage.getItem('selectedBackground') || '',  // Use cached value on load
            profileImageURL: sessionStorage.getItem('profileImageURL') || defaultProfileURL, // Use the Flask default URL
        };
    },
    created() {
        this.checkAuthStatus();
    },
    mounted() {
        // Apply the initial background when the component mounts
        this.updateBodyBackground();
    },
    beforeUnmount() {
        // Reset the body background when the component is unmounted, if desired
        document.body.style.backgroundImage = '';
    },
    watch: {
        selectedBackground() {
            this.updateBodyBackground();
        }
    },

    // Pagination Controls
    computed: {
        backgroundStyle() {
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
        charactersRemaining() {
            return `${165 - this.tempProfiledesc.length} characters remaining`;
        },
    },
    methods: {
        fetchUserData() {
            const userRef = db.collection('users').doc(this.uid);
            userRef.get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.username = data.username || 'username';
                    this.profiledesc = data.profiledesc || 'No Description';
                    this.profileImageURL = data.profileImageURL || this.profileImageURL; // Update profile image URL if it exists
                    sessionStorage.setItem('profileImageURL', this.profileImageURL); // Save in sessionStorage
                    console.log("User data updated.");
                }
            }).catch((error) => {
                console.error("Error fetching user data:", error);
            });
        },
        
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.resizeImageToSquare(file, (squareBlob) => {
                    this.profileImageFile = squareBlob;
                    // Now `profileImageFile` is ready to upload as a square image
                });
            }
        },
    
        resizeImageToSquare(file, callback) {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.onload = () => {
                    const side = Math.min(img.width, img.height); // Crop to the smallest side for a square
                    canvas.width = side;
                    canvas.height = side;
                    
                    ctx.drawImage(
                        img,
                        (img.width - side) / 2, // Center horizontally
                        (img.height - side) / 2, // Center vertically
                        side, // Width to draw
                        side, // Height to draw
                        0, // Destination x
                        0, // Destination y
                        side, // Destination width
                        side // Destination height
                    );
    
                    // Convert canvas to blob
                    canvas.toBlob((blob) => {
                        callback(blob);
                    }, 'image/jpeg', 0.9); // Set desired format and quality
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },
        async uploadProfileImage() {
            if (!this.profileImageFile) return;
    
            const storageRef = storage.ref().child(`profile_images/${this.uid}`);
            const uploadTask = storageRef.put(this.profileImageFile);
    
            // Track the upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Optional: Handle upload progress
                },
                (error) => {
                    console.error("Error uploading image:", error);
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    this.updateProfileImageURL(downloadURL);
                }
            );
        },
        updateProfileImageURL(downloadURL) {
            const userRef = db.collection('users').doc(this.uid);
            userRef.update({ profileImageURL: downloadURL })
                .then(() => {
                    console.log("Profile image updated successfully.");
                    this.profileImageURL = downloadURL; // Update Vue data
                    sessionStorage.setItem('profileImageURL', downloadURL); // Store in sessionStorage
                })
                .catch((error) => {
                    console.error("Error updating profile image URL:", error);
                });
        },
        
        archiveItem(item) {
            // Reference to the specific item document in Firestore
            const itemRef = db.collection('listings').doc(item.id); // Assume `id` is the document ID
    
            // Update the 'archived' field to true
            itemRef.update({ archived: true })
                .then(() => {
                    console.log(`Item ${item.item_name} archived successfully.`);
                    item.archived = true; // Update locally
    
                    // Remove the item from the appropriate array
                    if (item.report_type === 'Found') {
                        this.foundItems = this.foundItems.filter(i => i.id !== item.id);
                    } else if (item.report_type === 'Lost') {
                        this.lostItems = this.lostItems.filter(i => i.id !== item.id);
                    }
                })
                .catch((error) => {
                    console.error("Error archiving item:", error);
                });
        },
        updateBodyBackground() {
            if (this.selectedBackground) {
                document.body.style.backgroundImage = `url(${this.selectedBackground})`;
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
            } else {
                document.body.style.backgroundImage = '';
            }
        },
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
                    console.log("Real-time listener data:", data);
                    this.username = data.username || 'username';
                    this.profiledesc = data.profiledesc || 'No Description';
                    this.selectedBorder = data.selectedborder || ''; // Update the selected border
                    this.selectedBackground = data.selectedbackground || ''; // Set background image URL


                    // Cache updated data in localStorage
                    localStorage.setItem('selectedBorder', this.selectedBorder);
                    localStorage.setItem('selectedBackground', this.selectedBackground);
                    console.log(localStorage.getItem('selectedBackground')); // Logs the URL of selectedBackground
                    console.log(localStorage.getItem('selectedBorder')); // Logs the URL of selectedBorder


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
                        const item = { ...doc.data(), id: doc.id }; // Spread data and include document ID
                        if (item.report_type === 'Found' && !item.archived) {
                            this.foundItems.push(item);
                        } else if (item.report_type === 'Lost' && !item.archived) {
                            this.lostItems.push(item);
                        }
                    });
                })
                .catch((error) => {
                    console.error("Error fetching items:", error);
                });
        },

        openEditModal() {
            this.tempUsername = this.username;
            this.tempProfiledesc = this.profiledesc;
            console.log("Temp Username in Modal:", this.tempUsername);
            console.log("Temp Profile Description in Modal:", this.tempProfiledesc);
        },
        saveChanges() {
            this.username = this.tempUsername;
            this.profiledesc = this.tempProfiledesc;

            // Save changes to profile image if a new one is uploaded
            if (this.profileImageFile) {
                this.uploadProfileImage();
            }

            // Update other user details in Firestore
            const userRef = db.collection('users').doc(this.uid);
            userRef.update({
                username: this.username,
                profiledesc: this.profiledesc,
            }).then(() => {
                console.log("Profile successfully updated!");
                sessionStorage.setItem('username', this.username);
                sessionStorage.setItem('profiledesc', this.profiledesc);
            }).catch((error) => {
                console.error("Error updating profile: ", error);
            });
        },
    },
});

// Mount the Vue instance to #profile
profile.mount('#profile');
