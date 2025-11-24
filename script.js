
// LOADING DATA
// ================================================================================== //

// filters and parses data during import
const dataImportFn = (d) => {
    if (d.AccessionYear === "") {
        return null;
    }
    return {
        ...d,
        "AccessionYear": parseInt(d.AccessionYear),
    }
}

const DATA = await d3.csv("MetObjects.csv", dataImportFn);

// remove loading spinner after data is loaded
const loadingElement = document.getElementById("loadingChart");
if (loadingElement) {
    loadingElement.remove();
}

const minX = d3.min(DATA, d => d.AccessionYear);
const maxX = d3.max(DATA, d => d.AccessionYear);

console.log(DATA);

// ================================================================================== //
// LOADING DATA END



const width = 800
const height = 60
const margin = ({ top: 10, right: 20, bottom: 20, left: 20 })


let selectedDateMin = null
let selectedDateMax = null
const setTimePeriod = (min, max) => {
    selectedDateMax = max
    selectedDateMin = min
    const text = `${d3.timeFormat("%b. %Y")(selectedDateMin)} - ${d3.timeFormat("%b. %Y")(selectedDateMax)}`;
    document.getElementById("timePeriod").innerText = text
}

const x = d3.scaleTime()
    .domain([new Date(minX, 1, 1), new Date(maxX, 11, 31) - 1])
    .rangeRound([margin.left, width - margin.right])

const brushEnded = (event) => {
    const selection = event.selection;
    const brushedYears = selection.map(x.invert);
    setTimePeriod(brushedYears[0], brushedYears[1]);
}



const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(g =>
        // Tick on the x axis every 2 years
        g.append("g")
            .call(d3.axisBottom(x)
                .ticks(d3.timeYear.every(2))
                .tickSize(-height + margin.top + margin.bottom)
                .tickFormat(() => null))
        // .call(g => g.select(".domain")
        //     .attr("fill", "#a75454ff")
        //     .attr("stroke", null))
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "#3365e3ff")
            .attr("stroke-opacity", d => d <= d3.timeDay(d) ? 1 : 0.5))
    ).call(g =>
        // Year labels on the x axis every 10 years
        g.append("g")
            .call(d3.axisBottom(x)
                .ticks(d3.timeYear.every(10))
                .tickPadding(0))
            .attr("text-anchor", null)
            .attr("style", "font-size: 10px; font-family: sans-serif; color: #333333ff")
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll("text").attr("x", 6))
)

const brush = d3.brushX()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on("end", brushEnded);


const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "border:5px solid red; background-color:white");

svg.append("g")
    .call(xAxis)

const brushGroup = svg.append("g")
    .call(brush);

// Set default brush selection to last 5 years
const defaultSelection = [
    x(new Date(maxX - 15, 0, 1)), // Start: 15 years before maxX
    x(new Date(maxX, 11, 31))    // End: last day of maxX
];
brushGroup.call(brush.move, defaultSelection)


const selectedData = DATA.filter(d => d.AccessionYear >= selectedDateMin && d.AccessionYear <= selectedDateMax);

