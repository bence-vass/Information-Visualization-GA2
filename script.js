
// LOADING DATA
// ================================================================================== //

// filters and parses data during import
const dataImportFn = (d) => {
    // skip rows with missing data
    if (
        d.AccessionYear === "" ||
        d["Object Name"] === "" ||
        d["Title"] === ""
    ) {
        return null;
    }
    return {
        // ...d, // keep all original data
        "AccessionYear": parseInt(d.AccessionYear),
        "ObjectName": d["Object Name"].toString(),
        "ObjectID": d["Object ID"].toString(),
        "Title": d["Title"].toString(),
        "isHighlight": Boolean(d["Is Highlight"]),
        "Department": d["Department"] ? d["Department"].toString() : null,  // Added for department pie chart
    }
}

export const dataPromise = (async () => {

    // export const DATA = await d3.csv("MetObjects.csv", dataImportFn);   // local file
    const dataUrl = "MetObjects.min.csv"  // Updated to use local file with Department column
    const DATA = await d3.csv(dataUrl, dataImportFn); // online file

    // remove loading spinner after data is loaded
    const loadingElement = document.getElementById("loadingChart");
    if (loadingElement) {
        loadingElement.remove();
    }
    document.body.style.overflow = "auto";


    const minX = d3.min(DATA, d => d.AccessionYear);
    const maxX = d3.max(DATA, d => d.AccessionYear);

    console.log("Complete Data:");
    console.log(DATA);

    return { DATA, minX, maxX }

})()


// ================================================================================== //
// LOADING DATA END












