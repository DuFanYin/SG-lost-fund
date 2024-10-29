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
                report_type: '', // New field for Report Type
                status: 'Pending' // Default status set to Pending
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
        submitForm() {
            const { item_name, location, item_description, item_type, handoff_method, handoff_location, report_type } = this.formData;

            if (item_description.length > 200) {
                alert("Item description cannot exceed 200 characters.");
                return;
            }

            // Retrieve uid from sessionStorage
            const uid = sessionStorage.getItem('uid');
            console.log("Retrieved UID:", uid); // Log the UID to ensure it's retrieved correctly


            if (item_name && location && item_description && item_type && handoff_method && handoff_location && report_type) {
                const formDataToSend = new FormData();
                formDataToSend.append('item_name', item_name);
                formDataToSend.append('location', location);
                formDataToSend.append('item_description', item_description);
                formDataToSend.append('item_type', item_type);
                formDataToSend.append('handoff_method', handoff_method);
                formDataToSend.append('handoff_location', handoff_location);
                formDataToSend.append('report_type', report_type); // Append report type
                formDataToSend.append('status', this.formData.status); // Always Pending
                formDataToSend.append('uid', uid); // Append the user's uid

                if (this.formData.file) {
                    formDataToSend.append('file', this.formData.file);
                }

                // // Log formData contents for debugging
                // for (let [key, value] of formDataToSend.entries()) {
                //     console.log(`${key}: ${value}`);
                // }

                axios.post('http://127.0.0.1:5000/listing', formDataToSend)
                    .then(response => {
                        console.log("Form Submitted Successfully:", response.data);
                        this.formSubmitted = true;
                        this.resetForm();
                    })
                    .catch(error => {
                        console.error("Error submitting the form:", error);
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
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',
                handoff_location: '',
                file: null,
                report_type: '', // Reset the new fields
                status: 'Pending' // Reset the status to Pending
            };
            this.characterCount = 0;
        }
    }
}).mount('#temp');
