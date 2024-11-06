import { db } from './firebaseConfig.js';

Vue.createApp({
    data() {
        return {
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
                coordinates: { lat: null, lng: null } // Field to store coordinates
            },
            characterCount: 0,
            formSubmitted: false
        };
    },
    methods: {
        setType(type) {
            this.formData.type = type;
        },
        checkCharacterCount() {
            this.characterCount = this.formData.item_description.length;

            if (this.characterCount > 200) {
                this.formData.item_description = this.formData.item_description.slice(0, 200);
                this.characterCount = 200;
            }
        },
        geocodeLocation() {
            if (!this.formData.location) {
                alert("Please enter a location.");
                return;
            }

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: this.formData.location }, (results, status) => {
                if (status === "OK") {
                    const location = results[0].geometry.location;
                    this.formData.coordinates.lat = location.lat();
                    this.formData.coordinates.lng = location.lng();
                    alert(`Coordinates retrieved: ${this.formData.coordinates.lat}, ${this.formData.coordinates.lng}`);
                } else {
                    alert("Geocode was not successful: " + status);
                }
            });
        },
        submitForm() {
            const uid = sessionStorage.getItem('uid');
            if (this.formData.item_name && this.formData.location && this.formData.item_description &&
                this.formData.item_type && this.formData.handoff_method && this.formData.handoff_location &&
                this.formData.datetime && this.formData.file && this.formData.coordinates.lat !== null && this.formData.coordinates.lng !== null) {

                // Parse the datetime into a Firestore Timestamp
                const date = new Date(this.formData.datetime);
                const timestamp = firebase.firestore.Timestamp.fromDate(date);  // Ensure this line references firebase.firestore.Timestamp correctly

                // Prepare FormData for the file upload
                const formData = new FormData();
                formData.append('file', this.formData.file);  // Include the file for upload

                // First upload the file to the server
                fetch('/listing', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json(); // Get the file path back
                    })
                    .then(data => {
                        // Create a GeoPoint from the coordinates
                        const geoPoint = new firebase.firestore.GeoPoint(
                            this.formData.coordinates.lat,
                            this.formData.coordinates.lng
                        );

                        // Now add the document to Firestore without the File object
                        return db.collection("listings").add({
                            item_name: this.formData.item_name,
                            location: this.formData.location,
                            item_description: this.formData.item_description,
                            item_type: this.formData.item_type,
                            handoff_method: this.formData.handoff_method,
                            handoff_location: this.formData.handoff_location,
                            found_timestamp: timestamp, // Store as Firestore Timestamp
                            // datetime: this.formData.datetime,
                            uid: uid,
                            file_path: data.filePath,  // Use the file path returned from the server
                            geolocation: geoPoint, // Store as a GeoPoint
                            report_type: this.formData.type === 'found' ? 'Found' : 'Lost', // Store report_type based on selected form type
                            archived: false, // Default to false
                            comments: null // Initialize comments as null

                        });
                    })
                    .then(() => {
                        console.log("Form Submitted Successfully to Firestore");
                        this.formSubmitted = true;
                        this.resetForm();
                    })
                    .catch((error) => {
                        console.error("Error submitting the form:", error);
                        alert('There was an error submitting the form.');
                    });
            } else {
                alert("Please fill in all fields, including retrieving the coordinates.");
            }
        },
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.formData.file = file;
            }
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
                datetime: '',  // Reset datetime field
                file: null,
                coordinates: { lat: null, lng: null } // Reset coordinates

            };
            document.getElementById("file").value = null;
            this.characterCount = 0;
        }
    }
}).mount('#temp');