from __future__ import annotations

from enum import Enum
from typing import Type

from sqlalchemy import Enum as SAEnum, String, TypeDecorator


def value_string_enum(enum_class: Type[Enum], *, length: int = 32) -> SAEnum:
    """Persist str enum `.value` (e.g. `beginner`), not member name (`BEGINNER`)."""
    return SAEnum(
        enum_class,
        native_enum=False,
        length=length,
        values_callable=lambda members: [member.value for member in members],
    )


class FlexibleStrEnum(TypeDecorator):
    """Read enum names or values from VARCHAR; write lowercase `.value`."""

    impl = String
    cache_ok = True

    def __init__(self, enum_class: Type[Enum], length: int = 32):
        super().__init__()
        self.impl = String(length)
        self.enum_class = enum_class

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        return str(value).strip().lower()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        raw = str(value).strip()
        try:
            return self.enum_class(raw.lower())
        except ValueError:
            try:
                return self.enum_class[raw.upper()]
            except KeyError as exc:
                raise LookupError(f"Unknown {self.enum_class.__name__}: {value!r}") from exc
