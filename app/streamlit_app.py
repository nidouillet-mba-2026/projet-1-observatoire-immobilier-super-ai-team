# =============================================================================
# streamlit_app.py — ToulonFindAI Frontend
# =============================================================================
# Multi-section Streamlit application demonstrating the end-to-end flow:
#   1. Market Overview     — KPIs and per-district breakdown
#   2. Price Prediction    — estimate a property's value via OLS regression
#   3. Opportunity Detector— find undervalued listings
#   4. Buyer Recommendations— match properties to a buyer profile
#
# Launch:  streamlit run app/streamlit_app.py   (from project root)
# =============================================================================

import sys
import os

# ---------------------------------------------------------------------------
# Ensure the project root is on sys.path so `backend.*` imports resolve
# regardless of the working directory Streamlit is launched from.
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import streamlit as st
from backend.services.property_service import PropertyService

# ---------------------------------------------------------------------------
# Initialise the service (cached across Streamlit re-runs)
# ---------------------------------------------------------------------------


@st.cache_resource
def get_service() -> PropertyService:
    """Return a singleton PropertyService for the session."""
    return PropertyService()


service = get_service()

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="ToulonFindAI — Real Estate Observatory",
    page_icon="🏠",
    layout="wide",
)

st.title("🏠 ToulonFindAI — Real Estate Market Observatory")
st.caption("Analyse the Toulon housing market, predict prices, and discover opportunities.")

# ---------------------------------------------------------------------------
# Sidebar navigation
# ---------------------------------------------------------------------------
section = st.sidebar.radio(
    "Navigate",
    [
        "📊 Market Overview",
        "💰 Price Prediction",
        "🔍 Opportunity Detector",
        "🎯 Buyer Recommendations",
    ],
)

# ========================== MARKET OVERVIEW ================================
if section == "📊 Market Overview":
    st.header("📊 Market Overview")

    # Fetch data
    properties = service.load_properties()
    stats = service.get_market_statistics()

    # --- KPI row ---
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Properties", stats.total_properties)
    col2.metric("Avg Price", f"€{stats.avg_price:,.0f}")
    col3.metric("Median Price", f"€{stats.median_price:,.0f}")
    col4.metric("Avg €/m²", f"€{stats.avg_price_per_m2:,.0f}")

    st.divider()

    # --- Per-district table ---
    st.subheader("Per-District Breakdown")
    district_rows = []
    for name, ds in sorted(stats.by_district.items()):
        district_rows.append({
            "District": name,
            "Count": ds.count,
            "Avg Price (€)": f"{ds.avg_price:,.0f}",
            "Median Price (€)": f"{ds.median_price:,.0f}",
            "Avg €/m²": f"{ds.avg_price_per_m2:,.0f}",
        })
    st.table(district_rows)

    # --- Price distribution (simple bar chart) ---
    st.subheader("Price Distribution by District")
    chart_data = {ds.district: ds.avg_price for ds in stats.by_district.values()}
    st.bar_chart(chart_data, use_container_width=True)

# ========================== PRICE PREDICTION ===============================
elif section == "💰 Price Prediction":
    st.header("💰 Property Price Prediction")
    st.write("Enter property features below to estimate its market value using OLS regression.")

    with st.form("prediction_form"):
        col1, col2 = st.columns(2)
        surface = col1.number_input("Surface (m²)", min_value=10, max_value=500, value=75)
        rooms = col2.number_input("Rooms", min_value=1, max_value=15, value=3)
        floor = col1.number_input("Floor", min_value=0, max_value=30, value=2)
        year_built = col2.number_input("Year Built", min_value=1800, max_value=2030, value=2000)
        distance = col1.number_input(
            "Distance to Centre (km)", min_value=0.0, max_value=20.0, value=2.0, step=0.1
        )
        submitted = st.form_submit_button("Predict Price")

    if submitted:
        result = service.predict_property_value({
            "surface_m2": surface,
            "rooms": rooms,
            "floor": floor,
            "year_built": year_built,
            "distance_to_center_km": distance,
        })
        st.success(f"**Estimated Price: €{result['predicted_price']:,.0f}**")
        st.info(f"Model R²: {result['r_squared']:.4f}")

        with st.expander("Regression Details"):
            st.json(result["coefficients"])

# ========================== OPPORTUNITY DETECTOR ===========================
elif section == "🔍 Opportunity Detector":
    st.header("🔍 Opportunity Detector")
    st.write("Properties whose composite score suggests they are **undervalued** relative to the market.")

    threshold = st.slider("Opportunity Threshold", 40, 90, 60)
    opportunities = service.detect_opportunities(threshold=threshold)

    if opportunities:
        st.write(f"**{len(opportunities)}** opportunities found:")
        rows = []
        for opp in opportunities:
            rows.append({
                "ID": opp["property_id"],
                "District": opp["district"],
                "Price (€)": f"{opp['price']:,.0f}",
                "Score (price/m²)": opp["score_price_m2"],
                "Score (price)": opp["score_price"],
                "Surface Score": opp["score_surface"],
                "Amenity Score": opp["score_amenity"],
                "Composite": opp["composite_score"],
            })
        st.table(rows)
    else:
        st.info("No opportunities found at this threshold — try lowering it.")

# ========================== BUYER RECOMMENDATIONS ==========================
elif section == "🎯 Buyer Recommendations":
    st.header("🎯 Buyer Recommendations")
    st.write("Create a buyer profile to receive personalised property suggestions.")

    properties = service.load_properties()
    all_districts = sorted({p.district for p in properties})

    with st.form("buyer_form"):
        col1, col2 = st.columns(2)
        budget = col1.number_input("Max Budget (€)", min_value=50000, max_value=2000000, value=350000, step=10000)
        min_surface = col2.number_input("Min Surface (m²)", min_value=0, max_value=500, value=50)
        min_rooms = col1.number_input("Min Rooms", min_value=1, max_value=15, value=2)
        max_distance = col2.number_input(
            "Max Distance to Centre (km)", min_value=0.0, max_value=20.0, value=5.0, step=0.5
        )
        preferred = st.multiselect("Preferred Districts", all_districts, default=[])
        needs_parking = col1.checkbox("Needs Parking")
        needs_garden = col2.checkbox("Needs Garden")
        submitted = st.form_submit_button("Find Recommendations")

    if submitted:
        profile = service.create_buyer_profile(
            budget_max=budget,
            min_surface=min_surface,
            min_rooms=min_rooms,
            preferred_districts=preferred,
            needs_parking=needs_parking,
            needs_garden=needs_garden,
            max_distance_to_center=max_distance,
        )
        results = service.recommend_properties_for_buyer(profile, max_results=10)

        if results:
            st.write(f"**{len(results)}** matching properties:")
            for i, rec in enumerate(results, 1):
                prop = rec["property"]
                st.markdown(
                    f"**{i}. {prop.district} — {prop.property_type.title()}** "
                    f"| {prop.surface_m2} m² | {prop.rooms} rooms "
                    f"| **€{prop.price:,.0f}** (€{prop.price_per_m2:,.0f}/m²)"
                )
                cols = st.columns(3)
                cols[0].metric("Relevance", f"{rec['relevance_score']:.1f}")
                cols[1].metric("Market Score", f"{rec['market_score']:.1f}")
                cols[2].metric("Combined", f"{rec['combined_score']:.1f}")
                st.divider()
        else:
            st.warning("No properties match your criteria. Try relaxing some filters.")
