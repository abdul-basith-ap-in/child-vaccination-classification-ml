import os
import joblib
import pandas as pd
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Paths to model files and data
MODEL_PATH = r"C:\Users\ACER\Documents\child-vaccination-classification-ml\notebooks\vaccination_xgboost_model.pkl"
FEATURES_PATH = r"C:\Users\ACER\Documents\child-vaccination-classification-ml\notebooks\feature_names.pkl"
DATA_PATH = r"C:\Users\ACER\Documents\child-vaccination-classification-ml\data\final_df.xlsx"

# Load the trained model and features
print("Loading model and features...")
if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
    model = joblib.load(MODEL_PATH)
    features = joblib.load(FEATURES_PATH)
    print("Model and features loaded successfully.")
else:
    model = None
    features = []
    print("WARNING: Model or feature files not found.")

# Global cache for analytics data to speed up response
analytics_cache = None

def load_analytics_data():
    global analytics_cache
    if analytics_cache is not None:
        return analytics_cache

    if not os.path.exists(DATA_PATH):
        print("WARNING: Data file not found for analytics.")
        return {}

    try:
        print("Reading Excel file for analytics (caching in memory)...")
        df = pd.read_excel(DATA_PATH)
        
        # Calculate general stats
        total_records = len(df)
        vaccinated_count = int(df['vaccinated'].sum())
        overall_rate = float(df['vaccinated'].mean() * 100)
        
        # Wealth Index stats
        # wealth_index levels: 1 = Poorest, 2 = Poorer, 3 = Middle, 4 = Richer, 5 = Richest
        wealth_labels = {1: "Poorest", 2: "Poorer", 3: "Middle", 4: "Richer", 5: "Richest"}
        wealth_rates = df.groupby('wealth_index')['vaccinated'].mean().to_dict()
        wealth_data = {wealth_labels.get(k, str(k)): float(v * 100) for k, v in wealth_rates.items()}
        
        # Educational Level stats
        # 0 = No education, 1 = Primary, 2 = Secondary, 3 = Higher
        edu_labels = {0: "No Education", 1: "Primary", 2: "Secondary", 3: "Higher"}
        edu_rates = df.groupby('highest_educational_level')['vaccinated'].mean().to_dict()
        edu_data = {edu_labels.get(k, str(k)): float(v * 100) for k, v in edu_rates.items()}
        
        # Health Worker Visit stats
        hw_labels = {0: "No Visit", 1: "Visited"}
        hw_rates = df.groupby('health_worker_visit')['vaccinated'].mean().to_dict()
        hw_data = {hw_labels.get(k, str(k)): float(v * 100) for k, v in hw_rates.items()}
        
        # Residence stats
        res_labels = {0: "Rural", 1: "Urban"}
        res_rates = df.groupby('residence_urban')['vaccinated'].mean().to_dict()
        res_data = {res_labels.get(k, str(k)): float(v * 100) for k, v in res_rates.items()}
        
        analytics_cache = {
            "total_records": total_records,
            "vaccinated_count": vaccinated_count,
            "overall_rate": round(overall_rate, 2),
            "wealth_chart": wealth_data,
            "education_chart": edu_data,
            "health_worker_chart": hw_data,
            "residence_chart": res_data
        }
        return analytics_cache
    except Exception as e:
        print(f"Error computing analytics: {e}")
        return {}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model is not loaded on server."}), 500
        
    try:
        data = request.get_json(force=True)
        
        # Verify all 13 features are present in incoming JSON
        missing_features = [f for f in features if f not in data]
        if missing_features:
            return jsonify({"error": f"Missing input fields: {missing_features}"}), 400
            
        # Build pandas DataFrame for inference
        input_data = {f: [data[f]] for f in features}
        input_df = pd.DataFrame(input_data)
        
        # Run prediction
        pred = int(model.predict(input_df)[0])
        prob = float(model.predict_proba(input_df)[0, 1])
        
        return jsonify({
            "vaccinated": pred,
            "probability": round(prob, 4)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analytics', methods=['GET'])
def get_analytics():
    stats = load_analytics_data()
    if not stats:
        return jsonify({"error": "Could not compute analytics. File missing or server error."}), 500
    return jsonify(stats)

if __name__ == '__main__':
    # Force loading analytics cache on startup
    load_analytics_data()
    # Run the server locally on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
