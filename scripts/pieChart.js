import { SELECTED_DATA } from "./brush.js";


// counts the elements in the largest n-1 bucket, creates one for the rest
const getPieData = (selectedData, topN) => {
    if (!selectedData || selectedData.length === 0) return [];
    let pieData = [];
    topN = (topN !== null) ? topN - 1 : 9
    const grouppedData = d3.rollups(selectedData,
        v => d3.sum(v, d => 1),
        d => d.ObjectName
    ).map(([key, value]) => ({ ObjectName: key, Count: value }));


    const sorted = grouppedData.sort((a, b) => d3.descending(a.Count, b.Count));
    pieData = sorted.slice(0, topN);
    const restData = sorted.slice(topN)
    const restCount = d3.sum(restData, d => d.Count)
    pieData.push({ ObjectName: "Other", Count: restCount })
    return pieData;
}


const pieChartTopInputEl = document.getElementById("pieChartTopInput")
export let NO_CATEGORIES_PIE = pieChartTopInputEl.value

pieChartTopInputEl.addEventListener("change", e => {
    // console.log("changing top n line")
    NO_CATEGORIES_PIE = e.target.value
    updatePieChart(SELECTED_DATA, NO_CATEGORIES_PIE)
})



const width = 700
const height = 300
const outerRadius = height / 2 - 10;
const innerRadius = outerRadius * 0.55;
const tau = 2 * Math.PI;
const color = d3.scaleOrdinal(d3.schemeObservable10);
const offsetX = (-width / 2) + 200
const offsetY = (-height / 2)
const svg = d3.select("#pieChart")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [offsetX, offsetY, width, height])
    // .attr("style", "border:5px solid blue; background-color:white")

const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)

const pie = d3.pie().sort(null).value(d => d.Count)


export const updatePieChart = (rawData, topN) => {

    // create pie chart data from the new selection
    const data = getPieData(rawData, topN)
    console.debug("Pie Chart Data", data)

    // Clean svg
    svg.selectAll("*").remove()

    const path = svg.append("g")
        .attr("class", "pieArcs")
        .selectAll("path")
        .data(pie(data))
        .join("path")
        .attr("fill", (d, i) => color(i))
        .attr("d", arc)
        .each(function (d) {
            // start with 0 angel to animate
            this._current = {
                startAngle: 0,
                endAngle: 0,
                data: d.data
            };
        })
        .transition()
        .duration(1500)
        .ease(d3.easeExpOut)
        .attrTween("d", arcTween);



    function arcTween(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(0);
        return (t) => arc(i(t));
    }

    const addLegendPieChart = (data) => {
        const labelGroup = svg.append("g").attr("class", "pieLegend")

        const labels = labelGroup.selectAll(".legend-item")
            .data(pie(data))
            .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 25})`); // 25px spacing

        // Color squares
        labels.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", (d, i) => color(i));


        const total = d3.sum(data, d => d.Count);

        // Text labels
        labels.append("text")
            .attr("x", 20)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("fill", "#fff")
            .text(d => {
                const percentage = ((d.data.Count / total) * 100).toFixed(1);
                return `${d.data.ObjectName}: ${d3.format(",")(d.data.Count)} (${percentage}%)`;
            });

        const labelGroupBoundingBox = labelGroup.node().getBBox()
        labelGroup.attr("transform", `translate(${
            offsetX //viewBox offset
            + width // move to right
            // - labelGroupBoundingBox.width // keep group visible
            - 350 // margin
            }, ${
            offsetY //viewBox offset
            // + 20 // margin
            })`);
    }
    addLegendPieChart(data)

}



const refreshPieChartBtnEl = document.getElementById("refreshPieChartBtn")
refreshPieChartBtnEl.addEventListener("click", e => {
    updatePieChart(SELECTED_DATA, NO_CATEGORIES_PIE)
})

