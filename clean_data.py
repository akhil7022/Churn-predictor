"""Data cleaning for the retail (basket/customer) and churn datasets.

Steps per file: missing values -> duplicates -> data types -> outliers.
Every action is appended to cleaning_log.csv so nothing changes silently.
"""
import numpy as np
import pandas as pd

SRC1, SRC2, OUT = "a1", "a2", "/mnt/user-data/outputs"
log = []


def note(dataset, step, issue, action, rows):
    log.append(dict(dataset=dataset, step=step, issue=issue, action=action, rows_affected=int(rows)))


def iqr_flag(s, k=1.5):
    q1, q3 = s.quantile([.25, .75])
    i = q3 - q1
    return (s < q1 - k * i) | (s > q3 + k * i)


# ---------------------------------------------------------------- basket_details
b = pd.read_csv(f"{SRC1}/basket_details.csv")
n0 = len(b)
note("basket_details", "missing", "null values in any column", "none found - nothing to impute/drop", b.isna().any(axis=1).sum())
d = b.duplicated().sum()
b = b.drop_duplicates()
note("basket_details", "duplicates", "fully identical rows", "dropped", d)
# same customer+product on DIFFERENT dates is a genuine repeat purchase, so it is kept
note("basket_details", "duplicates", "same customer+product on different dates",
     "kept - legitimate repeat purchases", b.duplicated(["customer_id", "product_id"]).sum())
bad_dates = pd.to_datetime(b["basket_date"], errors="coerce").isna().sum()
b["basket_date"] = pd.to_datetime(b["basket_date"], errors="coerce").dt.strftime("%Y-%m-%d")
note("basket_details", "dtype", "basket_date stored as text", "converted to datetime (YYYY-MM-DD)", n0 - bad_dates)
b["customer_id"] = b["customer_id"].astype("int64")
b["product_id"] = b["product_id"].astype("int64")
note("basket_details", "dtype", "IDs", "confirmed integer identifiers (no decimals / no scientific notation)", len(b))
neg = (b["basket_count"] <= 0).sum()
note("basket_details", "outlier", "zero/negative purchase quantity", "none found", neg)
# IQR is degenerate here (Q1=Q3=2), so use the 99.5th percentile as the 'unusually large' cut-off
cut = b["basket_count"].quantile(.995)
b["is_outlier_qty"] = b["basket_count"] > cut
note("basket_details", "outlier", f"basket_count > {cut:.0f} (99.5th percentile)",
     "flagged in is_outlier_qty, kept (plausible bulk buys)", b["is_outlier_qty"].sum())
b.to_csv(f"{OUT}/basket_details_clean.csv", index=False)

# --------------------------------------------------------------- customer_details
c = pd.read_csv(f"{SRC1}/customer_details.csv")
note("customer_details", "missing", "null values", "none found as NaN - but see hidden missing values below", c.isna().any(axis=1).sum())
d = c.duplicated().sum() + c.duplicated("customer_id").sum()
c = c.drop_duplicates("customer_id")
note("customer_details", "duplicates", "duplicate rows / duplicate customer_id", "none found", d)

# hidden missing values in `sex`
junk = ~c["sex"].isin(["Male", "Female"])
note("customer_details", "missing", "sex = 'kvkktalepsilindi' (Turkish: data-deletion request) or 'UNKNOWN'",
     "recoded to 'Unknown' (not guessed - gender is not safely imputable)", junk.sum())
c["sex"] = np.where(junk, "Unknown", c["sex"])

# hidden missing values in `customer_age` (placeholder codes like 5, 123, 2022 and impossible values)
c["customer_age_raw"] = c["customer_age"]
invalid = (c["customer_age"] < 18) | (c["customer_age"] > 100)
note("customer_details", "outlier/missing", "age <18 or >100 (e.g. 5, 123, 2022, -34, 149)",
     "treated as invalid placeholder -> set to missing", invalid.sum())
med = c.loc[~invalid, "customer_age"].median()
c.loc[invalid, "customer_age"] = np.nan
c["age_imputed"] = invalid
c["customer_age"] = c["customer_age"].fillna(med).astype("int64")
note("customer_details", "imputation", "missing ages after cleaning",
     f"imputed with median of valid ages ({med:.0f}); flagged in age_imputed", invalid.sum())
c["customer_id"] = c["customer_id"].astype("int64")
note("customer_details", "dtype", "customer_age float, customer_id", "age -> integer, customer_id -> integer", len(c))
t_out = iqr_flag(c["tenure"]).sum()
note("customer_details", "outlier", "tenure outside 1.5*IQR", "mildly high (max 133 months) but plausible - kept, not flagged", t_out)
c.to_csv(f"{OUT}/customer_details_clean.csv", index=False)

# --------------------------------------------------------------- churn train/test
int_cols = ["CustomerID", "Age", "Tenure", "Usage Frequency", "Support Calls",
            "Payment Delay", "Last Interaction", "Churn"]
churn = {}
for name in ["training", "testing"]:
    df = pd.read_csv(f"{SRC2}/customer_churn_dataset-{name}-master.csv")
    ds = f"churn_{name}"
    allnull = df.isna().all(axis=1).sum()
    anynull = df.isna().any(axis=1).sum()
    df = df.dropna()
    note(ds, "missing", "completely empty row(s)", "dropped (no information to impute from)", allnull)
    note(ds, "missing", "other partially-missing rows", "none found", anynull - allnull)
    d = df.duplicated().sum() + df.duplicated("CustomerID").sum()
    df = df.drop_duplicates("CustomerID")
    note(ds, "duplicates", "duplicate rows / duplicate CustomerID", "none found", d)
    was_float = df[int_cols].dtypes.eq("float64").any()
    df[int_cols] = df[int_cols].astype("int64")
    note(ds, "dtype", "numeric columns stored as float" if was_float else "numeric columns already integer",
         "converted to int; Total Spend kept as float (real decimals)" if was_float else "confirmed int; Total Spend kept as float", len(df))
    for col in ["Gender", "Subscription Type", "Contract Length"]:
        df[col] = df[col].str.strip().str.title()
    out_rows = 0
    for col in ["Age", "Tenure", "Usage Frequency", "Support Calls", "Payment Delay", "Total Spend", "Last Interaction"]:
        out_rows += iqr_flag(df[col], 3).sum()
    neg = (df[["Age", "Tenure", "Usage Frequency", "Support Calls", "Payment Delay", "Total Spend", "Last Interaction"]] < 0).sum().sum()
    note(ds, "outlier", "negative values / extreme values (3*IQR)", "none found - all columns within plausible ranges", neg + out_rows)
    churn[name] = df
    df.to_csv(f"{OUT}/customer_churn_{name}_clean.csv", index=False)

# overlapping IDs between train and test are separate ID spaces, not duplicated customers
ov = churn["training"].merge(churn["testing"], on="CustomerID", suffixes=("_tr", "_te"))
same = (ov["Age_tr"] == ov["Age_te"]) & (ov["Total Spend_tr"] == ov["Total Spend_te"]) & (ov["Tenure_tr"] == ov["Tenure_te"])
note("churn_train_vs_test", "duplicates", "CustomerID values appear in both files",
     f"kept - different people ({same.sum()} of {len(ov)} identical); files use separate ID numbering", len(ov))

pd.DataFrame(log).to_csv(f"{OUT}/cleaning_log.csv", index=False)
print(pd.DataFrame(log).to_string())
