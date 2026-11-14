from fastapi import APIRouter, status

from app.api import schemas
from app.api.deps import Db, PathUser
from app.db import repository as repo

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[schemas.User])
def list_users(db: Db):
    return repo.list_users(db)


@router.post("", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(body: schemas.UserCreate, db: Db):
    user_id = repo.create_user(db, body.display_name, body.timezone)
    db.commit()
    return repo.get_user(db, user_id)


@router.get("/{user_id}", response_model=schemas.User)
def get_user(user: PathUser):
    return user
