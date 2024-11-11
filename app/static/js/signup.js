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
            showConfirmPassword: false
        };
    },
    methods: {
        togglePasswordVisibility() {
            this.showPassword = !this.showPassword;
        },
        toggleConfirmPasswordVisibility() {
            this.showConfirmPassword = !this.showConfirmPassword;
        },

        checkPasswordCriteria() {
            this.passwordvalidation = [];
            this.isPasswordInvalid = false;

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
            this.isConfirmPasswordInvalid = false;

            if (this.confirmPassword === "") {
                return;
            }

            if (this.confirmPassword !== this.password) {
                this.isConfirmPasswordInvalid = true;
            }
        },

        checkEmail() {
            this.isEmailInvalid = false;
            this.emailErrorMessage = '';

            if (this.email === "") {
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(this.email)) {
                this.isEmailInvalid = true;
            }
        },


        async signUp() {
            this.errorMessage = '';

            // Check password criteria
            this.checkPasswordCriteria();

            // Validate confirm password
            this.checkConfirmPassword();
            if (this.isConfirmPasswordInvalid) {
                return;
            }

            // Validate email
            this.checkEmail();
            if (this.isEmailInvalid) {
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
                    selectedbackground: ''
                    
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

