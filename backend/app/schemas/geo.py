from pydantic import BaseModel, Field


class VisitorGeoOut(BaseModel):
    country_code: str = Field(description="ISO 3166-1 alpha-2, or XX if unknown.")
    in_nigeria: bool
    display_currency: str
    ngn_per_usd: float
    on_premise_allowed: bool
    warning: str | None = None
