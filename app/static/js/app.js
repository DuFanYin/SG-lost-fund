import { db } from './firebaseConfig.js';

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
                    itemid: data.file,
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
var infoWindow = null;
var currentInfoWindow = null;
var infoPane = document.getElementById('panel');
var uniqueCategories = new Set();
var userPos = null;

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
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: defaultZoomLevel,
        center: centerPosition,
        styles: [],
        mapTypeId: 'roadmap',
        mapTypeControl: false,
    });

    bounds = new google.maps.LatLngBounds();
    infoWindow = new google.maps.InfoWindow();
    currentInfoWindow = infoWindow;

    map.data.addListener('addfeature', (event) => {
        if (event.feature.getGeometry().getType() === 'Point') {
            const position = event.feature.getGeometry().get();
            bounds.extend(position);

            const item_type = event.feature.getProperty('item_type');
            if (item_type) {
                uniqueCategories.add(item_type);
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

    const togglePanelButton = document.getElementById('toggle-panel-button');
    togglePanelButton.addEventListener('click', () => {
        if (panel.classList.contains('open')) {
            card.style.zIndex = 0;
            panel.classList.remove('open');
            document.getElementById('arrow').src = "../static/img/arrow_right.png"

        } else {
            card.style.zIndex = 2;
            panel.classList.add('open');
            document.getElementById('arrow').src = "../static/img//arrow_left.png"
        }
    });

    // map.data.addListener('addfeature', () => {
    //     map.fitBounds(bounds);

    //     const items = [];
    //     map.data.forEach((feature) => {
    //         const itemID = feature.getProperty("file");
    //         if (file) {
    //             items.push({
    //                 itemid: file,
    //             });
    //         }
    //         console.log(items);
    //     });
    // });

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
        // Content for InfoWindow
        const content = `
            <div class="card" style="border: 5px solid red">
                <div class="card-body">
                    <img style="float:left; width:200px; margin-top:30px" src="../static/img/profile-icon.jpg">
                    <div style="margin-left:220px; margin-bottom:20px;">
                <h2>${item_name}</h2><p>${item_description}</p>
                <p>
                    <b>Found Time:</b> ${found_timestamp}<br/>
                    <b>Email:</b> ${user.email}<br/>
                    <b>Handoff Method:</b> ${handoff_method}<br/>
                    <b>Handoff Location:</b> ${handoff_location}<br/>
                    <b>Status:</b> ${report_type}<br/>
                </p>
                </div>
            </div>`;

        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }
        infoWindow.open(map);
        currentInfoWindow = infoWindow;

        // Zoom in to the selected marker
        map.setZoom(zoomedInLevel);
        map.setCenter(position);

        google.maps.event.addListener(infoWindow, 'closeclick', () => {
            map.setZoom(defaultZoomLevel);
        });
    });

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
    input.setAttribute('placeholder', 'Enter an address');
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
        showItemsList(map.data, rankedItems, Array.from(uniqueCategories));
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
function showItemsList(data, items, categoryArray) {
    const panel = document.getElementById('panel');

    if (!panel) {
        console.error('Sidebar element (#panel) not found in the document.');
        return;
    }

    const totalElementChildren = panel.children.length;
    for (let i = panel.children.length - 1; i >= 2; i--) {
        panel.removeChild(panel.children[i]);
    }

    const categoryFilter = document.getElementById('category-filter');
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    categoryFilter.appendChild(allOption);
    categoryArray.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Capitalize category name
        categoryFilter.appendChild(option);
    });
    categoryFilter.addEventListener('change', () => {
        applyCategoryFilter(panel, data);
    });

    panel.originalItems = items;
    items.forEach((item) => {
        addCards(data, item);
    });

    panel.classList.add('open');
    card.style.zIndex = 2;
    document.getElementById('arrow').src = "../static/img/arrow_left.png"
}
window.showItemsList = showItemsList;
function addCards(data, item) {

    const temp = document.createElement('div');
    temp.classList.add('card');
    const tempBody = document.createElement('div');
    tempBody.classList.add('card-body');

    const currentItem = data.getFeatureById(item.itemid);
    const item_name = document.createElement('p');
    item_name.classList.add('itemTypeText');
    item_name.textContent = currentItem.getProperty('item_name');
    tempBody.appendChild(item_name);

    const distanceText = document.createElement('p');
    distanceText.classList.add('distanceText');
    distanceText.textContent = item.distanceText;
    tempBody.appendChild(distanceText);

    temp.appendChild(tempBody);

    // Add click event listener to show the InfoWindow when the card is clicked
    temp.addEventListener('click', async () => {
        const item_name = currentItem.getProperty('item_name');
        const item_description = currentItem.getProperty('item_description');
        const found_timestamp = currentItem.getProperty('found_timestamp');
        const handoff_method = currentItem.getProperty('handoff_method');
        const handoff_location = currentItem.getProperty('handoff_location');
        const report_type = currentItem.getProperty('report_type');
        const position = currentItem.getGeometry().get();

        const targetUid = currentItem.getProperty('uid');
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
                            <b>Found Time:</b> ${found_timestamp}<br />
                            <b>Email:</b> ${user.email}<br />
                            <b>Handoff Method:</b> ${handoff_method}<br />
                            <b>Handoff Location:</b> ${handoff_location}<br />
                            <b>Status:</b> ${report_type}<br />
                        </p>
                    </div>
            </div>`;

        infoPanel.innerHTML = content;
        infoPanel.style.display = 'block';
        infoPanel.style.position = 'absolute';
        infoPanel.style.left = ' max(225px, calc(22% + 20px))';
        infoPanel.style.height = '100%';
        infoPanel.style.width = 'calc(22% + 20px)';
        infoPanel.style.minWidth = '225px';
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
    });

    const panel = document.getElementById('panel');
    panel.appendChild(temp);
}
window.addCards = addCards;
function adjustPanelsForScreenSize() {
    const infoPanel = document.getElementById('info-panel');
    const panel = document.getElementById('panel');

    if (!infoPanel || !panel) return; // Guard clause if the panels don't exist yet

    if (window.innerWidth >= 992) { // Medium breakpoint onwards
        infoPanel.style.left = 'calc(22% + 20px)';

    } else {
        infoPanel.style.left = 0;
        document.getElementById('toggle-panel-button').classList.add('hidden');
    }
}
window.adjustPanelsForScreenSize = adjustPanelsForScreenSize;
window.addEventListener('resize', adjustPanelsForScreenSize);
function applyCategoryFilter(panel, data) {
    card.style.zIndex = 2;

    const selectedCategory = document.getElementById('category-filter').value;
    let filteredItems = panel.originalItems;

    if (selectedCategory !== 'all') {
        filteredItems = panel.originalItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return feature.getProperty('item_type') === selectedCategory;
        });
    }

    while (panel.childNodes.length > 5) {
        panel.removeChild(panel.lastChild);
    }

    filteredItems.forEach((item) => {
        addCards(data, item);
    });

    applyCategoryFilterToMap(data);
}
window.applyCategoryFilter = applyCategoryFilter;
function applyCategoryFilterToMap(data) {
    const selectedCategory = document.getElementById('category-filter').value;

    data.forEach((feature) => {
        const item_type = feature.getProperty('item_type');
        if (selectedCategory === 'all' || item_type === selectedCategory) {
            data.overrideStyle(feature, { visible: true });
        } else {
            data.overrideStyle(feature, { visible: false });
        }
    });
}
window.applyCategoryFilterToMap = applyCategoryFilterToMap;

