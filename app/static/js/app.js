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
        console.error('Review message is required.');
        alert('Please enter a review message before submitting.');
        return;
    }

    const uid = sessionStorage.getItem('uid');
    if (!uid) {
        console.error('User is not authenticated.');
        return;
    }

    const username = await getUsername(uid);
    if (!username) {
        console.error('Username not found.');
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
        console.error('Document ID is not set.');
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
        const ownerId = listingDoc.data().ownerId;

        if (uid !== ownerId) {
            const itemName = listingDoc.data().item_name;
            const notificationData = {
                message: `${username} commented on your listing "${itemName}"`,
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
        console.error('Error saving comment:', error);
    }
}


// Function to fetch the username from Firestore based on the UID
async function getUsername(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().username;
        } else {
            console.error('User not found in Firestore.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching username:', error);
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
let defaultZoomLevel = 11;
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
    if (loading) {
        loading.style.display = 'flex';
        console.log('Loading screen displayed.');
    } else {
        console.error('Loading screen element not found.');
    }
}


function hideLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
        console.log('Loading screen hidden.');
    } else {
        console.error('Loading screen element not found.');
    }

    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.style.display = 'block';
        mapDiv.classList.add('show');
        console.log('Map displayed.');
    } else {
        console.error('Map container element not found.');
    }
}


async function renderMapWithFeatures(centerPosition) {
    showLoadingScreen();


    const navElement = document.querySelector("nav");
    const navHeight = navElement ? navElement.offsetHeight : 0;
    document.getElementById("map").style.height = `calc(100vh - ${navHeight}px)`;
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: defaultZoomLevel,
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
        console.error("Error loading GeoJSON data into the map:", error);
    }

    addCustomMarker();
    uniqueDates = Array.from(temp)
        .sort((a, b) => a - b)
        .map(date => date.toDateString())
        .filter((date, index, self) => self.indexOf(date) === index);

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

        infoPanel.innerHTML = '';
        const content = `
            <div class="info-panel-content p-3 text-center">
                <img style="width: 100%; height: auto; border-radius: 10px; border: 2px solid #ddd;" src="${imageURL}">
                <div style="padding: 20px;">
                    <h2>${item_name}</h2>
                    <p>${item_description}</p>
                    <div class="d-flex flex-column align-items-start">
                        <p><i class="fas fa-calendar-alt text-danger"></i> <b>${report_type} On:</b> ${found_timestamp}</p>
                        <p><i class="fas fa-envelope text-danger"></i> <b>Email:</b> <a href="mailto:${user.email}">${user.email}</a></p>
                        <p><i class="fas fa-handshake text-danger"></i> <b>Handoff Method:</b> ${handoff_method}</p>
                        <p><i class="fas fa-map-marker-alt text-danger"></i> <b>Handoff Location:</b> ${handoff_location}</p>
                    </div>
                </div>
            </div>`;

        infoPanel.innerHTML = content;
        infoPanel.style.display = 'block';
        infoPanel.style.position = 'absolute';
        infoPanel.style.left = '0px';
        infoPanel.style.height = '100%';
        infoPanel.style.width = 'calc(20% + 20px)';
        infoPanel.style.minWidth = '250px';
        infoPanel.style.backgroundColor = '#fff';
        infoPanel.style.boxShadow = '-2px 0px 5px rgba(0, 0, 0, 0.3)';
        infoPanel.style.overflowY = 'auto';
        infoPanel.style.zIndex = '3';
        infoPanel.style.left = '0px'; // Ensure it's positioned correctly

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.classList.add('close-button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
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
    hideLoadingScreen();
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
                        scaledSize: new google.maps.Size(32, 32),
                    }
                });
            } else {
                map.data.setStyle({
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Default marker icon
                        scaledSize: new google.maps.Size(32, 32),
                    },
                });
            }
        });
        return {
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Default marker icon
                scaledSize: new google.maps.Size(32, 32),
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
                        // const distanceText = element.distance.text;
                        // const distanceVal = element.distance.value;
                        // const distanceObject = {
                        //     itemid: items[j],
                        //     distanceText: distanceText,
                        //     distanceVal: distanceVal,
                        // };
                        // distances.push(distanceObject);
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
        console.error('Sidebar element (#panel) not found in the document.');
        return;
    }

    while (panel.childNodes.length > 6) {
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

function displayComment(commentData) {
    let commentSection = document.getElementById('comment-section');

    // Remove "No comments found" message if it exists
    const noCommentsMessage = document.getElementById('no-comments-message');
    if (noCommentsMessage) {
        noCommentsMessage.remove();
    }

    const commentElement = document.createElement('div');
    // commentElement.classList.add('comment');
    commentElement.classList.add('comment', 'mb-3', 'p-2', 'border', 'rounded', 'd-flex', 'align-items-start');


    const userProfileLink = `./user-profile.html?uid=${commentData.userId}`;
    const userAvatar = commentData.avatarURL || 'https://via.placeholder.com/40'; // Placeholder image if no avatar is available

    commentElement.innerHTML = `
        <div class="d-flex align-items-start">
            <img src="${userAvatar}" alt="Avatar" class="rounded-circle me-2" style="width: 40px; height: 40px;">
            <div>
                <a href="${userProfileLink}" class="fw-bold text-primary">${sanitizeHTML`${commentData.username}`}</a>
                <span class="text-muted">(${new Date(commentData.timestamp).toLocaleString()})</span>
                <p class="mb-1">${sanitizeHTML`${commentData.message}`}</p>
            </div>
        </div>
    `;

    // Align comment box with the "Comments" heading
    commentElement.style.maxWidth = '100%';
    commentElement.style.marginLeft = '0';

    commentSection.appendChild(commentElement);
}

async function fetchComments(documentId) {
    try {
        const listingRef = db.collection('listings').doc(documentId);
        const doc = await listingRef.get();

        if (doc.exists) {
            const data = doc.data();
            const comments = data.comments || {};

            let commentSection = document.getElementById('comment-section');
            if (!commentSection) {
                console.log('loading comment section');
                commentSection = document.createElement('div');
                commentSection.id = 'comment-section';
                document.getElementById('info-panel').appendChild(commentSection);
            }

            commentSection.innerHTML = ''; // Clear previous comments

            // Check if there are no comments
            if (Object.keys(comments).length === 0) {
                const noCommentsMessage = document.createElement('p');
                noCommentsMessage.id = 'no-comments-message';
                noCommentsMessage.textContent = 'No comments found';
                noCommentsMessage.style.color = '#666'; // Optional styling
                noCommentsMessage.style.fontStyle = 'italic'; // Optional styling
                commentSection.appendChild(noCommentsMessage);
                return;
            }

            const sortedComments = Object.values(comments).sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            );

            console.log(commentSection);
            console.log(sortedComments);
            // Display each sorted comment
            sortedComments.forEach(displayComment);

        } else {
            console.error('Listing not found.');
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}

function addItemInfo(data, item) {

    const temp = document.createElement('div');
    const tempBody = document.createElement('div');

    const currentItem = data.getFeatureById(item.itemid);
    // Check if currentItem is valid
    if (!currentItem) {
        console.error(`Feature with ID ${item.itemid} not found.`);
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
        ${report_type} on: ${found_timestamp}</br>
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

        infoPanel.innerHTML = '';
        const content = `
            <div class="info-panel-content p-3">
                <img style="width: 100%; height: auto;" src="${imageURL}">
                    <div style="padding: 20px;">
                        <h2>${item_name}</h2><p>${item_description}</p>
                        <p>
                            <b>${report_type} On:</b> ${found_timestamp}<br />
                            <b>Email:</b> <a href="mailto:${user.email}">${user.email}</a><br />
                            <b>Handoff Method:</b> ${handoff_method}<br />
                            <b>Handoff Location:</b> ${handoff_location}<br />
                        </p>

                        <h2>Comments</h2>

                        <!-- Write a Comment Button -->
                        <button id="write-review-btn" class="btn btn-primary">
                            <i class="fas fa-pencil-alt"></i> Write a Comment
                        </button>
                    </div>
                <!-- Modal Structure -->
                <div class="modal fade" id="reviewModal" tabindex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg custom-modal-right">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="reviewModalLabel">Write a Comment</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                                    <i class="fas fa-times-circle text-danger"></i>
                                </button>
                            </div>
                            <div class="modal-body">
                                <form id="reviewForm">
                                    <div class="mb-3">
                                        <label for="reviewDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="reviewDescription" rows="5" placeholder="Enter comments"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="submitReview">Submit Review</button>
                            </div>
                        </div>
                    </div>
                </div>`;

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
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
                    backdrop: false,
                    keyboard: true
                });
                reviewModal.show();
            });
        }
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.classList.add('close-button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.addEventListener('click', () => {
            infoPanel.style.display = 'none';
            document.getElementById('toggle-panel-button').classList.remove('hidden');
        });
        infoPanel.appendChild(closeButton);

        map.setZoom(zoomedInLevel);
        map.setCenter(position);
        adjustPanelsForScreenSize();

        // const submitReviewButton = document.getElementById('submitReview');
        // if (submitReviewButton) {
        //     submitReviewButton.removeEventListener('click', handleSubmitReview); // Remove any existing event listeners
        //     submitReviewButton.addEventListener('click', () => handleSubmitReview()); // Add the event listener to handle submit
        // }
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
            return feature.getProperty('found_timestamp').toDateString() === selectedDate;
        });
    }

    while (panel.childNodes.length > 6) {
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
    const selectedDates = document.getElementById('date-filter').value;

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
        if (selectedDates !== 'all' && found_timestamp.toDateString() !== selectedDates) {
            visible = false;
        }

        data.overrideStyle(feature, { visible: visible });
    });
}