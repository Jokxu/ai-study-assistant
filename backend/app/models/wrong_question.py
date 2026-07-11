from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func

from app.database import Base


class WrongQuestion(Base):
    __tablename__ = "wrong_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=True)
    user_answer = Column(Text, nullable=False)
    feedback = Column(Text, nullable=True)
    tags = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
