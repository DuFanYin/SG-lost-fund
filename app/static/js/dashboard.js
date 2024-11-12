// Firebase Configuration
import { db } from '../js/firebaseConfig.js'; // Adjust the path according to your structure
// Added for UI Tooltip
document.addEventListener("DOMContentLoaded", function () {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
});


// Vue Application
// Within the Vue app
// Vue Application
const dashboardApp = Vue.createApp({
    data() {
        return {
            totalUsers: 0,
            lostItemReports: 0,
            recoveredItems: 0,
            selectedReportType: '',
            barChartInstance: null, // Store the bar chart instance
            pieChartInstance: null, // Tracks the pie chart instance
            lineChartInstance: null,
            isLoggedIn: sessionStorage.getItem("uid") !== null, // Initialize based on session storage
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
                console.log("Error counting users:", error);
            }
        },

        async countLostItemReports() {
            try {
                const reportsRef = db.collection("listings");
                const snapshot = await reportsRef.where("report_type", "==", "Lost").get();
                this.lostItemReports = snapshot.size;
                console.log("Total number of lost item reports :", this.lostItemReports);
            } catch (error) {
                console.log("Error counting lost item reports:", error);
            }
        },
        async countRecoveredItems() {
            try {
                const recoveredRef = db.collection("listings");
                const snapshot = await recoveredRef.where("archived", "==", true).get();
                this.recoveredItems = snapshot.size;
                console.log("Total number of recovered items:", this.recoveredItems);
            } catch (error) {
                console.log("Error counting recovered items:", error);
            }
        },


        async loadTopLostItems() {
            try {
                const listingsRef = db.collection("listings");
                const snapshot = await listingsRef.where("report_type", "==", "Lost").get();
        
                // Predefined categories (ensure these match exactly with the Firestore data)
                const categories = ["Electronics", "Clothing", "Furniture", "Books", "Jewelry", "Others"];
                const categoryCounts = categories.reduce((acc, category) => {
                    acc[category] = 0; // Start each category with a count of 0
                    return acc;
                }, {});
        
                console.log("Initialized categoryCounts:", categoryCounts);
        
                // Count the items for each category
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const itemType = data.item_type;  // No need to convert to lowercase
        
                    console.log("Document data:", data);
                    console.log("Item Type:", itemType);
        
                    // Check if the item type matches one of the predefined categories
                    if (categoryCounts.hasOwnProperty(itemType)) {
                        categoryCounts[itemType] += 1;
                    } else {
                        console.log(`Item type "${itemType}" does not match any predefined categories.`);
                    }
                });
        
                // Ensure all categories are included, even those with a count of 0
                const itemTypes = Object.keys(categoryCounts);  // ["Electronics", "Clothing", "Furniture", "Books", "Jewelry", "Others"]
                const typeCountsData = itemTypes.map(type => categoryCounts[type]);
        
                console.log("Category Counts after processing:", categoryCounts);
                console.log("Item Types:", itemTypes);
                console.log("Item Type Counts Data:", typeCountsData);
        
                const barChartCanvas = document.getElementById("barChart");
                if (!barChartCanvas) {
                    throw new Error("barChart element not found.");
                }
        
                const ctx = barChartCanvas.getContext("2d");
                if (!ctx) {
                    throw new Error("getContext failed on barChart canvas.");
                }
        
                if (this.barChartInstance) {
                    console.log("Updating existing bar chart...");
                    this.barChartInstance.data.labels = itemTypes;
                    this.barChartInstance.data.datasets[0].data = typeCountsData;
                    this.barChartInstance.update();
                } else {
                    console.log("Creating new bar chart...");
                    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
                    gradient.addColorStop(0, '#a3423c'); // Darkest red at the top
                    gradient.addColorStop(1, '#f07c6c'); // Lightest red at the bottom
        
                    this.barChartInstance = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: itemTypes,
                            datasets: [
                                {
                                    label: "Lost Items by Category",
                                    data: typeCountsData,
                                    backgroundColor: gradient,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: {
                                    display: true,
                                    text: "Lost Items by Category",
                                    font: {
                                        size: 20,
                                        weight: 'bold',
                                    },
                                    color: 'black',
                                    padding: {
                                        top: 10,
                                        bottom: 10,
                                    },
                                    align: 'start',
                                },
                                tooltip: {
                                    enabled: true,
                                    callbacks: {
                                        label: function (context) {
                                            const label = context.label;
                                            const value = context.raw;
                                            const reportLabel = value === 1 ? "item" : "items";
                                            return `${label}: ${value} ${reportLabel}`;
                                        }
                                    }
                                }
                            },
                            legend: {
                                display: false,
                                position: 'bottom',
                                align: 'center',
                                labels: {
                                    boxWidth: 20,
                                    font: {
                                        size: 14
                                    },
                                    padding: 15,
                                },
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        precision: 0,
                                    },
                                },
                            },
                        },
                    });
                }
        
            } catch (error) {
                console.log("Error loading top lost items:", error);
            }
        }
         
        

        ,


        async fetchAndRankUsers(currentUserId) {
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
                        userId: userId // Store the user ID for later use
                    });
                });

                // Wait for all promises to resolve
                await Promise.all(itemCountPromises);

                // Sort users by items found
                users.sort((a, b) => b.itemsFound - a.itemsFound);

                // Find the current user index
                const currentUserIndex = users.findIndex(user => user.userId === currentUserId);

                let usersToDisplay;

                // Logic to determine which users to display
                if (currentUserIndex <= 4) {
                    // If user is in the top 5, show the first 5 users
                    usersToDisplay = users.slice(0, 5);
                } else {
                    // If user is beyond 5th place, show the user in the third position
                    const startIndex = currentUserIndex - 2; // 2 users above
                    const endIndex = currentUserIndex + 3;   // 2 users below

                    // Adjust indices to prevent going out of bounds
                    if (startIndex < 0) {
                        // If too high, adjust to start at 0
                        usersToDisplay = users.slice(0, 5);
                    } else if (endIndex > users.length) {
                        // If too low, adjust to show the last 5 users
                        usersToDisplay = users.slice(users.length - 5);
                    } else {
                        usersToDisplay = users.slice(startIndex, endIndex);
                    }
                }

                // Display the leaderboard in the HTML
                const leaderboardDataElement = document.getElementById("leaderboardData");
                leaderboardDataElement.innerHTML = ""; // Clear existing data

                usersToDisplay.forEach((user, index) => {
                    const row = document.createElement("tr");

                    // Only highlight the current user
                    if (user.userId === currentUserId) {
                        console.log("Highlighting user:", user.username); // Log user being highlighted
                        row.classList.add("highlight-current-user"); // Add highlight class for current user
                        row.classList.add("congratulations"); // Optional additional styling for animation

                        // Trigger confetti over the current user's row
                        setTimeout(() => {
                            // Get the bounding box of the row to position confetti
                            const rowPosition = row.getBoundingClientRect();
                            const xPosition = (rowPosition.left + rowPosition.right) / 2 / window.innerWidth;
                            const yPosition = (rowPosition.top + rowPosition.bottom) / 2 / window.innerHeight;

                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { x: xPosition, y: yPosition },
                                startVelocity: 30,
                                gravity: 0.5,
                                useWorker: true,
                                colors: ['#ffeb3b', '#ff4081', '#69f0ae', '#3f51b5']
                            });
                        }, 500); // Add a delay to allow row rendering
                    }

                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${user.username}${user.userId === currentUserId ? ' (You)' : ''}</td>
                        <td>${user.itemsFound}</td>
                    `;
                    leaderboardDataElement.appendChild(row);
                });


            } catch (error) {
                console.log("Error fetching and ranking users:", error);
            }
        },




        updatePieChart() {
            console.log("Selected report type changed to:", this.selectedReportType);
            this.renderPieChart(); // Call to re-render the chart
        },

        async fetchDataForPieChart(reportType) {
            try {
                const listingsRef = db.collection("listings");
                const snapshot = await listingsRef.where("report_type", "==", reportType).get();

                const totalCount = snapshot.size; // Total items for the selected report type
                console.log("Total Count for report type", reportType, ":", totalCount);

                let successCount = 0; // Initialize success count

                // Count how many of these items are archived (successful recoveries)
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.archived === true) { // Assuming archived means successful recovery
                        successCount++;
                    }
                });

                console.log("Success Count for report type", reportType, ":", successCount);
                const successRate = (totalCount > 0) ? (successCount / totalCount) * 100 : 0;
                console.log("Calculated Success Rate for report type", reportType, ":", successRate);

                return {
                    successRate: successRate,
                    totalCount: totalCount
                };
            } catch (error) {
                console.log("Error fetching data for pie chart:", error);
                return null;
            }
        },

        async renderPieChart() {
            const ctx = document.getElementById('pieChart')?.getContext('2d');
            if (!ctx) {
                console.log("Canvas element not found or getContext failed.");
                return;
            }

            console.log(`Rendering pie chart for report type: ${this.selectedReportType}`);

            try {
                const data = await this.fetchDataForPieChart(this.selectedReportType);
                if (!data) {
                    console.log("No data returned for the pie chart.");
                    return;
                }

                // Destroy the previous chart instance if it exists
                if (this.pieChartInstance) {
                    this.pieChartInstance.destroy();
                    console.log("Destroyed previous pie chart instance.");
                }

                // Create a new pie chart instance
                this.pieChartInstance = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Success Rate', 'Failure Rate'],
                        datasets: [{
                            data: [data.successRate, 100 - data.successRate],
                            backgroundColor: ['#66b272', '#e87b6a'],
                            borderColor: '#ffffff',
                            borderWidth: 2,
                            hoverOffset: 8, // Adds a 3D effect on hover
                            offset: 10 // Offset slices slightly for a 3D look on load
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom', // Positions the legend box to the right
                                align: 'center', // Aligns the legend box vertically
                                labels: {
                                    boxWidth: 20, // Sets the size of the legend box
                                    font: {
                                        size: 14
                                    },

                                }
                            },
                            title: {
                                display: true,
                                text: `Rates ${this.selectedReportType} Items`,
                                font: {
                                    size: 20, // Adjusted font size for better alignment with dropdown
                                    weight: 'bold', // Keep the text bold
                                    family: 'Arial', // Keep the font family
                                },
                                color: 'black',  // Keep the font color

                                align: 'start', // Align the title to the start
                                position: 'top' // Position the title above the chart
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        label += context.raw.toFixed(2) + '%';
                                        return label;
                                    }
                                }
                            },
                            animation: {
                                animateScale: true, // Adds scaling effect on load
                                animateRotate: true // Adds rotation effect on load
                            }
                        }
                    }
                });

                console.log("Pie chart rendered successfully with data:", data);
            } catch (error) {
                console.log("Error rendering pie chart:", error);
            }
        },


        async lineChart() {
            try {
                const listingsRef = db.collection("listings");

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const foundCounts = Array(4).fill(0);
                const lostCounts = Array(4).fill(0);

                // Fetch all "Found" items within the current month
                const foundSnapshot = await listingsRef
                    .where("report_type", "==", "Found")
                    .where("found_timestamp", ">=", startOfMonth)
                    .where("found_timestamp", "<=", endOfMonth)
                    .get();

                // Fetch all "Lost" items within the current month
                const lostSnapshot = await listingsRef
                    .where("report_type", "==", "Lost")
                    .where("found_timestamp", ">=", startOfMonth)
                    .where("found_timestamp", "<=", endOfMonth)
                    .get();

                // Count the number of found items per week
                foundSnapshot.forEach(doc => {
                    const foundDate = doc.data().found_timestamp.toDate();
                    const weekIndex = Math.floor(foundDate.getDate() / 7);
                    if (weekIndex < 4) {
                        foundCounts[weekIndex]++;
                    }
                });

                // Count the number of lost items per week
                lostSnapshot.forEach(doc => {
                    const lostDate = doc.data().found_timestamp.toDate();
                    const weekIndex = Math.floor(lostDate.getDate() / 7);
                    if (weekIndex < 4) {
                        lostCounts[weekIndex]++;
                    }
                });

                // Prepare data for the line chart
                const data = {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [
                        {
                            label: 'Items Found',
                            data: foundCounts,
                            borderColor: '#66b272',
                            fill: false,
                            backgroundColor: 'transparent',
                            // backgroundColor: 'rgba(255, 192, 203, 0.2)', // Add a light background color
                            pointRadius: 5, // Adjust the radius of the points
                            fill: true, // Fill the area under the line
                            tension: 0.3, // Smooth the line
                        },
                        {
                            label: 'Items Lost',
                            data: lostCounts,
                            borderColor: '#f07c6c',
                            fill: false,
                            backgroundColor: 'transparent',
                            // backgroundColor: 'rgba(255, 192, 203, 0.2)', // Add a light background color
                            pointRadius: 5, // Adjust the radius of the points
                            fill: true, // Fill the area under the line
                            tension: 0.3, // Smooth the line
                        },
                    ]
                };
                console.log("Line Chart Data:", data); // Log the data for the line chart

                function getMonthName() {
                    const monthNames = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                    ];
                    const date = new Date();
                    return monthNames[date.getMonth()]; // Returns the current month name
                }

                const ctx = document.getElementById('lineChart')?.getContext('2d');
                if (!ctx) {
                    console.log("Canvas element not found for line chart.");
                    return;
                }

                // Destroy previous instance if it exists
                if (this.lineChartInstance) {
                    this.lineChartInstance.destroy();
                }

                // Create the line chart
                this.lineChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true, // Ensure the chart is responsive
                        maintainAspectRatio: false, // Allow height to be defined by the container
                        scales: {
                            y: {
                                ticks: {
                                    precision: 0 // Removes decimal points
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                enabled: true,
                                mode: 'index',
                                intersect: false
                            },
                            legend: {
                                display: true,
                                position: 'bottom', // Positions the legend box to the right
                                align: 'center' // Aligns the legend to the start (left)
                            },
                            title: {
                                display: true,
                                text: `Monthly Trends: Items Found VS Lost in ${getMonthName()}`,
                                font: {
                                    size: 20, // Set the desired font size (e.g., 20)
                                    weight: 'bold', // Make the text bold
                                    family: 'Arial', // Optional: Set the font family
                                },
                                color: 'black', // Set the font color to black
                                padding: {
                                    top: 10, // Add padding on top if needed
                                    bottom: 10 // Add padding on bottom if needed
                                },
                                align: 'start', // Align the title to the start (left)
                            }
                        }
                    }
                });

            } catch (error) {
                console.log("Error rendering line chart:", error);
            }
        },
    },

    watch: {
        selectedReportType(newValue) {
            console.log("selectedReportType changed to:", newValue);
            this.renderPieChart(); // This will trigger the chart to render again
        }
    },

    async mounted() {
        this.selectedReportType = "Found"; // Initial value
        console.log("Set selectedReportType to 'Found' in mounted.");

        try {
            await this.countUsers(); // General count of users
            await this.countLostItemReports(); // General count of lost item reports
            await this.countRecoveredItems(); // General count of recovered items
            await this.loadTopLostItems(); // Load top lost items for all users

            // Fetch and rank users only if a user ID is present
            const currentUserId = sessionStorage.getItem("uid");
            if (currentUserId) {
                await this.fetchAndRankUsers(currentUserId); // This function is uid specific
            }

            // Render the pie chart and line chart
            await this.renderPieChart(); // General pie chart rendering
            await this.lineChart(); // General line chart rendering
        } catch (error) {
            console.log("Error in mounted lifecycle:", error);
        }
    },


}); dashboardApp.mount("#app");// Mount the Vue app to #app

