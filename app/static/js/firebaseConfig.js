// Firebase Configuration


const firebaseConfig = {
    apiKey: "KEY",
    authDomain: "wad2project-db69b.firebaseapp.com",
    databaseURL: "[YOUT URL]",
    projectId: "wad2project-db69b",
    storageBucket: "wad2project-db69b.appspot.com",
    messagingSenderId: "262163048895",
    appId: "1:262163048895:web:5ab7dd89cf3bc6daaad90a",
    measurementId: "G-PKT1RMGB01",
    storageBucket: 'gs://wad2project-db69b.firebasestorage.app'
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const GeoPoint = firebase.firestore.GeoPoint; // Add this line to get GeoPoint
const storage = firebase.storage();


export { app, auth, db, GeoPoint, storage  };