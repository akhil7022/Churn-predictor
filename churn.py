import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

# 1. Load dataset
print("Loading dataset...")
df = pd.read_csv('customer_churn_training_clean.csv')

# Drop CustomerID as it's an identifier
df_clean = df.drop(columns=['CustomerID'])

# One-Hot Encode categorical features
df_encoded = pd.get_dummies(
    df_clean, 
    columns=['Gender', 'Subscription Type', 'Contract Length'], 
    drop_first=True
)

# 2. Features (X) and Target (y)
X = df_encoded.drop(columns=['Churn'])
y = df_encoded['Churn']

# Split data
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

# 3. Train Random Forest Model
print("Training Random Forest model...")
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)

rf_model.fit(X_train, y_train)

# 4. Evaluate
y_pred = rf_model.predict(X_val)
print("\n=== MODEL ACCURACY ===")
print(classification_report(y_val, y_pred))

# ---------------------------------------------------------
# 5. SAVE MODEL FILES (THIS CREATES THE .pkl FILES)
# ---------------------------------------------------------
print("\nSaving model files to disk...")
joblib.dump(rf_model, 'churn_model.pkl')
joblib.dump(X.columns.tolist(), 'model_features.pkl')

print("✅ SUCCESS! 'churn_model.pkl' and 'model_features.pkl' have been saved!")