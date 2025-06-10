from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
import firebase_admin.auth as admin_auth
from utils.firebase_config import db, auth_client
from utils.pdf_processor import PDFProcessor
from utils.chatbot import ChatBot
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('vector_stores', exist_ok=True)

pdf_processor = PDFProcessor(app.config['GOOGLE_API_KEY'])
chatbot = ChatBot(app.config['GOOGLE_API_KEY'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def get_user_role(uid):
    try:
        doc = db.collection('user_roles').document(uid).get()
        return doc.to_dict().get('role', 'user') if doc.exists else 'user'
    except:
        return 'user'

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        try:
            user = auth_client.sign_in_with_email_and_password(email, password)
            session['user_token'] = user['idToken']
            session['user_id'] = user['localId']
            session['user_role'] = get_user_role(user['localId'])
            return redirect(url_for('admin_dashboard' if session['user_role']=='admin' else 'chat'))
        except Exception as e:
            err = json.loads(e.args[1])['error']['message']
            flash(f"Login failed: {err}", 'error')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/admin')
def admin_dashboard():
    if session.get('user_role')!='admin':
        return redirect(url_for('login'))
    users = []
    for doc in db.collection('user_roles').stream():
        u = doc.to_dict()
        u['uid'] = doc.id
        users.append(u)
    return render_template('admin_dashboard.html', users=users)

@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    if session.get('user_role')!='admin':
        return jsonify({'error':'Unauthorized'}), 403
    file = request.files.get('file')
    if not file or not allowed_file(file.filename):
        return jsonify({'error':'Invalid file'}), 400
    name = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    path = os.path.join(app.config['UPLOAD_FOLDER'], name)
    file.save(path)
    text = pdf_processor.extract_text_from_pdf(path)
    chunks = pdf_processor.create_text_chunks(text)
    if not pdf_processor.create_vector_store(chunks, 'main_knowledge_base'):
        return jsonify({'error':'Vectorization failed'}), 500
    db.collection('pdfs').add({
        'filename': name,
        'original_name': file.filename,
        'upload_date': datetime.now(),
        'uploaded_by': session['user_id']
    })
    return jsonify({'success':True, 'message':'PDF processed'})

@app.route('/chat')
def chat():
    if 'user_token' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    if 'user_token' not in session:
        return jsonify({'error':'Unauthorized'}), 403
    question = request.form.get('question')
    if not question:
        return jsonify({'error':'No question provided'}), 400
    answer = chatbot.get_answer(question, 'main_knowledge_base')
    db.collection('conversations').add({
        'user_id': session['user_id'],
        'question': question,
        'answer': answer,
        'timestamp': datetime.now()
    })
    return jsonify({'answer': answer})

@app.route('/voice_to_text', methods=['POST'])
def voice_to_text():
    if 'user_token' not in session:
        return jsonify({'error':'Unauthorized'}), 403
    audio = request.files.get('audio')
    if not audio:
        return jsonify({'error':'No audio file'}), 400
    temp = f"tmp_{datetime.now().timestamp()}.wav"
    audio.save(temp)
    text = chatbot.speech_to_text(temp)
    os.remove(temp)
    return jsonify({'text': text})

if __name__ == '__main__':
    app.run(debug=True)
