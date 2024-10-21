from flask import Blueprint, render_template

main = Blueprint('main', __name__)

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
