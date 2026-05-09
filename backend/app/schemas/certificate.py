from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CertificateOut(BaseModel):
    id: UUID
    course_slug: str
    course_title: str
    code: str
    issued_at: datetime
