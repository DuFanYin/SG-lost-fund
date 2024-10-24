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
                file: null
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
            const { item_name, location, item_description, item_type, handoff_method, handoff_location } = this.formData;

            if (item_description.length > 200) {
                alert("Item description cannot exceed 200 characters.");
                return;
            }

            if (item_name && location && item_description && item_type && handoff_method && handoff_location) {
                const formDataToSend = new FormData();
                formDataToSend.append('item_name', item_name);
                formDataToSend.append('location', location);
                formDataToSend.append('item_description', item_description);
                formDataToSend.append('item_type', item_type);
                formDataToSend.append('handoff_method', handoff_method);
                formDataToSend.append('handoff_location', handoff_location);

                if (this.formData.file) {
                    formDataToSend.append('file', this.formData.file);
                }

                axios.post('http://127.0.0.1:5000/listing', formDataToSend)
                    .then(response => {
                        console.log("Form Submitted Successfully:", response.data);
                        // alert('Form submitted successfully!');
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
                file: null
            };
            this.characterCount = 0;
        }
    }
}).mount('#temp');



   // headers: {
        // 'Content-Type': 'multipart/form-data'
//        'Content-Type': 'application/json' // Set content type to application/json
 //   }
