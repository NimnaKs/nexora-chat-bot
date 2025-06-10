import firebase_admin
from firebase_admin import credentials, firestore, auth
import pyrebase

# Firebase Admin SDK
cred = credentials.Certificate('firebase_key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Pyrebase config for client-side operations
firebase_config = {
    "apiKey": "AIzaSyC57bfstiUnAqcGHptJi0UGIipMVLygv0M",
    "authDomain": "nexora-chat-bot.firebaseapp.com",
    "databaseURL": "https://nexora-chat-bot-default-rtdb.firebaseio.com", 
    "projectId": "nexora-chat-bot",
    "storageBucket": "nexora-chat-bot.firebasestorage.app",
    "messagingSenderId": "699022829158",
    "appId": "1:699022829158:web:621ba86de6db2d09cb2fa7",
    "measurementId": "G-1DNEL0JGWH",
}

firebase_client = pyrebase.initialize_app(firebase_config)
auth_client = firebase_client.auth()