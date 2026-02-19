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

  drawChart2(data);
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

  drawUrbChart(data);
  drawUrbBarChart(data);  

}).catch(error => {
  console.error("Error loading data:", error);
});

Promise.all([
  d3.csv("data/share-urban-and-rural-population.csv"),
  d3.csv("data/gdp-per-capita-worldbank.csv")
]).then(([incomeData, gdpData]) => {

  incomeData.forEach(d => {
    d.Year = +d.Year;
    d.Urban = +d["Urban"];
    d.Rural = +d["Rural"];
  });

  gdpData.forEach(d => {
    d.Year = +d.Year;
    d.gdpData = +d["gdp"];
  });

  const mergedData = mergeDatasets(incomeData, gdpData);
  console.log("Merged data:", mergedData);

  drawMergedChart(mergedData);
});

function mergeDatasets(matData, urbData) {

  const urbMap = new Map();
  urbData.forEach(d => {
    urbMap.set(`${d.Entity}-${d.Year}`, d.GDP);
  });

  const merged = matData
    .filter(d => urbMap.has(`${d.Entity}-${d.Year}`))
    .map(d => ({
      Entity: d.Entity,
      Year: d.Year,
    }));

  return merged;
}

function mergeDatasets(matData, urbData) {

  // Create lookup: "Entity-Year" → GDP value
  const urbMap = new Map();

  urbData.forEach(d => {
    urbMap.set(`${d.Entity}-${d.Year}`, d.GDP);
  });

  // Merge GDP into income records
  const merged = matData
    .filter(d => urbMap.has(`${d.Entity}-${d.Year}`)) // keep only matches
    .map(d => ({
      Entity: d.Entity,
      Year: d.Year,
    }));

  return merged;
}

// ---- BAR CHART: Urban vs Rural share per country (latest year) ----
function drawUrbBarChart(data) {

  // Keep only the latest year per country, exclude aggregate regions
  const latest = new Map();
  data.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  const barData = Array.from(latest.values())
    .sort((a, b) => b.Urban - a.Urban);

  const barMargin = { top: 40, right: 20, bottom: 100, left: 45 };
  const barWidth  = Math.max(barData.length * 26, 600);
  const barHeight = 400;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("body")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // title
  svg.append("text")
    .attr("x", iW / 2)
    .attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Urban vs Rural Population Share by Country (2024)");

  const x = d3.scaleBand()
    .domain(barData.map(d => d.Entity))
    .range([0, iW])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([iH, 0]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickValues([25, 50, 75, 100]).tickSize(-iW).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // rural bars (top portion)
  svg.selectAll(".bar-rural")
    .data(barData)
    .join("rect")
    .attr("class", "bar-rural")
    .attr("x", d => x(d.Entity))
    .attr("y", 0)
    .attr("width", x.bandwidth())
    .attr("height", d => y(d.Urban))
    .attr("fill", "#f4a261")
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`<strong>${d.Entity}</strong><br/>Urban: ${d.Urban.toFixed(1)}%<br/>Rural: ${d.Rural.toFixed(1)}%`);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // urban bars (bottom portion)
  svg.selectAll(".bar-urban")
    .data(barData)
    .join("rect")
    .attr("class", "bar-urban")
    .attr("x", d => x(d.Entity))
    .attr("y", d => y(d.Urban))
    .attr("width", x.bandwidth())
    .attr("height", d => iH - y(d.Urban))
    .attr("fill", "#2196f3")
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`<strong>${d.Entity}</strong><br/>Urban: ${d.Urban.toFixed(1)}%<br/>Rural: ${d.Rural.toFixed(1)}%`);
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%").tickSize(0))
    .call(g => g.select(".domain").remove());

  // x axis
  svg.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove())
    .selectAll("text")
    .attr("transform", "rotate(-50)")
    .attr("dx", "-0.6em")
    .attr("dy", "0.15em")
    .style("text-anchor", "end")
    .style("font-size", "9px");

  // legend
  const legend = svg.append("g").attr("transform", `translate(${iW - 120}, -28)`);
  [{ color: "#2196f3", label: "Urban" }, { color: "#f4a261", label: "Rural" }].forEach((item, i) => {
    legend.append("rect").attr("x", i * 70).attr("width", 12).attr("height", 12).attr("fill", item.color);
    legend.append("text").attr("x", i * 70 + 16).attr("y", 10).attr("font-size", "11px").text(item.label);
  });
}

function drawGenderBarChart(data) {

  const latest = new Map();
  data.forEach(d => {
    if (!d.Code || d.Code.startsWith("OWID") || d.Code.length !== 3) return;
    if (!d.gdi) return; // skip rows with no GDI value
    const prev = latest.get(d.Entity);
    if (!prev || d.Year > prev.Year) latest.set(d.Entity, d);
  });

  const barData = Array.from(latest.values())
    .sort((a, b) => b.gdi - a.gdi); // was b.gender, should be b.gdi

  const barMargin = { top: 40, right: 20, bottom: 100, left: 45 };
  const barWidth  = Math.max(barData.length * 26, 600);
  const barHeight = 400;
  const iW = barWidth  - barMargin.left - barMargin.right;
  const iH = barHeight - barMargin.top  - barMargin.bottom;

  const svg = d3.select("body")
    .append("svg")
    .attr("width",  barWidth)
    .attr("height", barHeight)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  svg.append("text")
    .attr("x", iW / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px").attr("font-weight", "bold")
    .text("Gender Development Index by Country"); // was "Urban vs Rural..." (wrong title)

  const x = d3.scaleBand()
    .domain(barData.map(d => d.Entity))
    .range([0, iW]).padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, 1.1]) // GDI ranges 0–~1.1, not 0–100
    .range([iH, 0]);

  // gridlines
  svg.append("g")
    .call(d3.axisLeft(y).tickValues([0.25, 0.5, 0.75, 1.0]).tickSize(-iW).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke", "#e0e0e0"))
    .call(g => g.select(".domain").remove());

  // bars
  svg.selectAll(".bar-gender")
    .data(barData)
    .join("rect")
    .attr("class", "bar-gender")
    .attr("x", d => x(d.Entity))
    .attr("y", d => y(d.gdi)) // was d.gender
    .attr("width", x.bandwidth())
    .attr("height", d => iH - y(d.gdi)) // was d.gender
    .attr("fill", "#2196f3")
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px")
        .html(`<strong>${d.Entity}</strong><br/>GDI: ${d.gdi.toFixed(3)}<br/>Year: ${d.Year}`); // was toFixed(1) with "%" which is wrong for GDI
    })
    .on("mouseleave", () => d3.select("#tooltip").style("display", "none"));

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d.toFixed(2)).tickSize(0)) // was just d => d, now formatted
    .call(g => g.select(".domain").remove());

  // x axis
  svg.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove())
    .selectAll("text")
    .attr("transform", "rotate(-50)")
    .attr("dx", "-0.6em").attr("dy", "0.15em")
    .style("text-anchor", "end").style("font-size", "9px");

  // legend
  const legend = svg.append("g").attr("transform", `translate(${iW - 140}, -28)`);
  legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#2196f3");
  legend.append("text").attr("x", 16).attr("y", 10).attr("font-size", "11px").text("Gender Development Index");
}

function drawChart2(data) {

  const svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---- SCALES ----
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Year))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.GDP),
      d3.max(data, d => d.GDP)
    ])
    .nice()
    .range([height, 0]);

  const rScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.GDP))
    .range([4, 20]);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(data.map(d => d.Entity))]);

  // ---- AXES ----
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScale);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Ruralization or Urbanization");

  // ---- CIRCLES ----
  const circles = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d.Year))
    .attr("cy", d => yScale(d.GDP))
    .attr("r", d => rScale(d.GDP))
    .attr("fill", d => colorScale(d.Entity))
    .attr("opacity", 0.8)
    .attr("stroke", "gray")
    .attr("stroke-width", 1.5);

  circles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`
          <strong>${d.Entity}</strong><br/>
          Year: ${d.Year}<br/>
          GDP per capita: $${d3.format(",")(d.GDP)}
        `);
    })
    .on("mouseleave", () => {
      d3.select("#tooltip").style("display", "none");
    });

  
}

function drawUrbChart(data) {

  const svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---- SCALES ----
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Year))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.Urban),
      d3.max(data, d => d.Urban)
    ])
    .nice()
    .range([height, 0]);

  const rScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Urban))
    .range([0, 200]);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(data.map(d => d.Entity))]);

  // ---- AXES ----
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScale);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("GDP per capita");

  // ---- CIRCLES ----
  const circles = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d.Year))
    .attr("cy", d => yScale(d.Urban))
    .attr("r", d => rScale(d.Urban / 100))
    .attr("fill", d => colorScale(d.Entity))
    .attr("opacity", 0.8)
    .attr("stroke", "gray")
    .attr("stroke-width", 1.5);

  circles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`
          <strong>${d.Entity}</strong><br/>
          Year: ${d.Year}<br/>
          GDP per capita: $${d3.format(",")(d.GDP)}
        `);
    })
    .on("mouseleave", () => {
      d3.select("#tooltip").style("display", "none");
    });
}


function drawMergedChart(data) {

  const svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---- SCALES ----
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.GDP))
    .nice()
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Share))
    .nice()
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(data.map(d => d.Entity))]);

  // ---- AXES ----
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("gdp per capita");

  svg.append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("rulization or Urbanization");

  // ---- POINTS ----
  const circles = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d.GDP))
    .attr("cy", d => yScale(d.Share))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.Entity))
    .attr("opacity", 0.7);

  // ---- TOOLTIP ----
  circles
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`
          <strong>${d.Entity}</strong><br/>
          Year: ${d.Year}<br/>
          GDP per capita: $${d3.format(",")(d.GDP)}<br/>
          Top 1% income share: ${d.Share}%
        `);
    })
    .on("mouseleave", () => {
      d3.select("#tooltip").style("display", "none");
    });
}
