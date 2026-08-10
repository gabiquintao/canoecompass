import os

from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from supabase import create_client

from database import SessionLocal, User

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
security = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_response.user.id

        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                try:
                    user = User(id=user_id)
                    db.add(user)
                    db.commit()
                except IntegrityError:
                    db.rollback()

        return user_id
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
