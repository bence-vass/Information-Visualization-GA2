import { SELECTED_DATA, DEPARTMENT_FILTER, setDepartmentFilter, clearDepartmentFilter } from "./brush.js";

// Configuration
const width = 900;
const height = 700;
const radius = Math.min(width, height) / 2 - 150; // 150 for labels
const color = d3.scaleOrdinal(d3.schemeTableau10);

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
        PIE_LABEL_PERCENT_THRESHOLD = parseFloat(e.target.value);
        if (SELECTED_DATA) {
            updateDepartmentPieChart(SELECTED_DATA);
        }
    });
}

if (pieChartTopInput) {
    pieChartTopInput.addEventListener("change", e => {
        PIE_LABEL_TOP_COUNT = parseInt(e.target.value);
        if (SELECTED_DATA) {
            updateDepartmentPieChart(SELECTED_DATA);
        }
    });
}

// SVG container
const svg = d3.select("#pieChartDepartment")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    //.attr("transform", `translate(${width / 2}, ${height / 2})`);
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

// Function to update SVG size based on filter
function updateSVGSize() {
    const svgElement = d3.select("#pieChartDepartment svg");

    // Scale back up when filter is cleared
    const scaledWidth = width;
    const scaledHeight = height;
    svgElement
        .transition()
        .duration(300)
        .attr("width", scaledWidth)
        .attr("height", scaledHeight);

    // Reset transform to original center
    svg.transition()
        .duration(300)
        .attr("transform", `translate(${scaledWidth / 2}, ${scaledHeight / 2})`);
}

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
    d3.select("#pieChartDepartment svg").interrupt();
    
    // Use full dataset if there's a department filter active, otherwise use filtered data
    const dataToUse = DEPARTMENT_FILTER ? SELECTED_DATA : rawData;
    const data = getDepartmentData(dataToUse);
    console.debug("Department Pie Chart Data", data, "Filter:", DEPARTMENT_FILTER);

    // Update SVG size based on filter
    updateSVGSize();

    // Clean svg
    svg.selectAll("*").remove();

    if (!data || data.length === 0) {
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 0)
            .style("font-size", "14px")
            .style("fill", "#fff")
            .text("No data available");
        return;
    }

    const total = d3.sum(data, d => d.Count);

    // Filter for labels using configurable thresholds
    const labelData = pie(data).filter((d, i) => {
        const pct = (d.value / total) * 100;
        return pct > PIE_LABEL_PERCENT_THRESHOLD || i < PIE_LABEL_TOP_COUNT;
    });

    const path = svg.append("g")
        .attr("class", "pie-arcs")
        .selectAll("path")
        .data(pie(data))
        .join("path")
        .attr("fill", (d, i) => color(i))
        .attr("d", arc)
        .attr("stroke", "white")
        .attr("stroke-width", d => d.data.Department === DEPARTMENT_FILTER ? 4 : 2)
        .style("cursor", "pointer")
        .style("opacity", d => {
            // Highlight selected department, dim others
            if (!DEPARTMENT_FILTER) return 1;
            return d.data.Department === DEPARTMENT_FILTER ? 1 : 0.3;
        })
        .each(function (d) {
            this._current = {
                startAngle: 0,
                endAngle: 0,
                data: d.data
            };
        })
        .on("mouseover", function (event, d) {
            if (!DEPARTMENT_FILTER || d.data.Department === DEPARTMENT_FILTER) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("opacity", 0.7);
            }

            const percentage = ((d.data.Count / total) * 100).toFixed(1);
            d3.select("#tooltipDeptPie")
                .style("opacity", 1)
                .html(`
                    <strong>${d.data.Department}</strong><br/>
                    Objects: ${d3.format(",")(d.data.Count)}<br/>
                    ${percentage}% of collection
                    ${d.data.Department === DEPARTMENT_FILTER ? '<br/><em>(Active Filter)</em>' : '<br/><em>Click to filter</em>'}
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
                .style("opacity", () => {
                    if (!DEPARTMENT_FILTER) return 1;
                    return d.data.Department === DEPARTMENT_FILTER ? 1 : 0.3;
                });
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            
            // Prevent spam clicking during animations
            if (isAnimating) return;
            
            const clickedDept = d.data.Department;
            console.log("Clicked department:", clickedDept);

            // Set animation lock
            isAnimating = true;
            setTimeout(() => { isAnimating = false; }, 1500); // Release after animation completes

            // Toggle filter: if clicking same department, clear filter; otherwise set new filter
            if (DEPARTMENT_FILTER === clickedDept) {
                clearDepartmentFilter();
            } else {
                setDepartmentFilter(clickedDept);
            }
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

    lines.enter()
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
        });

    // Labels
    const labels = svg.selectAll("text.slice-label")
        .data(labelData, d => d.data.Department);

    labels.enter()
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
        .text(d => d.data.Department);

    // Update filter indicator UI
    updateFilterIndicator();
}

// Update filter indicator UI
function updateFilterIndicator() {
    const indicator = document.getElementById("departmentFilterIndicator");
    const filterName = document.getElementById("departmentFilterName");

    if (DEPARTMENT_FILTER && indicator && filterName) {
        indicator.style.display = "inline";
        filterName.textContent = DEPARTMENT_FILTER;
    } else if (indicator) {
        indicator.style.display = "none";
    }
}

// Setup clear filter button
const clearBtn = document.getElementById("clearDepartmentFilter");
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        clearDepartmentFilter();
    });
}
