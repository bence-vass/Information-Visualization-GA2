
// LOADING DATA
// ================================================================================== //

// filters and parses data during import
const dataImportFn = (d) => {
    // skip rows with missing data
    if (
        d.AccessionYear === "" ||
        d["Object Name"] === ""
    ) {
        return null;
    }
    return {
        // ...d, // keep all original data
        "AccessionYear": parseInt(d.AccessionYear),
        "ObjectName": d["Object Name"].toString(),
        "objectID": d["Object ID"].toString(),
    }
}

export const DATA = await d3.csv("MetObjects.csv", dataImportFn);   // local file
const dataUrl = "https://media.githubusercontent.com/media/bence-vass/Information-Visualization-A3/refs/heads/main/MetObjects.csv"
// const DATA = await d3.csv(dataUrl, dataImportFn); // online file

// remove loading spinner after data is loaded
const loadingElement = document.getElementById("loadingChart");
if (loadingElement) {
    loadingElement.remove();
}

export const minX = d3.min(DATA, d => d.AccessionYear);
export const maxX = d3.max(DATA, d => d.AccessionYear);

console.log("Complete Data:");
console.log(DATA);

// ================================================================================== //
// LOADING DATA END












