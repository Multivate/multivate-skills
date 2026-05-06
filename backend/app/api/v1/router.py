from fastapi import APIRouter

from app.api.v1 import admin, auth, courses, enrollments, instructor, learning, lessons, payments, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(admin.router)
api_router.include_router(auth.router)
api_router.include_router(lessons.router)
api_router.include_router(courses.router)
api_router.include_router(enrollments.router)
api_router.include_router(payments.router)
api_router.include_router(learning.router)
api_router.include_router(instructor.router)
api_router.include_router(users.router)
