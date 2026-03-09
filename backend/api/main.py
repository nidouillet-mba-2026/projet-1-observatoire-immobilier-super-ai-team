# =============================================================================
# backend/api/main.py — FastAPI Application
# =============================================================================
# Exposes the PropertyService functionality as a RESTful API for the React
# frontend. This allows the Vite application (immo-app) to fetch real
# properties, market stats, and scores from the Python backend.
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from pydantic import BaseModel

from backend.services.property_service import PropertyService
from backend.models.data_models import Property

app = FastAPI(title="ToulonFindAI API")

# Allow CORS for the Vite frontend (which usually runs on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton service instance
service = PropertyService()

# --- Pydantic models for incoming requests ---

class BuyerProfileIn(BaseModel):
    pieces: int = 1
    quartiers: List[str] = []
    prixMax: float = 0.0
    mensualiteMax: float = 0.0
    typeBien: str = "Appartement"
    achatLocation: str = "Achat"
    environnement: List[str] = []


class PropertyFeaturesIn(BaseModel):
    surface_m2: float
    rooms: int
    floor: int
    year_built: int
    distance_to_center_km: float


# --- Endpoints ---

@app.get("/api/properties")
def get_properties() -> List[Dict]:
    """Retrieve all properties from the dataset."""
    props = service.load_properties()
    # Convert dataclasses to dicts manually (or use asdict) for JSON response
    # We rename some fields slightly to match the frontend expectations where possible.
    results = []
    for p in props:
        # Match the frontend format (which expects pieces, etage, prixM2, etc.)
        results.append({
            "id": p.id,
            "prix": p.price,
            "prixM2": p.price_per_m2,
            "surface": p.surface_m2,
            "type": p.property_type.capitalize(), # "Appartement", "Maison"
            "quartier": p.district,
            "pieces": p.rooms,
            "etage": f"{p.floor}ème" if p.floor > 0 else "RDC",
            "img": f"https://images.unsplash.com/photo-1560448204-e02f11c{min(p.id, 9)}d0e2?w=400&q=80", # mock image
            "niveau": 1,
            "achatLocation": "Achat",
            "description": f"Bien situé dans le quartier {p.district}.",
            "dateAnnonce": "01/01/2025",
            "has_garden": p.has_garden,
            "has_parking": p.has_parking,
        })
    return results


@app.get("/api/stats")
def get_stats() -> Dict:
    """Retrieve market statistics."""
    stats = service.get_market_statistics()
    return {
        "total_properties": stats.total_properties,
        "avg_price": stats.avg_price,
        "median_price": stats.median_price,
        "avg_price_per_m2": stats.avg_price_per_m2,
        "by_district": {k: {"avg_price": v.avg_price, "count": v.count} for k, v in stats.by_district.items()}
    }


@app.post("/api/score")
def score_properties(profile: BuyerProfileIn) -> List[Dict]:
    """Returns all properties with their relevancy score against the profile."""
    # Map React frontend profile format to backend BuyerProfile
    backend_profile = service.create_buyer_profile(
        budget_max=profile.prixMax,
        min_surface=0.0, # Frontend profile doesn't strictly have min_surface right now
        min_rooms=profile.pieces,
        preferred_districts=profile.quartiers,
        needs_parking=False,
        needs_garden=False,
        max_distance_to_center=float("inf")
    )
    
    # Recommend/score all
    results = service.recommend_properties_for_buyer(backend_profile, max_results=100)
    
    # We format it to contain both the property info from get_properties() and the new score
    formatted_results = []
    for r in results:
        p = r["property"]
        formatted_results.append({
            "id": p.id,
            "prix": p.price,
            "prixM2": p.price_per_m2,
            "surface": p.surface_m2,
            "type": p.property_type.capitalize(),
            "quartier": p.district,
            "pieces": p.rooms,
            "etage": f"{p.floor}ème" if p.floor > 0 else "RDC",
            "img": f"https://images.unsplash.com/photo-1560448204-e02f11c{min(p.id, 9)}d0e2?w=400&q=80",
            "achatLocation": "Achat",
            "score": r["combined_score"],   # we use the combined backend score
            "backend_relevance": r["relevance_score"],
            "backend_market_score": r["market_score"],
        })
    return formatted_results


@app.post("/api/predict")
def predict_price(features: PropertyFeaturesIn) -> Dict:
    """Predicts a property price given features."""
    return service.predict_property_value(features.dict())
