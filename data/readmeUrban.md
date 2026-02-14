# Share of people living in urban and rural areas - Data package

This data package contains the data that powers the chart ["Share of people living in urban and rural areas"](https://ourworldindata.org/grapher/share-urban-and-rural-population?v=1&csvType=full&useColumnShortNames=false) on the Our World in Data website.

## CSV Structure

The high level structure of the CSV file is that each row is an observation for an entity (usually a country or region) and a timepoint (usually a year).

The first two columns in the CSV file are "Entity" and "Code". "Entity" is the name of the entity (e.g. "United States"). "Code" is the OWID internal entity code that we use if the entity is a country or region. For most countries, this is the same as the [iso alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) code of the entity (e.g. "USA") - for non-standard countries like historical countries these are custom codes.

The third column is either "Year" or "Day". If the data is annual, this is "Year" and contains only the year as an integer. If the column is "Day", the column contains a date string in the form "YYYY-MM-DD".

The remaining columns are the data columns, each of which is a time series. If the CSV data is downloaded using the "full data" option, then each column corresponds to one time series below. If the CSV data is downloaded using the "only selected data visible in the chart" option then the data columns are transformed depending on the chart type and thus the association with the time series might not be as straightforward.


## Metadata.json structure

The .metadata.json file contains metadata about the data package. The "charts" key contains information to recreate the chart, like the title, subtitle etc.. The "columns" key contains information about each of the columns in the csv, like the unit, timespan covered, citation for the data etc..

## About the data

Our World in Data is almost never the original producer of the data - almost all of the data we use has been compiled by others. If you want to re-use data, it is your responsibility to ensure that you adhere to the sources' license and to credit them correctly. Please note that a single time series may have more than one source - e.g. when we stich together data from different time periods by different producers or when we calculate per capita metrics using population data from a second source.

### How we process data at Our World In Data
All data and visualizations on Our World in Data rely on data sourced from one or several original data providers. Preparing this original data involves several processing steps. Depending on the data, this can include standardizing country names and world region definitions, converting units, calculating derived indicators such as per capita measures, as well as adding or adapting metadata such as the name or the description given to an indicator.
[Read about our data pipeline](https://docs.owid.io/projects/etl/)

## Detailed information about each time series


## Urban
Last updated: January 29, 2026  
Next update: January 2027  
Date range: 1960–2024  
Unit: % of total  


### How to cite this data

#### In-line citation
If you have limited space (e.g. in data visualizations), you can use this abbreviated in-line citation:  
World Urbanization Prospects - UN Population Division, via World Bank (2026) – processed by Our World in Data

#### Full citation
World Urbanization Prospects - UN Population Division, via World Bank (2026) – processed by Our World in Data. “Urban” [dataset]. World Urbanization Prospects - UN Population Division, via World Bank, “World Development Indicators 125” [original data].
Source: World Urbanization Prospects - UN Population Division, via World Bank (2026) – processed by Our World In Data

### How is this data described by its producer - World Urbanization Prospects - UN Population Division, via World Bank (2026)?
Urban population refers to people living in urban areas as defined by national statistical offices. The data are collected and smoothed by United Nations Population Division.

### Limitations and exceptions:
Aggregation of urban and rural population may not add up to total population because of different country coverage. There is no consistent and universally accepted standard for distinguishing urban from rural areas, in part because of the wide variety of situations across countries.

Most countries use an urban classification related to the size or characteristics of settlements. Some define urban areas based on the presence of certain infrastructure and services. And other countries designate urban areas based on administrative arrangements. Because of national differences in the characteristics that distinguish urban from rural areas, the distinction between urban and rural population is not amenable to a single definition that would be applicable to all countries.

Estimates of the world's urban population would change significantly if China, India, and a few other populous nations were to change their definition of urban centers.

Because the estimates of city and metropolitan area are based on national definitions of what constitutes a city or metropolitan area, cross-country comparisons should be made with caution.

### Statistical concept and methodology:
Urban population refers to people living in urban areas as defined by national statistical offices. The indicator is calculated using World Bank population estimates and urban ratios from the United Nations World Urbanization Prospects.

Percentages urban are the numbers of persons residing in an area defined as ''urban'' per 100 total population. Particular caution should be used in interpreting the figures for percentage urban for different countries.

Countries differ in the way they classify population as "urban" or "rural." The population of a city or metropolitan area depends on the boundaries chosen.

### Source

#### World Urbanization Prospects - UN Population Division, via World Bank – World Development Indicators
Retrieved on: 2026-01-30  
Retrieved from: https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS  


## Rural
Last updated: January 29, 2026  
Next update: January 2027  
Date range: 1960–2024  
Unit: % of total population  


### How to cite this data

#### In-line citation
If you have limited space (e.g. in data visualizations), you can use this abbreviated in-line citation:  
World Bank based on data from the UN Population Division (2026) – processed by Our World in Data

#### Full citation
World Bank based on data from the UN Population Division (2026) – processed by Our World in Data. “Rural” [dataset]. World Bank based on data from the UN Population Division, “World Development Indicators 125” [original data].
Source: World Bank based on data from the UN Population Division (2026) – processed by Our World In Data

### How is this data described by its producer - World Bank based on data from the UN Population Division (2026)?
Rural population refers to people living in rural areas as defined by national statistical offices. It is calculated as the difference between total population and urban population.

### Limitations and exceptions:
Aggregation of urban and rural population may not add up to total population because of different country coverage. There is no consistent and universally accepted standard for distinguishing urban from rural areas, in part because of the wide variety of situations across countries.

Estimates of the world's urban population would change significantly if China, India, and a few other populous nations were to change their definition of urban centers.

Because the estimates of city and metropolitan area are based on national definitions of what constitutes a city or metropolitan area, cross-country comparisons should be made with caution. To estimate urban populations, UN ratios of urban to total population were applied to the World Bank's estimates of total population.

### Statistical concept and methodology:
Rural population is calculated as the difference between the total population and the urban population. Rural population is approximated as the midyear nonurban population. While a practical means of identifying the rural population, it is not a precise measure.

The United Nations Population Division and other agencies provide current population estimates for developing countries that lack recent census data and pre- and post-census estimates for countries with census data.

### Source

#### World Bank based on data from the UN Population Division – World Development Indicators
Retrieved on: 2026-01-30  
Retrieved from: https://data.worldbank.org/indicator/SP.RUR.TOTL.ZS  


    