import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, jsonify, request, render_template, Blueprint
from werkzeug.utils import secure_filename


main = Blueprint('main', __name__)

cred = credentials.Certificate('static/js/firebase.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@main.route('/')
def index():
    return render_template('home.html')


@main.route('/user_profile')
def user_profile():
    return render_template('user_profile.html')


@main.route('/dash_board')
def dash_board():
    return render_template('dash_board.html')


@main.route('/listing', methods=['POST', 'GET'])
def listing():
    if request.method == 'GET':
        return render_template('listing.html')
    
    # Handle form data for POST request
    item_name = request.form.get('item_name')
    location = request.form.get('location')
    item_description = request.form.get('item_description')
    item_type = request.form.get('item_type')
    handoff_method = request.form.get('handoff_method')
    handoff_location = request.form.get('handoff_location')

    # Handle file upload
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Save file
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        
    # Secure the filename and save the file
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Prepare data to store in Firestore
    doc_data = {
        'item_name': item_name,
        'location': location,
        'item_description': item_description,
        'item_type': item_type,
        'handoff_method': handoff_method,
        'handoff_location': handoff_location,
        'file': filename  # Store the saved filename
    }

    # Add document to Firestore (e.g., in a collection called "listings")
    db.collection('listings').add(doc_data)

    # Prepare the response data
    response_data = doc_data

    return jsonify(response_data), 200


@main.route('/footer')
def footer():
    return render_template('footer.html')


@main.route('/login')
def login():
    return render_template('login.html')
