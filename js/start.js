const margin = { top: 40, right: 50, bottom: 50, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let urbDataGlobal = [];
let genderDataGlobal = [];

const nameMap = {
  "USA": "United States",
  "Russian Federation": "Russia",
  "Republic of Korea": "South Korea",
  "Czech Republic": "Czechia",
  "Viet Nam": "Vietnam",
  "Iran (Islamic Republic of)": "Iran",
  "England": "United Kingdom",
  "Greenland": "Greenland",
  "Syrian Arab Republic": "Syria"
  
};

// ---- load gender data ----
d3.csv("data/gender-development-index-vs-gdp-per-capita.csv").then(data => {
  data.forEach(d => {
    d.Year = +d.Year;
    d.gdi  = +d["Gender Development Index"];
    d.gdp  = +d["GDP per capita"];
    d.pop  = +d["Population"];
  });

  genderDataGlobal = data;
    // set slider range from available years
  const years  = [...new Set(data.map(d => d.Year))].sort((a, b) => a - b);
  const slider = document.getElementById("year-slider");
  const label  = document.getElementById("year-label");
  slider.min   = d3.min(years);
  slider.max   = d3.max(years);
  slider.value = d3.max(years);
  label.textContent = d3.max(years);

  
  drawGenderBarChart(genderDataGlobal, d3.max(years));
  // update on slider change — inside .then() so data is available
  slider.addEventListener("input", function() {
    const year = +this.value;
    label.textContent = year;
    drawUrbBarChart(urbDataGlobal, year);
    drawRuralBarChart(urbDataGlobal, year);
    drawGenderBarChart(genderDataGlobal, year);
  });

}).catch(error => console.error("Error loading gender data:", error));

// ---- load urban data ----
d3.csv("data/share-urban-and-rural-population.csv").then(data => {
  data.forEach(d => {
    d.Year  = +d.Year;
    d.Urban = +d["Urban"];
    d.Rural = +d["Rural"];
  });

  urbDataGlobal = data;


  const years = [...new Set(data.map(d => d.Year))].sort((a, b) => a - b);
  // initial draw
  drawUrbBarChart(urbDataGlobal, d3.max(years));
  drawRuralBarChart(urbDataGlobal, d3.max(years));

  

}).catch(error => console.error("Error loading urban data:", error));



// ---- scatter ----
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
    d.Year = +d.Year;
    d.gdi  = +d["Gender Development Index"];
    d.gdp  = +d["GDP per capita"];
  });
  drawScatterChart(urbData, genderData);
});

// ---- choropleth ----
Promise.all([
  d3.json('data/worldShapes.json'),
  d3.csv('data/gender-development-index-vs-gdp-per-capita.csv')
]).then(data => {
  const geoData     = data[0];
  const countryData = data[1];

  const latest = new Map();
  countryData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d["Gender Development Index"]) return;
    const prev = latest.get(d.Entity);
    if (!prev || +d.Year > +prev.Year) latest.set(d.Entity, d);
  });

  geoData.features.forEach(d => {
    const lookupName = nameMap[d.properties.name] || d.properties.name;
    const match = latest.get(lookupName);
    if (match) {
      d.properties.genderindex = +match["Gender Development Index"];
    } else {
      console.warn(`No GDI data for ${d.properties.name}`);
    }
  });

  new ChoroplethMap({ parentElement: '#map' }, geoData);
}).catch(error => console.error(error));


// ---- Histograms ----
function drawUrbBarChart(data, selectedYear) {

  d3.select("#panel-1").selectAll("*").remove(); // clear before redraw

  const countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    return d.Year === selectedYear;
  });

  

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
  const barWidth  = 510;
  const barHeight = 310;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#panel-1")
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
    .text("Number of Countries by Urbanization Range " + `(${selectedYear})`);

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

function drawRuralBarChart(data, selectedYear) {

  d3.select("#panel-2").selectAll("*").remove();

  const countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    return d.Year === selectedYear;
  });

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
  const barWidth  = 510;
  const barHeight = 310;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#panel-2")
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
    .text("Number of Countries by Ruralization Range (" + selectedYear + ")");

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

function drawGenderBarChart(data, selectedYear) {

  d3.select("#panel-3").selectAll("*").remove();

  const countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    if (!d.gdi) return false;
    return d.Year === selectedYear;
  });

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
  const barWidth  = 510;
  const barHeight = 310;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("#panel-3")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  svg.append("text")
    .attr("x", iW / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Number of Countries by Gender Development Index Range (" + selectedYear + ")");

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



// ---- Scatter plot ----
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
    .text("Urban Population % vs Gender Development Index by Country");

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










