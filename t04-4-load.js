
// Load the tvBrandCount.csv file from /data
// d3.csv("data/tvBrandCount.csv", d => {
// console.log(d); // inspect raw rows as they stream in
// });


// d3.csv("data/tvBrandCount.csv", d => {
//     return {
//         brand: d.brand,
//         count: +d.count // '+' converts string to number
//     };
//     }).then(data => {
//     console.log(data); // array of typed objects
// });

// function createBarChart(data) {
//   console.log("createBarChart received", data.length, "rows");
// }
/* Load CSV, Convert Type, Quick Check */
d3.csv("data/tvBrandCount.csv", d => ({
    brand: d.brand,
    count: +d.count
})).then(data => {
// Quick check
    console.log(data); // whole array
    console.log("rows:", data.length);
    console.log("max:", d3.max(data, d => d.count));
    console.log("min:", d3.min(data, d => d.count));
    console.log("extent:", d3.extent(data, d => d.count)); // [min, max]
    //Optional: sort for easier reading (descending by count)
    data.sort((a, b) => d3.descending(a.count, b.count));
    // Hand off to the chart builder (implemented next exercise)
    createBarChart(data);
});