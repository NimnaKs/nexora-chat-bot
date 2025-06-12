from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
import firebase_admin.auth as admin_auth
from firebase_admin import firestore
from utils.firebase_config import db, auth_client
from utils.pdf_processor import PDFProcessor
from utils.chatbot import ChatBot
from config import Config
import jwt
from functools import wraps
from flask import Flask, request, jsonify
from functools import wraps
from werkzeug.utils import secure_filename
from datetime import datetime
import speech_recognition as sr
from pydub import AudioSegment

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for Next.js frontend
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('vector_stores', exist_ok=True)

pdf_processor = PDFProcessor(app.config['GOOGLE_API_KEY'])
chatbot = ChatBot(app.config['GOOGLE_API_KEY'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def get_user_role(uid):
    print(f"Fetching role for user ID: {uid}")  # Debugging line
    try:
        doc = db.collection('user_roles').document(uid).get()
        print(f"Document exists: {doc.exists}, Data: {doc.to_dict()}")  # Debugging line
        return doc.to_dict().get('role', 'user') if doc.exists else 'user'
    except:
        return 'user'

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify Firebase token
            decoded_token = admin_auth.verify_id_token(token)
            current_user = {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'role': get_user_role(decoded_token['uid'])
            }
            request.current_user = current_user
        except Exception as e:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'current_user') or request.current_user['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# API Routes

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        print(f"Login attempt for email: {email}")  # Debugging line
        print(f"Password provided: {password}")  # Debugging line
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = auth_client.sign_in_with_email_and_password(email, password)
        print(f"User signed in: {user}")  # Debugging line
        user_role = get_user_role(user['localId'])
        print(f"User role: {user_role}")  # Debugging line
        
        return jsonify({
            'success': True,
            'token': user['idToken'],
            'user': {
                'uid': user['localId'],
                'email': email,
                'role': user_role
            }
        })
    except Exception as e:
        err_msg = "Invalid credentials"
        try:
            err = json.loads(e.args[1])['error']['message']
            err_msg = err
        except:
            pass
        return jsonify({'error': err_msg}), 401

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token():
    return jsonify({
        'success': True,
        'user': {
            'uid': request.current_user['uid'],
            'email': request.current_user['email'],
            'role': request.current_user['role']
        }
    })

@app.route('/api/admin/users', methods=['GET'])
@token_required
@admin_required
def get_users():
    try:
        users = []
        for doc in db.collection('user_roles').stream():
            user_data = doc.to_dict()
            user_data['uid'] = doc.id
            users.append(user_data)
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
@token_required
@admin_required
def add_user():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not all([name, email, password]):
            return jsonify({'error': 'Name, email, and password are required'}), 400
        
        # Create user in Firebase Auth
        user_record = admin_auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        
        # Store user role in Firestore
        db.collection('user_roles').document(user_record.uid).set({
            'name': name,
            'email': email,
            'role': role,
            'created_date': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'message': f'User {name} created successfully'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/upload-pdf', methods=['POST'])
@token_required
@admin_required
def upload_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed'}), 400
        
        # Save file
        filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process PDF
        text = pdf_processor.extract_text_from_pdf(filepath)
        if not text.strip():
            return jsonify({'error': 'Could not extract text from PDF'}), 400
        
        chunks = pdf_processor.create_text_chunks(text)
        if not pdf_processor.create_vector_store(chunks, 'main_knowledge_base'):
            return jsonify({'error': 'Failed to create vector store'}), 500
        
        # Store PDF info in database
        db.collection('pdfs').add({
            'filename': filename,
            'original_name': file.filename,
            'upload_date': datetime.now(),
            'uploaded_by': request.current_user['uid']
        })
        
        return jsonify({
            'success': True,
            'message': 'PDF uploaded and processed successfully'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/ask', methods=['POST'])
@token_required
def ask_question():
    try:
        data = request.get_json()
        question = data.get('question')
        
        if not question or not question.strip():
            return jsonify({'error': 'Question is required'}), 400
        
        answer = chatbot.get_answer(question, 'main_knowledge_base')
        
        # Store conversation
        db.collection('conversations').add({
            'user_id': request.current_user['uid'],
            'question': question,
            'answer': answer,
            'timestamp': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'answer': answer
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/voice-to-text', methods=['POST'])
@token_required
def voice_to_text():
    print("Received voice-to-text request")  # Debugging line
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    # 1. save incoming file
    audio_file = request.files['audio']
    orig_fn = secure_filename(audio_file.filename)
    audio_file.save(orig_fn)

    # 2. convert to 16 kHz mono WAV
    converted_fn = f"conv_{datetime.now().timestamp()}.wav"
    AudioSegment.from_file(orig_fn)\
                .set_frame_rate(16000)\
                .set_channels(1)\
                .export(converted_fn, format="wav")
    os.remove(orig_fn)

    # 3. recognize
    recognizer = sr.Recognizer()
    with sr.AudioFile(converted_fn) as src:
        audio_data = recognizer.record(src)

    lang = request.form.get('language', 'en-US')  # default English
    try:
        text = recognizer.recognize_google(audio_data, language=lang)
        success = True
    except sr.UnknownValueError:
        text = ""
        success = True  # no words detected, but not an error
    except Exception as e:
        text = str(e)
        success = False

    # 4. cleanup
    os.remove(converted_fn)

    return jsonify({'success': success, 'text': text})

@app.route('/api/chat/history', methods=['GET'])
@token_required
def get_chat_history():
    try:
        conversations = []
        docs = db.collection('conversations')\
                .where('user_id', '==', request.current_user['uid'])\
                .order_by('timestamp', direction='desc')\
                .limit(50)\
                .stream()
        
        for doc in docs:
            conv = doc.to_dict()
            conv['id'] = doc.id
            conversations.append(conv)
        
        return jsonify({
            'success': True,
            'conversations': conversations
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/pdfs', methods=['GET'])
@token_required
@admin_required
def get_uploaded_pdfs():
    try:
        pdfs = []
        docs = (
            db
            .collection('pdfs')
            .order_by('upload_date', direction=firestore.Query.DESCENDING)
            .get()
        )

        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id

            uploader_id = data.get('uploaded_by')
            if uploader_id:
                user_snap = db.collection('user_roles').document(uploader_id).get()
                if user_snap.exists:
                    user = user_snap.to_dict()
                    data['uploaded_by'] = user.get('name', 'Unknown User')
                else:
                    data['uploaded_by'] = 'Unknown User'
            else:
                data['uploaded_by'] = 'Unknown User'

            pdfs.append(data)

        return jsonify({
            'success': True,
            'pdfs': pdfs
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)