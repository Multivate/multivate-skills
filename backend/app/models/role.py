import enum


class UserRole(str, enum.Enum):
    """Application roles. Registration is limited to student and instructor."""

    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
