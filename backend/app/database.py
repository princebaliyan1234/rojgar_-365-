from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"

engine = create_engine(f"sqlite:///{DB_PATH}", echo=True)

Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)

def get_db():
   database_session = SessionLocal()
   yield database_session
   database_session.close() 

def init_db():
    Base.metadata.create_all(engine)


if __name__ == "__main__":
    init_db()
    print("Database created:", DB_PATH)