# =============================================================================
# csv_loader.py — Data ingestion layer
# =============================================================================
# Reads raw CSV files and converts each row into a Property dataclass.
# This module is the single entry-point for data into the system; any future
# data sources (API, database) should follow the same pattern of returning
# a list[Property].
# =============================================================================

import csv
import os
from typing import List

from backend.models.data_models import Property


def _safe_float(value: str, default: float = 0.0) -> float:
    """Convert a string to float, returning *default* on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _safe_int(value: str, default: int = 0) -> int:
    """Convert a string to int, returning *default* on failure."""
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def _safe_bool(value: str) -> bool:
    """Interpret common truthy strings as booleans."""
    return str(value).strip().lower() in ("1", "true", "yes", "oui")


def load_properties_from_csv(filepath: str) -> List[Property]:
    """Load a CSV file and return a list of Property objects.

    Expected CSV columns (header row required):
        id, district, property_type, surface_m2, rooms, price,
        has_garden, has_parking, floor, year_built, distance_to_center_km

    Args:
        filepath: Absolute or relative path to the CSV file.

    Returns:
        A list of Property instances, one per valid row.

    Raises:
        FileNotFoundError: If the CSV file does not exist.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Dataset not found: {filepath}")

    properties: List[Property] = []

    with open(filepath, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            prop = Property(
                id=_safe_int(row.get("id", "0")),
                district=row.get("district", "Unknown").strip(),
                property_type=row.get("property_type", "apartment").strip(),
                surface_m2=_safe_float(row.get("surface_m2", "0")),
                rooms=_safe_int(row.get("rooms", "1")),
                price=_safe_float(row.get("price", "0")),
                has_garden=_safe_bool(row.get("has_garden", "0")),
                has_parking=_safe_bool(row.get("has_parking", "0")),
                floor=_safe_int(row.get("floor", "0")),
                year_built=_safe_int(row.get("year_built", "2000")),
                distance_to_center_km=_safe_float(
                    row.get("distance_to_center_km", "0")
                ),
            )
            properties.append(prop)

    return properties
