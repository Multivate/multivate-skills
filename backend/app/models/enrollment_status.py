import enum


class EnrollmentStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    ENROLLED = "enrolled"
    CANCELLED = "cancelled"
