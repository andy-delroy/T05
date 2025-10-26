(function(){
  // Multi-line chart of wholesale spot prices per NEM region.
  const container = d3.select('#line-chart');
  if(container.empty()) return; // Exit early if the card is not in the DOM.

  // Static SVG scaffold for responsive updates.
  const svg = container.append('svg');
  const plot = svg.append('g').attr('class', 'plot');
  const tooltip = container.append('div').attr('class', 'chart-tooltip');

  // Helpers for parsing year strings and formatting labels.
  const parseYear = d3.timeParse('%Y');
  const formatYear = d3.timeFormat('%Y');
  const columnAlias = new Map([
    ['Queensland ($ per megawatt hour)', 'Queensland'],
    ['New South Wales ($ per megawatt hour)', 'New South Wales'],
    ['Victoria ($ per megawatt hour)', 'Victoria'],
    ['South Australia ($ per megawatt hour)', 'South Australia'],
    ['Tasmania ($ per megawatt hour)', 'Tasmania'],
    ['Snowy ($ per megawatt hour)', 'Snowy'],
    ['Average Price (notTas-Snowy)', 'NEM average']
  ]);
  const preferredOrder = ['Queensland', 'New South Wales', 'Victoria', 'South Australia', 'Tasmania', 'NEM average'];
  const formatPrice = d3.format(',.0f');

  // Load the Ex5 wholesale price data.
  d3.csv('data/Ex5_ARE_Spot_Prices.csv').then(raw => {
    const tidy = [];

    // Reshape the wide CSV into tidy records (year, state, price).
    raw.forEach(row => {
      const yearValue = row['Year'] ? String(row['Year']).trim() : '';
      const date = parseYear(yearValue);
      if(!date) return;

      Object.keys(row).forEach(key => {
        if(key === 'Year') return;
        const value = row[key];
        if(value === undefined || value === null || value === '') return;
        const price = +value;
        if(!Number.isFinite(price)) return;
        const alias = (columnAlias.get(key) || key).replace(/\s*\(\$ per megawatt hour\)/, '').trim();
        tidy.push({date, state: alias, price});
      });
    });

    if(!tidy.length) return;

    // Group rows by state and sort chronologically so the line path is valid.
    const byState = d3.group(tidy, d => d.state);
    byState.forEach(values => values.sort((a, b) => d3.ascending(a.date, b.date)));

    // Prefer familiar state ordering, but push unknown labels to the end.
    const states = Array.from(byState.entries())
      .filter(([, values]) => values.length >= 3)
      .map(([state]) => state)
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a);
        const bi = preferredOrder.indexOf(b);
        if(ai === -1 && bi === -1) return d3.ascending(a, b);
        if(ai === -1) return 1;
        if(bi === -1) return -1;
        return ai - bi;
      });

    const filteredRows = tidy.filter(d => states.includes(d.state));
    if(!filteredRows.length) return;

    // Shared colour palette for lines, dots, and legend swatches.
    const color = d3.scaleOrdinal(states, d3.schemeTableau10);

    // Inject the legend into the surrounding card once.
    const parentCard = d3.select(container.node().parentNode);
    const legend = parentCard.selectAll('.chart-legend.line').data([null]).join('div')
      .attr('class', 'chart-legend line');

    legend.selectAll('span')
      .data(states)
      .join('span')
      .style('--swatch-color', state => color(state))
      .text(state => state);

    const margin = {top: 32, right: 32, bottom: 56, left: 72};

    let xScale = d3.scaleTime();
    let yScale = d3.scaleLinear();
    const lineGen = d3.line()
      .defined(d => d.price != null)
      .curve(d3.curveMonotoneX);

    const gridGroup = plot.append('g').attr('class', 'line-chart-grid');

    function render(){
      // Size the chart according to its container width.
      const width = container.node().clientWidth || 320;
      const height = Math.max(360, Math.round(width * 0.65));

      svg.attr('width', width).attr('height', height);
      plot.attr('transform', `translate(${margin.left},${margin.top})`);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      xScale = d3.scaleTime()
        .domain(d3.extent(filteredRows, d => d.date))
        .range([0, innerWidth]);

      yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredRows, d => d.price) * 1.1])
        .nice()
        .range([innerHeight, 0]);

      const line = lineGen
        .x(d => xScale(d.date))
        .y(d => yScale(d.price));

      const xAxis = d3.axisBottom(xScale)
        .ticks(Math.min(10, innerWidth / 80))
        .tickFormat(formatYear);

      const yAxis = d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => `$${formatPrice(d)}`);

      // Horizontal grid lines for easier price comparisons.
      gridGroup.attr('transform', 'translate(0,0)');
      gridGroup.selectAll('line')
        .data(yScale.ticks(6))
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d));

      const xAxisGroup = plot.selectAll('.axis--x').data([null]).join('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.selectAll('.axis-label').data([null]).join('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', 44)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .text('Year');

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
        .text('Wholesale price ($/MWh)');

      // Draw one path per state using the tidy grouped data.
      const stateLines = plot.selectAll('path.state-line')
        .data(states.map(state => ({state, values: byState.get(state)})), d => d.state);

      stateLines.join(
        enter => enter.append('path')
          .attr('class', 'state-line')
          .attr('fill', 'none')
          .attr('stroke-width', 2.5)
          .attr('stroke', d => color(d.state))
          .attr('d', d => line(d.values)),
        update => update
          .attr('stroke', d => color(d.state))
          .attr('d', d => line(d.values))
      );

      // Dots that follow the cursor for cheap focus highlighting.
      let focusDots = plot.selectAll('circle.focus-dot')
        .data(states, d => d);

      focusDots = focusDots.join(
        enter => enter.append('circle')
          .attr('class', 'focus-dot')
          .attr('r', 4)
          .attr('fill', state => color(state))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .style('opacity', 0),
        update => update
          .attr('fill', state => color(state))
      );

      svg.on('mousemove', event => {
        // Convert pointer position into a nearby year for all series.
        const [mx, my] = d3.pointer(event, plot.node());
        if(mx < 0 || mx > innerWidth || my < 0 || my > innerHeight){
          tooltip.style('opacity', 0);
          focusDots.style('opacity', 0);
          return;
        }

        const hoveredDate = xScale.invert(mx);
        const bisect = d3.bisector(d => d.date).left;
        let tooltipRows = '';
        let anyVisible = false;
        let headerYear = null;

        focusDots.each(function(state){
          const values = byState.get(state);
          const index = bisect(values, hoveredDate);
          const prev = values[Math.max(index - 1, 0)];
          const next = values[Math.min(index, values.length - 1)];
          const datum = !prev ? next : !next ? prev : (hoveredDate - prev.date > next.date - hoveredDate ? next : prev);
          if(!datum) return;

          d3.select(this)
            .attr('cx', xScale(datum.date))
            .attr('cy', yScale(datum.price))
            .style('opacity', 1);

          tooltipRows += `<div><strong>${state}</strong>: $${formatPrice(datum.price)}</div>`;
          anyVisible = true;
          if(!headerYear) headerYear = datum.date;
        });

        if(anyVisible){
          tooltip.style('opacity', 1)
            .html(`<strong>${formatYear(headerYear || hoveredDate)}</strong>${tooltipRows}`)
            .style('left', `${event.offsetX + 16}px`)
            .style('top', `${event.offsetY - 20}px`);
        } else {
          tooltip.style('opacity', 0);
        }
      });

      svg.on('mouseleave', () => {
        tooltip.style('opacity', 0);
        focusDots.style('opacity', 0);
      });
    }

    render();
    window.addEventListener('resize', render);
  });
})();
