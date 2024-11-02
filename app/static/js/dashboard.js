// Firebase Configuration
import { db } from '../js/firebaseConfig.js'; // Adjust the path according to your structure

// Vue Application
// Within the Vue app
// Vue Application
const dashboardApp = Vue.createApp({
    data() {
        return {
            totalUsers: 0,
            lostItemReports: 0,
            recoveredItems: 0,
            selectedReportType: "Found",
            barChartInstance: null, // Store the bar chart instance
        };
    },
    methods: {
        async countUsers() {
            try {
                const usersRef = db.collection("users");
                const snapshot = await usersRef.get();
                this.totalUsers = snapshot.size;
                console.log("Total number of users :", this.totalUsers);
            } catch (error) {
                console.error("Error counting users:", error);
            }
        },
        async countLostItemReports() {
            try {
                const reportsRef = db.collection("listings");
                const snapshot = await reportsRef.where("report_type", "==", "Lost").get();
                this.lostItemReports = snapshot.size;
                console.log("Total number of lost item reports :", this.lostItemReports);
            } catch (error) {
                console.error("Error counting lost item reports:", error);
            }
        },
        async countRecoveredItems() {
            try {
                const recoveredRef = db.collection("listings");
                const snapshot = await recoveredRef.where("archived", "==", true).get();
                this.recoveredItems = snapshot.size;
                console.log("Total number of recovered items:", this.recoveredItems);
            } catch (error) {
                console.error("Error counting recovered items:", error);
            }
        },
        async loadTopLostItems() {
            try {
                const listingsRef = db.collection("listings");
                const snapshot = await listingsRef.where("report_type", "==", "Lost").get();

                const itemCounts = {};
                snapshot.forEach(doc => {
                    const itemName = doc.data().item_name;
                    itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
                });

                const topItems = Object.entries(itemCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                const itemNames = topItems.map(item => item[0]);
                const itemCountsData = topItems.map(item => item[1]);

                const barChartCanvas = document.getElementById("barChart");
                if (!barChartCanvas) {
                    throw new Error("barChart element not found.");
                }

                const ctx = barChartCanvas.getContext("2d");
                if (!ctx) {
                    throw new Error("getContext failed on barChart canvas.");
                }

                // Create a new bar chart or update the existing one
                if (this.barChartInstance) {
                    this.barChartInstance.data.labels = itemNames;
                    this.barChartInstance.data.datasets[0].data = itemCountsData;
                    this.barChartInstance.update();
                } else {
                    this.barChartInstance = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: itemNames,
                            datasets: [
                                {
                                    label: "Top 5 Most Lost Items",
                                    data: itemCountsData,
                                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                                    borderColor: "rgba(54, 162, 235, 1)",
                                    borderWidth: 1,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                tooltip: {
                                    enabled: true,  // Enable tooltips (default is true)
                                    callbacks: {
                                        label: function (context) {
                                            const label = context.dataset.label || '';
                                            const value = context.raw;
                                            return `${label}: ${value} reports`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                },
                            },
                        },
                    });
                }
            } catch (error) {
                console.error("Error loading top lost items:", error);
            }
        },

        async fetchAndRankUsers(currentUserId) { // Pass the current user's ID as an argument
            try {
                const usersRef = db.collection("users");
                const snapshot = await usersRef.get();
        
                const users = [];
                const listingsRef = db.collection("listings"); // Reference to the listings collection
        
                // Create an array of promises for counting items found
                const itemCountPromises = snapshot.docs.map(async doc => {
                    const userData = doc.data();
                    const userId = doc.id; // Get the user ID
        
                    // Count items found by this user
                    const foundSnapshot = await listingsRef.where("uid", "==", userId).where("report_type", "==", "Found").get();
                    const itemsFound = foundSnapshot.size; // Count of found items
        
                    users.push({
                        username: userData.username,
                        itemsFound: itemsFound, // Number of items found by the user
                        points: userData.points,
                        userId: userId // Store the user ID for later use
                    });
                });
        
                // Wait for all promises to resolve
                await Promise.all(itemCountPromises);
        
                // Sort users by points
                users.sort((a, b) => b.points - a.points);
        
                // Find the current user
                const currentUserIndex = users.findIndex(user => user.userId === currentUserId);
                const startIndex = Math.max(currentUserIndex - 2, 0); // Display 2 users above
                const endIndex = Math.min(currentUserIndex + 3, users.length); // Display 2 users below + current user
        
                // Get the users to display
                const usersToDisplay = users.slice(startIndex, endIndex);
        
                // Display the leaderboard in the HTML
                const leaderboardDataElement = document.getElementById("leaderboardData");
                leaderboardDataElement.innerHTML = ""; // Clear existing data
        
                usersToDisplay.forEach((user, index) => {
                    const row = document.createElement("tr");
        
                    // Add a special class for the current user
                    if (user.userId === currentUserId) {
                        row.classList.add("current-user");
                    }
        
                    row.innerHTML = `
                        <td>${startIndex + index + 1}</td>
                        <td>${user.username}${user.userId === currentUserId ? ' (You)' : ''}</td>
                        <td>${user.itemsFound}</td>
                        <td>${user.points}</td>
                    `;
                    leaderboardDataElement.appendChild(row);
                });
            } catch (error) {
                console.error("Error fetching and ranking users:", error);
            }
        },
        
        



        async fetchItemsFoundCount(uid) {
            const listingsRef = db.collection("listings");
            const snapshot = await listingsRef.where("uid", "==", uid).where("report_type", "==", "Found").get();
            return snapshot.size; // Return the count of found items
        },

        displayLeaderboard(users) {
            const leaderboardDataElement = document.getElementById('leaderboardData');
            leaderboardDataElement.innerHTML = ''; // Clear existing data

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.rank}</td>
                    <td>${user.username}</td>
                    <td>${user.itemsFound}</td>
                    <td>${user.points}</td>
                `;
                leaderboardDataElement.appendChild(row);
            });
        },
    },
    mounted() {
        this.countUsers();
        this.countLostItemReports();
        this.loadTopLostItems(); // Load bar chart data when Vue app mounts
        this.countRecoveredItems();
        // Get the current user's ID from sessionStorage
        const currentUserId = sessionStorage.getItem("uid"); // Assuming you store the user's UID in sessionStorage as "uid"
        this.fetchAndRankUsers(currentUserId);// Call this new method to fetch and display ranked users

    },
});

// Mount the Vue app to #app
dashboardApp.mount("#app");







// function showData() {
//     let url = "/static/js/leaderboard.json";

//     axios.get(url)
//         .then(response => {
//             const data = response.data; // Access data from the response
//             const tableBody = document.getElementById('leaderboardData');
//             let tableRows = '';

//             // Loop through the data and build table rows dynamically
//             data.forEach(player => {
//                 tableRows += 
//                     <tr>
//                         <td>${player.ranking}</td>
//                         <td>${player.username}</td>
//                         <td>${player.items_found}</td>
//                         <td>${player.points}</td>
//                     </tr>
//                 ;
//             });
//             tableBody.innerHTML = tableRows;
//         })
//         .catch(error => {
//             console.log("Error loading JSON:", error.message);
//         });
// }

// function lineChart() {
//     axios.get('static/js/lineChart.json') // Update this path to your JSON file
//         .then(response => {
//             const jsonData = response.data.data; // Access the data property from JSON

//             // Create the layout for the plot
//             const layout = {
//                 title: 'Weekly Items Found and Returned',
//                 xaxis: {
//                     title: 'Weeks',
//                     showgrid: true,
//                     zeroline: false
//                 },
//                 yaxis: {
//                     title: 'Number of Items',
//                     showline: true
//                 },
//                 legend: {
//                     x: 0,
//                     y: 1,
//                     traceorder: 'normal',
//                     orientation: 'h'
//                 },
//                 autosize: true // Ensure the plot resizes with the container
//             };

//             // Create the plot with displayModeBar set to false
//             Plotly.newPlot('lineChart', jsonData, layout, { responsive: true, displayModeBar: false });
//         })
//         .catch(error => {
//             console.error("Error fetching the JSON data:", error);
//         });
// }


// <! -- let pieChartInstance; // Variable to hold the chart instance
// function pieChart() {
//     axios.get('static/js/pieChart.json') // Update this path to your JSON file
//         .then(response => {
//             console.log(response.data); // Log the response to check its structure
//             const jsonData = response.data.data; // Access the data property from JSON

//             if (!jsonData) {
//                 console.error("No data found in the response.");
//                 return;
//             }

//             Create the plot
//             const renderChart = (status) => {
//                 let filteredData, successRate = 0, totalCount = 0;

//                 Filter data based on status
//                 filteredData = jsonData.filter(item => item.item_status === status);

//                 Calculate the success rate based on the status
//                 if (filteredData.length > 0) {
//                     const successfulCount = filteredData[0].success_count; // Get success count
//                     totalCount = filteredData[0].total_count; // Get total count
//                     successRate = (successfulCount / totalCount) * 100; // Calculate success rate as a percentage
//                 }

//                 const ctx = document.getElementById('pieChart').getContext('2d');

//                 Destroy the existing chart instance if it exists
//                 if (pieChartInstance) {
//                     pieChartInstance.destroy(); // Destroy the old chart instance
//                 }

//                 Create a new chart instance
//                 pieChartInstance = new Chart(ctx, {
//                     type: 'pie',
//                     data: {
//                         labels: ['Success Rate', 'Failure Rate'], // Labels for the pie chart
//                         datasets: [{
//                             data: [successRate, 100 - successRate], // Data for success and failure
//                             backgroundColor: ['#36a2eb', '#ff6384'], // Colors for the segments
//                         }]
//                     },
//                     options: {
//                         responsive: true, // Make chart responsive
//                         maintainAspectRatio: false,
//                         plugins: {
//                             legend: {
//                                 display: true,
//                                 position: 'top'
//                             },
//                             title: {
//                                 display: true,
//                                 text: Success Rate for ${status} Items
//                             },
//                             datalabels: {
//                                 formatter: (value, ctx) => {
//                                     const total = ctx.chart.data.datasets[0].data.reduce((acc, val) => acc + val, 0);
//                                     const percentage = (value / total * 100).toFixed(0); // Calculate percentage
//                                     return percentage + '%'; // Display percentage
//                                 },
//                                 color: '#fff',
//                                 font: {
//                                     weight: 'bold',
//                                     size: 14
//                                 }
//                             }
//                         }
//                     },
//                     plugins: [ChartDataLabels] // Enable the Data Labels plugin
//                 });
//             }

//             Set up event listener for dropdown selection change
//             document.getElementById('statusSelect').addEventListener('change', function () {
//                 renderChart(this.value); // Render chart for selected status
//             });

//             Initial chart rendering
//             renderChart('Returned'); // Default value to display on load
//         })
//         .catch(error => {
//             console.error("Error fetching the JSON data:", error);
//         });
// }

// document.addEventListener("DOMContentLoaded", function () {
//     pieChart(); // Call the function to initialize after DOM is loaded
// });


// function barChart() {
//     axios.get('static/js/barChart.json')
//         .then(function (response) {
//             Handle successful response
//             const data = response.data;

//             Sort the items by report_count in descending order and take the top 5
//             const top5Items = data.items_reported.sort((a, b) => b.report_count - a.report_count).slice(0, 5);

//             Extract data for the top 5 items for the bar chart
//             const itemNames = top5Items.map(item => item.item_name);
//             const reportCounts = top5Items.map(item => item.report_count);
//             const percentages = top5Items.map(item => item.percentage_of_total);

//             Get the current month name
//             const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
//             const currentMonth = monthNames[new Date().getMonth()];

//             Bar chart configuration for top 5 items
//             const trace1 = {
//                 x: itemNames, // Item names on the x-axis
//                 y: reportCounts, // Report counts on the y-axis (vertical bars)
//                 type: 'bar', // Bar chart
//                 text: percentages.map(percent => percent + '%'), // Display percentage on each bar
//                 textposition: 'auto',
//                 marker: {
//                     color: 'rgba(55, 128, 191, 0.7)',
//                     line: {
//                         color: 'rgba(55, 128, 191, 1.0)',
//                         width: 2
//                     }
//                 }
//             };

//             const layout = {
//                 title: Top 5 Most Reported Items - ${currentMonth} ${new Date().getFullYear()}, // Use dynamic month and year
//                 xaxis: {
//                     title: 'Item Names' // Labels on x-axis
//                 },
//                 yaxis: {
//                     title: 'Number of Reports' // Labels on y-axis
//                 },
//                 margin: {
//                     l: 50,
//                     r: 50,
//                     b: 100,
//                     t: 50,
//                     pad: 4
//                 },
//                 autosize: true, // Automatically size the chart
//             };

//             Render the vertical bar chart for the top 5 items without mode bar
//             Plotly.newPlot('barChart', [trace1], layout, { displayModeBar: false, responsive: true }); // Combine options in one object
//         })
//         .catch(function (error) {
//             Handle error if the request fails
//             console.error('Error fetching the JSON data:', error);
//         });
// }


// window.onload = function () {
//     showData();
//     lineChart();
//     pieChart();
//     barChart();
// };
// </script>
