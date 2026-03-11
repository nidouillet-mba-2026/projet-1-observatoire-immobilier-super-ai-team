[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/JY1xUUGg)
# Projet 1 : Observatoire du Marche Immobilier Toulonnais

## Objectif

Construire une application web deployee qui analyse le marche immobilier toulonnais en temps reel, avec des algorithmes statistiques implementes from scratch.

## Evaluation automatique

A chaque `git push`, le CI evalue automatiquement votre travail.
Consultez l'onglet **Actions** > dernier workflow > **Job Summary** pour voir votre score.

**Score CI : jusqu'a 55 / 100** — les 45 points restants sont evalues en soutenance.

## Structure du projet

```
.
ToulonFindAI project/
├── data/
│   ├── raw/                          
│   └── processed/                    
├── backend/
│   ├── __init__.py
│   ├── api/                          
│   │   ├── __init__.py
│   │   └── main.py                  
│   ├── models/
│   │   ├── __init__.py
│   │   └── data_models.py           
│   ├── loaders/
│   │   ├── __init__.py
│   │   └── csv_loader.py            
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── stats.py                 
│   │   ├── regression.py             
│   │   ├── scoring.py               
│   │   └── recommendation.py         
│   └── services/
│       ├── __init__.py
│       └── property_service.py       
├── app/
│   └── streamlit_app.py             
├── immo-app/                         
├── scripts/
│   └── merge_datasets.py            
├── tests/
│   ├── test_smoke.py                 
│   └── test_stats.py                 
├── README.md                       
└── requirements.txt 
```

## Installation

```bash
git clone <votre-url>
cd <votre-repo>
pip install -r requirements.txt
```

## Lancement local

```bash
streamlit run app/streamlit_app.py
```

## Application deployee

**URL :** (https://projet-1-observatoire-immobilier-super.onrender.com) 

## Repartition du travail

| Membre | Role | Contributions principales |
|--------|------|--------------------------|
| Melina Barbieux | Data Engineer | Analyse du marché, Scraping, Read Me & Déploiement|
| Brigitte raissa Simen ossanguem | Data Engineer | Analyse du marché, Scraping, Frontend |
| Maxence N'goma | Data Scientist | Scraping, Connexion Scraping & Frontend |
| Marc ivan stevie Nguidjol | AI Engineer | Backend, Connexion Frontend & Backend |
| Joe Deriu | Frontend / DevOps | Frontend & Algorithme |

## Donnees

- **DVF** : telechargees depuis https://files.data.gouv.fr/geo-dvf/latest/csv/83/
- **Annonces** : collectees via [GumLoop / scraper Python] le [DATE]

## References

- Joel Grus, *Data Science From Scratch*, ch.5 (statistiques) et ch.14 (regression)
