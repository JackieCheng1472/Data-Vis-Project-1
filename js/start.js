const margin = { top: 40, right: 50, bottom: 50, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

d3.csv("data/gender-development-index-vs-gdp-per-capita.csv").then(data => {

  console.log("Data loaded:", data);

  // ---- DATA PROCESSING ----
  data.forEach(d => {
    d.Year = +d.Year;
    d.gdi    = +d["Gender Development Index"];
    d.gdp    = +d["GDP per capita"];
    d.pop    = +d["Population"];
  });

  
  drawGenderBarChart(data);

}).catch(error => {
  console.error("Error loading data:", error);
});

d3.csv("data/share-urban-and-rural-population.csv").then(data => {

  console.log("Data loaded:", data);

  // ---- DATA PROCESSING ----
  data.forEach(d => {
    d.Year = +d.Year;
    d.Urban = +d["Urban"];
    d.Rural = +d["Rural"];
  });

  
  drawUrbBarChart(data);
  drawRuralBarChart(data)  

}).catch(error => {
  console.error("Error loading data:", error);
});

Promise.all([
  d3.csv("data/share-urban-and-rural-population.csv"),
  d3.csv("data/gender-development-index-vs-gdp-per-capita.csv")
]).then(([urbData, genderData]) => {

  urbData.forEach(d => {
    d.Year  = +d.Year;
    d.Urban = +d["Urban"];
    d.Rural = +d["Rural"];
  });

  genderData.forEach(d => {
    d.Year   = +d.Year;
    d.gdi    = +d["Gender Development Index"];
    d.gdp    = +d["GDP per capita"];
  });

  drawScatterChart(urbData, genderData);  // ← correct datasets now
});

Promise.all([
  d3.json('data/worldShapes.json'),
  d3.csv('data/gender-development-index-vs-gdp-per-capita.csv')
]).then(data => {
  const geoData = data[0];
  const countryData = data[1];


  // Combine both datasets by adding the population density to the TopoJSON file
  geoData.objects.collection.geometries.forEach(d => {
    for (let i = 0; i < countryData.length; i++) {
      if (d.properties.name == countryData[i].region) {
        d.properties.genderindex = +countryData[i]["Gender Development Index"];
      }
    }
  });


  const choroplethMap = new ChoroplethMap({ 
    parentElement: '#map'
  }, geoData);
})
.catch(error => console.error(error));



// ---- Histogram number of Urban share per number of country (latest year) ----
function drawUrbBarChart(data) {

  const latest = new Map();
  data.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  const countries = Array.from(latest.values());

  // bin countries into 10% urbanization ranges: 0-10, 10-20, ... 90-100
  const binSize = 10;
  const bins = d3.range(0, 100, binSize).map(start => ({
    label: `${start}–${start + binSize}%`,
    min: start,
    max: start + binSize,
    countries: countries.filter(d => d.Urban >= start && d.Urban < start + binSize)
  }));
  // include 100% in the last bin
  bins[bins.length - 1].countries.push(...countries.filter(d => d.Urban === 100));

  const barMargin = { top: 40, right: 20, bottom: 60, left: 60 };
  const barWidth  = 600;
  const barHeight = 400;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#row-1")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // title
  svg.append("text")
    .attr("x", iW / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Number of Countries by Urbanization Range (2024)");

  const x = d3.scaleBand()
    .domain(bins.map(b => b.label))
    .range([0, iW])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, b => b.countries.length)]).nice()
    .range([iH, 0]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(-iW).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // bars
  svg.selectAll(".bar")
    .data(bins)
    .join("rect")
    .attr("class", "bar")
    .attr("x", b => x(b.label))
    .attr("y", b => y(b.countries.length))
    .attr("width", x.bandwidth())
    .attr("height", b => iH - y(b.countries.length))
    .attr("fill", "#2196f3")
    .on("mouseover", (event, b) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`
          <strong>${b.label} Urban</strong><br/>
          Countries: ${b.countries.length}<br/>
          <small>${b.countries.map(d => d.Entity).join(", ")}</small>
        `);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Number of Countries");

  // x axis
  svg.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("x", iW / 2).attr("y", 45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Urban Population %");
}

function drawRuralBarChart(data) {

  const latest = new Map();
  data.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  const countries = Array.from(latest.values());

  // bin countries into 10% urbanization ranges: 0-10, 10-20, ... 90-100
  const binSize = 10;
  const bins = d3.range(0, 100, binSize).map(start => ({
    label: `${start}–${start + binSize}%`,
    min: start,
    max: start + binSize,
    countries: countries.filter(d => d.Rural >= start && d.Rural < start + binSize)
  }));
  // include 100% in the last bin
  bins[bins.length - 1].countries.push(...countries.filter(d => d.Rural === 100));

  const barMargin = { top: 40, right: 20, bottom: 60, left: 60 };
  const barWidth  = 600;
  const barHeight = 400;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#row-1")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // title
  svg.append("text")
    .attr("x", iW / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Number of Countries by Ruralization Range (2024)");

  const x = d3.scaleBand()
    .domain(bins.map(b => b.label))
    .range([0, iW])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, b => b.countries.length)]).nice()
    .range([iH, 0]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(-iW).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // bars
  svg.selectAll(".bar")
    .data(bins)
    .join("rect")
    .attr("class", "bar")
    .attr("x", b => x(b.label))
    .attr("y", b => y(b.countries.length))
    .attr("width", x.bandwidth())
    .attr("height", b => iH - y(b.countries.length))
    .attr("fill", "#f37921")
    .on("mouseover", (event, b) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`
          <strong>${b.label} Rural</strong><br/>
          Countries: ${b.countries.length}<br/>
          <small>${b.countries.map(d => d.Entity).join(", ")}</small>
        `);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Number of Countries");

  // x axis
  svg.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("x", iW / 2).attr("y", 45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Rural Population %");
}

function drawGenderBarChart(data) {

  const latest = new Map();
  data.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d.gdi) return;
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  const countries = Array.from(latest.values());

  // bin into 0.1 GDI ranges: 0–0.1, 0.1–0.2, ... 1.0–1.1
  const binSize = 0.1;
  const bins = d3.range(0, 1.1, binSize).map(start => {
    const end = +(start + binSize).toFixed(1);
    return {
      label: `${start.toFixed(1)}–${end.toFixed(1)}`,
      min: start,
      max: end,
      countries: countries.filter(d => d.gdi >= start && d.gdi < end)
    };
  });

  const barMargin = { top: 40, right: 20, bottom: 60, left: 60 };
  const barWidth  = 800;
  const barHeight = 400;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#row-2")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  svg.append("text")
    .attr("x", iW / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Number of Countries by Gender Development Index Range");

  const x = d3.scaleBand()
    .domain(bins.map(b => b.label))
    .range([0, iW])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, b => b.countries.length)]).nice()
    .range([iH, 0]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(-iW).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  
  svg.selectAll(".bar-gender")
    .data(bins)
    .join("rect")
    .attr("class", "bar-gender")
    .attr("x", b => x(b.label))
    .attr("y", b => y(b.countries.length))
    .attr("width", x.bandwidth())
    .attr("height", b => iH - y(b.countries.length))
    .attr("fill", "#2196f3")
    .on("mouseover", (event, b) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`
          <strong>GDI ${b.label}</strong><br/>
          Countries: ${b.countries.length}<br/>
          <small>${b.countries.map(d => d.Entity).join(", ")}</small>
        `);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Number of Countries");

  // x axis
  svg.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove())
    .append("text")
    .attr("x", iW / 2).attr("y", 45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Gender Development Index Range");
}




function drawScatterChart(urbData, genderData) {

  // get latest year per country for urban data
  const urbLatest = new Map();
  urbData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    const prev = urbLatest.get(d.Entity);
    if (!prev || d.Year > prev.Year) urbLatest.set(d.Entity, d);
  });

  // get latest year per country for gender data
  const genderLatest = new Map();
  genderData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d.gdi) return;
    const prev = genderLatest.get(d.Entity);
    if (!prev || d.Year > prev.Year) genderLatest.set(d.Entity, d);
  });

  // merge: only countries present in both datasets
  const merged = [];
  urbLatest.forEach((u, entity) => {
    const g = genderLatest.get(entity);
    if (g) merged.push({
      Entity: entity,
      Urban:  u.Urban,
      gdi:    g.gdi,
      gdp:    g.gdp,
      region: g.region
    });
  });

  const scatterMargin = { top: 40, right: 30, bottom: 60, left: 70 };
  const scatterWidth  = 900 - scatterMargin.left - scatterMargin.right;
  const scatterHeight = 500 - scatterMargin.top  - scatterMargin.bottom;

  const svg = d3.select("body")
    .append("svg")
    .attr("width",  scatterWidth  + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top  + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // title
  svg.append("text")
    .attr("x", scatterWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Urban Population % vs Gender Development Index by Country (2024)");

  const x = d3.scaleLinear()
    .domain([0, 100]).nice()
    .range([0, scatterWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(merged, d => d.gdi)).nice()
    .range([scatterHeight, 0]);

  const rScale = d3.scaleLinear()
    .domain(d3.extent(merged, d => d.gdp))
    .range([4, 20]);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(merged.map(d => d.region))]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(-scatterWidth).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(x).tickSize(-scatterHeight).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // axes
  svg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => d + "%"))
    .append("text")
    .attr("x", scatterWidth / 2).attr("y", 45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Urban Population %");

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d.toFixed(2)))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2).attr("y", -55)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text("Gender Development Index");

  // dots
  svg.selectAll(".dot")
    .data(merged)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.Urban))
    .attr("cy", d => y(d.gdi))
    .attr("r", d => 5 + d.gdp / 10000) // size by GDP per capita
    .attr("fill", d => colorScale(d.region))
    .attr("opacity", 0.75)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`
          <strong>${d.Entity}</strong><br/>
          Urban: ${d.Urban.toFixed(1)}%<br/>
          GDI: ${d.gdi.toFixed(3)}<br/>
          Region: ${d.region}
        `);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // legend
  const regions = [...new Set(merged.map(d => d.region))].filter(Boolean);
  const legend  = svg.append("g").attr("transform", `translate(${scatterWidth - 120}, 0)`);
  regions.forEach((r, i) => {
    legend.append("circle").attr("cx", 6).attr("cy", i * 20).attr("r", 5).attr("fill", colorScale(r));
    legend.append("text").attr("x", 16).attr("y", i * 20 + 4).attr("font-size", "10px").text(r);
  });
}

function drawChoropleth(data) {
  // This function would create a choropleth map showing the relationship between urbanization and gender development index across countries. 
  // You would need to load a GeoJSON file for country boundaries and join it with the data.
  // Then use D3's geoPath and color scales to draw the map.
}
