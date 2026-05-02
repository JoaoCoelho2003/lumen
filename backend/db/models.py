from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from backend.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RouteWeights(Base):
    __tablename__ = "route_weights"

    id = Column(Integer, primary_key=True, index=True)
    light_weight = Column(Float, default=1.0, nullable=False)
    crime_weight = Column(Float, default=1.0, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
