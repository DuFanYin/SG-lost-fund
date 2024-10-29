document.addEventListener("DOMContentLoaded", function () {
    const profile = Vue.createApp({
        data() {
            return {
                username: sessionStorage.getItem('username') || '',
                profileDescription: sessionStorage.getItem('profiledesc') || 'No Description',
                uid: sessionStorage.getItem('uid') || 0,
                contactNumber: sessionStorage.getItem('contactnum') || 'No contact information',
            };
        },
        methods: {
            async updateProfile() {
                try {
                    // Ensure the uid is set in the session storage
                    const uid = this.uid;
                    if (!uid) {
                        console.error("User UID not found.");
                        return;
                    }

                    // Reference to the Firestore document for this user
                    const userDocRef = firebase.firestore().collection('users').doc(uid);

                    // Update the document with the latest data
                    await userDocRef.set({
                        username: this.username,
                        profileDescription: this.profileDescription,
                        contactNumber: this.contactNumber
                    }, { merge: true });

                    // Update session storage with new values
                    sessionStorage.setItem('username', this.username);
                    sessionStorage.setItem('profiledesc', this.profileDescription);
                    sessionStorage.setItem('contactnum', this.contactNumber);

                    alert("Profile updated successfully!");
                } catch (error) {
                    console.error("Error updating profile:", error);
                }
            }
        }
    });

    // Mount the Vue app to the "profile" ID
    profile.mount('#profile');
});
