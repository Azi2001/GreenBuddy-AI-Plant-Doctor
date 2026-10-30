from database import Base, engine
import models  # noqa: F401  (importing it registers the tables)

Base.metadata.create_all(bind=engine)
print("Tables created")