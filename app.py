import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from flask import Flask, jsonify, request, render_template, Blueprint, redirect, url_for, session
from werkzeug.utils import secure_filename
from datetime import datetime

main = Blueprint('main', __name__)

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate('app/static/js/firebase.json')  # Replace with your Firebase Admin SDK key file path
    firebase_admin.initialize_app(cred)

db = firestore.client()

UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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

@main.route('/listing')
def listing():
    return render_template('listing.html')

@main.route('/footer')
def footer():
    return render_template('footer.html')

@main.route('/navbar')
def navbar():
    return render_template('navbar.html')

@main.route('/login', methods=['GET', 'POST'])
def login():
    message = ""  
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        try:
            user = auth.get_user_by_email(email)
            session['user_uid'] = user.uid
            user_doc = db.collection('users').document(user.uid).get()
            if user_doc.exists:
                session['username'] = user_doc.to_dict().get('username')
                session['points'] = user_doc.to_dict().get('points')

            message = 'Login successful! Redirecting to dashboard...'
            return redirect(url_for('main.dash_board'))

        except Exception as e:
            message = str(e)

    return render_template('login.html', message=message)

@main.route('/signup', methods=['GET', 'POST'])
def signup():
    message = ""
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        try:
            user = auth.create_user(email=email, password=password)
            db.collection('users').document(user.uid).set({
                'username': username,
                'email': email,
            })

            message = 'Sign up successful! Please log in.'
            return render_template('login.html', message=message)

        except Exception as e:
            message = str(e)

    return render_template('signup.html', message=message)

@main.route('/pointshop')
def pointshop():
    return render_template('pointshop.html')

def create_app():
    app = Flask(__name__)
    app.register_blueprint(main)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.secret_key = os.urandom(24)
    return app

app = create_app()  # Vercel will use this `app` variable to run the Flask application