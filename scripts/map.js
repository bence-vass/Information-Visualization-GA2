Promise.all([
    d3.json("../preprocessing/country_counts.json"),
    d3.json("https://unpkg.com/world-atlas@2/countries-110m.json")
]).then(([countryCountsObj, world]) => {

    const countryCounts = new Map(Object.entries(countryCountsObj));

    const svg = d3.select("#mapSvg");
    const { width, height } = svg.node().getBoundingClientRect();
    const tooltip = d3.select('.mapTooltip');

    const mapGroup = svg.append("g").attr("class", "map-group");

    svg.append("defs")
        .append("pattern")
        .attr("id", "stripePattern")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 3)
        .attr("height", 3)
        .attr("patternTransform", "rotate(45)")
        .append("rect")
        .attr("width", 1)
        .attr("height", 3)
        .attr("fill", "#9b9696");

    const projection = d3.geoNaturalEarth1()
        .scale(180)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const zoom = d3.zoom()
        .scaleExtent([1, 6])
        .extent([[0, 0], [width, height]])
        .translateExtent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });


    svg.call(zoom);

    const countries = topojson.feature(world, world.objects.countries).features;

    const maxCount = d3.max([...countryCounts.values()].map(d => +d));

    const colorScale = d3.scaleSequentialLog()
        .domain([1, maxCount])
        .interpolator(d3.interpolatePurples);

    mapGroup.selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const name = d.properties.name;
            const count = countryCounts.get(name);
            return count > 0 ? colorScale(count) : "url(#stripePattern)";

        })
        .attr("stroke", "#666")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
            // Country outline
            d3.select(this)
                .raise() // bring to front so outline is visible
                .attr("stroke", "grey")
                .attr("stroke-width", 1.5);

            const name = d.properties.name;
            const count = countryCounts.get(name) || 0;

            tooltip
                .style("opacity", 1)
                .html(`<strong>${name}</strong><br/>Objects: ${count}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function () {
            // Reset outline
            d3.select(this)
                .attr("stroke", "#666")
                .attr("stroke-width", 0.5);

            tooltip.style("opacity", 0);
        });

    // Zoom button
    document.getElementById("resetZoomBtn").addEventListener("click", () => {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });


    // Legend
    const legendWidth = 300;
    const legendHeight = 12;

    const legendGroup = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${(width - legendWidth) / 2}, ${height - 40})`);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legendGradient");

    const stops = [1, 10, 100, 1000, maxCount];

    stops.forEach(d => {
        gradient.append("stop")
            .attr("offset", `${(Math.log(d) / Math.log(maxCount)) * 100}%`)
            .attr("stop-color", colorScale(d));
    });

    // Draw gradient bar
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    // Legend axis
    const legendScale = d3.scaleLog()
        .domain([1, maxCount])
        .range([0, legendWidth]);

    const legendTicks = legendScale.ticks()
        .filter(t => Number.isInteger(Math.log10(t)));

    const legendAxis = d3.axisBottom(legendScale)
        .tickValues(legendTicks)
        .tickFormat(d3.format("~s"));

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

});