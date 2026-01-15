import { dataPromise } from "../script.js";
import { updatePieChart, NO_CATEGORIES_PIE } from "./pieChart.js";
import { getLineData, NO_CATEGORIES_LINE, SHIFT, updateLineChart } from "./lineChart.js";
import { NO_CATEGORIES_BAR, updateBarChart } from "./barChart.js";
import { updateWordCloud } from "./wordCloud.js";
import { updateDepartmentPieChart } from "./pieChartDepartment.js";


// Time Period Selection Brush
// ================================================================================= //
// https://observablehq.com/@d3/brush-snapping-transitions

const width = 900
const height = 45
const margin = ({ top: 10, right: 20, bottom: 20, left: 20 })

// Selected Data Update
export let SELECTED_DATA = null;
export let DEPARTMENT_FILTER = null; // Department filter for bidirectional linking
export let yearFilteredData = null; // Data filtered only by year (NOT by department) - for pie chart
let selectedDateMin = null
let selectedDateMax = null
let DATA = []
let x = null

// Export function to set department filter
export const setDepartmentFilter = (department) => {
    DEPARTMENT_FILTER = department;

    // Use requestAnimationFrame to defer updates and avoid blocking
    requestAnimationFrame(() => {
        updateSelectedData(true); // Skip pie update since we just clicked on it
    });
}

// Export function to clear department filter
export const clearDepartmentFilter = () => {
    DEPARTMENT_FILTER = null;
    requestAnimationFrame(() => {
        updateSelectedData(true); // Skip pie update
    });
}

// actual selection of data
const updateSelectedData = (skipPieUpdate = false) => {
    // Guard against uninitialized date range  
    if (!selectedDateMin || !selectedDateMax) {
        return;
    }

    const minYear = selectedDateMin.getFullYear();
    const maxYear = selectedDateMax.getFullYear();

    // Filter data in chunks to avoid blocking the UI
    // Polyfill for browsers that don't support requestIdleCallback
    const scheduleCallback = (callback, options) => {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(callback, options);
        } else {
            setTimeout(callback, 0);
        }
    };

    scheduleCallback(() => {
        // Filter by year only
        let filteredByYear = DATA.filter(d => d.AccessionYear >= minYear && d.AccessionYear <= maxYear);
        yearFilteredData = filteredByYear; // Store year-filtered data for pie chart

        // Apply department filter if set (for other charts)
        let filteredData = filteredByYear;
        if (DEPARTMENT_FILTER) {
            filteredData = filteredData.filter(d => d.Department === DEPARTMENT_FILTER);
        }

        SELECTED_DATA = filteredData;

        // Update charts after filtering is complete
        requestAnimationFrame(() => {
            // updatePieChart(SELECTED_DATA, NO_CATEGORIES_PIE)

            // Pie chart always gets year-filtered data (ALL departments)
            if (!skipPieUpdate) {
                updateDepartmentPieChart(yearFilteredData);
            }

            updateLineChart(SELECTED_DATA, NO_CATEGORIES_LINE, SHIFT)

            updateBarChart(SELECTED_DATA, NO_CATEGORIES_BAR)

            updateWordCloud(SELECTED_DATA)
        });
    }, { timeout: 50 });
}

// Set Time Period Display
const setTimePeriod = (min, max) => {
    selectedDateMax = max
    selectedDateMin = min
    const text = `${d3.timeFormat("%b. %Y")(selectedDateMin)} - ${d3.timeFormat("%b. %Y")(selectedDateMax)}`;
    document.getElementById("timePeriod").innerText = text
    updateSelectedData();
}

// function called on brushing end, sets the time period
const brushEnded = (event) => {
    const selection = event.selection;
    const brushedYears = selection.map(x.invert);
    setTimePeriod(brushedYears[0], brushedYears[1]);
}


(async () => {
    console.log("waitnig")
    const res = await dataPromise
    const minX = res["minX"]
    const maxX = res["maxX"]
    DATA = res["DATA"]


    const svg = d3.select("#timelineChart")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
    // .attr("style", "border:5px solid red; background-color:white");
    
    // Background for timeline (important for light mode)
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#1f2937");

    x = d3.scaleTime()
        .domain([new Date(minX, 1, 1), new Date(maxX, 11, 31) - 1])
        .rangeRound([margin.left, width - margin.right])


    const xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(g =>
            // Tick on the x axis every 2 years
            g.append("g")
                .call(d3.axisBottom(x)
                    .ticks(d3.timeYear.every(2))
                    .tickSize(-height + margin.top + margin.bottom)
                    .tickFormat(() => null))
                .call(g => g.select(".domain")
                    .attr("fill", null)
                    .attr("stroke", "#fff"))
                .call(g => g.selectAll(".tick line")
                    .attr("stroke", "#fff")
                    .attr("stroke-opacity", d => d <= d3.timeDay(d) ? 1 : 0.5))
        ).call(g =>
            // Year labels on the x axis every 10 years
            g.append("g")
                .call(d3.axisBottom(x)
                    .ticks(d3.timeYear.every(10))
                    .tickPadding(0))
                .attr("text-anchor", null)
                .attr("style", "font-size: 10px; font-family: sans-serif; color: #fff")
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll("text").attr("x", 6))
        )

    svg.append("g")
        .call(xAxis)

    const brush = d3.brushX()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on("end", brushEnded);

    const brushGroup = svg.append("g")
        .call(brush);



    // Set default brush selection to last 5 years
    const defaultSelection = [
        x(new Date(maxX - 15, 0, 1)), // Start: 15 years before maxX
        x(new Date(maxX, 11, 31))    // End: last day of maxX
    ];
    brushGroup.call(brush.move, defaultSelection)

})()



// ================================================================================= //
// Time Period Selection Brush END