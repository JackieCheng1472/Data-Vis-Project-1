const margin = { top: 40, right: 50, bottom: 50, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let urbDataGlobal = [];
let genderDataGlobal = [];
let selectedEntities = new Set();

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
  slider.max   = 2023;//d3.max(years);
  slider.value = 2023; //d3.max(years);
  label.textContent = 2023; //d3.max(years);

  
  drawGenderBarChart(genderDataGlobal, 2023);
  slider.addEventListener("input", function() {
    const year = +this.value;
    label.textContent = year;
    selectedEntities = new Set();
    drawUrbBarChart(urbDataGlobal, year);
    drawRuralBarChart(urbDataGlobal, year);
    drawGenderBarChart(genderDataGlobal, year);
    drawScatterChart(urbDataGlobal, genderDataGlobal, year);
    drawChoropleth(year);
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
  drawUrbBarChart(urbDataGlobal, 2023);
  drawRuralBarChart(urbDataGlobal, 2023);

  

}).catch(error => console.error("Error loading urban data:", error));




// ---- scatter ----
Promise.all([
  d3.csv("data/share-urban-and-rural-population.csv"),
  d3.csv("data/gender-development-index-vs-gdp-per-capita.csv")
]).then(([urbData, genderData]) => {
  urbData.forEach(d => { d.Year = +d.Year; d.Urban = +d["Urban"]; d.Rural = +d["Rural"]; });
  genderData.forEach(d => { d.Year = +d.Year; d.gdi = +d["Gender Development Index"]; d.gdp = +d["GDP per capita"]; d.pop = +d["Population"]; });

  drawScatterChart(urbData, genderData, 2023);
  initScatterControls(urbData, genderData); 
});

// ---- choropleth ----
let geoDataGlobal = null;
let choroplethCountryData = [];

Promise.all([
  d3.json('data/worldShapes.json'),
  d3.csv('data/gender-development-index-vs-gdp-per-capita.csv')
]).then(data => {
  geoDataGlobal        = data[0];
  choroplethCountryData = data[1];

  choroplethCountryData.forEach(d => {
    d.Year = +d.Year;
    d.gdi  = +d["Gender Development Index"];
  });

  drawChoropleth(2023); 
}).catch(error => console.error(error));

function drawChoropleth(selectedYear) {
  if (!geoDataGlobal) return;

  // find latest year per country up to selectedYear
  const latest = new Map();
  choroplethCountryData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d["Gender Development Index"]) return;
    if (d.Year > selectedYear) return; // ← only use data up to selected year
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  // update geoData properties
  geoDataGlobal.features.forEach(d => {
    const lookupName = nameMap[d.properties.name] || d.properties.name;
    const match = latest.get(lookupName);
    d.properties.genderindex = match ? +match["Gender Development Index"] : null;
  });

  // clear and redraw
  d3.select("#map").selectAll("*").remove();
  new ChoroplethMap({ parentElement: '#map', selectedYear: selectedYear }, geoDataGlobal);
}
// ---- Histograms ----
function drawUrbBarChart(data, selectedYear) {

  d3.select("#panel-1").selectAll("*").remove(); // clear before redraw

  let countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    return d.Year === selectedYear;
  });

  if (selectedEntities.size > 0) {
    countries = countries.filter(d => selectedEntities.has(d.Entity));
  }
  

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
  const barWidth  = 500;
  const barHeight = 400;
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

  let countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    return d.Year === selectedYear;
  });

  if (selectedEntities.size > 0) {
    countries = countries.filter(d => selectedEntities.has(d.Entity));
  }

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
  const barWidth  = 500;
  const barHeight = 400;
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

  let countries = data.filter(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return false;
    if (!d.gdi) return false;
    return d.Year === selectedYear;
  });

  if (selectedEntities.size > 0) {
    countries = countries.filter(d => selectedEntities.has(d.Entity));
  }

  // 
  const binSize = (1.1 - 0.4) / 7; // range of GDI values (0.3 to 1.1)
  const bins = d3.range(0.4, 1.1, binSize).map(start => {
    const end = +(start + binSize).toFixed(1);
    return {
      label: `${start.toFixed(1)}–${end.toFixed(1)}`,
      min: start,
      max: end,
      countries: countries.filter(d => d.gdi >= start && d.gdi < end)
    };
  });

  const barMargin = { top: 40, right: 20, bottom: 60, left: 60 };
  const barWidth  = 500;
  const barHeight = 400;
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
    .attr("fill",  "#f06277")
    .on("mouseover", (event, b) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`
          <strong>${b.label} GDI</strong><br/>
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

//----scatter plot-------------
let scatterXAttr = "Urban";
let scatterYAttr = "gdi";


d3.select("#plot").on("dblclick", () => {
  const year = +document.getElementById("year-slider").value;
  selectedEntities = new Set();
  drawScatterChart(urbDataGlobal, genderDataGlobal, year);
});

const scatterAttrConfig = {
  Urban:  { label: "Urban Population %",  format: d => d.toFixed(1) + "%",     scale: "linear" },
  Rural:  { label: "Rural Population %",  format: d => d.toFixed(1) + "%",     scale: "linear" },
  gdi:    { label: "Gender Dev. Index",   format: d => d.toFixed(3),            scale: "linear" },
  gdp:    { label: "GDP per Capita",      format: d => "$" + d3.format(",")(Math.round(d)), scale: "log" },
  pop:    { label: "Population",          format: d => d3.format(".2s")(d),     scale: "log" }
};


function initScatterControls(urbData, genderData) {
  document.querySelectorAll(".x-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".x-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      scatterXAttr = this.dataset.attr;
      const year = +document.getElementById("year-slider").value;
      drawScatterChart(urbData, genderData, year);
    });
  });

  document.querySelectorAll(".y-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".y-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      scatterYAttr = this.dataset.attr;
      const year = +document.getElementById("year-slider").value;
      drawScatterChart(urbData, genderData, year);
    });
  });
}

function drawScatterChart(urbData, genderData, selectedYear) {  
  d3.select("#plot").selectAll("*").remove();

  const urbFiltered = new Map();
  urbData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (d.Year === selectedYear) urbFiltered.set(d.Entity, d);
  });

  const genderFiltered = new Map();
  genderData.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d.gdi) return;
    if (d.Year === selectedYear) genderFiltered.set(d.Entity, d);
  });

  // fall back to latest year per country if no data for selected year
  if (genderFiltered.size === 0) {
    genderData.forEach(d => {
      if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
      if (!d.gdi || d.Year > selectedYear) return;
      const prev = genderFiltered.get(d.Entity);
      if (!prev || d.Year > prev.Year) genderFiltered.set(d.Entity, d);
    });
  }

  const merged = [];
  urbFiltered.forEach((u, entity) => {
    const g = genderFiltered.get(entity);
    if (g) merged.push({
      Entity: entity,
      Urban:  u.Urban,
      Rural:  u.Rural,
      gdi:    g.gdi,
      gdp:    g.gdp,
      pop:    g.pop,
      region: g["World region according to OWID"]
    });
  });

  // ← define config and cfg before anything uses them
  const attrConfig = {
    Urban: { label: "Urban Population %", format: d => d.toFixed(1) + "%",                          scale: "linear" },
    Rural: { label: "Rural Population %", format: d => d.toFixed(1) + "%",                          scale: "linear" },
    gdi:   { label: "Gender Dev. Index",  format: d => d.toFixed(2),                                scale: "linear" },
    gdp:   { label: "GDP per Capita",     format: d => "$" + d3.format(".2s")(d).replace("G", "B"), scale: "log"    },
    pop:   { label: "Population",         format: d => d3.format(".2s")(d),                         scale: "log"    }
  };

  const xCfg = attrConfig[scatterXAttr];
  const yCfg = attrConfig[scatterYAttr];

  // ← define clean before scales use it
  const clean = merged.filter(d =>
    d[scatterXAttr] > 0 && d[scatterYAttr] > 0 &&
    !isNaN(d[scatterXAttr]) && !isNaN(d[scatterYAttr])
  );

  const scatterMargin = { top: 40, right: 150, bottom: 60, left: 75 };
  const scatterWidth  = 550 - scatterMargin.left - scatterMargin.right;
  const scatterHeight = 400 - scatterMargin.top  - scatterMargin.bottom;

  const svg = d3.select("#plot").append("svg")
    .attr("width",  scatterWidth  + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top  + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  svg.append("text")
    .attr("x", scatterWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold")
    .text(`${xCfg.label} vs ${yCfg.label} by Country (${selectedYear})`);

  const xScale = xCfg.scale === "log"
    ? d3.scaleLog().domain(d3.extent(clean, d => d[scatterXAttr])).nice().range([0, scatterWidth])
    : d3.scaleLinear().domain(d3.extent(clean, d => d[scatterXAttr])).nice().range([0, scatterWidth]);

  const yScale = yCfg.scale === "log"
    ? d3.scaleLog().domain(d3.extent(clean, d => d[scatterYAttr])).nice().range([scatterHeight, 0])
    : d3.scaleLinear().domain(d3.extent(clean, d => d[scatterYAttr])).nice().range([scatterHeight, 0]);

  const rScale = d3.scaleLinear()
    .domain(d3.extent(merged, d => d.gdp))
    .range([5, 20]);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(clean.map(d => d.region))]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(yScale).tickSize(-scatterWidth).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-scatterHeight).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // axes — drawn once with gdp-aware tick values
  const xAxis = scatterXAttr === "gdp"
    ? d3.axisBottom(xScale).tickValues([1000, 5000, 10000, 25000, 50000, 100000]).tickFormat(xCfg.format)
    : d3.axisBottom(xScale).tickFormat(xCfg.format).ticks(4);

  const yAxis = scatterYAttr === "gdp"
    ? d3.axisLeft(yScale).tickValues([1000, 5000, 10000, 25000, 50000, 100000]).tickFormat(yCfg.format)
    : d3.axisLeft(yScale).tickFormat(yCfg.format).ticks(4);

  svg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", scatterWidth / 2).attr("y", 45)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text(xCfg.label);

  svg.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2).attr("y", -60)
    .attr("fill", "black").attr("text-anchor", "middle")
    .text(yCfg.label);

  // ---- brush ----

  const brush = d3.brush()
    .extent([[0, 0], [scatterWidth, scatterHeight]])
    .on("end", function(event) {
  if (!event.selection) {
    selectedEntities = new Set();
  } else {
    const [[x0, y0], [x1, y1]] = event.selection;
    selectedEntities = new Set(
      clean
        .filter(d => {
          const cx = xScale(d[scatterXAttr]);
          const cy = yScale(d[scatterYAttr]);
          return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        })
        .map(d => d.Entity)
    );
  }

  // highlight dots
  d3.selectAll(".dot")
    .attr("opacity", d =>
      selectedEntities.size === 0 || selectedEntities.has(d.Entity) ? 0.75 : 0.1
    )
    .attr("r", d =>
      selectedEntities.size === 0 || selectedEntities.has(d.Entity) ? rScale(d.gdp) : 3
    );

  // redraw histograms
  const year = +document.getElementById("year-slider").value;
  drawUrbBarChart(urbDataGlobal, year);
  drawRuralBarChart(urbDataGlobal, year);
  drawGenderBarChart(genderDataGlobal, year);

  // highlight map
  d3.selectAll(".country").attr("fill", function(d) {
    if (selectedEntities.size === 0) {
      return d.properties.genderindex
        ? window._choroplethColorScale(d.properties.genderindex)
        : "#e0e0e0";
    }
    const isSelected = selectedEntities.has(d.properties.name) ||
      [...selectedEntities].some(e => nameMap[d.properties.name] === e || d.properties.name === e);
    return isSelected
      ? (d.properties.genderindex ? window._choroplethColorScale(d.properties.genderindex) : "#aaa")
      : "#d0d0d0";
  });
});

  svg.append("g").attr("class", "brush").call(brush);
  svg.selectAll(".dot").data(clean).join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d[scatterXAttr]))
    .attr("cy", d => yScale(d[scatterYAttr]))
    .attr("r", d => rScale(d.gdp))
    .attr("fill", d => colorScale(d.region))
    .attr("opacity", d =>
      selectedEntities.size === 0 || selectedEntities.has(d.Entity) ? 0.75 : 0.1
    )
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      d3.select("#tooltip").style("display", "block")
        .style("left", (event.pageX + 12) + "px")
        .style("top",  (event.pageY - 28) + "px")
        .html(`
          <strong>${d.Entity}</strong><br/>
          ${xCfg.label}: ${xCfg.format(d[scatterXAttr])}<br/>
          ${yCfg.label}: ${yCfg.format(d[scatterYAttr])}<br/>
          Region: ${d.region}
        `);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

    svg.selectAll(".dot").raise();

  // legend
  const regions = [...new Set(clean.map(d => d.region))].filter(Boolean);
  const legend  = svg.append("g").attr("transform", `translate(${scatterWidth + 10}, 0)`);
  regions.forEach((r, i) => {
    legend.append("circle").attr("cx", 6).attr("cy", i * 20).attr("r", 5).attr("fill", colorScale(r));
    legend.append("text").attr("x", 16).attr("y", i * 20 + 4).attr("font-size", "10px").text(r);
  });

  
}













