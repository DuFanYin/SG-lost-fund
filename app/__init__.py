from flask import Flask
from .routes import main

def create_app():
    app = Flask(__name__)

    # Set upload folder
    app.config['UPLOAD_FOLDER'] = 'uploads'

    # Register blueprint
    app.register_blueprint(main)

    return app
