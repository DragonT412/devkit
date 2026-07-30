from pydantic import BaseModel, Field
from typing import Optional


class ProxyRequest(BaseModel):
    method: str = Field(..., description="HTTP method")
    url: str = Field(..., description="Target URL to proxy")
    headers: dict[str, str] = Field(default_factory=dict)
    body: str = Field(default="")


class ProxyResponse(BaseModel):
    status_code: int
    headers: dict[str, str]
    body: str
    duration_ms: float


class CollectionCreate(BaseModel):
    name: str


class CollectionUpdate(BaseModel):
    name: str


class CollectionRequestCreate(BaseModel):
    name: str
    method: str = "GET"
    url: str = ""
    headers: dict[str, str] = Field(default_factory=dict)
    body: str = ""


class CollectionRequestUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    body: Optional[str] = None
