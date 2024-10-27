# WAD2 Project SG Lost & Found


this is how you link the style sheet

<link rel="stylesheet" type="text/css" href="{{ url_for('static', filename='css/styles.css') }}">

this is how you link the js files

<script src="{{ url_for('static', filename='js/app2.js') }}"></script>


form data is saved into firebase under a collection called "listings"