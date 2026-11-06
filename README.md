# AUREUS — E-Commerce Customer Churn Predictor & Retention Intelligence

![AUREUS Banner](assets/concrete-web.jpg)

**AUREUS** is a full-stack AI/Data Science web application for predicting e-commerce customer churn, understanding behavioral drivers, and orchestrating targeted retention strategies.

Powered by a pre-trained **Random Forest Classifier** (100 estimators, max depth 15) evaluated on **440,832 customer profiles**, AUREUS translates raw customer metrics into real-time churn probabilities, financial exposure analysis, and prescriptive operational playbooks.

---

## Key Features

- **3D Reactive Globe (Three.js WebGL)**: Real-time visual risk indicator that shifts hue and rotational turbulence based on prediction outputs (Emerald for $<30\%$, Amber for $30\%-60\%$, and Crimson with pulse for $>60\%$).
- **Client Parameter Terminal**: Adjust customer signals (age, tenure, support calls, payment delays, spend, contract duration, etc.) with real-time risk scoring and dataset benchmark indicators.
- **Explainable AI & Decision Path**: Interactive decision-tree trace showing the exact split rules and identified "biggest lever" to reduce churn probability.
- **Executive Overview & Problem Scale**: Live portfolio-level health metrics highlighting baseline platform churn ($56.7\%$), monitored customer volume ($440,832$), and total recurring revenue at risk ($135.3M$).
- **Interactive Executive ROI Calculator**: Dynamic modeling tool projecting gross revenue saved, campaign costs, net profit recovered, and CLV protected across custom cohort sizes.
- **Operational Response Playbooks**: Prescriptive, tiered action checklists with response SLAs (2-hour VIP outreach, $50 annual upgrade credits, billing grace windows).
- **Model Diagnostics**: Detailed feature importance rankings, training vs. testing accuracy breakdown, and data hygiene logs.
- **AI Retention Analyst Chatbot**: Embedded conversational assistant answering queries about dataset demographics, contract longevity, support call thresholds, and retention strategies.

---

## Tech Stack

- **Backend**: Python 3, Flask REST API
- **Machine Learning**: Scikit-Learn (`RandomForestClassifier`), Pandas, NumPy, Joblib
- **Frontend**: HTML5, Vanilla JavaScript, Three.js, GSAP, ApexCharts, VanillaTilt.js
- **Styling**: Cobalt Brutalist / Editorial design system with textured overlays

---

## Project Structure

```text
├── app.py                            # Flask server hosting /predict, /chat, and static routes
├── churn.py                          # Model training and evaluation script
├── clean_data.py                     # Data preprocessing and cleaning pipeline
├── churn_model.pkl                   # Trained RandomForestClassifier model
├── model_features.pkl                # Encoded feature schema list (12 features)
├── requirements.txt                  # Python dependencies
├── feature_importance.png            # Visualized model feature importance
├── cleaning_log.csv                  # Data hygiene audit log
├── customer_churn_training_clean.csv # Cleaned training dataset (440,832 rows)
├── customer_churn_testing_clean.csv  # Cleaned test dataset (64,374 rows)
├── customer_details_clean.csv        # Supplementary customer attributes
├── basket_details_clean.csv          # Transaction & basket details
├── templates/
│   ├── index.html                    # Primary application template
│   └── Churn Predictor.html          # Alternative direct-launch template
├── churn/
│   ├── app.js                        # UI controller, charts, and 3D globe animation
│   ├── engine.js                     # Client-side decision-tree evaluation & lever finder
│   ├── data.js                       # Distilled dataset distributions and decision tree
│   └── styles.css                    # Complete Cobalt Brutalist styling
└── assets/
    ├── concrete-web.jpg              # Background texture
    └── 04-concrete.jpg               # High-res brutalist imagery
```

---

## Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/aureus-churn-engine.git
cd aureus-churn-engine
```

### 2. Set Up a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## API Reference

### `POST /predict`
Evaluates account parameters against the trained Random Forest model.

**Request Body:**
```json
{
  "Age": 38,
  "Tenure": 24,
  "Usage_Frequency": 12,
  "Support_Calls": 3,
  "Payment_Delay": 10,
  "Total_Spend": 650.0,
  "Last_Interaction": 14,
  "Gender": "Male",
  "Subscription_Type": "Standard",
  "Contract_Length": "Monthly"
}
```

**Response:**
```json
{
  "status": "success",
  "churn_probability": 48.2,
  "risk_tier": "Moderate Risk",
  "risk_color": "#F59E0B",
  "financial_exposure": {
    "annual_revenue": 650,
    "revenue_at_risk": 313,
    "clv_protected": 876,
    "suggested_retention_budget": 98
  },
  "drivers": [
    "Elevated Support Inquiries (3 complaints - escalating friction)",
    "Monthly Contract Vulnerability (100% attrition rate in historical monthly cohort)"
  ],
  "protocol": {
    "name": "Targeted Re-Engagement Protocol (Tier 2 Amber)",
    "sla": "24 Hours",
    "summary": "Account exhibits moderate churn warning signals...",
    "checklist": [
      "Trigger proactive customer satisfaction check-in (24 Hours SLA)",
      "Offer $50 account bonus upon conversion to Annual contract"
    ]
  }
}
```

### `POST /chat`
Conversational endpoint grounded in dataset findings.

**Request Body:**
```json
{
  "message": "What is the threshold for support calls?"
}
```

**Response:**
```json
{
  "status": "success",
  "reply": "☎️ **Support Complaints Impact (#1 ML Feature Weight: 29.2%):**\n\n• **0–2 Calls:** **30.3% – 31.5% Churn**..."
}
```

---

## Model & Dataset Highlights

- **Algorithm**: Scikit-Learn `RandomForestClassifier` (100 estimators, max depth 15, stratified 80/20 train/validation split).
- **Discrimination**: **100% ROC-AUC** and **99.8% accuracy** on the held-out validation split.
- **Top 5 Predictive Features**:
  1. Support Complaints (**29.2%**) — Critical inflection point at 5+ calls ($94.7\%+$ churn).
  2. Total Lifetime Spend (**22.0%**) — Accounts under $\$500$ lack switching friction ($100\%$ churn in dataset).
  3. Customer Age (**13.9%**) — Age 31–45 is the most loyal cohort ($43.9\%$ churn); age 51+ exhibits $100\%$ churn in training data.
  4. Contract Length (**13.8%**) — Monthly subscribers churned at $100\%$; Annual/Quarterly contracts drop churn to $\sim 46\%$.
  5. Payment Delay (**12.2%**) — Payments delayed $>20$ days result in $100\%$ attrition.

---

## License

This project is licensed under the MIT License.
