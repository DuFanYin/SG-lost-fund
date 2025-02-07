import { db, GeoPoint, storage } from './firebaseConfig.js';

Vue.createApp({
    data() {
        return {
            currentStep: 1,
            formData: {
                type: 'found', // Default type
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                datetime: '',  // New datetime field
                file: null,
                coordinates: { // Initialize coordinates
                    lat: null,
                    lng: null
                }
            },
            dateError: '',
            currentDateTime: this.getCurrentDateTime(), // Initialize the current date and time
            characterCount: 0,
            formSubmitted: false,
            map: null, // Store map instance
            marker: null, // Store marker instance
            errorMessages: [] // Array to hold validation messages
        };
    },
    methods: {
        nextStep() {
            // Call the validation method before proceeding
            if (!this.validateStep()) {
                // If validation fails, do not proceed to the next step
                return;
            }

            // proceed to the next step
            if (this.currentStep < 3) {
                this.currentStep++;
                if (this.currentStep === 2) {
                    this.$nextTick(() => {
                        this.initMap();
                    });
                }
            }
        },
        previousStep() {
            if (this.currentStep > 1) {
                this.currentStep--;
                if (this.currentStep === 2) {
                    this.$nextTick(() => {
                        this.initMap();
                    });
                }
            }
        },
        validateStep() {
            this.errorMessages = []; // Reset error messages

            // Step 1 Validation: Item Details
            if (this.currentStep === 1) {
                if (!this.formData.type) {
                    this.errorMessages.push("Please select whether the item is 'Found' or 'Lost'.");
                }
                if (!this.formData.item_name.trim()) {
                    this.errorMessages.push("Item name is required.");
                }
                if (!this.formData.item_type) {
                    this.errorMessages.push("Please select an item type.");
                }
                if (!this.formData.item_description.trim()) {
                    this.errorMessages.push("Item description is required.");
                }
                if (!this.formData.file) {
                    this.errorMessages.push("Please upload an image of the item.");
                }
            }

            // Step 2 Validation: Time & Location Details
            if (this.currentStep === 2) {
                if (!this.formData.datetime) {
                    this.errorMessages.push("Date and time are required.");
                }
                if (!this.formData.location.trim()) {
                    this.errorMessages.push("Location is required.");
                }
                if (!this.formData.coordinates.lat || !this.formData.coordinates.lng) {
                    this.errorMessages.push("Please select a valid location on the map.");
                }
            }

            // Step 3 Validation: Hand-Off Details
            if (this.currentStep === 3) {
                if (!this.formData.handoff_method) {
                    this.errorMessages.push("Please select a handoff method.");
                }
                if (!this.formData.handoff_location.trim()) {
                    this.errorMessages.push("Handoff location is required.");
                }
            }

            // Return false if there are any error messages
            return this.errorMessages.length === 0;
        },
        validateDateTime() {
            const selectedDateTime = new Date(this.formData.datetime);
            const currentDateTime = new Date(this.currentDateTime);
    
            // Check if the selected date and time is in the future
            if (selectedDateTime > currentDateTime) {
                this.dateError = "Please select a date and time that is not in the future.";
            } else {
                this.dateError = "";
            }
        },
        
        getCurrentDateTime() {
            const now = new Date();
    
            // Format as 'YYYY-MM-DDTHH:MM' to set both date and time
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
    
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },
        setType(type) {
            this.formData.type = type;
            console.log(this.formData.type);  // Check the value of formData.type

        },
        checkCharacterCount() {
            this.characterCount = this.formData.item_description.length;

            if (this.characterCount > 200) {
                this.formData.item_description = this.formData.item_description.slice(0, 200);
                this.characterCount = 200;
            }
        },

        initMap() {
            const mapDiv = document.getElementById('map');
            if (!mapDiv) {
                console.log('Map container element not found.');
                return;
            }

            // Center of Singapore
            const singapore = { lat: 1.3521, lng: 103.8198 };

            // Initialize the map
            this.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 12,
                center: singapore
            });

            // Create a marker at the initial position
            this.marker = new google.maps.Marker({
                position: singapore,
                map: this.map
            });

            // Listen for click events on the map
            google.maps.event.addListener(this.map, 'click', (event) => {
                const clickedLocation = event.latLng;

                // Move the marker to the clicked position
                this.marker.setPosition(clickedLocation);

                // Update the coordinates in the form data
                this.formData.coordinates.lat = clickedLocation.lat();
                this.formData.coordinates.lng = clickedLocation.lng();

                // Update the input fields with the new coordinates
                document.getElementById('lat').value = this.formData.coordinates.lat;
                document.getElementById('lng').value = this.formData.coordinates.lng;
            });
            google.maps.event.trigger(this.map, 'resize');
        },
        async submitForm() {
            // Trigger validation for step 3
            if (!this.validateStep()) {
                // If validation fails, do not proceed with form submission
                return;
            }

            const uid = sessionStorage.getItem('uid');
            if (this.formData.item_name && this.formData.file && this.formData.location) {
                try {
                    // Upload the image file and get the URL
                    const imageURL = await this.uploadImageAndGetURL(this.formData.file);

                    const datetimeValue = new Date(this.formData.datetime);

                    // Save the listing with the image URL
                    await db.collection("listings").add({
                        item_name: this.formData.item_name,
                        location: this.formData.location,
                        item_description: this.formData.item_description,
                        item_type: this.formData.item_type,
                        handoff_method: this.formData.handoff_method,
                        handoff_location: this.formData.handoff_location,
                        found_timestamp: firebase.firestore.Timestamp.fromDate(datetimeValue),
                        uid: uid,
                        imageURL: imageURL, // Link the image URL to the listing
                        geolocation: new GeoPoint(this.formData.coordinates.lat, this.formData.coordinates.lng),
                        report_type: this.formData.type === 'found' ? 'Found' : 'Lost',
                        archived: false,
                        comments: []
                    });

                    console.log("Listing with image saved successfully.");
                    this.formSubmitted = true;
                    this.resetForm();
                } catch (error) {
                    console.log("Error saving the listing:", error);
                    alert('There was an error submitting the form.');
                }
            } else {
                alert("Please fill in all fields, including uploading an image.");
            }
        },
        handleFileUpload(event) {
            this.formData.file = event.target.files[0];
        },
        async uploadImageAndGetURL(file) {
            const storageRef = storage.ref(`listings/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload is ${progress}% done`);
                    },
                    (error) => {
                        console.log("Error uploading image:", error);
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(downloadURL);
                    }
                );
            });
        },
        resetForm() {
            this.formData = {
                type: 'found',
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                datetime: '',
                file: null,
                coordinates: { lat: null, lng: null }
            };
            this.characterCount = 0;
        }
    },

    // auto zooms into the location and display the coordinates
    watch: {
        'formData.location': function (newLocation) {
            if (newLocation.trim() !== "") {
                const geocoder = new google.maps.Geocoder();

                // Geocode the entered location
                geocoder.geocode({ address: newLocation, componentRestrictions: { country: "SG" } }, (results, status) => {
                    if (status === "OK" && Array.isArray(results) && results.length > 0) {
                        const foundLocation = results[0].geometry?.location;

                        if (foundLocation) {
                            // Center the map on the found location and zoom in
                            this.map.setCenter(foundLocation);
                            this.map.setZoom(15);

                            // Move the marker to the found location
                            this.marker.setPosition(foundLocation);

                            // Update formData coordinates
                            this.formData.coordinates.lat = foundLocation.lat();
                            this.formData.coordinates.lng = foundLocation.lng();

                            // Update the input fields with the new coordinates
                            document.getElementById('lat').value = this.formData.coordinates.lat;
                            document.getElementById('lng').value = this.formData.coordinates.lng;

                            console.log("Auto-zoomed to location:", this.formData.coordinates);
                        } else {
                            console.log("Found location is undefined.");
                        }
                    } else {
                        console.log("Geocode was not successful or results array is empty.");
                    }
                });
            }
        }
    },

    mounted() {
        // Attach initMap to the global window object
        window.initMap = this.initMap;

        // Initialize the map after Vue instance is mounted

    }
}).mount('#temp');