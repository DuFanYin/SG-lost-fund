from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # Import routes
    from .routes import main  # Make sure this matches your routes file

    app.register_blueprint(main)  # Register the blueprint

    return app
