import { db, collection, addDoc } from './firebaseConfig.js';

Vue.createApp({
    data() {
        return {
            formData: {
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
                report_type: '',
                status: 'Pending'
            },
            characterCount: 0,
            formSubmitted: false
        };
    },
    methods: {
        checkCharacterCount() {
            this.characterCount = this.formData.item_description.length;
            if (this.characterCount > 200) {
                this.formData.item_description = this.formData.item_description.slice(0, 200);
                this.characterCount = 200;
            }
        },
        async submitForm() {
            try {
                const uid = sessionStorage.getItem('uid');
                console.log("Retrieved UID:", uid);

                if (this.formData.item_name && this.formData.location && this.formData.item_description &&
                    this.formData.item_type && this.formData.handoff_method && this.formData.handoff_location &&
                    this.formData.report_type) {

                    // Prepare the data to be added to Firestore
                    const formDataToSend = {
                        item_name: this.formData.item_name,
                        location: this.formData.location,
                        item_description: this.formData.item_description,
                        item_type: this.formData.item_type,
                        handoff_method: this.formData.handoff_method,
                        handoff_location: this.formData.handoff_location,
                        report_type: this.formData.report_type,
                        status: this.formData.status,
                        uid: uid
                    };

                    // Add data to Firestore
                    await addDoc(collection(db, "listings"), formDataToSend);

                    console.log("Form Submitted Successfully to Firestore");
                    this.formSubmitted = true;
                    this.resetForm();
                } else {
                    alert("Please fill in all fields.");
                }
            } catch (error) {
                console.error("Error submitting form to Firestore:", error);
                alert('There was an error submitting the form.');
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
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
                report_type: '',
                status: 'Pending'
            };
            this.characterCount = 0;
        }
    }
}).mount('#temp');