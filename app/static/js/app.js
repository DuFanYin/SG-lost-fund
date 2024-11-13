
var animData = {
    wrapper: document.querySelector('#loading'),
    animType: 'svg',
    loop: true,
    prerender: true,
    autoplay: true,
    path: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/35984/LEGO_loader_chrisgannon.json'
};
var anim = bodymovin.loadAnimation(animData);
anim.setSpeed(3.24);



import { db } from './firebaseConfig.js';

let currentDocumentId = null;


// Added for UI Tooltip
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

async function saveCommentToFirebase(description) {
    if (!description) {
        console.log('Review message is required.');
        alert('Please enter a review message before submitting.');
        return;
    }

    const uid = sessionStorage.getItem('uid');
    if (!uid) {
        console.log('User is not authenticated.');
        return;
    }

    const username = await getUsername(uid);
    if (!username) {
        console.log('Username not found.');
        return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const commentId = `${day}-${month}-${year}_${hours}_${minutes}_${seconds}`;

    const commentData = {
        userId: uid,
        username: username,
        message: description,
        timestamp: now.toISOString(),
    };

    if (!currentDocumentId) {
        console.log('Document ID is not set.');
        return;
    }

    const listingRef = db.collection('listings').doc(currentDocumentId);

    try {
        console.log('Saving comment...');
        await listingRef.update({
            [`comments.${commentId}`]: commentData
        });
        console.log('Comment saved successfully!');

        const listingDoc = await listingRef.get();
        const ownerId = listingDoc.data().uid;

        if (uid !== ownerId) {
            const itemName = listingDoc.data().item_name;
            const notificationData = {
                message: `${username} commented " ${description} " on your listing " ${itemName} "`,
                timestamp: new Date().toISOString(),
                itemName: itemName,
                read: false
            };

            const ownerRef = db.collection('users').doc(ownerId);
            await ownerRef.update({
                notifications: firebase.firestore.FieldValue.arrayUnion(notificationData)
            });

            console.log('Notification sent to the owner.');
        }

        await fetchComments(currentDocumentId); // Fetch comments after saving and sending notification

        document.getElementById('reviewDescription').value = '';

    } catch (error) {
        console.log('Error saving comment:', error);
    }
}


// Function to fetch the username from Firestore based on the UID
async function getUsername(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().username;
        } else {
            console.log('User not found in Firestore.');
            return null;
        }
    } catch (error) {
        console.log('Error fetching username:', error);
        return null;
    }
}

async function exportListings() {
    const listings = [];
    const snapshot = await db.collection('listings').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.found_timestamp;
        const milliseconds = (timestamp.seconds * 1000) + (timestamp.nanoseconds / 1_000_000);
        const date = new Date(milliseconds);
        if (!data.archived) {
            const geoJsonFeature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [data.geolocation.longitude, data.geolocation.latitude] // Adjust these fields as needed
                },
                properties: {
                    itemid: doc.id,
                    found_timestamp: date,
                    handoff_location: data.handoff_location,
                    handoff_method: data.handoff_method,
                    item_description: data.item_description,
                    item_name: data.item_name,
                    item_type: data.item_type,
                    report_type: data.report_type,
                    uid: data.uid,
                    imageURL: data.imageURL,
                }
            };
            listings.push(geoJsonFeature);
        }
    });

    // Return the data in GeoJSON format
    return {
        type: "FeatureCollection",
        features: listings
    };
};

async function exportUsers() {
    const users = [];
    const snapshot = await db.collection('users').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        users.push(data);
    });

    return {
        users
    };
}

const card = document.getElementById('card');
let zoomedInLevel = 15;
var map = null;
var bounds = null;
var userPos = null;
var uniqueCategories = new Set();
var uniqueStatuses = new Set();
var uniqueDates = null;
let original = true;

//Prevents XSS
function sanitizeHTML(strings) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
    let result = strings[0];
    for (let i = 1; i < arguments.length; i++) {
        result += String(arguments[i]).replace(/[&<>'"]/g, (char) => {
            return entities[char];
        });
        result += strings[i];
    }
    return result;
}


function userLocation() {
    showLoadingScreen();
    const defaultPos = { lat: 1.3521, lng: 103.8198 }; // Singapore center
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            userPos = pos;
            renderMapWithFeatures(pos); // Call the map rendering function with the user's location
        }, () => {
            console.log("Geolocation permission denied. Using default location.");
            userPos = defaultPos;
            renderMapWithFeatures(defaultPos);
        });
    } else {
        console.log("Geolocation is not supported by this browser. Using default location.");
        userPos = defaultPos;
        renderMapWithFeatures(defaultPos);
    }
};
window.userLocation = userLocation;


function showLoadingScreen() {
    const loading = document.getElementById('loading');
    const mapDiv = document.getElementById('map');

    if (loading) {
        loading.style.display = 'flex'; // Show loading screen
        console.log('Loading screen displayed.');
    } else {
        console.log('Loading screen element not found.');
    }

    if (mapDiv) {
        mapDiv.style.display = 'none'; // Hide the map initially
    } else {
        console.log('Map container element not found.');
    }

    // After 2 seconds, hide the loading screen and show the map
    // setTimeout(() => {
    //     hideLoadingScreen();
    // }, 2000);
}

function hideLoadingScreen() {
    const loading = document.getElementById('loading');
    const mapDiv = document.getElementById('map');

    if (loading) {
        loading.style.display = 'none'; // Hide loading screen
        console.log('Loading screen hidden.');
    }

    if (mapDiv) {
        mapDiv.style.display = 'block'; // Show the map
        mapDiv.classList.add('show');
        console.log('Map displayed.');
    }
}


async function renderMapWithFeatures(centerPosition) {
    const navElement = document.querySelector("nav");
    const navHeight = navElement ? navElement.offsetHeight : 0;
    document.getElementById("map").style.height = `calc(100vh - ${navHeight}px)`;
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoomedInLevel,
        center: centerPosition,
        styles: [],
        mapTypeId: 'roadmap',
        mapTypeControl: false,
    });
    bounds = new google.maps.LatLngBounds();

    var temp = new Set();
    map.data.addListener('addfeature', (event) => {
        if (event.feature.getGeometry().getType() === 'Point') {
            const position = event.feature.getGeometry().get();
            bounds.extend(position);

            const item_type = event.feature.getProperty('item_type');
            if (item_type) {
                uniqueCategories.add(item_type);
            }

            const report_type = event.feature.getProperty('report_type');
            if (report_type) {
                uniqueStatuses.add(report_type);
            }

            const date = event.feature.getProperty('found_timestamp');
            if (date) {
                temp.add(date);
            }
        }
    });

    try {
        const geoJsonData = await exportListings();
        map.data.addGeoJson(geoJsonData, { idPropertyName: 'itemid' });

    } catch (error) {
        console.log("Error loading GeoJSON data into the map:", error);
    }

    addCustomMarker();
    uniqueDates = Array.from(temp)
        .sort((a, b) => a - b)
        .map(date => formatSingaporeTime(date))
        .filter((date, index, self) => self.indexOf(date) === index);
    hideLoadingScreen();
    const togglePanelButton = document.getElementById('toggle-panel-button');
    togglePanelButton.addEventListener('click', () => {
        if (panel.classList.contains('open')) {
            card.style.zIndex = 0;
            panel.classList.remove('open');
            document.getElementById('arrow').src = "../static/img/arrow_right.png"
        } else {
            card.style.zIndex = 2;
            panel.classList.add('open');
            document.getElementById('arrow').src = "../static/img/arrow_left.png"
        }

    });

    // Show the information for a store when its marker is clicked.
    map.data.addListener('click', async (event) => {

        const item_name = event.feature.getProperty('item_name');
        const item_description = event.feature.getProperty('item_description');
        const found_timestamp = event.feature.getProperty('found_timestamp');
        const handoff_method = event.feature.getProperty('handoff_method');
        const handoff_location = event.feature.getProperty('handoff_location');
        const report_type = event.feature.getProperty('report_type');
        const position = event.feature.getGeometry().get();
        const imageURL = event.feature.getProperty('imageURL'); // Get the image URL

        const targetUid = event.feature.getProperty('uid');
        const data = await exportUsers();
        const user = data.users.find(user => user.uid === targetUid);

        let infoPanel = document.getElementById('info-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.setAttribute('id', 'info-panel');
            infoPanel.classList.add('info-panel');
            document.body.appendChild(infoPanel);
        }

        const userProfileLink = `./other_profile?uid=${user.uid}`;

        infoPanel.innerHTML = '';
        const content =
            `<div class="info-panel-content p-3 text-center">
                <img style="width: 100%; height: auto; border-radius: 10px; border: 2px solid #ddd;" src="${imageURL}">
                    <div style="padding: 20px;">
                        <h2>${item_name}</h2>
                        <div class="d-flex flex-column align-items-start">
                            <p><i class="fas fa-info-circle text-danger"></i> <b>Description:</b> ${item_description}</p>
                            <p><i class="fas fa-calendar-alt text-danger"></i> <b>${report_type} On:</b> ${formatSingaporeTime(found_timestamp, true)}</p>
                            <p><i class="fas fa-user text-danger"></i> <b>Username:</b> <a href="${userProfileLink}">${user.username}</a></p>
                            <p><i class="fas fa-envelope text-danger"></i> <b>Email:</b> <a href="mailto:${user.username}">${user.email}</a></p>
                            <p><i class="fas fa-handshake text-danger"></i> <b>Handoff Method:</b> ${handoff_method}</p>
                            <p><i class="fas fa-map-marker-alt text-danger"></i> <b>Handoff Location:</b> ${handoff_location}</p>
                        </div>

                        <hr>

                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <h4 class="mb-0">Comments</h4>

                                <!-- Write a Comment Button -->
                                <button id="write-review-btn" class="btn btn-danger ms-3">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                            </div>
                    </div>
                    <!-- Modal Structure -->
                    <div class="modal fade" id="reviewModal" tabindex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="reviewModalLabel">Write a Comment</h5>
                                    <button type="button" class="close-btn" data-bs-dismiss="modal" aria-label="Close">
                                        <i class="fas fa-times-circle text-danger"></i>
                                    </button>
                                </div>
                                <div class="modal-body">
                                    <form id="reviewForm">
                                        <div class="mb-3">
                                            <label for="reviewDescription" class="form-label" style="text-align: left;">Description</label>
                                            <textarea class="form-control" id="reviewDescription" rows="5" placeholder="Enter comments"></textarea>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary" id="submitReview" style="background-color: #28a745; border-color: #28a745;">Submit Comment</button>
                                </div>
                            </div>
                        </div>
                    </div>
            </div>`;

        infoPanel.innerHTML = content;
        infoPanel.style.display = 'block';
        infoPanel.style.position = 'absolute';
        infoPanel.style.left = '0';
        infoPanel.style.height = '100%';
        infoPanel.style.width = 'calc(20% + 20px)';
        infoPanel.style.minWidth = '250px';
        infoPanel.style.backgroundColor = '#fff';
        infoPanel.style.boxShadow = '-2px 0px 5px rgba(0, 0, 0, 0.3)';
        infoPanel.style.overflowY = 'auto';
        infoPanel.style.zIndex = '3';

        const documentId = event.feature.getProperty('itemid'); // Retrieve the documentId dynamically
        currentDocumentId = documentId; // Store it globally
        console.log('Current Document ID:', currentDocumentId);

        // Fetch and display existing comments for the listing
        await fetchComments(documentId);

        // Add event listener for the review button
        const reviewButton = document.getElementById('write-review-btn');

        // added this to check if the user is login before being able to comment
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                const uid = sessionStorage.getItem('uid');

                // Check if the user is logged in
                if (!uid) {
                    // Show the login modal if the user is not logged in
                    const loginModal = new bootstrap.Modal(document.getElementById('commentsModal'), {
                        backdrop: 'static',
                        keyboard: false
                    });
                    loginModal.show();
                } else {
                    const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
                        backdrop: false,
                        keyboard: true
                    });
                    reviewModal.show();
                }
            });
        }

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '<i class="fas fa-times"></i>'; // Using Font Awesome's "times" icon
        closeButton.classList.add('icon-close-button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.color = '#666';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            infoPanel.style.display = 'none';
            document.getElementById('toggle-panel-button').classList.remove('hidden');
        });
        infoPanel.appendChild(closeButton);

        // Zoom in to the selected marker
        map.setZoom(zoomedInLevel);
        map.setCenter(position);

    });

    const rankedItems = await calculateDistances(map.data, centerPosition);
    showItemsList(map.data, rankedItems, Array.from(uniqueCategories), Array.from(uniqueStatuses), uniqueDates);

    // Autocomplete location search bar
    const container = document.getElementById('sidebar-autocomplete-container');
    const input = document.createElement('input');
    const options = {
        componentRestrictions: { country: 'sg' },
    };

    container.setAttribute('id', 'autocomplete-container');
    input.setAttribute('id', 'autocomplete-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Location of Lost Item');
    input.style.width = '100%';
    container.appendChild(input);
    const autocomplete = new google.maps.places.Autocomplete(input, options);
    autocomplete.setFields(['address_components', 'geometry', 'name', 'place_id', 'formatted_address']);

    const originMarker = new google.maps.Marker({ map: map });
    originMarker.setVisible(false);
    let originLocation = map.getCenter();
    autocomplete.addListener('place_changed', async () => {
        originMarker.setVisible(false);
        originLocation = map.getCenter();
        const place = autocomplete.getPlace();

        if (!place.geometry) {
            window.alert('No address available for input: \'' + place.name + '\'');
            return;
        }

        // Recenter the map to the selected address
        originLocation = place.geometry.location;
        map.setCenter(originLocation);
        map.setZoom(zoomedInLevel);

        originMarker.setPosition(originLocation);
        originMarker.setVisible(true);
        // Use the selected address as the origin to calculate distances to each of the store locations
        const rankedItems = await calculateDistances(map.data, originLocation);
        original = false;
        showItemsList(map.data, rankedItems, Array.from(uniqueCategories), Array.from(uniqueStatuses), uniqueDates);
    });

    input.addEventListener('input', async () => {
        if (input.value === '') {
            // Input is empty, reset listings and map
            original = true;
            showItemsList(map.data, rankedItems, Array.from(uniqueCategories), Array.from(uniqueStatuses), uniqueDates);
        }
    });

}

function formatSingaporeTime(timestamp, isFull) {
    // Create a Date object
    const date = new Date(timestamp);

    // Extract the day, month, year, hours, minutes, and seconds
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Format as ddmmyyyy 00:00:00
    if(isFull){
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
    return `${day}/${month}/${year}`;

}

function imageExists(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
}


function addCustomMarker() {
    map.data.setStyle((feature) => {
        const item_type = feature.getProperty("item_type");
        const iconURL = `../static/img/icon_${item_type}.png`

        imageExists(iconURL, (exists) => {
            if (exists) {
                map.data.overrideStyle(feature, {
                    icon: {
                        url: iconURL,
                        scaledSize: new google.maps.Size(45, 40),
                    }
                });
            } else {
                map.data.setStyle({
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Default marker icon
                        scaledSize: new google.maps.Size(45, 40),
                    },
                });
            }
        });
        return {
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Default marker icon
                scaledSize: new google.maps.Size(45, 40),
            },
        };
    });
}


async function calculateDistances(data, origin) {

    const items = [];
    const destinations = [];

    data.forEach((item) => {
        const itemID = item.getProperty('itemid');
        const location = item.getGeometry().get();

        items.push(itemID);

        destinations.push(location);
    });

    const service = new google.maps.DistanceMatrixService();
    const getDistanceMatrix =
        (service, parameters) => new Promise((resolve, reject) => {
            service.getDistanceMatrix(parameters, (response, status) => {
                if (status != google.maps.DistanceMatrixStatus.OK) {
                    reject(response);
                } else {
                    const distances = [];
                    const results = response.rows[0].elements;
                    for (let j = 0; j < results.length; j++) {
                        const element = results[j];


                        // Add a guard clause to check for the 'distance' object
                        // error handling for map in the post listing form
                        if (element.status === "OK" && element.distance) {
                            const distanceText = element.distance.text;
                            const distanceVal = element.distance.value;

                            const distanceObject = {
                                itemid: items[j],
                                distanceText: distanceText,
                                distanceVal: distanceVal,
                            };

                            distances.push(distanceObject);
                        } else {
                            console.warn(`Distance data is unavailable for item ID ${items[j]} (status: ${element.status})`);
                        }

                    }
                    resolve(distances);
                }
            });
        });

    const distancesList = await getDistanceMatrix(service, {
        origins: [origin],
        destinations: destinations,
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.METRIC,
    });

    distancesList.sort((first, second) => {
        return first.distanceVal - second.distanceVal;
    });
    return distancesList;
}


function showItemsList(data, items, categoryArray, statusArray, datesArray) {
    const panel = document.getElementById('panel');

    if (!panel) {
        console.log('Sidebar element (#panel) not found in the document.');
        return;
    }

    while (panel.childNodes.length > 8) {
        panel.removeChild(panel.lastChild);
    }

    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    categoryFilter.appendChild(allOption);
    categoryArray.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    categoryFilter.addEventListener('change', () => {
        applyFilters(panel, data);
    });

    const statusFilter = document.getElementById('status-filter');
    statusFilter.innerHTML = '';
    const allStatusOption = document.createElement('option');
    allStatusOption.value = 'all';
    allStatusOption.textContent = 'All';
    statusFilter.appendChild(allStatusOption);
    statusArray.forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        statusFilter.appendChild(option);
    });
    statusFilter.addEventListener('change', () => {
        applyFilters(panel, data);
    });


    const dateFilter = document.getElementById('date-filter');
    dateFilter.innerHTML = '';
    const allDatesOption = document.createElement('option');
    allDatesOption.value = 'all';
    allDatesOption.textContent = 'All';
    dateFilter.appendChild(allDatesOption);
    datesArray.forEach((date) => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateFilter.appendChild(option);
    });
    dateFilter.addEventListener('change', () => {
        applyFilters(panel, data);
    });


    panel.originalItems = items;
    items.forEach((item) => {
        addItemInfo(data, item);
    });

    panel.classList.add('open');
    card.style.zIndex = 2;
    document.getElementById('arrow').src = "../static/img/arrow_left.png"
}

async function getUserAvatar(commentuid) {
    try {
        const userDoc = await db.collection('users').doc(commentuid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.profileImageURL || "https://firebasestorage.googleapis.com/v0/b/wad2project-db69b.firebasestorage.app/o/profile_images%2Fprofile-icon.jpg?alt=media&token=54252fe9-e3f0-4cd3-b97c-dc8bc19dd85b"; // Return profile image URL or fallback to placeholder
        } else {
            console.log("No such user document!");
            return userAvatar; // Fallback to placeholder if user document doesn't exist
        }
    } catch (error) {
        console.log("Error fetching user avatar:", error);
        return userAvatar; // Fallback to placeholder in case of error
    }
}

async function displayComment(commentData, commentId) {
    const commentSection = document.getElementById('comment-section');

    // Remove "No comments found" message if it exists
    const noCommentsMessage = document.getElementById('no-comments-message');
    if (noCommentsMessage) {
        noCommentsMessage.remove();
    }

    const commentElement = document.createElement('div');
    commentElement.classList.add('comment', 'mb-3', 'p-2', 'border', 'rounded', 'd-flex', 'align-items-start');
    commentElement.setAttribute('data-id', commentId); // Set the commentId in the data-id attribute

    const userProfileLink = `./other_profile?uid=${commentData.userId}`;
    const userAvatar = await getUserAvatar(commentData.userId);

    commentElement.innerHTML = `
        <div class="d-flex align-items-start">
            <img src="${userAvatar}" alt="Avatar" class="rounded-circle me-2" style="width: 40px; height: 40px;">
            <div>
                <a id ="userLink" href="${userProfileLink}" class="fw-bold text-primary">${sanitizeHTML`${commentData.username}`}</a>
                <span class="text-muted">(${new Date(commentData.timestamp).toLocaleString()})</span>
                <p class="mb-1 comment-message">${sanitizeHTML`${commentData.message}`}</p>
            </div>
        </div>
    `;

    // Only show edit/delete buttons if the comment belongs to the current user
    const currentUserId = sessionStorage.getItem('uid');
    if (commentData.userId === currentUserId) {
        // const buttonsContainer = document.createElement('div');
        // buttonsContainer.innerHTML = `
        //     <button class="btn btn-sm btn-link edit-comment" data-id="${commentId}">Edit</button>
        //     <button class="btn btn-sm btn-link text-danger delete-comment" data-id="${commentId}">Delete</button>
        // `;
        // commentElement.querySelector('div > div').appendChild(buttonsContainer);
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('d-flex', 'justify-content-between', 'flex-wrap', 'mt-2', 'buttons-container');
        buttonsContainer.innerHTML = `
            <button class="btn btn-sm btn-link edit-comment" data-id="${commentId}" title="Edit" style="padding: 15px;margin:auto"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-link text-danger delete-comment" data-id="${commentId}" title="Delete" style="padding: 8px;margin:auto"><i class="fas fa-trash-alt"></i></button>
        `;
        commentElement.querySelector('div > div').appendChild(buttonsContainer);

        // Event listener for delete
        buttonsContainer.querySelector('.delete-comment').addEventListener('click', async () => {
            console.log(`Deleting comment with ID: ${commentId}`); // Log for debugging
            await deleteComment(commentId); // Pass the correct commentId for deletion
            commentElement.remove(); // Remove the comment from the UI
        });

        // Event listener for edit
        buttonsContainer.querySelector('.edit-comment').addEventListener('click', async () => {
            console.log(`Editing comment with ID: ${commentId}`);
            await editComment(commentData, commentId); // Pass the commentData and commentId to edit
        });
    }

    // Append the comment to the comment section
    commentSection.appendChild(commentElement);
}

async function fetchComments(documentId) {
    // const currentUserId = sessionStorage.getItem('uid');
    // if (!currentUserId) {
    //     console.log('User is not authenticated.');
    //     return;
    // }

    try {
        const listingRef = db.collection('listings').doc(documentId);
        const doc = await listingRef.get();

        if (doc.exists) {
            const data = doc.data();
            const comments = data.comments || {};

            let commentSection = document.getElementById('comment-section');
            if (!commentSection) {
                commentSection = document.createElement('div');
                commentSection.id = 'comment-section';
                document.getElementById('info-panel').appendChild(commentSection);
            }

            commentSection.innerHTML = ''; // Clear previous comments

            if (Object.keys(comments).length === 0) {
                const noCommentsMessage = document.createElement('p');
                noCommentsMessage.id = 'no-comments-message';
                noCommentsMessage.textContent = 'No comments found';
                noCommentsMessage.style.marginLeft = '10px'; // Adjust for alignment
                noCommentsMessage.style.textAlign = 'center'; // Aligns text to the left
                noCommentsMessage.style.paddingLeft = '5px'; // Additional spacing, if needed
                noCommentsMessage.style.color = '#666'; // Optional: Change the text color for better visibility
                commentSection.appendChild(noCommentsMessage);
                return;
            }

            // Sort comments by timestamp
            const sortedComments = Object.entries(comments).sort(
                (a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp)
            );

            // Display each comment
            sortedComments.forEach(([commentId, commentData]) => {
                displayComment(commentData, commentId); // Pass the commentId (key) and commentData
            });
        } else {
            console.log('Listing not found.');
        }
    } catch (error) {
        console.log('Error fetching comments:', error);
    }
}

// Edit Comment Function
async function editComment(commentData, commentId) {
    // Set the initial value in the modal input
    const editCommentInput = document.getElementById('editCommentInput');
    editCommentInput.value = commentData.message;

    // Show the edit modal
    const editModal = new bootstrap.Modal(document.getElementById('editCommentModal'));
    editModal.show();

    // Define the save handler for the edit comment modal
    const saveEditedCommentButton = document.getElementById('saveEditedComment');
    const saveEditedCommentHandler = async () => {
        const newMessage = editCommentInput.value.trim();

        if (newMessage && newMessage !== commentData.message) {
            const listingRef = db.collection('listings').doc(currentDocumentId);

            // Update the comment message in Firestore
            await listingRef.update({
                [`comments.${commentId}.message`]: newMessage
            });

            // Update the comment in the UI
            const commentElement = document.querySelector(`[data-id="${commentId}"]`).closest('.comment');
            commentElement.querySelector('.comment-message').textContent = sanitizeHTML`${newMessage}`;
        }

        // Hide the modal after saving
        editModal.hide();
    };

    // Clean up any previous event listeners to prevent duplicates
    saveEditedCommentButton.removeEventListener('click', saveEditedCommentHandler);
    saveEditedCommentButton.addEventListener('click', saveEditedCommentHandler);
}

async function deleteComment(commentId) {
    const currentUserId = sessionStorage.getItem('uid');
    if (!currentUserId) {
        console.log('User is not authenticated.');
        return;
    }

    try {
        const listingRef = db.collection('listings').doc(currentDocumentId); // Ensure this is the correct document ID
        console.log(`Attempting to delete comment with ID: ${commentId}`);

        // Delete the comment using the correct path: comments.{commentId}
        await listingRef.update({
            [`comments.${commentId}`]: firebase.firestore.FieldValue.delete()
        });

        console.log('Comment deleted successfully');
    } catch (error) {
        console.log('Error deleting comment:', error);
    }
}


function addItemInfo(data, item) {

    const temp = document.createElement('div');
    const tempBody = document.createElement('div');

    const currentItem = data.getFeatureById(item.itemid);
    // Check if currentItem is valid
    if (!currentItem) {
        console.log(`Feature with ID ${item.itemid} not found.`);
        return; // Exit the function if the feature is not found
    }

    const distance = item.distanceText;

    const panel = document.getElementById('panel');
    if (distance.split(" ")[0] > 3 && original === false) {
        return;
    }
    const item_name = currentItem.getProperty('item_name');
    const item_description = currentItem.getProperty('item_description');
    const found_timestamp = currentItem.getProperty('found_timestamp');
    const handoff_method = currentItem.getProperty('handoff_method');
    const handoff_location = currentItem.getProperty('handoff_location');
    const report_type = currentItem.getProperty('report_type');
    const position = currentItem.getGeometry().get();
    const targetUid = currentItem.getProperty('uid');
    const imageURL = currentItem.getProperty('imageURL'); // Retrieve the image URL

    const header = document.createElement('p');
    header.classList.add('itemText');
    header.textContent = item_name;
    // header.textContent = item_name + ` (${distance + " away"})`;
    tempBody.appendChild(header);

    // Add distance in a separate line, with a specific class for styling
    const distanceElement = document.createElement('span');
    distanceElement.classList.add('distanceText');
    distanceElement.textContent = `(${distance} away)`;
    tempBody.appendChild(distanceElement);

    tempBody.innerHTML += `
        <img src="${imageURL}" alt="Item Image" style="width: 100%; height: auto;">
        <p>${item_description}</br>
        Location: ${handoff_location}</br>
        ${report_type} on: ${formatSingaporeTime(found_timestamp, true)}</br>
    `;
    temp.appendChild(tempBody);
    temp.style.paddingLeft = "10px";

    // Add click event listener to show the InfoPanel when the card is clicked
    temp.addEventListener('click', async () => {
        const data = await exportUsers();
        const user = data.users.find(user => user.uid === targetUid);

        let infoPanel = document.getElementById('info-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.setAttribute('id', 'info-panel');
            infoPanel.classList.add('info-panel');
            document.body.appendChild(infoPanel);
        }

        const userProfileLink = `./other_profile?uid=${user.uid}`;

        infoPanel.innerHTML = '';
        const content =
            `
            <div class="info-panel-content p-3 text-center">
            <img style="width: 100%; height: auto; border-radius: 10px; border: 2px solid #ddd;" src="${imageURL}">
            <div style="padding: 20px;">
                <h2>${item_name}</h2>
                <div class="d-flex flex-column align-items-start">
                    <p><i class="fas fa-info-circle text-danger"></i> <b>Description:</b> ${item_description}</p>  
                    <p><i class="fas fa-calendar-alt text-danger"></i> <b>${report_type} On:</b> ${formatSingaporeTime(found_timestamp, true)}</p>
                    <p><i class="fas fa-user text-danger"></i> <b>Username:</b> <a href="${userProfileLink}">${user.username}</a></p>
                    <p><i class="fas fa-envelope text-danger"></i> <b>Email:</b> <a href="mailto:${user.username}">${user.email}</a></p>
                    <p><i class="fas fa-handshake text-danger"></i> <b>Handoff Method:</b> ${handoff_method}</p>
                    <p><i class="fas fa-map-marker-alt text-danger"></i> <b>Handoff Location:</b> ${handoff_location}</p>
                </div>
        
                <hr>
        
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h4 class="mb-0">Comments</h4>
        
                    <!-- Write a Comment Button -->
                    <button id="write-review-btn" class="btn btn-danger ms-3">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                </div>    
            </div>
            <!-- Modal Structure -->
            <div class="modal fade" id="reviewModal" tabindex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="reviewModalLabel">Write a Comment</h5>
                            <button type="button" class="close-btn" data-bs-dismiss="modal" aria-label="Close">
                                <i class="fas fa-times-circle text-danger"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="reviewForm">
                                <div class="mb-3">
                                    <label for="reviewDescription" class="form-label" style="text-align: left;">Description</label>
                                    <textarea class="form-control" id="reviewDescription" rows="5" placeholder="Enter comments"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="submitReview" style="background-color: #28a745; border-color: #28a745;">Submit Comment</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;


        infoPanel.innerHTML = content;
        infoPanel.style.display = 'block';
        infoPanel.style.position = 'absolute';
        infoPanel.style.left = ' max(250px, calc(20% + 20px))';
        infoPanel.style.height = '100%';
        infoPanel.style.width = 'calc(20% + 20px)';
        infoPanel.style.minWidth = '250px';
        infoPanel.style.backgroundColor = '#fff';
        infoPanel.style.boxShadow = '-2px 0px 5px rgba(0, 0, 0, 0.3)';
        infoPanel.style.overflowY = 'auto';
        infoPanel.style.zIndex = '3';

        const documentId = item.itemid; // Retrieve the documentId dynamically
        currentDocumentId = documentId; // Store it globally
        console.log('Current Document ID:', currentDocumentId);

        // Fetch and display existing comments for the listing
        await fetchComments(documentId);

        // Add event listener for the review button
        const reviewButton = document.getElementById('write-review-btn');

        // added this to check if the user is login before being able to comment
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                const uid = sessionStorage.getItem('uid');

                // Check if the user is logged in
                if (!uid) {
                    // Show the login modal if the user is not logged in
                    const loginModal = new bootstrap.Modal(document.getElementById('commentsModal'), {
                        backdrop: 'static',
                        keyboard: false
                    });
                    loginModal.show();
                } else {
                    const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
                        backdrop: false,
                        keyboard: true
                    });
                    reviewModal.show();
                }
            });
        }

        // if (reviewButton) {
        //     reviewButton.addEventListener('click', () => {
        //         const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
        //             backdrop: false,
        //             keyboard: true
        //         });
        //         reviewModal.show();
        //     });
        // }
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '<i class="fas fa-times"></i>'; // Using Font Awesome's "times" icon
        closeButton.classList.add('icon-close-button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.color = '#666';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            infoPanel.style.display = 'none';
            document.getElementById('toggle-panel-button').classList.remove('hidden');
        });
        infoPanel.appendChild(closeButton);

        map.setZoom(zoomedInLevel);
        map.setCenter(position);
        adjustPanelsForScreenSize();

        const submitReviewButton = document.getElementById('submitReview');
        if (submitReviewButton) {
            submitReviewButton.removeEventListener('click', saveCommentToFirebase);
            submitReviewButton.addEventListener('click', async () => {
                const description = document.getElementById('reviewDescription').value.trim();
                await saveCommentToFirebase(description);

                const reviewModalInstance = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
                if (reviewModalInstance) {
                    reviewModalInstance.hide();
                }

                const successModal = new bootstrap.Modal(document.getElementById('successModal'), {
                    backdrop: 'static',
                    keyboard: false
                });
                successModal.show();

                setTimeout(() => {
                    successModal.hide();
                }, 2000);
            });
        }

        const writeReviewButton = document.getElementById("write-review-btn");
        if (writeReviewButton) {
            writeReviewButton.removeEventListener("click", async () => {
                const description = document.getElementById('reviewDescription').value.trim();
                await saveCommentToFirebase(description);
            });
        }



    });


    panel.appendChild(temp);
    const hrElement = document.createElement("hr");
    panel.appendChild(hrElement);
}

// Redirection for the comments when user did not login and is redirected to the login
async function startRedirectToLogin() {
    window.location.href = '/login';
}
window.startRedirectToLogin = startRedirectToLogin; // Expose the function globally for the modal button


function adjustPanelsForScreenSize() {
    const infoPanel = document.getElementById('info-panel');
    const panel = document.getElementById('panel');

    if (!infoPanel || !panel) return; // Guard clause if the panels don't exist yet

    if (window.innerWidth >= 992) { // Medium breakpoint onwards
        infoPanel.style.left = 'calc(20% + 20px)';

    } else {
        infoPanel.style.left = 0;
        if (!infoPanel.classList.contains("hidden")) {
            document.getElementById('toggle-panel-button').classList.add('hidden');
        }
    }
}
window.addEventListener('resize', adjustPanelsForScreenSize);


function applyFilters(panel, data) {
    card.style.zIndex = 2;

    const selectedCategory = document.getElementById('category-filter').value;
    const selectedStatus = document.getElementById('status-filter').value;
    const selectedDate = document.getElementById('date-filter').value;
    let filteredItems = panel.originalItems;

    if (selectedCategory !== 'all') {
        filteredItems = filteredItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return feature.getProperty('item_type') === selectedCategory;
        });
    }

    if (selectedStatus !== 'all') {
        filteredItems = filteredItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return feature.getProperty('report_type') === selectedStatus;
        });
    }

    if (selectedDate !== 'all') {
        filteredItems = filteredItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return formatSingaporeTime(feature.getProperty('found_timestamp'), false) === selectedDate;
        });
    }

    while (panel.childNodes.length > 8) {
        panel.removeChild(panel.lastChild);
    }

    filteredItems.forEach((item) => {
        addItemInfo(data, item);
    });

    applyFiltersToMap(data);
}


function applyFiltersToMap(data) {
    const selectedCategory = document.getElementById('category-filter').value;
    const selectedStatus = document.getElementById('status-filter').value;
    const selectedDate = document.getElementById('date-filter').value;

    data.forEach((feature) => {
        const item_type = feature.getProperty('item_type');
        const report_type = feature.getProperty('report_type');
        const found_timestamp = feature.getProperty('found_timestamp');

        let visible = true;
        if (selectedCategory !== 'all' && item_type !== selectedCategory) {
            visible = false;
        }
        if (selectedStatus !== 'all' && report_type !== selectedStatus) {
            visible = false;
        }
        if (selectedDate !== 'all' && formatSingaporeTime(found_timestamp, false) !== selectedDate) {
            visible = false;
        }

        data.overrideStyle(feature, { visible: visible });
    });
}

