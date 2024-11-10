// Load footer content into the page
function loadFooter() {
    fetch('/footer')  // Correct path to the Flask route
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
}

document.addEventListener("DOMContentLoaded", function() {
    loadFooter();
});
