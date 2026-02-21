class ChoroplethMap {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 900,
      containerHeight: _config.containerHeight || 500,
      margin: _config.margin || {top: 0, right: 0, bottom: 0, left: 0},
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150
    }
    this.data = _data;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width  = vis.config.containerWidth  - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top  - vis.config.margin.bottom;

    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width',  vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.projection = d3.geoMercator();
    vis.geoPath    = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3.scaleLinear()
      .range(['#cfe2f2', '#0d306b'])
      .interpolate(d3.interpolateHcl);

    vis.linearGradient = vis.svg.append('defs').append('linearGradient')
      .attr('id', 'legend-gradient');

    vis.legend = vis.chart.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

    vis.legendRect = vis.legend.append('rect')
      .attr('width',  vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend.append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text('Gender Development Index');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

  
    const gdiExtent = d3.extent(vis.data.features, d => d.properties.genderindex);

    vis.colorScale.domain(gdiExtent);

    vis.legendStops = [
      { color: '#cfe2f2', value: gdiExtent[0], offset: 0   },
      { color: '#0d306b', value: gdiExtent[1], offset: 100 },
    ];

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // ← uses vis.data directly instead of geoData variable
    vis.projection.fitSize([vis.width, vis.height], vis.data);

    const countryPath = vis.chart.selectAll('.country')
      .data(vis.data.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', vis.geoPath)
      .attr('fill', d => {
        if (d.properties.genderindex) {
          return vis.colorScale(d.properties.genderindex);
        } else {
          return '#e0e0e0'; // grey for no data
        }
      });

    countryPath
      .on('mousemove', (event, d) => {
        const gdi = d.properties.genderindex
          ? `<strong>${d.properties.genderindex.toFixed(3)}</strong> Gender Development Index`
          : 'No data available';
        d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top',  (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`
            <div class="tooltip-title">${d.properties.name}</div>
            <div>${gdi}</div>
          `);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

    vis.legend.selectAll('.legend-label')
      .data(vis.legendStops)
      .join('text')
      .attr('class', 'legend-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('y', 20)
      .attr('x', (d, i) => i == 0 ? 0 : vis.config.legendRectWidth)
      .text(d => d.value ? d.value.toFixed(2) : '');

    vis.linearGradient.selectAll('stop')
      .data(vis.legendStops)
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}