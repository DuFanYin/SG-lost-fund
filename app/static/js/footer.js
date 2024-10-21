// Load footer content into the page
function loadFooter() {
    fetch('/footer')  
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
}

window.onload = loadFooter;
