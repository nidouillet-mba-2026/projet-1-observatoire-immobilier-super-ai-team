"""
API Flask pour exposer les données de régression au frontend.
"""

import csv
import math
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Chemin vers le projet
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Import des fonctions de régression
import sys
sys.path.insert(0, PROJECT_ROOT)
from analysis.stats import mean, correlation
from analysis.regression import least_squares_fit, r_squared, predict

app = Flask(__name__)
CORS(app)


def load_dvf_data():
    """Charge les données DVF depuis le CSV."""
    filepath = os.path.join(PROJECT_ROOT, 'data', 'dvf_toulon.csv')
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                data.append({
                    'type': row['type'],
                    'prix': float(row['prix']),
                    'surface': float(row['surface']),
                    'quartier': row['quartier'],
                    'date': row['date'],
                    'adresse': row['adresse']
                })
            except (ValueError, KeyError):
                continue
    return data


def compute_regression():
    """Calcule la régression linéaire prix = f(surface)."""
    data = load_dvf_data()

    # Filtrer les données valides
    valid_data = [d for d in data if d['surface'] > 0 and d['prix'] > 0]

    # Extraire surface et prix
    surfaces = [d['surface'] for d in valid_data]
    prix = [d['prix'] for d in valid_data]

    # Calculer la régression
    alpha, beta = least_squares_fit(surfaces, prix)
    r2 = r_squared(alpha, beta, surfaces, prix)

    # Calculer RMSE
    n = len(surfaces)
    ss_res = sum((prix[i] - predict(alpha, beta, surfaces[i])) ** 2 for i in range(n))
    rmse = math.sqrt(ss_res / n)

    # Points pour le scatter plot (limité à 200)
    scatter_points = [
        {'surface': round(d['surface'], 1), 'prix': round(d['prix'], 0)}
        for d in valid_data[:200]
    ]

    # Ligne de régression
    min_surf = min(surfaces)
    max_surf = max(surfaces)
    step = max(1, int((max_surf - min_surf) / 20))
    regression_line = [
        {'surface': s, 'prix': round(predict(alpha, beta, s), 0)}
        for s in range(int(min_surf), int(max_surf) + 1, step)
    ]

    # Résidus (limité à 100)
    residuals = [
        {'n': i, 'r': round(prix[i] - predict(alpha, beta, surfaces[i]), 0)}
        for i in range(min(100, n))
    ]

    return {
        'alpha': round(alpha, 2),
        'beta': round(beta, 2),
        'r_squared': round(r2, 4),
        'rmse': round(rmse, 2),
        'n_transactions': n,
        'correlation': round(correlation(surfaces, prix), 4),
        'scatter_points': scatter_points,
        'regression_line': regression_line,
        'residuals': residuals,
        'stats': {
            'mean_surface': round(mean(surfaces), 2),
            'mean_prix': round(mean(prix), 2),
            'min_surface': round(min(surfaces), 2),
            'max_surface': round(max(surfaces), 2),
            'min_prix': round(min(prix), 2),
            'max_prix': round(max(prix), 2)
        }
    }


@app.route('/api/regression', methods=['GET'])
def get_regression():
    """Endpoint pour obtenir les données de régression."""
    try:
        result = compute_regression()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check."""
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
