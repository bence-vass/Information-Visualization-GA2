

const aaplRaw = await d3.csv("../aapl.csv", d3.autoType);
const aapl = aaplRaw.slice(0, 20);
const aapl2 = aapl.map(item => ({ ...item, close: item.close + 25. }))

console.log(aapl);
console.log(aapl2)

const width = 500;
const height = 500;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;





const tooltip = d3.select("#tooltipLineChart")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "white")
    .style("padding", "5px 10px")
    .style("border-radius", "4px")
    .style("pointer-events", "none") // ignore mouse events
    .style("opacity", 0); // hidden initially


const svg = d3.select("#lineChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "border:5px solid blue; background-color:white")

let x = null
let y = null
let line = null

const newLineChartData = (data) => {

    if (Array.isArray(data) && data.every(Array.isArray)) {
        const flat = data.flat()
        data = flat
    }

    x = d3.scaleUtc(d3.extent(data, d => d.date), [marginLeft, width - marginRight]);
    y = d3.scaleLinear(d3.extent(data, d => d.close), [height - marginBottom, marginTop]);


    line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.close));

}

let isLineChartRefreshing = false
const updateLineChart = (data) => {
    console.log("updating", data)
    isLineChartRefreshing = true

    svg.selectAll("*").remove()

    const vLine = svg.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom)
        .style("opacity", 0) // hidden initially
        .style("z-index", 9)

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))


    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(height / 40))

    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
        data = [data]; // wrap in an array
    }

    data.forEach(item => {
        console.log("item", item)
        const circles = svg.append("g")
            .selectAll("circle")
            .data(item)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.close))
            .attr("r", 0)
            .attr("fill", "red")
            .attr("stroke", "black")
            .style("z-index", 10)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .raise()
                    .transition()
                    .duration(250)
                    .attr("r", 12); // increase radius

                tooltip
                    .transition()
                    .duration(100)
                    .style("opacity", 1);
                tooltip.html(`Date: ${d.date.toLocaleDateString()}<br>Close: $${d.close}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 25) + "px");

                vLine
                    .attr("x1", x(d.date))
                    .attr("x2", x(d.date))
                    .transition()
                    .duration(150)
                    .style("opacity", 1);

            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 25) + "px");
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0);
                d3.select(this)
                d3.select(this)
                    .transition()
                    .duration(250)
                    .attr("r", 4);   // shrink back

                vLine.transition().duration(150).style("opacity", 0);
            });


        circles.transition()
            .delay((d, i) => i * 50)
            .duration(500)
            .attr("r", 4)
            .on("end", (d, i) => {
                if (i == item.length - 1) {
                    console.log("drawLine called")
                    drawLine(item)
                }
            })

    });





    const drawLine = (data) => {
        console.log("draw")
        const path = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("stroke", "steelblue")
            .attr("d", line)
            .lower()

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", (d, i) => {
                isLineChartRefreshing = false
            })
            

    }

}

const dataToPlot = [aapl, aapl2]
newLineChartData(dataToPlot)
updateLineChart(dataToPlot)


const refreshBtnE = document.getElementById("refreshBtn")
refreshBtnE.addEventListener("click", e => {
    console.log(isLineChartRefreshing)
    if (!isLineChartRefreshing) {
        console.log("refreshing Chart")
        updateLineChart(dataToPlot)
    }
})


const series = [
  { name: "Apples", color: "steelblue" },
  { name: "Bananas", color: "orange" }
];

const legend = svg.append("g")
  .attr("transform", `translate(${width-marginLeft-marginRight-20},20)`)  // adjust position
  .attr("class", "legend");

const legendBg = legend.append("rect")
    .attr("fill", "#c34040ff")


const legendItem = legend.selectAll(".legend-item")
  .data(series)
  .enter()
  .append("g")
  .attr("class", "legend-item")
  .attr("transform", (d, i) => `translate(0, ${i * 20})`);

// Add legend color boxes
legendItem.append("rect")
  .attr("width", 12)
  .attr("height", 12)
  .attr("fill", d => d.color);

// Add legend text
legendItem.append("text")
  .attr("x", 18)
  .attr("y", 10)
  .text(d => d.name)
  .style("font-size", "12px");

const legendBoundingBox = legend.node().getBBox()
legendBg
  .attr("width", legendBoundingBox.width + 10)
  .attr("height", legendBoundingBox.height + 10)
  .attr("transform", `translate(-5, -5)`)  // adjust position
