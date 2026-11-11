from fastapi import APIRouter, Request

from app.schemas.geo import VisitorGeoOut
from app.services.geo_ip_service import resolve_visitor

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/visitor", response_model=VisitorGeoOut)
def visitor_geo(request: Request) -> VisitorGeoOut:
    return resolve_visitor(request).to_out()
