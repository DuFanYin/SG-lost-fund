import { db } from './firebaseConfig.js';

Vue.createApp({
    data() {
        return {
            formData: {
                type: 'found', // Default type
                archived: 'False',
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
                date_time: '', // New date and time field
                latitude: '',
                longitude: ''
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
        async submitForm() {
            const uid = sessionStorage.getItem('uid');

            if (this.formData.item_name && this.formData.location && this.formData.item_description &&
                this.formData.item_type && this.formData.handoff_method && this.formData.handoff_location &&
                this.formData.date_time && this.formData.latitude && this.formData.longitude) {

                try {
                    // Upload the file to the server if it exists
                    let fileLocation = '';
                    if (this.formData.file) {
                        fileLocation = await this.uploadFileToServer(this.formData.file);
                    }

                    // Submit form data to Firestore
                    await db.collection("listings").add({
                        ...this.formData,
                        uid: uid,
                        file_location: fileLocation
                    });

                    console.log("Form Submitted Successfully to Firestore");
                    this.formSubmitted = true;
                    this.resetForm();
                } catch (error) {
                    console.error("Error submitting the form:", error);
                    alert('There was an error submitting the form.');
                }
            } else {
                alert("Please fill in all fields.");
            }
        },
        async uploadFileToServer(file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error("Failed to upload the file.");
                }

                const result = await response.json();
                return result.filePath; // Assuming server returns { filePath: "/uploads/filename" }
            } catch (error) {
                console.error("Error uploading file:", error);
                alert("Failed to upload the file.");
                return '';
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
                archived: 'False',
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
                date_time: '',
                latitude: '',
                longitude: ''
            };
            this.characterCount = 0;
        }
    }
}).mount('#temp');