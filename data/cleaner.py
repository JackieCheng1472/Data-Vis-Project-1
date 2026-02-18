import pandas as pd


# pick specific columns
df = pd.read_csv("data/share-urban-and-rural-population.csv", usecols=["Entity", "Year", "Urban", "Rural"])

df2 = pd.read_csv("data/gdp-per-capita-worldbank.csv", usecols=["Entity", "Year", "GDP per capita"])

