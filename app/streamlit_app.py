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
def get_service(cache_version: int = 1) -> PropertyService:
    """Return a singleton PropertyService for the session.
    The cache_version parameter is used to bust the cache when data models change.
    """
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
        "🏠 Property Search & Listings",
        "💰 Price Prediction",
        "🔍 Opportunity Detector",
        "🎯 Buyer Recommendations",
    ],
)

# ========================== PROPERTY SEARCH ================================
if section == "🏠 Property Search & Listings":
    st.header("🏠 Property Search & Listings")
    
    st.sidebar.markdown("---")
    st.sidebar.subheader("Filters")
    props = service.load_properties()
    
    # Filter controls
    max_budget = st.sidebar.slider("Max Budget (€)", 50000, 2000000, 500000, 10000)
    min_surface = st.sidebar.slider("Min Surface (m²)", 10, 300, 20, 5)
    prop_type = st.sidebar.selectbox("Property Type", ["All", "Appartement", "Maison"])
    
    # Apply filters
    filtered = [p for p in props if p.price <= max_budget and p.surface_m2 >= min_surface]
    if prop_type != "All":
        filtered = [p for p in filtered if p.property_type.lower() == prop_type.lower()]
        
    st.write(f"**{len(filtered)}** properties match your criteria.")
    
    # Prepare Map Data
    import pandas as pd
    import random
    
    DISTRICT_COORDS = {
        "Mourillon": [43.107, 5.940],
        "Centre-Ville": [43.125, 5.930],
        "Saint-Jean du Var": [43.128, 5.950],
        "La Rode": [43.118, 5.942],
        "Pont du Las": [43.131, 5.910],
        "Le Pradet": [43.106, 6.020],
        "La Seyne": [43.101, 5.882],
        "Siblas": [43.132, 5.936],
    }
    
    map_data = []
    for p in filtered:
        base_coords = DISTRICT_COORDS.get(p.district, [43.125, 5.930])
        map_data.append({
            "lat": base_coords[0] + random.uniform(-0.005, 0.005),
            "lon": base_coords[1] + random.uniform(-0.005, 0.005),
            "price": p.price
        })
    
    if map_data:
        st.map(pd.DataFrame(map_data))
        
    # Gallery Feed
    st.subheader("Property Feed")
    for i in range(0, len(filtered), 3):
        cols = st.columns(3)
        for j, col in enumerate(cols):
            if i + j < len(filtered):
                p = filtered[i + j]
                with col:
                    st.markdown(f"#### €{p.price:,.0f}")
                    st.write(f"**{p.district.capitalize()}** • {p.property_type.title()}")
                    st.caption(f"{p.surface_m2} m² • {p.rooms} rooms")
                    if p.price_per_m2:
                        st.caption(f"€{p.price_per_m2:,.0f}/m²")
                    if p.url:
                        st.markdown(f"[View Listing]({p.url})")
                    st.divider()

# ========================== MARKET OVERVIEW ================================
elif section == "📊 Market Overview":
    st.header("📊 Market Overview")

    # Fetch data
    properties = service.load_properties()
    stats = service.get_market_statistics()

    # --- KPI row ---
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total Properties", stats.total_properties)
    col2.metric("Avg Price", f"€{stats.avg_price:,.0f}")
    col3.metric("Median Price", f"€{stats.median_price:,.0f}")
    col4.metric("Avg €/m²", f"€{stats.avg_price_per_m2:,.0f}")
    
    # Safe getattr fetch in case module cache is out of sync
    var_price = getattr(stats, "variance_price", 0.0)
    col5.metric("Variance", f"€²{var_price:,.0f}")

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

    # --- Detailed Analytics Charts ---
    st.subheader("Market Analytics")
    st.write("**Average Price per m² by District (€)**")
    chart_data_m2 = {ds.district: ds.avg_price_per_m2 for ds in stats.by_district.values()}
    st.bar_chart(chart_data_m2, use_container_width=True)

    st.write("**Surface Area vs. Asking Price**")
    import pandas as pd
    scatter_data = pd.DataFrame([{
        "Surface (m²)": p.surface_m2,
        "Price (€)": p.price,
        "District": p.district
    } for p in properties])
    
    st.scatter_chart(
        data=scatter_data,
        x="Surface (m²)",
        y="Price (€)",
        color="District",
        use_container_width=True
    )

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
