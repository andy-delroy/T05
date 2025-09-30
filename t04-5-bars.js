
// t04-5-bars.js
// const createBarChart = (data) => {
//      const svg = d3.select(".responsive-svg-container")
//     .append("svg")
//     .attr("viewBox", "0 0 1200 400") // temporary; we’ll adjust layout soon
//     .style("border", "1px solid black"); // dev-only border so we see the canvas
//     svg
//     .selectAll("rect")
//     .data(data)
//     .join("rect")
//      .attr("class", d => {
//         console.log(d); //inspect each row in the Console
//         return `bar bar-${d.count}`; //"bar bar-859" 
//      })
//     .attr("width", d => d.count) // uses your numeric column directly
//     .attr("height", 16); // constant bar height 
// };


// const createBarChart = (data) => {
//     const viewW = 500, viewH = 1600;
//     const displayW = 640, displayH = 420;
//     const svg = d3.select(".responsive-svg-container")
//     .append("svg")
//     .attr("viewBox", `0 0 ${viewW} ${viewH}`)
//     .attr("width", displayW)
//     .attr("height", displayH)
//     .style("border", "1px solid black");
//     // X scale (numeric)
//     const xMax = d3.max(data, d => d.count);
//     const xScale = d3.scaleLinear()
//     .domain([0, xMax])
//     .range([0, viewW]);
//     // Y scale (categorical) — change 'brand' if your category column differs
//     const yScale = d3.scaleBand()
//     .domain(data.map(d => d.brand))
//     .range([0, viewH])
//     .paddingInner(0.2)
//     .paddingOuter(0.1);
//     // Bars
//     svg.selectAll("rect")
//     .data(data)
//     .join("rect")
//     .attr("class", d => `bar bar-${d.count}`)
//     .attr("x", 0)
//     .attr("y", d => yScale(d.brand))
//     .attr("width", d => xScale(d.count))
//     .attr("height", yScale.bandwidth())
//     .attr("fill", "steelblue");
// };

const createBarChart = (data) => {
// --- Sizes (logical vs. display) ---
const viewW = 500;
const viewH = Math.max(220, data.length * 28);
const displayW = 640;
const displayH = Math.min(480, data.length * 24 + 40);
// --- SVG root ---
const svg = d3.select(".responsive-svg-container")
.append("svg")
.attr("viewBox", `0 0 ${viewW} ${viewH}`)
.attr("width", displayW)
.attr("height", displayH)
.style("border", "1px solid #ccc");
// --- Scales (from T04-6) ---
const xMax = d3.max(data, d => d.count);
const xScale = d3.scaleLinear()
.domain([0, xMax])
.range([0, viewW]);
const yScale = d3.scaleBand()
.domain(data.map(d => d.brand)) 
.range([0, viewH])
.paddingInner(0.2)
.paddingOuter(0.1);
// OLD rectangle-only drawing block from T04-6 (COMMENTED OUT for T04-7). //
/* svg.selectAll("rect")
.data(data)
.join("rect")
.attr("class", d => `bar bar-${d.count}`)
.attr("x", 0) .attr("y", d => yScale(d.brand))
.attr("width", d => xScale(d.count))
.attr("height", yScale.bandwidth())
.attr("fill", "steelblue");
*/
// --- NEW in T04-7: group per row (bar + labels move together) ---
// Using x = 100 so labels align at 100 and bars start there too.
const labelX = 100;
const barAndLabel = svg
.selectAll("g")
.data(data)
.join("g")
.attr("transform", d => `translate(0, ${yScale(d.brand)})`);
// --- Bar rectangle inside the group ---
// y is 0 because the group sets vertical position via transform.
barAndLabel
.append("rect")
.attr("x", labelX) // bar starts at x = 100
.attr("y", 0)
.attr("width", d => xScale(d.count)) // scaled width fits the viewBox
.attr("height", yScale.bandwidth()) // bar thickness from band scale
.attr("fill", "steelblue");
// --- Category text (left of bar, right-aligned at x=100) ---
barAndLabel
.append("text")
.text(d => d.brand) // change if your category column differs
.attr("x", labelX)
.attr("y", 15) // adjust to center in the band
.attr("text-anchor", "end") // right-align so text ends at x=100
.style("font-family", "sans-serif")
.style("font-size", "13px");
// --- Value text (at the end of each bar) ---
barAndLabel
.append("text")
.text(d => d.count) // numeric label
.attr("x", d => labelX + xScale(d.count) + 4) // just past bar end
.attr("y", 12) // adjust as needed
.style("font-family", "sans-serif")
.style("font-size", "13px");
};