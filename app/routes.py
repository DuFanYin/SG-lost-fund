from flask import Blueprint, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from firebase_admin import credentials, auth, firestore
import firebase_admin

main = Blueprint('main', __name__)

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate('app/static/js/firebase.json')  # Replace with your Firebase Admin SDK key file path
    firebase_admin.initialize_app(cred)

# Initialize Firestore
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
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    # Prepare the response data
    response_data = {
        'item_name': item_name,
        'location': location,
        'item_description': item_description,
        'item_type': item_type,
        'handoff_method': handoff_method,
        'handoff_location': handoff_location,
        'file': filename  # Return the saved filename
    }

    return jsonify(response_data), 200


@main.route('/footer')
def footer():
    return render_template('footer.html')


@main.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        # Render the signup form without any authorization checks
        return render_template('signup.html')
    
    if request.method == 'POST':
        # Proceed with sign-up logic, expecting an Authorization token in the header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization token missing"}), 401

        id_token = auth_header.split("Bearer ")[1]

        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']

            # Get user data from the request
            data = request.json
            username = data.get('username')
            email = data.get('email')

            if not username or not email:
                return jsonify({"error": "Username and Email are required"}), 400

            # Store the user profile in Firestore using UID as the document ID
            user_data = {
                'username': username,
                'email': email,
                'uid': uid
            }
            db.collection('users').document(uid).set(user_data)

            return jsonify({"status": "User registered successfully"}), 200

        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401


@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    elif request.method == 'POST':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization token missing"}), 401

        id_token = auth_header.split("Bearer ")[1]
        print("Received ID Token:", id_token)  # Log token for debugging

        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']

            # Retrieve user data from Firestore
            user_doc = db.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                return jsonify({"status": "Login successful", "user_data": user_data}), 200
            else:
                return jsonify({"error": "User data not found in database"}), 404

        except auth.InvalidIdTokenError:
            return jsonify({"error": "Invalid ID token"}), 401
        except auth.ExpiredIdTokenError:
            return jsonify({"error": "Expired ID token"}), 401
        except auth.RevokedIdTokenError:
            return jsonify({"error": "Revoked ID token"}), 401
        except Exception as e:
            print("Token verification error:", e)
            return jsonify({"error": f"Authentication error: {str(e)}"}), 401

@main.route('/navbar')
def navbar():
    return render_template('navbar.html')