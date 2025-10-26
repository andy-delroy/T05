(function(){
  // Donut chart summarising total annual energy by screen technology.
  const container = d3.select('#donut-chart');
  if(container.empty()) return; // Abort if the layout does not include the donut card.

  // Persistent SVG scaffold for responsive rendering.
  const svg = container.append('svg');
  const plot = svg.append('g').attr('class', 'plot');
  const tooltip = container.append('div').attr('class', 'chart-tooltip');

  // Load the TV dataset and pull out the numeric fields we need.
  d3.csv('data/Ex5_TV_energy.csv', d => {
    const energy = d.energy_consumpt ? +d.energy_consumpt : null;
    const count = d.count ? +d.count : 0;
    return {
      tech: d.screen_tech,
      annual_kwh: Number.isFinite(energy) ? energy : null,
      count: Number.isFinite(count) && count > 0 ? count : 0
    };
  }).then(rows => {
    // Only keep entries that can contribute to the energy totals.
    const usable = rows.filter(d => d.annual_kwh != null && d.count > 0);
    if(!usable.length) return;

    // Roll up total energy and model counts for each technology bucket.
    const totals = d3.rollups(
      usable,
      values => {
        const totalEnergy = d3.sum(values, v => v.annual_kwh * v.count);
        const totalModels = d3.sum(values, v => v.count);
        return {totalEnergy, totalModels};
      },
      d => d.tech
    )
      .map(([tech, summary]) => ({
        tech,
        value: summary.totalEnergy,
        models: summary.totalModels
      }))
      .filter(d => d.value > 0 && d.models > 0)
      .sort((a, b) => d3.descending(a.value, b.value));

    if(!totals.length) return;

    // Palette shared between chart and legend.
    const color = d3.scaleOrdinal(totals.map(d => d.tech), d3.schemeTableau10);
    const totalKwh = d3.sum(totals, d => d.value);
    const formatKwh = d3.format(',.0f');

    // Legend lines up with the surrounding card text.
    const parentCard = d3.select(container.node().parentNode);
    const legend = parentCard.selectAll('.chart-legend.donut').data([null]).join('div')
      .attr('class', 'chart-legend donut');

    legend.selectAll('span')
      .data(totals)
      .join('span')
      .style('--swatch-color', d => color(d.tech))
      .text(d => `${d.tech} (${d.models} models)`);

    // Arc generators reused during each resize.
    const arcGen = d3.arc();
    const pie = d3.pie().value(d => d.value).sort(null);

    function render(){
      // Scale the donut to the card width while keeping a minimum height.
      const width = container.node().clientWidth || 320;
      const height = Math.max(320, Math.round(width * 0.8));
      const radius = Math.min(width, height) / 2 - 12;
      const innerRadius = radius * 0.55;

      svg.attr('width', width).attr('height', height);
      plot.attr('transform', `translate(${width / 2},${height / 2})`);

      arcGen.innerRadius(innerRadius).outerRadius(radius).cornerRadius(6);

      // Slice paths keyed by technology so the transitions stay consistent.
      const slices = plot.selectAll('path.slice').data(pie(totals), d => d.data.tech);

      slices.join(
        enter => enter.append('path')
          .attr('class', 'slice')
          .attr('fill', d => color(d.data.tech))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .each(function(d){ this._current = d; })
          .attr('d', arcGen)
          .on('mouseenter', (event, d) => {
            // Tooltip explains total energy, model count, and share.
            const percent = ((d.data.value / totalKwh) * 100).toFixed(1);
            tooltip.style('opacity', 1)
              .html(`<strong>${d.data.tech}</strong><br>${formatKwh(d.data.value)} kWh across ${d.data.models} models<br>${percent}% of total energy`)
              .style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mousemove', event => {
            tooltip.style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`);
          })
          .on('mouseleave', () => tooltip.style('opacity', 0)),
        update => update
          .attr('d', arcGen)
      );

      // Center labels show rounded percentages for a quick read.
      const labelGroup = plot.selectAll('text.slice-label').data(pie(totals), d => d.data.tech);
      labelGroup.join(
        enter => enter.append('text')
          .attr('class', 'slice-label')
          .attr('dy', '0.35em')
          .attr('fill', 'currentColor')
          .style('font-size', '0.8rem')
          .style('text-anchor', 'middle'),
        update => update
      )
        .attr('transform', d => `translate(${arcGen.centroid(d)})`)
        .text(d => `${Math.round((d.data.value / totalKwh) * 100)}%`);
    }

    render();
    window.addEventListener('resize', render);
  });
})();
