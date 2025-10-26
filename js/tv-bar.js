(function(){
  // Bar chart comparing average kWh for 55-inch TVs by technology.
  const container = d3.select('#bar-chart');
  if(container.empty()) return; // Skip running if the layout omits this chart.

  // Static SVG markup that will be resized on demand.
  const svg = container.append('svg');
  const plot = svg.append('g').attr('class', 'plot');
  const tooltip = container.append('div').attr('class', 'chart-tooltip');

  // Load and coerce the data necessary to compute technology averages.
  d3.csv('data/Ex5_TV_energy.csv', d => {
    const size = d.screensize ? +d.screensize : null;
    const energy = d.energy_consumpt ? +d.energy_consumpt : null;
    const stars = d.star2 ? +d.star2 : null;
    const count = d.count ? +d.count : 0;
    return {
      tech: d.screen_tech,
      diagonal_inch: Number.isFinite(size) ? size : null,
      annual_kwh: Number.isFinite(energy) ? energy : null,
      star_rating: Number.isFinite(stars) ? stars : null,
      count: Number.isFinite(count) && count > 0 ? count : 0
    };
  }).then(rows => {
    // We only need rows that represent 55-inch models with usable energy data.
    const filtered = rows.filter(d => d.diagonal_inch != null && Math.abs(d.diagonal_inch - 55) < 0.5 && d.annual_kwh != null && d.count > 0);
    if(!filtered.length) return;

    // Weighted mean energy consumption for each technology bucket.
    const summaries = d3.rollups(
      filtered,
      values => {
        const totalEnergy = d3.sum(values, v => v.annual_kwh * v.count);
        const totalModels = d3.sum(values, v => v.count);
        return totalModels ? {average: totalEnergy / totalModels, models: totalModels} : null;
      },
      d => d.tech
    )
      .map(([tech, summary]) => summary ? {tech, value: summary.average, models: summary.models} : null)
      .filter(Boolean)
      .sort((a, b) => d3.ascending(a.value, b.value));

    if(!summaries.length) return;

    const color = d3.scaleOrdinal(summaries.map(d => d.tech), d3.schemeTableau10);
    const formatKwh = d3.format(',.0f');

    // Display a legend so viewers know which bar belongs to which tech.
    const parentCard = d3.select(container.node().parentNode);
    const legend = parentCard.selectAll('.chart-legend.bar').data([null]).join('div')
      .attr('class', 'chart-legend bar');

    legend.selectAll('span')
      .data(summaries)
      .join('span')
      .style('--swatch-color', d => color(d.tech))
      .text(d => `${d.tech} (${d.models} models)`);

    const margin = {top: 24, right: 20, bottom: 64, left: 80};

    function render(){
      // Resize the SVG based on the card width for responsiveness.
      const width = container.node().clientWidth || 320;
      const height = Math.max(320, Math.round(width * 0.65));

      svg.attr('width', width).attr('height', height);
      plot.attr('transform', `translate(${margin.left},${margin.top})`);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const xScale = d3.scaleBand()
        .domain(summaries.map(d => d.tech))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(summaries, d => d.value) * 1.15])
        .range([innerHeight, 0]);

      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale).ticks(6);

      const xAxisGroup = plot.selectAll('.axis--x').data([null]).join('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      // Angle the category labels so they do not overlap on narrow screens.
      xAxisGroup.selectAll('text').attr('transform', 'rotate(-25)').style('text-anchor', 'end');

      xAxisGroup.selectAll('.axis-label').data([null]).join('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', 50)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Screen technology');

      const yAxisGroup = plot.selectAll('.axis--y').data([null]).join('g')
        .attr('class', 'axis axis--y')
        .call(yAxis);

      yAxisGroup.selectAll('.axis-label').data([null]).join('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -56)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Average annual energy use (kWh)');

      const bars = plot.selectAll('rect.bar')
        .data(summaries, d => d.tech);

      bars.join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => xScale(d.tech))
          .attr('width', xScale.bandwidth())
          .attr('y', innerHeight)
          .attr('height', 0)
          .attr('fill', d => color(d.tech))
          .on('mouseenter', (event, d) => {
            // Tooltip combines the weighted average with the sample size.
            tooltip.style('opacity', 1)
              .html(`<strong>${d.tech}</strong><br>${formatKwh(d.value)} kWh per year on average<br>${d.models} models analysed`)
              .style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mousemove', event => {
            tooltip.style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mouseleave', () => tooltip.style('opacity', 0))
          .transition()
          .duration(600)
          .attr('y', d => yScale(d.value))
          .attr('height', d => innerHeight - yScale(d.value)),
        update => update
          .attr('x', d => xScale(d.tech))
          .attr('width', xScale.bandwidth())
          .attr('y', d => yScale(d.value))
          .attr('height', d => innerHeight - yScale(d.value))
      );
    }

    render();
    window.addEventListener('resize', render);
  });
})();
