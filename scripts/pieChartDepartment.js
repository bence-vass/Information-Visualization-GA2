import { yearFilteredData, DEPARTMENT_FILTER, setDepartmentFilter, clearDepartmentFilter } from "./brush.js";

// Configuration
const width = 900;
const height = 500;
const radius = Math.min(width, height) / 1.5 - 150; // Subtract 150px margin to accommodate external labels
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Animation and timing constants
const ANIMATION_LOCK_DURATION = 800; // ms - Duration to prevent spam clicking

// Label filtering configuration
export let PIE_LABEL_PERCENT_THRESHOLD = 5;
export let PIE_LABEL_TOP_COUNT = 7;

// Animation lock to prevent spam clicking issues
let isAnimating = false;

// Setup input controls
const pieChartPercentInput = document.getElementById("pieChartPercentInput");
const pieChartTopInput = document.getElementById("pieChartTopInput");

if (pieChartPercentInput) {
    pieChartPercentInput.addEventListener("change", e => {
        const rawValue = e.target.value;
        const parsedValue = parseInt(rawValue, 10);

        // Accept only valid integer percentages between 0 and 100 (inclusive)  
        if (!Number.isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
            PIE_LABEL_PERCENT_THRESHOLD = parsedValue;
            if (yearFilteredData) {
                updateDepartmentPieChart(yearFilteredData);
            }
        } else {
            // Revert to the last valid value in the UI if input is invalid  
            e.target.value = PIE_LABEL_PERCENT_THRESHOLD;
        }
    });
}

if (pieChartTopInput) {
    pieChartTopInput.addEventListener("change", e => {
        const rawValue = e.target.value;
        const parsedValue = parseInt(rawValue, 10);
        // Accept only valid non-negative integers
        if (!Number.isNaN(parsedValue) && parsedValue >= 0) {
            PIE_LABEL_TOP_COUNT = parsedValue;
            if (yearFilteredData) {
                updateDepartmentPieChart(yearFilteredData);
            }
        } else {
            // Revert to the last valid value in the UI if input is invalid
            e.target.value = PIE_LABEL_TOP_COUNT;
        }
    });
}

// SVG container
const rootSvg = d3.select("#pieChartDepartment")
    .append("svg")
    // .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

const svg = rootSvg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

let svgElement = rootSvg;

// Arc generator
const arc = d3.arc()
    .innerRadius(radius / 4)  // Donut chart
    .outerRadius(radius);

// Pie layout
const pie = d3.pie()
    .value(d => d.Count)
    .sort(null);

// Process data by department
const getDepartmentData = (selectedData) => {
    if (!selectedData || selectedData.length === 0) return [];

    const departmentCounts = d3.rollups(
        selectedData.filter(d => d.Department), // Filter out undefined/null departments
        v => v.length,
        d => d.Department
    ).map(([department, count]) => ({
        Department: department,
        Count: count
    }));

    return departmentCounts.sort((a, b) => d3.descending(a.Count, b.Count));
}

export const updateDepartmentPieChart = (rawData) => {
    // Interrupt any ongoing transitions to prevent conflicts
    svg.interrupt();
    svgElement.interrupt();

    // Always use the full time-filtered data (ignoring department filter)
    // This keeps all departments visible and provides context
    const data = getDepartmentData(rawData);

    // Clean svg
    svg.selectAll("*").remove();

    if (!data || data.length === 0) {
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 0)
            .style("font-size", "14px")
            .style("fill", "#fff")
            .text("No data available for selected time period");
        return;
    }

    const total = d3.sum(data, d => d.Count);

    // Filter for labels using configurable thresholds
    const labelData = pie(data).filter((d, i) => {
        const pct = (d.value / total) * 100;
        return pct > PIE_LABEL_PERCENT_THRESHOLD || i < PIE_LABEL_TOP_COUNT;
    });

    svg.append("g")
        .attr("class", "pie-arcs")
        .selectAll("path")
        .data(pie(data))
        .join("path")
        .attr("fill", (d, i) => color(i))
        .attr("d", arc)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .each(function (d) {
            this._current = {
                startAngle: 0,
                endAngle: 0,
                data: d.data
            };
        })
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", 0.8);

            const percentage = ((d.data.Count / total) * 100).toFixed(1);
            d3.select("#tooltipDeptPie")
                .style("opacity", 1)
                .html(`
                    <strong>${d.data.Department}</strong><br/>
                    Objects: ${d3.format(",")(d.data.Count)}<br/>
                    ${percentage}% of selection
                    ${d.data.Department === DEPARTMENT_FILTER ? '<br/><em>(Active Filter - Click to clear)</em>' : '<br/><em>Click to filter</em>'}
                `);
        })
        .on("mousemove", function (event) {
            d3.select("#tooltipDeptPie")
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (event, d) {
            d3.select("#tooltipDeptPie").style("opacity", 0);
            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", 1);
        })
        .on("click", function (event, d) {
            event.stopPropagation();

            // Prevent spam clicking during animations
            if (isAnimating) return;

            const clickedDept = d.data.Department;

            // Set animation lock
            isAnimating = true;
            setTimeout(() => { isAnimating = false; }, ANIMATION_LOCK_DURATION);

            // Toggle filter: if clicking same department, clear filter; otherwise set new filter
            if (DEPARTMENT_FILTER === clickedDept) {
                clearDepartmentFilter();
            } else {
                setDepartmentFilter(clickedDept);
            }

            // Update filter indicator
            updateFilterIndicator();
        })
        .transition()
        .duration(750)
        .attrTween("d", arcTween);

    // Arc tween function
    function arcTween(d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return t => arc(interpolate(t));
    }

    // Add labels outside the pie
    const outerArc = d3.arc()
        .innerRadius(radius * 1.05)
        .outerRadius(radius * 1.05);

    // Add connecting lines
    const lines = svg.selectAll("polyline")
        .data(labelData, d => d.data.Department);

    lines.join(  
        enter => enter  
            .append("polyline")  
            .attr("class", "dept-slice-line")  
            .attr("stroke", "#9ca3af")  
            .attr("stroke-width", 1)  
            .attr("fill", "none")  
            .attr("points", d => {  
                const posA = arc.centroid(d);  
                const posB = outerArc.centroid(d);  
                const posC = outerArc.centroid(d);  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                posC[0] = radius * 1.1 * (midangle < Math.PI ? 1 : -1);  
                return [posA, posB, posC];  
            }),  
        update => update  
            .attr("points", d => {  
                const posA = arc.centroid(d);  
                const posB = outerArc.centroid(d);  
                const posC = outerArc.centroid(d);  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                posC[0] = radius * 1.1 * (midangle < Math.PI ? 1 : -1);  
                return [posA, posB, posC];  
            }),  
        exit => exit.remove()  
    );  

    // Labels  
    const labels = svg.selectAll("text.slice-label")  
        .data(labelData, d => d.data.Department);  

    labels.join(  
        enter => enter  
            .append("text")  
            .attr("class", "slice-label")  
            .style("fill", "#e5e7eb")  
            .style("font-size", "12px")  
            .attr("transform", d => {  
                const pos = outerArc.centroid(d);  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                pos[0] = radius * 1.15 * (midangle < Math.PI ? 1 : -1);  
                return `translate(${pos})`;  
            })  
            .style("text-anchor", d => {  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                return midangle < Math.PI ? "start" : "end";  
            })  
            .text(d => d.data.Department),  
        update => update  
            .attr("transform", d => {  
                const pos = outerArc.centroid(d);  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                pos[0] = radius * 1.15 * (midangle < Math.PI ? 1 : -1);  
                return `translate(${pos})`;  
            })  
            .style("text-anchor", d => {  
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;  
                return midangle < Math.PI ? "start" : "end";  
            })  
            .text(d => d.data.Department),  
        exit => exit.remove()  
    );

    // Update filter indicator UI
    updateFilterIndicator();
}

// Update filter indicator UI
function updateFilterIndicator() {
    const filterNameSpan = document.getElementById("departmentFilterName");
    const clearBtn = document.getElementById("clearDepartmentFilter");

    if (filterNameSpan && clearBtn) {
        if (DEPARTMENT_FILTER) {
            // Show the filter name and button
            filterNameSpan.textContent = DEPARTMENT_FILTER;
            clearBtn.style.display = "inline-block";
        } else {
            // Hide/reset the filter display
            filterNameSpan.textContent = "None";
            clearBtn.style.display = "none";
        }
    }
}

// Setup clear filter button
const clearBtn = document.getElementById("clearDepartmentFilter");
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        clearDepartmentFilter();
        // Filter indicator is updated via updateFilterIndicator() in updateDepartmentPieChart
    });
}
