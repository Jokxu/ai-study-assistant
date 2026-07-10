from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
