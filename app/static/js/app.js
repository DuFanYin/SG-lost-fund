// COMPLETED //
const card = document.getElementById('card');
let defaultZoomLevel = 11;
let zoomedInLevel = 15;
var map = "";
var bounds = null;
var infoWindow = null;
var currentInfoWindow = null;
var infoPane = document.getElementById('panel');
var uniqueCategories = new Set();

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

//Gets user current location
function getUserLocation() {
    const defaultPos = { lat: 1.3521, lng: 103.8198 }; // Singapore center
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            renderMapWithFeatures(pos); // Call the map rendering function with the user's location
        }, () => {
            console.log("Geolocation permission denied. Using default location.");
            renderMapWithFeatures(defaultPos);
        });
    } else {
        console.log("Geolocation is not supported by this browser. Using default location.");
        renderMapWithFeatures(defaultPos);
    }
}

function renderMapWithFeatures(centerPosition) {

    // Initialize the map with the given center position
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: defaultZoomLevel,
        center: centerPosition,
        styles: [],
        mapTypeId: 'roadmap', // Options: 'roadmap' (default), 'satellite', 'hybrid', 'terrain'
        mapTypeControl: false, // Disable default map type control
    });

    bounds = new google.maps.LatLngBounds();
    infoWindow = new google.maps.InfoWindow();
    currentInfoWindow = infoWindow;

    // Load the items GeoJSON onto the map.
    map.data.loadGeoJson("../static/js/items.json", { idPropertyName: 'itemid' });

    // Define the custom marker icons, using the item's "category".
    addCustomMarker();

    // Adjust the bounds to include all features added to the map
    map.data.addListener('addfeature', (event) => {
        if (event.feature.getGeometry().getType() === 'Point') {
            const position = event.feature.getGeometry().get();
            bounds.extend(position);

            const category = event.feature.getProperty('category');
            if (category) {
                uniqueCategories.add(category);
            }
        }

    });

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

    // Fit the map to the bounds after all markers are loaded
    map.data.addListener('addfeature', () => {

        map.fitBounds(bounds);
        const categoryArray = Array.from(uniqueCategories);

        const items = [];
        map.data.forEach((feature) => {

            const itemID = feature.getProperty("itemid");
            if (itemID) {
                items.push({
                    itemid: itemID,
                });
            }
        });
    });

    // Show the information for a store when its marker is clicked.
    map.data.addListener('click', (event) => {
        const category = event.feature.getProperty('category');
        const name = event.feature.getProperty('name');
        const description = event.feature.getProperty('description');
        const hours = event.feature.getProperty('found_time');
        const phone = event.feature.getProperty('phone');
        const position = event.feature.getGeometry().get();


        // Content for InfoWindow
        const content = `
        <div class="card">
            <div class="card-body">
                <img style="float:left; width:200px; margin-top:30px" src="../static/img/profile-icon.jpg">
                <div style="margin-left:220px; margin-bottom:20px;">
            <h2>${name}</h2><p>${description}</p>
            <p><b>Found Time:</b> ${hours}<br/><b>Phone:</b> ${phone}</p>
          </div>
        </div>`;

        // Set InfoWindow content and open it
        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }

        // Open the new InfoWindow
        infoWindow.open(map);
        currentInfoWindow = infoWindow;

        // Zoom in to the selected marker
        map.setZoom(zoomedInLevel);
        map.setCenter(position);

        // google.maps.event.addListener(infoWindow, 'closeclick', () => {

        //     map.setZoom(defaultZoomLevel);
        //     map.fitBounds(bounds);

        // });
    });

    // AUTOCOMPLETE SEARCH BAR //
    const container = document.getElementById('sidebar-autocomplete-container');
    const input = document.createElement('input');
    const options = {
        types: ['address'],
        componentRestrictions: { country: 'sg' },
    };
    const panel = document.getElementById('panel');

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

function imageExists(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
}

function addCustomMarker() {
    map.data.setStyle((feature) => {
        const category = feature.getProperty("category");
        const iconURL = `../static/img/icon_${category}.png`

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

    // Add filter controls to the sidebar
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

    panel.originalItems = items;

    categoryFilter.addEventListener('change', () => {
        applyCategoryFilter(panel, data);
    });


    // Display the list of items in the sidebar
    items.forEach((item) => {
        addCards(data, item);
    });

    // Show the panel by adding the 'open' class
    panel.classList.add('open');
    card.style.zIndex = 2;
    document.getElementById('arrow').src = "../static/img/arrow_left.png"
}

function addCards(data, item) {
    const temp = document.createElement('div');
    temp.classList.add('card');

    const tempBody = document.createElement('div');
    tempBody.classList.add('card-body');

    const currentItem = data.getFeatureById(item.itemid);

    const name = document.createElement('p');
    name.classList.add('place');
    name.textContent = currentItem.getProperty('name');
    tempBody.appendChild(name);

    const distanceText = document.createElement('p');
    distanceText.classList.add('distanceText');
    distanceText.textContent = item.distanceText;
    tempBody.appendChild(distanceText);

    temp.appendChild(tempBody);

    // Add click event listener to show the InfoWindow when the card is clicked
    temp.addEventListener('click', () => {
        const category = currentItem.getProperty('category');
        const position = currentItem.getGeometry().get();
        const name = currentItem.getProperty('name');
        const description = currentItem.getProperty('description');
        const hours = currentItem.getProperty('found_time');
        const phone = currentItem.getProperty('phone');

        // Check if a secondary panel already exists, if not, create one
        let infoPanel = document.getElementById('info-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.setAttribute('id', 'info-panel');
            infoPanel.classList.add('info-panel');

            // Append the secondary panel to the body or map container
            document.body.appendChild(infoPanel);
        }

        // Clear the previous content of the secondary panel
        infoPanel.innerHTML = '';

        // Set up the content for the secondary panel
        const content = `
            <div class="info-panel-content">
                <img style="width: 100%; height: auto;" src="../static/img/profile-icon.jpg">
                <div style="padding: 20px;">
                    <h2>${name}</h2>
                    <p>${description}</p>
                    <p><b>Found Time:</b> ${hours}<br/><b>Phone:</b> ${phone}</p>
                </div>
            </div>`;

        infoPanel.innerHTML = content;

        // Ensure the panel is visible
        infoPanel.style.display = 'block';
        infoPanel.style.position = 'fixed';
        infoPanel.style.left = '350px'; // Align the secondary panel to the right side of the viewport
        infoPanel.style.height = '100%';
        infoPanel.style.width = '350px'; // Adjust as necessary for desired width
        infoPanel.style.backgroundColor = '#fff';
        infoPanel.style.boxShadow = '-2px 0px 5px rgba(0, 0, 0, 0.3)'; // Adds shadow for better visibility
        infoPanel.style.overflowY = 'auto';
        infoPanel.style.zIndex = '3'; // Make sure it appears above the map and main panel

        // Optionally, add a close button to the secondary panel
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

        // Center the map on the selected marker (optional)
        map.setZoom(zoomedInLevel);
        map.setCenter(position);
        adjustPanelsForScreenSize();

    });

    const panel = document.getElementById('panel');
    panel.appendChild(temp);
}


function adjustPanelsForScreenSize() {
    const infoPanel = document.getElementById('info-panel');
    const panel = document.getElementById('panel');

    if (!infoPanel || !panel) return; // Guard clause if the panels don't exist yet

    if (window.innerWidth >= 992) { // Medium breakpoint onwards
        infoPanel.style.left = "350px";
    } else {
        infoPanel.style.left = 0;
        document.getElementById('toggle-panel-button').classList.add('hidden');
        
    }
}

// Add event listener for resizing the window
window.addEventListener('resize', adjustPanelsForScreenSize);


// Apply the category filter to the map and panel items
function applyCategoryFilter(panel, data) {
    card.style.zIndex = 2;

    const selectedCategory = document.getElementById('category-filter').value;
    let filteredItems = panel.originalItems;

    if (selectedCategory !== 'all') {
        filteredItems = panel.originalItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return feature.getProperty('category') === selectedCategory;
        });
    }

    // Clear the panel except for the filter controls
    while (panel.childNodes.length > 6) {
        console.log(panel.lastChild);
        panel.removeChild(panel.lastChild);
    }

    // Display the filtered items in the sidebar
    filteredItems.forEach((item) => {
        addCards(data, item);
    });

    // Update the visibility of markers on the map
    applyCategoryFilterToMap(data);
}

function applyCategoryFilterToMap(data) {
    const selectedCategory = document.getElementById('category-filter').value;

    data.forEach((feature) => {
        const category = feature.getProperty('category');
        if (selectedCategory === 'all' || category === selectedCategory) {
            data.overrideStyle(feature, { visible: true });
        } else {
            data.overrideStyle(feature, { visible: false });
        }
    });
}
