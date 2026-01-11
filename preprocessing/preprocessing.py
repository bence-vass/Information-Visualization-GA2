import pandas as pd

df = pd.read_csv("../MetObjects.csv", header=[0])

cols_to_keep = [
    "AccessionYear",
    "Object Name",
    "Object ID",
    "Title",
    "Is Highlight",
    "Department"  # Added for pie chart department visualization
]
df = df[cols_to_keep]
df.to_csv("../MetObjects.min.csv", index=False)