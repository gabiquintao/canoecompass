import os

import jwt
from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import SessionLocal, User

load_dotenv()

SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
if not SUPABASE_SECRET_KEY:
    raise ValueError("SUPABASE_SECRET_KEY environment variable is not set")

security = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(  # type: ignore
            token,
            SUPABASE_SECRET_KEY,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")

        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user = User(id=user_id)
                db.add(user)
                db.commit()

        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
