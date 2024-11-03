import { db } from './firebaseConfig.js';

Vue.createApp({
    data() {
        return {
            formData: {
                type: 'found', // Default type
                archieved: 'False',
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
            },
            characterCount: 0,
            formSubmitted: false
        };
    },
    methods: {
        setType(type) {
            this.formData.type = type; // This updates the type
        },
        checkCharacterCount() {
            this.characterCount = this.formData.item_description.length;

            if (this.characterCount > 200) {
                this.formData.item_description = this.formData.item_description.slice(0, 200);
                this.characterCount = 200;
            }
        },
        submitForm() {
            const uid = sessionStorage.getItem('uid');
            if (this.formData.item_name && this.formData.location && this.formData.item_description &&
                this.formData.item_type && this.formData.handoff_method && this.formData.handoff_location) {

                db.collection("listings").add({
                    ...this.formData,
                    uid: uid,  // Capture and add the user ID to the document
                })
                .then(() => {
                    console.log("Form Submitted Successfully to Firestore");
                    this.formSubmitted = true;
                    this.resetForm();
                })
                .catch((error) => {
                    console.error("Error submitting the form to Firestore:", error);
                    alert('There was an error submitting the form.');
                });
            } else {
                alert("Please fill in all fields.");
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
                type: 'found', // Reset to default type
                archieved: 'False',
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
            };
            this.characterCount = 0;
        }
    }
}).mount('#temp');