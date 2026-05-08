import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import jwt
from jwt import DecodeError, ExpiredSignatureError

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# User storage file
USERS_FILE = Path(__file__).parent.parent.parent / "users.json"


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    email: str


class UserResponse(BaseModel):
    email: str


def init_users_file():
    """Initialize users.json if it doesn't exist"""
    if not USERS_FILE.exists():
        USERS_FILE.write_text(json.dumps({"users": []}, indent=2))


def load_users() -> dict:
    """Load users from JSON file"""
    init_users_file()
    with open(USERS_FILE, "r") as f:
        return json.load(f)


def save_users(data: dict):
    """Save users to JSON file"""
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(email: str, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token"""
    to_encode = {"email": email}
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> str | None:
    """Verify JWT token and return email"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        if email is None:
            return None
        return email
    except ExpiredSignatureError:
        return None
    except DecodeError:
        return None


def register_user(email: str, password: str) -> tuple[bool, str]:
    """Register a new user"""
    users_data = load_users()
    
    # Check if user already exists
    if any(user["email"] == email for user in users_data["users"]):
        return False, "User already exists"
    
    # Add new user
    users_data["users"].append({
        "email": email,
        "hashed_password": hash_password(password),
        "created_at": datetime.now().isoformat()
    })
    
    save_users(users_data)
    return True, "User registered successfully"


def authenticate_user(email: str, password: str) -> tuple[bool, str]:
    """Authenticate user with email and password"""
    users_data = load_users()
    
    for user in users_data["users"]:
        if user["email"] == email:
            if verify_password(password, user["hashed_password"]):
                return True, "Authentication successful"
            return False, "Invalid password"
    
    return False, "User not found"


def create_demo_user():
    """Create a demo user for testing"""
    users_data = load_users()
    
    # Check if demo user exists
    if any(user["email"] == "test@plannavigator.app" for user in users_data["users"]):
        return
    
    # Create demo user
    users_data["users"].append({
        "email": "test@plannavigator.app",
        "hashed_password": hash_password("Test1234!"),
        "created_at": datetime.now().isoformat()
    })
    
    save_users(users_data)


# Initialize on import
init_users_file()
create_demo_user()
