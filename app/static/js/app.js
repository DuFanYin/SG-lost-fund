// COMPLETED //
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
    let defaultZoomLevel = 11;
    let zoomedInLevel = 18;


    // Initialize the map with the given center position
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: defaultZoomLevel,
        center: centerPosition,
        styles: [],
        mapTypeId: 'roadmap', // Options: 'roadmap' (default), 'satellite', 'hybrid', 'terrain'
        mapTypeControl: false, // Disable default map type control
    });

    addLayersButton(map);
    map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(document.getElementById('layers-button'));

    const bounds = new google.maps.LatLngBounds();
    const infoWindow = new google.maps.InfoWindow();
    let currentInfoWindow = infoWindow;
    const infoPane = document.getElementById('panel');
    const uniqueCategories = new Set();

    // Load the items GeoJSON onto the map.
    map.data.loadGeoJson("../static/js/items.json", { idPropertyName: 'itemid' });

    // Define the custom marker icons, using the item's "category".
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
    const card = document.getElementById('card');
    const cardBody = document.getElementById('cardBody');

    togglePanelButton.addEventListener('click', () => {
        if (panel.classList.contains('open')) {
            card.style.zIndex = 0;
            panel.classList.remove('open');
            togglePanelButton.innerHTML = '<img src="https://maps.gstatic.com/tactile/pane/arrow_left_2x.png" class="flipped-horizontal" alt="<" id="arrow">';

        } else {
            card.style.zIndex = 2;
            panel.classList.add('open');
            togglePanelButton.innerHTML = '<img src="https://maps.gstatic.com/tactile/pane/arrow_left_2x.png" alt=">" id="arrow">'; 

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
        // showItemsList(map.data, items, categoryArray);
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
        <div>
          <img style="float:left; width:200px; margin-top:30px" src="https://www.google.com/imgres?q=cat%20image&imgurl=https%3A%2F%2Fi.natgeofe.com%2Fn%2F548467d8-c5f1-4551-9f58-6817a8d2c45e%2FNationalGeographic_2572187_square.jpg&imgrefurl=https%3A%2F%2Fwww.nationalgeographic.com%2Fanimals%2Fmammals%2Ffacts%2Fdomestic-cat&docid=K6Qd9XWnQFQCoM&tbnid=eAP244UcF5wdYM&vet=12ahUKEwjJs67amqKJAxW2yzgGHQKWKRYQM3oECB0QAA..i&w=3072&h=3072&hcb=2&itg=1&ved=2ahUKEwjJs67amqKJAxW2yzgGHQKWKRYQM3oECB0QAA">
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

        google.maps.event.addListener(infoWindow, 'closeclick', () => {

            map.setZoom(defaultZoomLevel);
            map.fitBounds(bounds);

            if (infoPane.classList.contains("open")) {
                infoPane.classList.remove("open");
            }
        });
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
        console.log(rankedItems);
        showItemsList(map.data, rankedItems, Array.from(uniqueCategories));
    });



}

function imageExists(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
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

    console.log(getDistanceMatrix);
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

    // Clear the previous details in the sidebar
    const totalElementChildren = panel.children.length;
    for (let i = panel.children.length - 1; i >= 3; i--) {
        panel.removeChild(panel.children[i]);
    }

    // Add filter controls to the sidebar
    const filterContainer = document.createElement('div');
    filterContainer.setAttribute('id', 'filter-container');
    filterContainer.style.margin = '10px 18px';

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Filter by Category: ';
    filterLabel.setAttribute('for', 'category-filter');
    filterContainer.appendChild(filterLabel);

    const categoryFilter = document.createElement('select');
    categoryFilter.setAttribute('id', 'category-filter');

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    categoryFilter.appendChild(allOption);

    // Add options for each unique category
    categoryArray.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Capitalize category name
        categoryFilter.appendChild(option);
    });

    filterContainer.appendChild(categoryFilter);
    panel.appendChild(filterContainer);

    // Store the original items list
    panel.originalItems = items;

    // Add Event Listener for Filter Change
    categoryFilter.addEventListener('change', () => {
        applyCategoryFilter(panel, data);
    });

    // Display the list of items in the sidebar
    items.forEach((item) => {
        console.log(item);
        const currentItem = data.getFeatureById(item.itemid);

        const name = document.createElement('p');
        name.classList.add('place');
        name.textContent = currentItem.getProperty('name');
        panel.appendChild(name);

        const distanceText = document.createElement('p');
        distanceText.classList.add('distanceText');
        distanceText.textContent = item.distanceText;
        panel.appendChild(distanceText);

    });

    // Show the panel by adding the 'open' class
    panel.classList.add('open');
    document.getElementById("temp").style.zIndex = 2;
    document.getElementById("temp").style.display = "inline-block";

    document.getElementById('map').classList.add('panel-open');
}

// Apply the category filter to the map and panel items
function applyCategoryFilter(panel, data) {
    const selectedCategory = document.getElementById('category-filter').value;
    let filteredItems = panel.originalItems;

    if (selectedCategory !== 'all') {
        filteredItems = panel.originalItems.filter((item) => {
            const feature = data.getFeatureById(item.itemid);
            return feature.getProperty('category') === selectedCategory;
        });
    }

    // Clear the panel except for the filter controls
    while (panel.childNodes.length > 1) {
        panel.removeChild(panel.lastChild);
    }

    // Display the filtered items in the sidebar
    filteredItems.forEach((item) => {
        const currentItem = data.getFeatureById(item.itemid);

        const name = document.createElement('p');
        name.classList.add('place');
        name.textContent = currentItem.getProperty('name');
        panel.appendChild(name);

        const distanceText = document.createElement('p');
        distanceText.classList.add('distanceText');
        distanceText.textContent = item.distanceText;
        panel.appendChild(distanceText);
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



function addLayersButton(map) {
    const layersButton = document.getElementById('layers-button');

    layersButton.addEventListener('click', (event) => {
        const layerOption = event.target.getAttribute('data-layer');

        if (layerOption === 'terrain') {
            map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
        } else if (layerOption === 'traffic') {
            const trafficLayer = new google.maps.TrafficLayer();
            trafficLayer.setMap(map);
        } else if (layerOption === 'transit') {
            const transitLayer = new google.maps.TransitLayer();
            transitLayer.setMap(map);
        } else if (layerOption === 'biking') {
            const bikeLayer = new google.maps.BicyclingLayer();
            bikeLayer.setMap(map);
        } else if (layerOption === 'more') {
            // You can add additional functionality for "more"
        }
    });
}
