import { app, auth, db } from '../js/firebaseConfig.js'; // Adjust the path according to your file structure

Vue.createApp({
    data() {
        return {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            errorMessage: '',
            isPasswordInvalid: false,
            passwordvalidation: [],
            isConfirmPasswordInvalid: false,
            isEmailInvalid: false,
            emailErrorMessage: '',
            showPassword: false,
            showConfirmPassword: false,
            isEmailDuplicate: false,
            isUsernameInvalid: false
        };
    },
    methods: {
        togglePasswordVisibility() {
            this.showPassword = !this.showPassword;
        },
        toggleConfirmPasswordVisibility() {
            this.showConfirmPassword = !this.showConfirmPassword;
        },

        async validateAllFields() {
            // Clear existing messages
            this.passwordvalidation = [];

            // Run all validation checks and push error messages if found
            await this.checkUsernameUnique();
            this.checkEmail();
            await this.checkEmailUnique();
            this.checkPasswordCriteria();
            this.checkConfirmPassword();

  

        },

        checkPasswordCriteria() {
            this.passwordvalidation = this.passwordvalidation.filter(
                message => !message.includes('Password')
            );

            if (this.password === "") {
                return;
            }

            // Validation checks
            if (this.password.length < 8) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must be at least 8 characters long.');
            }
            if (!/\d/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one digit.');
            }
            if (!/[a-z]/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one lowercase letter.');
            }
            if (!/[A-Z]/.test(this.password)) {
                this.isPasswordInvalid = true;
                this.passwordvalidation.push('Password must contain at least one uppercase letter.');
            }
        },

        checkConfirmPassword() {
            this.passwordvalidation = this.passwordvalidation.filter(
                message => !message.includes('Confirm password')
            );

            if (this.confirmPassword === "") {
                return;
            }

            if (this.confirmPassword !== this.password) {
                this.passwordvalidation.push('Confirm password must match the password.');
            }
        },

        checkEmail() {
            this.passwordvalidation = this.passwordvalidation.filter(
                message => !message.includes('Please enter a valid email address')
            );

            if (this.email === "") {
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(this.email)) {
                this.passwordvalidation.push('Please enter a valid email address.');
            }
        },

        validateEmail() {
            this.checkEmail();       // Check email format
            this.checkEmailUnique();  // Check if email is unique
        },

        async checkUsernameUnique() {
            this.passwordvalidation = this.passwordvalidation.filter(
                message => !message.includes('Username already exists')
            );
            if (this.username === '') return;

            try {
                // Check Firestore for existing username
                const querySnapshot = await db.collection('users')
                    .where('username', '==', this.username)
                    .get();

                // Log the query result
                if (!querySnapshot.empty) {
                    this.passwordvalidation.push('Username already exists.');
                }
            } catch (error) {
                console.error('Error checking username uniqueness:', error);
            }
        },

        async checkEmailUnique() {
            this.passwordvalidation = this.passwordvalidation.filter(
                message => !message.includes('Email already exists')
            );
            if (this.email === '') return;
            
            try {
                // Check Firestore for existing email
                const querySnapshot = await db.collection('users')
                    .where('email', '==', this.email)
                    .get();
                
                // Log the query result
                console.log('Email Query Snapshot:', querySnapshot);
        
                // Check if the email already exists
                this.isEmailDuplicate = !querySnapshot.empty;
                if (!querySnapshot.empty) {
                    this.passwordvalidation.push('Email already exists.');
                }
            } catch (error) {
                console.error('Error checking email uniqueness:', error);
            }
        },
        

        async signUp() {
            this.passwordvalidation = [];  // Reset validation messages

            // Check password criteria
        

           // Run all field validations
           await this.validateAllFields();

           // If there are any validation errors, do not proceed
           if (this.passwordvalidation.length > 0) {
            const failureModal = new bootstrap.Modal(document.getElementById('failureModal'));
            failureModal.show();
            return;
        }

            try {
                // Create user with email and password
                const userCredential = await auth.createUserWithEmailAndPassword(this.email, this.password);
                const user = userCredential.user;

                // Save the username, email, and UID to Firestore
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,  // Storing UID
                    username: this.username,
                    email: this.email,
                    points: 200,
                    profiledesc: '',
                    border1: false,
                    border2: false,
                    border3: false,
                    border4: false,
                    background1: false,
                    background2: false,
                    selectedbackground: '',
                    profileImageURL: 'https://firebasestorage.googleapis.com/v0/b/wad2project-db69b.firebasestorage.app/o/profile_images%2Fprofile-icon.jpg?alt=media&token=54252fe9-e3f0-4cd3-b97c-dc8bc19dd85b',

                });


                const modal = new bootstrap.Modal(document.getElementById('successModal'));
                modal.show();

                // Redirect to the login page after a brief delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);

                // Redirect to the login page
                // alert('Sign up successful! Redirecting to login...');
                // window.location.href = '/login'; // Adjust the path according to your routing setup

            } catch (error) {
                // Handle errors here
                this.errorMessage = error.message;
            }
        }
    }
}).mount('#app');

