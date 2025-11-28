
import { SELECTED_DATA } from "./brush.js";

const width = 700;
const height = 500;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;


export const getLineData = (selectedData, topN) => {
    if (!selectedData || selectedData.length === 0) return [];
    topN = (topN !== null) ? topN : 10

    // Getting top N categories
    const grouppedData = d3.rollups(selectedData,
        v => d3.sum(v, d => 1),
        d => d.ObjectName
    ).map(([key, value]) => ({ ObjectName: key, Count: value }));

    const sorted = grouppedData.sort((a, b) => d3.descending(a.Count, b.Count));
    const shift = 5
    const topCategories = sorted.slice(
        // magic of js
        Number(0) + Number(shift),
        Number(topN) + Number(shift)
    ).map(d => d.ObjectName)

    // Filtering the data ( keep only from topN categories )
    const filteredData = selectedData.filter(d => topCategories.includes(d.ObjectName))

    const allYears = filteredData.map(d => d.AccessionYear)
    const minYear = Math.min(...allYears)
    const maxYear = Math.max(...allYears)

    const lineData = d3.rollups(filteredData,
        v => d3.sum(v, d => 1),
        d => d.ObjectName,
        d => d.AccessionYear
    ).map(
        ([objName, yearGroup], i) => {
            const objColor = color(i)
            const sortedYear = yearGroup.map(([year, count]) => ({
                Year: new Date(Date.UTC(year, 0, 1)),
                Count: count
            })).sort((a, b) => a.Year - b.Year)


            let commulative = 0;
            const commulativeData = sortedYear.map(d => {
                commulative += d.Count
                return {
                    Year: d.Year,
                    Count: commulative,
                    color: objColor
                }
            })
            return {
                name: objName,
                value: commulativeData
            }
        }
    )

    // Extend to min and max years
    lineData.forEach(objName => {
        const firstYear = objName.value[0].Year.getUTCFullYear()
        const lastYear = objName.value[objName.value.length - 1].Year.getUTCFullYear();

        if (firstYear > minYear) {
            objName.value.unshift({
                Year: new Date(Date.UTC(minYear, 0, 1)),
                Count: 0,
                support: true,
                color: objName.value[0].color
            })
        }

        if (lastYear < maxYear) {
            objName.value.push({
                Year: new Date(Date.UTC(maxYear, 0, 1)),
                Count: objName.value[objName.value.length - 1].Count,
                support: true,
                color: objName.value[0].color
            })
        }
    })

    console.log(lineData)

    return lineData
}


const tooltip = d3.select("#tooltipLineChart")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "white")
    .style("padding", "0.2rem 0.5rem")
    .style("border-radius", "5px")
    .style("pointer-events", "none") // ignore mouse events
    .style("opacity", 0); // hidden initially


const svg = d3.select("#lineChart")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
// .attr("style", "border:5px solid blue; background-color:aqua")


let x = null
let y = null
let line = null
const color = d3.scaleOrdinal(d3.schemeObservable10);


const lineChartTopInputEl = document.getElementById("lineChartTopInput")
export let NO_CATEGORIES_LINE = lineChartTopInputEl.value

export const initLineChart = (data) => {
    const flatData = data.flatMap(obj => obj.value)

    x = d3.scaleUtc(d3.extent(flatData, d => d.Year), [marginLeft, width - marginRight]);
    y = d3.scaleLinear([0, d3.max(flatData, d => d.Count)], [height - marginBottom, marginTop]);

    line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d.Count));

}

export let isLineChartRefreshing = false
export const updateLineChart = (data, topN) => {

    data = getLineData(data, topN)

    initLineChart(data)

    isLineChartRefreshing = true

    svg.selectAll("*").remove()

    const legend = addLegendLineChart(data)

    const vLine = svg.append("line")
        .attr("stroke", "#ffffffb4")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5")
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


    data.forEach((item, i) => {
        const itemIxd = i
        const category = item.name
        const itemData = item.value.sort((a, b) => d3.ascending(a.Year, b.Year))

        const circles = svg.append("g")
            .selectAll("circle")
            .data(itemData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.Year))
            .attr("cy", d => y(d.Count))
            .attr("r", 0)
            .attr("fill", d => d.color)
            .attr("stroke", d => d.color)
            .style("z-index", 10)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .raise()
                    .transition()
                    .duration(250)
                    .attr("r", 9); // increase radius

                tooltip
                    .transition()
                    .duration(100)
                    .style("opacity", 1);
                tooltip.html(`Item: ${category}<br>Date: ${d.Year.getUTCFullYear()}<br>Count: ${d.Count}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 25) + "px");

                vLine
                    .attr("x1", x(d.Year))
                    .attr("x2", x(d.Year))
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
            })
            .transition()
            .delay((d, i) => i * 50)
            .duration(500)
            .attr("r", (d, i) => d.support ? 0 : 4) // keep support values (min, max) hidden 
            .on("end", (d, i) => {
                if (i == itemData.length - 1) {
                    drawLine(itemData, d.color)
                }
            })

        setTimeout(() => {
            console.log("Finished Refreshing")
            isLineChartRefreshing = false
        }, 1000)

    });





    const drawLine = (data, color) => {

        const path = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("stroke", color)
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
    }

    // After rendering everthing raise legend on top
    legend.raise()

}



const addLegendLineChart = (data) => {


    const legend = svg.append("g")
        .attr("transform", `translate(${Number(marginLeft) + 20},20)`)  // adjust position
        .attr("class", "legend")
        .raise()

    const legendBg = legend.append("rect")
        .attr("fill", "none")

    const legendItem = legend.selectAll(".legend-item")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    // Add legend color boxes
    legendItem.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", (d, i) => color(i));

    // Add legend text
    legendItem.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", "#fff")
        .text(d => d.name)
        .style("font-size", "12px");

    const legendBoundingBox = legend.node().getBBox()
    legendBg
        .attr("width", legendBoundingBox.width + 10)
        .attr("height", legendBoundingBox.height + 10)
        .attr("transform", `translate(-5, -5)`)  // adjust position

    return legend
}



const refreshPieChartBtnEl = document.getElementById("refreshLineChartBtn")
refreshPieChartBtnEl.addEventListener("click", e => {
    // console.log("refresh")
    if (isLineChartRefreshing === true) {
        console.log("Already Refreshing...")
        return
    }
    updateLineChart(SELECTED_DATA, NO_CATEGORIES_LINE)
})

lineChartTopInputEl.addEventListener("change", e => {
    // console.log("changing top n line")
    NO_CATEGORIES_LINE = e.target.value
    updateLineChart(SELECTED_DATA, NO_CATEGORIES_LINE)
})

