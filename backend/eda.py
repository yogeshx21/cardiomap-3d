# backend/eda.py
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from data import read_raw, prepare, save_feature_list

raw = read_raw()
X, targets, leak = prepare()

print("=" * 60)
print("RAW SHAPE:", raw.shape)
print("\nRAW COLUMNS:\n", list(raw.columns))

print("\n" + "=" * 60)
print("LEAKAGE COLUMNS HATAYE GAYE:", leak)
print("FINAL X SHAPE:", X.shape)

print("\n" + "=" * 60)
print("MISSING VALUES (sirf jinme hain):")
miss = X.isna().sum()
print(miss[miss > 0] if miss.sum() > 0 else "Koi missing value nahi")

print("\n" + "=" * 60)
print("TARGET BALANCE:")
for name, y in targets.items():
    pos = int(y.sum())
    print(f"  {name}: positive={pos}, negative={len(y)-pos}, "
          f"positive%={100*pos/len(y):.1f}%")

# Plot: target balance
fig, ax = plt.subplots(figsize=(6, 4))
names = list(targets.keys())
pos_counts = [int(targets[n].sum()) for n in names]
neg_counts = [len(targets[n]) - p for n, p in zip(names, pos_counts)]
ax.bar(names, neg_counts, label="Negative", color="#bbbbbb")
ax.bar(names, pos_counts, bottom=neg_counts, label="Positive", color="#111111")
ax.set_title("Target class balance")
ax.legend()
plt.tight_layout()
plt.savefig("results/target_balance.png", dpi=150)

save_feature_list(X)
X.to_csv("results/clean_features.csv", index=False)
print("\nSaved: results/target_balance.png, results/clean_features.csv, "
      "backend/models/feature_columns.json")