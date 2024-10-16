const mapStyle = [{
    'featureType': 'administrative',
    'elementType': 'all',
    'stylers': [{
        'visibility': 'on',
    },
    {
        'lightness': 33,
    },
    ],
},
{
    'featureType': 'landscape',
    'elementType': 'all',
    'stylers': [{
        'color': '#f2e5d4',
    }],
},
{
    'featureType': 'poi.park',
    'elementType': 'geometry',
    'stylers': [{
        'color': '#c5dac6',
    }],
},
{
    'featureType': 'poi.park',
    'elementType': 'labels',
    'stylers': [{
        'visibility': 'on',
    },
    {
        'lightness': 20,
    },
    ],
},
{
    'featureType': 'road',
    'elementType': 'all',
    'stylers': [{
        'lightness': 20,
    }],
},
{
    'featureType': 'road.highway',
    'elementType': 'geometry',
    'stylers': [{
        'color': '#c5c6c6',
    }],
},
{
    'featureType': 'road.arterial',
    'elementType': 'geometry',
    'stylers': [{
        'color': '#e4d7c6',
    }],
},
{
    'featureType': 'road.local',
    'elementType': 'geometry',
    'stylers': [{
        'color': '#fbfaf7',
    }],
},
{
    'featureType': 'water',
    'elementType': 'all',
    'stylers': [{
        'visibility': 'on',
    },
    {
        'color': '#acbcc9',
    },
    ],
},
];

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

function initMap() {

    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: { lat: 1.3521, lng: 103.8198 },
        styles: mapStyle,
    });

    // Load the items GeoJSON onto the map.
    map.data.loadGeoJson("../static/js/items.json", { idPropertyName: 'itemid' });

    // Define the custom marker icons, using the item's "category".
    map.data.setStyle((feature) => {
        return {
            icon: {
                url: `../static/img/icon_${feature.getProperty('category')}.png`,
                scaledSize: new google.maps.Size(64, 64),
            },
        };
    });

    const apiKey = 'AIzaSyBI4DCVUE76O9lZUimz8uY9oAPEecHchv8';
    const infoWindow = new google.maps.InfoWindow();

    // Show the information for a store when its marker is clicked.
    map.data.addListener('click', (event) => {
        const category = event.feature.getProperty('category');
        const name = event.feature.getProperty('name');
        const description = event.feature.getProperty('description');
        const hours = event.feature.getProperty('found_time');
        const phone = event.feature.getProperty('phone');
        const position = event.feature.getGeometry().get();
        const content = sanitizeHTML`
        <img style="float:left; width:200px; margin-top:30px" src="../static/img/logo_${category}.png" alt="No Image">
        <div style="margin-left:220px; margin-bottom:20px;">
          <h2>${name}</h2><p>${description}</p>
          <p><b>Found Time:</b> ${hours}<br/><b>Phone:</b> ${phone}</p>
        </div>
        `;

        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });
        infoWindow.open(map);
    });

    // AUTOCOMPLETE SEARCH BAR 
    const card = document.createElement('div');
    const titleBar = document.createElement('div');
    const title = document.createElement('div');
    const container = document.createElement('div');
    const input = document.createElement('input');
    const options = {
        types: ['address'],
        componentRestrictions: { country: 'sg' },
    };

    card.setAttribute('id', 'autocomplete-card');
    title.setAttribute('id', 'title');
    title.textContent = 'Location of missing item';
    titleBar.appendChild(title);
    container.setAttribute('id', 'autocomplete-container');
    input.setAttribute('id', 'autocomplete-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Enter an address');
    container.appendChild(input);
    card.appendChild(titleBar);
    card.appendChild(container);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);

    const autocomplete = new google.maps.places.Autocomplete(input, options);

    autocomplete.setFields(
        ['address_components', 'geometry', 'name']);

    // Set the origin point when the user selects an address
    const originMarker = new google.maps.Marker({ map: map });
    originMarker.setVisible(false);
    let originLocation = map.getCenter();

    autocomplete.addListener('place_changed', async () => {
        originMarker.setVisible(false);
        originLocation = map.getCenter();
        const place = autocomplete.getPlace();

        if (!place.geometry) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            window.alert('No address available for input: \'' + place.name + '\'');
            return;
        }

        // Recenter the map to the selected address
        originLocation = place.geometry.location;
        map.setCenter(originLocation);
        map.setZoom(9);
        console.log(place);

        originMarker.setPosition(originLocation);
        originMarker.setVisible(true);

        // Use the selected address as the origin to calculate distances
        // to each of the store locations
        console.log(map.data);
        const rankedItems = await calculateDistances(map.data, originLocation);
        showItemsList(map.data, rankedItems);

        return;
    });
}

// /**
//  * Use Distance Matrix API to calculate distance from origin to each store.
//  * @param {google.maps.Data} data The geospatial data object layer for the map
//  * @param {google.maps.LatLng} origin Geographical coordinates in latitude
//  * and longitude
//  * @return {Promise<object[]>} n Promise fulfilled by an array of objects with
//  * a distanceText, distanceVal, and storeid property, sorted ascending
//  * by distanceVal.
//  */
// async function calculateDistances(data, origin) {
//     const items = [];
//     const destinations = [];

//     // Build parallel arrays for the store IDs and destinations
//     data.forEach((store) => {
//         const storeNum = store.getProperty('storeid');
//         const storeLoc = store.getGeometry().get();

//         items.push(storeNum);
//         destinations.push(storeLoc);
//     });

//     // Retrieve the distances of each store from the origin
//     // The returned list will be in the same order as the destinations list
//     const service = new google.maps.DistanceMatrixService();
//     const getDistanceMatrix =
//         (service, parameters) => new Promise((resolve, reject) => {
//             service.getDistanceMatrix(parameters, (response, status) => {
//                 if (status != google.maps.DistanceMatrixStatus.OK) {
//                     reject(response);
//                 } else {
//                     const distances = [];
//                     const results = response.rows[0].elements;
//                     for (let j = 0; j < results.length; j++) {
//                         const element = results[j];
//                         const distanceText = element.distance.text;
//                         const distanceVal = element.distance.value;
//                         const distanceObject = {
//                             itemid: items[j],
//                             distanceText: distanceText,
//                             distanceVal: distanceVal,
//                         };
//                         distances.push(distanceObject);
//                     }

//                     resolve(distances);
//                 }
//             });
//         });

//     const distancesList = await getDistanceMatrix(service, {
//         origins: [origin],
//         destinations: destinations,
//         travelMode: 'DRIVING',
//         unitSystem: google.maps.UnitSystem.METRIC,
//     });

//     distancesList.sort((first, second) => {
//         return first.distanceVal - second.distanceVal;
//     });

//     return distancesList;
// }

// /**
//  * Build the content of the side panel from the sorted list of items
//  * and display it.
//  * @param {google.maps.Data} data The geospatial data object layer for the map
//  * @param {object[]} stores An array of objects with a distanceText,
//  * distanceVal, and storeid property.
//  */


// function showItemsList(data, items) {
//     if (items.length == 0) {
//         console.log('no items');
//         return;
//     }

//     let panel = document.getElementById('panel');
//     // If the panel already exists, use it. Else, create it and add to the page.
//     if (panel) {
//         // If panel is already open, close it
//         if (panel.classList.contains('open')) {
//             panel.classList.remove('open');
//             document.getElementById('map').classList.remove('panel-open');
//             return;
//         }
//     } else {
//         panel = document.createElement('div');
//         panel.setAttribute('id', 'panel');
//         const body = document.body;
//         body.insertBefore(panel, body.childNodes[0]);
//     }

//     // Clear the previous details
//     panel.innerHTML = '';

//     // **Add Filter Controls**
//     const filterContainer = document.createElement('div');
//     filterContainer.setAttribute('id', 'filter-container');
//     filterContainer.style.margin = '10px 18px';

//     const filterLabel = document.createElement('label');
//     filterLabel.textContent = 'Filter by Category: ';
//     filterLabel.setAttribute('for', 'category-filter');
//     filterContainer.appendChild(filterLabel);

//     const categoryFilter = document.createElement('select');
//     categoryFilter.setAttribute('id', 'category-filter');
//     categoryFilter.innerHTML = `
//     <option value="all">All</option>
//     <option value="patisserie">Patisserie</option>
//     <option value="cafe">Cafe</option>
//   `;
//     filterContainer.appendChild(categoryFilter);
//     panel.appendChild(filterContainer);

//     // **Store the Original items List**
//     panel.originalItems = items; // Attach original items to the panel for filtering

//     // **Add Event Listener for Filter**
//     categoryFilter.addEventListener('change', () => {
//         applyCategoryFilter(panel, data);
//     });

//     // **Display items**
//     items.forEach((item) => {
//         // Add item details with text formatting
//         const name = document.createElement('p');
//         name.classList.add('place');
//         const currentItem = data.getFeatureById(item.itemid);
//         name.textContent = currentItem.getProperty('name');
//         panel.appendChild(name);
//         const distanceText = document.createElement('p');
//         distanceText.classList.add('distanceText');
//         distanceText.textContent = item.distanceText;
//         panel.appendChild(distanceText);
//     });

//     // Toggle the panel
//     if (panel.classList.contains('open')) {
//         panel.classList.remove('open');
//         document.getElementById('map').classList.remove('panel-open');
//     } else {
//         panel.classList.add('open');
//         document.getElementById('map').classList.add('panel-open');
//     }
//     // **Open the Panel and Adjust Map**
//     panel.classList.add('open');
//     document.getElementById('map').classList.add('panel-open');
// }


// function applyCategoryFilter(panel, data) {
//     const selectedCategory = document.getElementById('category-filter').value;
//     let filteredItems= panel.originalItems;

//     if (selectedCategory !== 'all') {
//         filteredItems = panel.originalItems.filter(item => {
//             const feature = data.getFeatureById(item.item);
//             return feature.getProperty('category') === selectedCategory;
//         });
//     }

//     // Clear the panel except for the filter controls
//     while (panel.childNodes.length > 1) { // Assuming first child is filterContainer
//         panel.removeChild(panel.lastChild);
//     }

//     // Display the filtered items
//     filteredItems.forEach((item) => {
//         const name = document.createElement('p');
//         name.classList.add('place');
//         const currentItem = data.getFeatureById(item.itemid);
//         name.textContent = currentItem.getProperty('name');
//         panel.appendChild(name);
//         const distanceText = document.createElement('p');
//         distanceText.classList.add('distanceText');
//         distanceText.textContent = item.distanceText;
//         panel.appendChild(distanceText);
//     });

//     // **Update Map Markers Visibility**
//     applyCategoryFilterToMap(data);
// }

// /**
//  * Apply the selected category filter to the map markers.
//  * @param {google.maps.Data} data The geospatial data object layer for the map.
//  */
// function applyCategoryFilterToMap(data) {
//     const selectedCategory = document.getElementById('category-filter').value;

//     data.forEach((feature) => {
//         const category = feature.getProperty('category');
//         if (selectedCategory === 'all' || category === selectedCategory) {
//             data.overrideStyle(feature, { visible: true });
//         } else {
//             data.overrideStyle(feature, { visible: false });
//         }
//     });
// }

