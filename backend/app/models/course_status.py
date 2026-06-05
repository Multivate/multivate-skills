import enum


class CourseStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CourseLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class LessonType(str, enum.Enum):
    VIDEO = "video"
    ARTICLE = "article"
    DOCUMENT = "document"
    QUIZ = "quiz"
    LIVE = "live"


class VideoSource(str, enum.Enum):
    UPLOAD = "upload"
    YOUTUBE = "youtube"
    VIMEO = "vimeo"
    URL = "url"
