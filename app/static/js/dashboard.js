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
        
                // Log the counts for each item
                console.log("Item Counts:", itemCounts);
        
                const topItems = Object.entries(itemCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
        
                // Log the top items and their counts
                console.log("Top Items:", topItems);
        
                const itemNames = topItems.map(item => item[0]);
                const itemCountsData = topItems.map(item => item[1]);
        
                // Log the processed item names and counts
                console.log("Item Names:", itemNames);
                console.log("Item Counts Data:", itemCountsData);
        
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
                                    backgroundColor: "#B95CF4",
                                    borderColor: "#7D0DC3",
                                    borderWidth: 1,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false, // This allows the chart to fill its container
                            plugins: {
                                title: {
                                    display: true,
                                    text: "Top 5 Most Lost Items",
                                    font: {
                                        size: 20, // Set the desired font size (e.g., 20)
                                        weight: 'bold', // Make the text bold
                                        color: '#000000' // Set the font color to black
                                    }
                                },
                                tooltip: {
                                    enabled: true,
                                    callbacks: {
                                        label: function (context) {
                                            const rank = context.dataIndex + 1; // Get the rank (1-based index)
                                            const labelPrefix = rank === 1 ? "Top most lost item" :
                                                                rank === 2 ? "Top 2nd most lost item" :
                                                                rank === 3 ? "Top 3rd most lost item" :
                                                                `Top ${rank}th most lost item`;
                                            const value = context.raw;
                                            const reportLabel = value === 1 ? "report" : "reports";
                                            return `${labelPrefix}: ${value} ${reportLabel}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        precision: 0 // Remove decimal points by using whole numbers
                                    }
                                },
                            },
                        },
                    });
                }

            } catch (error) {
                console.error("Error loading top lost items:", error);
            }
        },
  
       
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
                        points: userData.points,
                        userId: userId // Store the user ID for later use
                    });
                });
        
                // Wait for all promises to resolve
                await Promise.all(itemCountPromises);
        
                // Sort users by points
                users.sort((a, b) => b.points - a.points);
        
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
        
                    // Add a special class for the current user
                    if (user.userId === currentUserId) {
                        row.classList.add("current-user");
                        row.classList.add("congratulations"); // Always trigger animation on load
                    }
        
                    row.innerHTML = `
                        <td>${index + 1}</td>
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
                console.error("Error fetching data for pie chart:", error);
                return null;
            }
        },
        
        async renderPieChart() {
            const ctx = document.getElementById('pieChart')?.getContext('2d');
            if (!ctx) {
                console.error("Canvas element not found or getContext failed.");
                return;
            }
        
            console.log(`Rendering pie chart for report type: ${this.selectedReportType}`);
        
            try {
                const data = await this.fetchDataForPieChart(this.selectedReportType);
                if (!data) {
                    console.error("No data returned for the pie chart.");
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
                            backgroundColor: ['#6495ED', '#D397F8'],
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            title: {
                                display: true,
                                text: `Success Rate for ${this.selectedReportType} Items`,
                                font: {
                                    size: 20, // Set the desired font size (e.g., 20)
                                    weight: 'bold', // Make the text bold
                                    family: 'Arial', // Optional: Set the font family
                                    color: 'black' // Set the font color to black
                                },
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        label += context.raw.toFixed(2) + '%';
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
        
                console.log("Pie chart rendered successfully with data:", data);
            } catch (error) {
                console.error("Error rendering pie chart:", error);
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
                            borderColor: '#FFC0CB',
                            fill: false,
                        },
                        {
                            label: 'Items Lost',
                            data: lostCounts,
                            borderColor: '#4D81DA',
                            fill: false,
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
                    console.error("Canvas element not found for line chart.");
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
                                position: 'top'
                            },
                            title: {
                                display: true,
                                text: `Monthly Trends: Items Found VS Lost in ${getMonthName()}`,
                                font: {
                                    size: 20, // Set the desired font size (e.g., 20)
                                    weight: 'bold', // Make the text bold
                                    family: 'Arial', // Optional: Set the font family
                                    color: 'black' // Set the font color to black
                                },
                            }
                        }
                    }
                });
                
            } catch (error) {
                console.error("Error rendering line chart:", error);
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
            console.error("Error in mounted lifecycle:", error);
        }
    },
    

}); dashboardApp.mount("#app");// Mount the Vue app to #app

