// Dimensions and margins
const margin = { top: 80, right: 40, bottom: 80, left: 150 };
const width  = 900 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select("#heatmapChart")
  .append("svg")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("#tooltipHeatmap");

// Dropdowns
const centurySelect = d3.select("#centurySelect");
const nationalitySelect = d3.select("#nationalitySelect");
const resetBtn = d3.select("#resetFilters");

// Load preprocessed CSV
d3.csv("data/heatmap_data.csv", d => {
  return {
    nationality: d.Artist_Nationality,
    century: d.century_label,
    count: +d.count,
    percent: +d.percent
  };
}).then(data => {

  const allCenturies = Array.from(new Set(data.map(d => d.century)))
    .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
    .sort((a, b) => parseInt(a) - parseInt(b));

  const allNationalities = Array.from(new Set(data.map(d => d.nationality)))
    .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
    .sort(d3.ascending);

  centurySelect.selectAll("option.centOpt")
    .data(allCenturies)
    .join("option")
    .attr("class", "centOpt")
    .attr("value", d => d)
    .text(d => d);

  nationalitySelect.selectAll("option.natOpt")
    .data(allNationalities)
    .join("option")
    .attr("class", "natOpt")
    .attr("value", d => d)
    .text(d => d);

  const maxCountGlobal = d3.max(data, d => d.count);

  function getSelectedValues(selectSel) {
    const node = selectSel.node();
    return Array.from(node.selectedOptions).map(o => o.value);
  }


  function getFilteredData() {
    const selectedCenturies = getSelectedValues(centurySelect);
    const selectedNats = getSelectedValues(nationalitySelect);

    const allCent = selectedCenturies.includes("all") || selectedCenturies.length === 0;
    const allNat = selectedNats.includes("all") || selectedNats.length === 0;

    const centSet = new Set(selectedCenturies.filter(v => v !== "all"));
    const natSet = new Set(selectedNats.filter(v => v !== "all"));

    return data.filter(d => {
      const centuryOk = allCent || centSet.has(d.century);
      const natOk = allNat || natSet.has(d.nationality);
      return centuryOk && natOk;
    });
  }

  function render(currData) {
    svg.selectAll("*").remove();

    if (currData.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "white")
        .text("No data for selected filters");
      return;
    }

    // Get unique domains from filtered data
    const centuries = Array.from(new Set(currData.map(d => d.century))).sort((a, b) => {
      const ca = parseInt(a);
      const cb = parseInt(b);
      return ca - cb;
    });

    const nationalities = Array.from(new Set(currData.map(d => d.nationality)));

    // Scales
    const x = d3.scaleBand()
      .domain(centuries)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(nationalities)
      .range([0, height])
      .padding(0.05);

    // Color scale
    const color = d3.scaleSequential()
      .domain([0, maxCountGlobal])
      .interpolator(d3.interpolateViridis);

    // Axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g").call(yAxis);

    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .attr("fill", "white")
      .text("Artist Nationality over Time (by Century)");

    // X label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("fill", "white")
      .text("Century");

    // Y label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -110)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("fill", "white")
      .text("Artist Nationality");

    // Draw rectangles (cells)
    svg.selectAll("rect")
      .data(currData, d => d.nationality + "-" + d.century)
      .join("rect")
      .attr("x", d => x(d.century))
      .attr("y", d => y(d.nationality))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.count))
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("opacity", 0)
      .transition()
      .duration(400)
      .style("opacity", 1);

    // Add percentage text labels
    svg.selectAll("text.cell-label")
      .data(currData, d => d.nationality + "-" + d.century)
      .join("text")
      .attr("class", "cell-label")
      .attr("x", d => x(d.century) + x.bandwidth() / 2)
      .attr("y", d => y(d.nationality) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .text(d => `${d.percent.toFixed(1)}%`);

    // Interaction: hover tooltip
    svg.selectAll("rect")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "black")
          .attr("stroke-width", 2);

        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${d.nationality}</strong><br/>
            Century: ${d.century}<br/>
            Count: ${d.count}<br/>
            Share: ${d.percent.toFixed(2)}%
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 20) + "px");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", 0.5);

        tooltip.style("opacity", 0);
      });

    // Legend (stable across filters)
    const legendWidth = 200;
    const legendHeight = 12;

    const legendSvg = svg.append("g")
      .attr("transform", `translate(${width - legendWidth}, ${-30})`);

    const legendScale = d3.scaleLinear()
      .domain([0, maxCountGlobal])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickSize(legendHeight);

    // Create gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient");

    linearGradient
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    const legendStops = d3.range(0, 1.01, 0.2);
    legendStops.forEach((t) => {
      linearGradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", color(t * maxCountGlobal));
    });

    legendSvg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendSvg.append("g")
      .attr("transform", `translate(0, 0)`)
      .call(legendAxis)
      .select(".domain").remove();

    legendSvg.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .attr("fill", "white")
      .text("Number of Objects");
  }


  // Wire dropdown events
  function update() {
    render(getFilteredData());
  }

  centurySelect.on("change", update);
  nationalitySelect.on("change", update);

  resetBtn.on("click", () => {
    centurySelect.selectAll("option").property("selected", false);
    nationalitySelect.selectAll("option").property("selected", false);

    centurySelect.select('option[value="all"]').property("selected", true);
    nationalitySelect.select('option[value="all"]').property("selected", true);

    update();
  });

  // Initial render
  update();
});

