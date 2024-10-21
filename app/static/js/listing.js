Vue.createApp({
    data() {
        return {
            // Form Data
            formData: {
                item_name: '',
                location: '',
                item_description: '',
                item_type: '',
                handoff_method: '',   
                handoff_location: '',  
                file: null
            }
        };
    },
    methods: {
        submitForm() {
            // Check if all required fields are filled in
            const { item_name, location, item_description, item_type, handoff_method, handoff_location } = this.formData;

            if (item_name && location && item_description && item_type && handoff_method && handoff_location) {
                
                // Create a FormData object to package both the JSON and file
                const formDataToSend = new FormData();

                // Append the form fields to the FormData object
                formDataToSend.append('item_name', item_name);
                formDataToSend.append('location', location);
                formDataToSend.append('item_description', item_description);
                formDataToSend.append('item_type', item_type);
                formDataToSend.append('handoff_method', handoff_method); 
                formDataToSend.append('handoff_location', handoff_location);

                // Append the file to the FormData object (if a file is provided)
                if (this.formData.file) {
                    formDataToSend.append('file', this.formData.file);
                }

                // Use Axios to send data
                axios.post('http://127.0.0.1:5000/api/item', formDataToSend, {
                    headers: {
                        // 'Content-Type': 'multipart/form-data'
                        'Content-Type': 'application/json' // Set content type to application/json

                    }
                })
                .then(response => {
                    console.log("Form Submitted Successfully:", response.data);
                    alert('Form submitted successfully!');
                    this.resetForm(); 
                })
                .catch(error => {
                    console.error("Error submitting the form:", error);
                    alert('There was an error submitting the form.');
                });

            } else {
                console.error("Missing fields:", this.formData);
                alert("Please fill in all fields.");
            }
        },
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.formData.file = file;
                console.log("File selected:", file);
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
            
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = null;
            }
        }
    }
}).mount('#temp');
