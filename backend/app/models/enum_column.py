from __future__ import annotations

from enum import Enum
from typing import Type

from sqlalchemy import Enum as SAEnum


def value_string_enum(enum_class: Type[Enum], *, length: int = 32) -> SAEnum:
    """Persist str enum `.value` (e.g. `beginner`), not member name (`BEGINNER`)."""
    return SAEnum(
        enum_class,
        native_enum=False,
        length=length,
        values_callable=lambda members: [member.value for member in members],
    )
