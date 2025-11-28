



const width = 700;
const height = 500;
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;


const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("class", "mx-auto")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [(-width/2) , (-height/2) - 15, width, height])
    .attr("style", "border:5px solid blue; background-color:aqua")


const myWords = ["Hello", "Everybody", "How", "Are", "You", "Today", "It", "Is", "A", "Lovely", "Day", "I", "Love", "Coding", "In", "My", "Van", "Mate"]


export const updateWordCloud = (data) => {

    console.log("update word cloud")

    const layout = d3.layout.cloud()
        .size([width, height])
        .words(data.map(d => ({ text: d })))
        .padding(10)
        .fontSize(60)
        .on("end", addText)

    layout.start()



}


const addText = (words) => {
    console.log(words)
    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}","${height / 2})`);

    const links = g.selectAll("a")
        .data(words)
        .enter()
        .append("a")
        .attr("href", "https://example.com")
        .attr("target", "_blank");

    links.append("text")
        .style("font-size", d => d.size + "px")
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x} , ${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
}


updateWordCloud(myWords)