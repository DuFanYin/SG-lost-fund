import { db } from './firebaseConfig.js';

// Added for UI Tooltip
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Add event listener to the review button (write-review-btn)
    const reviewButton = document.getElementById('write-review-btn');
    if (reviewButton) {
        reviewButton.addEventListener('click', () => {
            const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
                backdrop: false,  // Disable backdrop
                keyboard: true
            });

            // Show modal when the button is clicked
            reviewModal.show();
        });
    }

    // Add event listener for submitting the review
    const submitReviewButton = document.getElementById('submitReview');
    if (submitReviewButton) {
        submitReviewButton.addEventListener('click', saveCommentToFirebase);
    }
});


// Function to save comment to Firestore
async function saveCommentToFirebase() {
    try {
        console.log('Saving comment...');  // Check if the function is triggered

        // Get the current user's UID from sessionStorage (or use Firebase auth)
        const uid = sessionStorage.getItem('uid'); // Replace with Firebase auth if needed
        if (!uid) {
            console.error('User is not authenticated.');
            return;
        }

        // Retrieve the current username from Firestore based on the UID
        const username = await getUsername(uid);
        if (!username) {
            console.error('Username not found.');
            return;
        }

        // Ensure the review description exists and retrieve the review text
        const reviewDescription = document.getElementById("reviewDescription");
        if (!reviewDescription) {
            console.error('Review input field not found.');
            return;
        }
        console.log('Review input field found.');

        // Trim whitespace and get the value of the textarea
        const message = reviewDescription.value.trim();
        console.log('Message:', message); // Check the value entered in the textarea
        
        // Check if message is empty after trimming whitespace
        if (!message) {
            console.error('Review message is required.');
            return;
        }

        // Get the current timestamp for the review
        const timestamp = new Date().toISOString();

        // Construct the comment data object
        const commentData = {
            [`${timestamp}`]: {
                userId: uid,
                username: username,
                message: message
            }
        };

        // Get the document ID of the item being commented on (this should be dynamic based on your logic)
        const documentId = "7leD9T5L7pxPOW592IMH"; // Example, replace with dynamic ID

        // Save the comment to Firestore under the relevant listing
        const listingRef = db.collection('listings').doc(documentId);

        await listingRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(commentData)
        });

        console.log('Comment saved successfully!');
        // Optionally, close the modal after saving
        const reviewModal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        reviewModal.hide();
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
                    itemid: data.file_path,
                    found_timestamp: date,
                    handoff_location: data.handoff_location,
                    handoff_method: data.handoff_method,
                    item_description: data.item_description,
                    item_name: data.item_name,
                    item_type: data.item_type,
                    report_type: data.report_type,
                    uid: data.uid,
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
window.exportListings = exportListings;
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
window.exportUsers = exportUsers;

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
window.sanitizeHTML = sanitizeHTML;

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

async function renderMapWithFeatures(centerPosition) {
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
            <div class="info-panel-content">
                <img style="width: 100%; height: auto;" src="../static/img/profile-icon.jpg">
                    <div style="padding: 20px;">
                        <h2>${item_name}</h2><p>${item_description}</p>
                        <p>
                            <b>${report_type} On:</b> ${found_timestamp}<br />
                            <b>Email:</b> ${user.email}<br />
                            <b>Handoff Method:</b> ${handoff_method}<br />
                            <b>Handoff Location:</b> ${handoff_location}<br />
                        </p>
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
    showItemsList(map.data, rankedItems, Array.from(uniqueCategories), Array.from(uniqueStatuses), uniqueDates);

    // Autocomplete location search bar
    const container = document.getElementById('sidebar-autocomplete-container');
    const input = document.createElement('input');
    const options = {
        types: ['address'],
        componentRestrictions: { country: 'sg' },
    };

    container.setAttribute('id', 'autocomplete-container');
    input.setAttribute('id', 'autocomplete-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Location of Lost Item');
    input.style.width = '100%';
    container.appendChild(input);
    const autocomplete = new google.maps.places.Autocomplete(input, options);
    autocomplete.setFields(['address_components', 'geometry', 'name']);

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
window.renderMapWithFeatures = renderMapWithFeatures;

function imageExists(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
}
window.imageExists = imageExists;
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
window.addCustomMarker = addCustomMarker;
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
                        const distanceText = element.distance.text;
                        const distanceVal = element.distance.value;
                        const distanceObject = {
                            itemid: items[j],
                            distanceText: distanceText,
                            distanceVal: distanceVal,
                        };
                        distances.push(distanceObject);
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
window.calculateDistances = calculateDistances;
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
window.showItemsList = showItemsList;

function addItemInfo(data, item) {
    const temp = document.createElement('div');
    const tempBody = document.createElement('div');

    const distance = item.distanceText;
    const currentItem = data.getFeatureById(item.itemid);
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
            <div class="info-panel-content">
                <img style="width: 100%; height: auto;" src="../static/img/profile-icon.jpg">
                    <div style="padding: 20px;">
                        <h2>${item_name}</h2><p>${item_description}</p>
                        <p>
                            <b>${report_type} On:</b> ${found_timestamp}<br />
                            <b>Email:</b> <a href="mailto:${user.email}">${user.email}</a><br />
                            <b>Handoff Method:</b> ${handoff_method}<br />
                            <b>Handoff Location:</b> ${handoff_location}<br />
                        </p>

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
                                <h5 class="modal-title" id="reviewModalLabel">Write a Review</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="reviewForm">
                                    <div class="mb-3">
                                        <label for="reviewDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="reviewDescription" rows="5" placeholder="Enter description"></textarea>
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

        // JavaScript for Modal Button and Submission
        const reviewButton = document.getElementById('write-review-btn');
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'), {
                    backdrop: false,  // Disable backdrop
                    keyboard: true
                });
                reviewModal.show();
            });
        }

        // document.getElementById('submitReview').addEventListener('click', () => {
        //     const description = document.getElementById('reviewDescription').value;
        //     console.log("Description:", description);
        //     document.getElementById('reviewForm').reset();
        //     bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
        // }
        document.getElementById('submitReview').addEventListener('click', async () => {
            const description = document.getElementById('reviewDescription').value;
            console.log("Description:", description);
        
            // Save the comment to Firebase if you want it to be persistent.
            // Assuming you have a function `saveCommentToFirebase` to handle the database operation.
            const commentData = {
                description,
                timestamp: new Date().toISOString(),
                user: user.uid // assuming `user` is the logged-in user's data
            };
            await saveCommentToFirebase(targetUid, commentData); // replace with actual saving function
        
            // Display the comment in the info panel
            const commentSection = document.getElementById('comment-section');
            if (!commentSection) {
                const newCommentSection = document.createElement('div');
                newCommentSection.id = 'comment-section';
                infoPanel.appendChild(newCommentSection);
            }
        
            // Add the comment to the section
            const commentElement = document.createElement('p');
            commentElement.textContent = `${description}`;
            document.getElementById('comment-section').appendChild(commentElement);
        
            // Clear the form and hide the modal
            document.getElementById('reviewForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
        });
        
       

    
  
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
  
  // Event listener for the comment submission
  document.getElementById("write-review-btn").addEventListener("click", saveCommentToFirebase);

    });


    panel.appendChild(temp);
    const hrElement = document.createElement("hr");
    panel.appendChild(hrElement);
}
window.addItemInfo = addItemInfo;
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
window.adjustPanelsForScreenSize = adjustPanelsForScreenSize;
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
window.applyFilters = applyFilters;
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
window.applyFiltersToMap = applyFiltersToMap;

