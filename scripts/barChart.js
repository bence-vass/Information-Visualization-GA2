import { SELECTED_DATA } from "./brush.js";

const width = 900;
const height = 500;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 150;


const barChartTopInputEl = document.getElementById("barChartTopInput")
export let NO_CATEGORIES_BAR = barChartTopInputEl.value

barChartTopInputEl.addEventListener("change", e => {
    // console.log("changing top n line")
    NO_CATEGORIES_BAR = e.target.value
    updateBarChart(SELECTED_DATA, NO_CATEGORIES_BAR)
})



const color = d3.scaleOrdinal(d3.schemeTableau10);


// counts the elements in the largest n-1 bucket, creates one for the rest
const getBarData = (selectedData, topN) => {
    if (!selectedData || selectedData.length === 0) return [];
    let barData = [];
    topN = (topN !== null) ? topN - 1 : 9
    const grouppedData = d3.rollups(selectedData,
        v => d3.sum(v, d => 1),
        d => d.ObjectName
    ).map(([key, value]) => ({ ObjectName: key, Count: value }));


    const sorted = grouppedData.sort((a, b) => d3.descending(a.Count, b.Count));
    barData = sorted.slice(0, topN);
    const restData = sorted.slice(topN)
    const restCount = d3.sum(restData, d => d.Count)
    barData.push({ ObjectName: "Other", Count: restCount })
    return barData;
}



// Create the SVG container.
const svg = d3.select("#barChart")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")
// .attr("style", "border:5px solid blue; background-color:aqua")


let x;
let y;
let format
export const initBarChart = (data) => {

    x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Count)])
        .range([marginLeft, width - marginRight]);

    y = d3.scaleBand()
        .domain(d3.sort(data, d => -d.Count).map(d => d.ObjectName))
        .rangeRound([marginTop, height - marginBottom])
        .padding(0.1);

    // Create a value format.
    // format = x.tickFormat(10, "%");
}


export const updateBarChart = (data, topN) => {

    const barData = getBarData(data, topN)
    console.log(barData)

    initBarChart(barData)

    svg.selectAll("*").remove()

    // Append a rect for each letter.
    svg.append("g")
        .selectAll()
        .data(barData)
        .join("rect")
        .attr("x", x(0))
        .attr("y", (d) => y(d.ObjectName))
        .attr("fill", (d, i) => color(i))
        .transition()
        .duration(500)
        .attr("width", (d) => x(d.Count) - x(0))
        .attr("height", y.bandwidth())
        .on("end", d => {
            addLabel()
        })

    const addLabel = () => {
        // Append a label for each letter.
        svg.append("g")
            .attr("fill", "#fff")
            .attr("text-anchor", "end")
            .selectAll()
            .data(barData)
            .join("text")
            .attr("font-size", 12)
            .attr("x", (d) => x(d.Count))
            .attr("y", (d) => y(d.ObjectName) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("dx", -4)
            .text((d) => d.Count)
            .call((text) => text.filter(d => x(d.Count) - x(0) < 100) // short bars
                .attr("dx", +4)
                .attr("fill", "#fff")
                .attr("text-anchor", "start"))
            .attr("opacity", 0)
            .transition()
            .duration(700)
            .ease(d3.easeLinear)
            .attr("opacity", 1)
    }

    // Create the axes.
    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(d3.axisTop(x).ticks(width / 80))
        .call(g => g.select(".domain").remove());

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0))
        .attr("font-size", 14)


}





const refreshBarChartBtnEl = document.getElementById("refreshBarChartBtn")
if (refreshBarChartBtnEl) {
    refreshBarChartBtnEl.addEventListener("click", e => {
        updateBarChart(SELECTED_DATA, NO_CATEGORIES_BAR)
    })
}


