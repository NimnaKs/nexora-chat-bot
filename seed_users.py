import firebase_admin
from firebase_admin import credentials, auth, firestore
from requests.exceptions import HTTPError

# Initialize Firebase Admin
cred = credentials.Certificate('firebase_key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

def create_user_if_not_exists(email, password, role):
    try:
        user = auth.get_user_by_email(email)
        print(f"User already exists: {email} (UID: {user.uid})")
    except firebase_admin.auth.UserNotFoundError:
        user = auth.create_user(email=email, password=password)
        print(f"Created user: {email} (UID: {user.uid})")

    # Set role in Firestore
    db.collection("user_roles").document(user.uid).set({"role": role})
    print(f"Set role '{role}' for user {email}\n")

# Seed admin and user
create_user_if_not_exists("nimnakse@gmail.com", "Ns20260804", "admin")
create_user_if_not_exists("nimnakse02@gmail.com", "Ns2026080402", "user")
