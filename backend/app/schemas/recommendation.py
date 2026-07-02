from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500, description="e.g. 'Recommend something spicy'")


class RecommendationResponse(BaseModel):
    query: str
    recommendation: str
