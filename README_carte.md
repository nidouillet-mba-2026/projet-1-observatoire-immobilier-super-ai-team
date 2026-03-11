# 📍 Toulon : Analyse des Prix Immobiliers

Application Streamlit interactive pour visualiser les prix immobiliers par quartier (IRIS) à Toulon.

## 🚀 Installation

### Prérequis
- Python 3.9+
- pip ou poetry

### Étapes d'installation

1. **Cloner le projet et accéder au répertoire**
```bash
cd carte_toulon_project
```

2. **Créer un environnement virtuel (optionnel mais recommandé)**
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
```

3. **Installer les dépendances**

**Avec pip :**
```bash
pip install -r requirements.txt
```

**Avec poetry :**
```bash
poetry install
```

## 🏃 Lancer l'application

Depuis la racine du projet :
```bash
streamlit run app/html.py
```

L'application ouvrira automatiquement dans votre navigateur par défaut à l'adresse `http://localhost:8501`

## 📁 Structure du projet

```
carte_toulon_project/
├── app/
│   └── html.py              # Application Streamlit principale
├── data/
│   └── prix_quartiers.csv   # Données des prix par quartier (IRIS)
├── pyproject.toml           # Configuration des dépendances (poetry)
├── README.md                # Ce fichier
└── poetry.lock              # Lock file des dépendances
```

## 📊 Données

Le fichier `data/prix_quartiers.csv` doit contenir les prix immobiliers par quartier avec la structure suivante :

```csv
iris_code,quartier,prix_moyen,prix_min,prix_max,nombre_ventes
83137001,Quartier 1,450000,350000,550000,25
83137002,Quartier 2,420000,320000,520000,18
...
```

**Colonnes requises :**
- `iris_code` : Code INSEE de l'IRIS
- `quartier` : Nom du quartier
- `prix_moyen` : Prix moyen au m²
- `prix_min` : Prix minimum au m²
- `prix_max` : Prix maximum au m²
- `nombre_ventes` : Nombre de transactions

## 🗺️ Fonctionnalités

- ✨ Visualisation interactive de la carte de Toulon avec Mapbox
- 🎨 Code couleur des quartiers selon les prix
- 📈 Statistiques par quartier
- 🔍 Interface utilisateur moderne et responsive

## 🔧 Configuration

Le token Mapbox est défini dans `app/html.py` et peut être modifié selon vos besoins.

## 📝 Notes

- Les données actuellement utilisées sont simulées
- Remplacez les données simulées par le contenu réel du CSV une fois disponible
- L'application utilise l'API OpenDataSoft pour récupérer les contours des IRIS de Toulon
