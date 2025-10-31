(function(){
  // Donut chart summarising average labelled energy by screen technology.
  const container = d3.select('#donut-chart');
  if(container.empty()) return; // Abort if the layout does not include the donut card.

  // Persistent SVG scaffold for responsive rendering.
  const svg = container.append('svg');
  const plot = svg.append('g').attr('class', 'plot');
  const tooltip = container.append('div').attr('class', 'chart-tooltip');

  // Load the supplied roll-up that averages annual energy by technology.
  d3.csv('data/Ex5_TV_energy_Allsizes_byScreenType.csv', d => {
    const tech = d['Screen_Tech'] ? String(d['Screen_Tech']).trim() : '';
    const value = d['Mean(Labelled energy consumption (kWh/year))'];
    const meanKwh = value !== undefined && value !== null && value !== '' ? +value : null;
    return tech && Number.isFinite(meanKwh) ? {tech, value: meanKwh} : null;
  }).then(rows => {
    const averages = rows.filter(Boolean);
    if(!averages.length) return;

    const sorted = averages.slice().sort((a, b) => d3.descending(a.value, b.value));

    // Palette shared between chart and legend.
    const color = d3.scaleOrdinal(sorted.map(d => d.tech), d3.schemeTableau10);
    const totalKwh = d3.sum(sorted, d => d.value);
    const formatKwh = d3.format(',.0f');

    // Legend lines up with the surrounding card text.
    const parentCard = d3.select(container.node().parentNode);
    const legend = parentCard.selectAll('.chart-legend.donut').data([null]).join('div')
      .attr('class', 'chart-legend donut');

    legend.selectAll('span')
      .data(sorted)
      .join('span')
      .style('--swatch-color', d => color(d.tech))
      .text(d => `${d.tech} - ${formatKwh(d.value)} kWh`);

    // Arc generators reused during each resize.
    const arcGen = d3.arc();
    const pie = d3.pie().value(d => d.value).sort(null);

    function render(){
      // Scale the donut to the card width while keeping a minimum height.
      const width = container.node().clientWidth || 320;
      const height = Math.max(260, Math.round(width * 0.7));
      const radius = Math.min(width, height) / 2 - 12;
      const innerRadius = radius * 0.55;

      svg.attr('width', width).attr('height', height);
      plot.attr('transform', `translate(${width / 2},${height / 2})`);

      arcGen.innerRadius(innerRadius).outerRadius(radius).cornerRadius(6);

      // Slice paths keyed by technology so the transitions stay consistent.
      const slices = plot.selectAll('path.slice').data(pie(sorted), d => d.data.tech);

      slices.join(
        enter => enter.append('path')
          .attr('class', 'slice')
          .attr('fill', d => color(d.data.tech))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .each(function(d){ this._current = d; })
          .attr('d', arcGen)
          .on('mouseenter', (event, d) => {
            // Tooltip explains the average labelled energy and relative share.
            const percent = ((d.data.value / totalKwh) * 100).toFixed(1);
            tooltip.style('opacity', 1)
              .html(`<strong>${d.data.tech}</strong><br>${formatKwh(d.data.value)} kWh average consumption<br>${percent}% of combined mean`)
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
      const labelGroup = plot.selectAll('text.slice-label').data(pie(sorted), d => d.data.tech);
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
