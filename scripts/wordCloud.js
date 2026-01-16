
// Based on
// https://www.jasondavies.com/wordcloud/
// https://d3-graph-gallery.com/graph/wordcloud_basic.html

const width = window.innerWidth
const height = 600;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;


const svg = d3.select("#wordCloud")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0,  width, height])
    // .attr("style", "border:5px solid blue; background-color:aqua")




const getWordcloudData = (selectedData, randN) => {

    const filteredData = selectedData.filter(v => v["isHighlight"])
    
    // Return empty array if no data available
    if (!filteredData || filteredData.length === 0) {
        return [];
    }
    
    const randSet = new Set()
    const randRows = []
    
    // Limit randN to available data to avoid infinite loop
    const maxItems = Math.min(randN, filteredData.length);

    while(randSet.size < maxItems){
        const randIdx = Math.floor(Math.random() * filteredData.length)
        if(!randSet.has(randIdx)){
            randSet.add(randIdx)
            randRows.push(filteredData[randIdx])
        }
    }

    const titles = randRows.map((v, i) => ({ text: v["Title"], id: v["ObjectID"]}))
    return titles
}


export const updateWordCloud = (data) => {

    svg.selectAll("*").remove()
    
    // Handle empty data
    if (!data || data.length === 0) {
        console.log("No data available for word cloud");
        return;
    }

    const cloudData = getWordcloudData(data, 150)
    console.log("cloudData", cloudData)
    
    // Handle empty cloud data
    if (!cloudData || cloudData.length === 0) {
        console.log("No highlighted data available for word cloud");
        return;
    }

    const layout = d3.layout.cloud()
        .size([width, height])
        .words(cloudData)
        .padding(5)
        .fontSize(d => parseInt(Math.min(55, Math.random() * 20 + 15)))
        .spiral("archimedean")
        .on("end", words => addText(words))

    layout.start()



}


const addText = (words) => {
    console.log("addText", words)
    const g = svg.append("g")
        .attr("transform", `translate(${width / 2} , ${height / 2})`);

    const metLink = "https://www.metmuseum.org/art/collection/search/"
    const links = g.selectAll("a")
        .data(words)
        .enter()
        .append("a")
        .attr("href", d => metLink + d["id"])
        .attr("target", "_blank");

    links.append("text")
        .style("font-size", d => d.size + "px")
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .attr("transform", d => `translate(${d.x} , ${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
}


