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
                coordinates: { // Initialize coordinates
                    lat: null,
                    lng: null
                },
                formData: {
                    datetime: '',  // Initialize datetime
                }
            },
            characterCount: 0,
            formSubmitted: false,
            map: null, // Store map instance
            marker: null, // Store marker instance
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
        initMap() {
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
        },
        submitForm() {
            const uid = sessionStorage.getItem('uid');
        
            // Proceed with form submission if all required fields are filled
            if (this.formData.item_name && this.formData.location && this.formData.item_description &&
                this.formData.item_type && this.formData.handoff_method && this.formData.handoff_location &&
                this.formData.datetime && this.formData.file && this.formData.coordinates.lat !== null && this.formData.coordinates.lng !== null) {
            
                // Prepare FormData for the file upload
                const formData = new FormData();
                formData.append('file', this.formData.file);  // Include the file for upload
            
                // First upload the file to the server
                axios.post('/listing', formData)
                    .then(response => {
                        const data = response.data;
                        // Add document to Firestore with datetime value
                        return db.collection("listings").add({
                            item_name: this.formData.item_name,
                            location: this.formData.location,
                            item_description: this.formData.item_description,
                            item_type: this.formData.item_type,
                            handoff_method: this.formData.handoff_method,
                            handoff_location: this.formData.handoff_location,
                            found_timestamp: this.formData.datetime,
                            uid: uid,
                            file_path: data.filePath,
                            latitude: this.formData.coordinates.lat,
                            longitude: this.formData.coordinates.lng,
                            report_type: this.formData.type === 'found' ? 'Found' : 'Lost',
                            archived: false,
                            comments: null
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
            };
            document.getElementById("file").value = null;
            this.characterCount = 0;
        }
    },
    mounted() {
        // Attach initMap to the global window object
        window.initMap = this.initMap;

        // Initialize the map after Vue instance is mounted

    }
}).mount('#temp');