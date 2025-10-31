(function(){
  // Scatter plot for star rating versus annual energy consumption.
  const container = d3.select('#scatter-chart');
  if(container.empty()) return; // Stop if the chart container is not on the page.

  // Static SVG scaffold reused on each resize.
  const svg = container.append('svg');
  const plot = svg.append('g').attr('class', 'plot');
  const tooltip = container.append('div').attr('class', 'chart-tooltip');

  // Load the Ex5 TV energy file and coerce numeric fields.
  d3.csv('data/Ex5_TV_energy.csv', d => {
    const diagonal = d.screensize ? +d.screensize : null;
    const energy = d.energy_consumpt ? +d.energy_consumpt : null;
    const stars = d.star2 ? +d.star2 : null;
    const count = d.count ? +d.count : 0;
    return {
      brand: d.brand,
      tech: d.screen_tech,
      diagonal_inch: Number.isFinite(diagonal) ? diagonal : null,
      annual_kwh: Number.isFinite(energy) ? energy : null,
      star_rating: Number.isFinite(stars) ? stars : null,
      count: Number.isFinite(count) && count > 0 ? count : 0
    };
  }).then(rows => {
    // Keep only rows that have all the fields required for plotting.
    const data = rows.filter(d => d.star_rating != null && d.annual_kwh != null && d.diagonal_inch != null && d.count > 0);
    if(!data.length) return;

    // Colour encoding for display technologies.
    const technologies = Array.from(new Set(data.map(d => d.tech)));
    const color = d3.scaleOrdinal(technologies, d3.schemeTableau10);

    // One-time legend construction within the card layout.
    const parentCard = d3.select(container.node().parentNode);
    const legend = parentCard.selectAll('.chart-legend.scatter').data([null]).join('div')
      .attr('class', 'chart-legend scatter');

    legend.selectAll('span')
      .data(technologies)
      .join('span')
      .style('--swatch-color', d => color(d))
      .text(d => d);

    // Shared layout helpers.
    const margin = {top: 40, right: 24, bottom: 56, left: 72};
    const formatStar = value => value == null ? '' : Number(value).toFixed(2).replace(/\.?0+$/, '');
    const formatKwh = d3.format(',.1f');

    function render(){
      // Make the chart responsive to the card width.
      const width = container.node().clientWidth || 320;
      const height = Math.max(300, Math.round(width * 0.6));

      svg.attr('width', width).attr('height', height);
      plot.attr('transform', `translate(${margin.left},${margin.top})`);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Compute axis domains from raw data.
      const xExtent = d3.extent(data, d => d.star_rating);
      const yMax = d3.max(data, d => d.annual_kwh);
      const sizeExtent = d3.extent(data, d => d.diagonal_inch);

      const xDomainMin = Math.max(0, Math.floor(xExtent[0] - 0.3));
      const xDomainMax = Math.ceil(xExtent[1] + 0.3);

      const xScale = d3.scaleLinear()
        .domain([xDomainMin, xDomainMax])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.1])
        .range([innerHeight, 0]);

      const minRadius = 3; // Prevent markers from disappearing on narrow cards
      const maxRadius = Math.max(8, Math.min(14, innerWidth / 30)); // Cap size so dots do not overwhelm the plot
      const rScale = d3.scaleSqrt()
        .domain(sizeExtent)
        .range([minRadius, maxRadius]);

      // Axes and labels persist between renders.
      const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f'));
      const yAxis = d3.axisLeft(yScale).ticks(6);

      const xAxisGroup = plot.selectAll('.axis--x').data([null]).join('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.selectAll('.axis-label').data([null]).join('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Star rating (higher is better)');

      const yAxisGroup = plot.selectAll('.axis--y').data([null]).join('g')
        .attr('class', 'axis axis--y')
        .call(yAxis);

      yAxisGroup.selectAll('.axis-label').data([null]).join('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -52)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Annual energy use (kWh)');

      // Render the data points, keyed for stability across updates.
      const dots = plot.selectAll('circle.dot')
        .data(data, d => `${d.brand}-${d.tech}-${d.diagonal_inch}-${d.star_rating}`);

      dots.join(
        enter => enter.append('circle')
          .attr('class', 'dot')
          .attr('cx', d => xScale(d.star_rating))
          .attr('cy', d => yScale(d.annual_kwh))
          .attr('r', d => rScale(d.diagonal_inch))
          .attr('fill', d => color(d.tech))
          .attr('fill-opacity', 0.8)
          .attr('stroke', 'white')
          .attr('stroke-width', 1)
          .on('mouseenter', (event, d) => {
            // Tooltip shows brand, tech, model count, and metrics.
            tooltip.style('opacity', 1)
              .html(`<strong>${d.brand}</strong><br>${d.tech} (${d.count} models)<br>${formatStar(d.star_rating)} stars - ${formatKwh(d.annual_kwh)} kWh/yr`)
              .style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mousemove', event => {
            tooltip.style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mouseleave', () => {
            tooltip.style('opacity', 0);
          }),
        update => update
          .attr('cx', d => xScale(d.star_rating))
          .attr('cy', d => yScale(d.annual_kwh))
          .attr('r', d => rScale(d.diagonal_inch))
      );
    }

    render();
    window.addEventListener('resize', render);
  });
})();
