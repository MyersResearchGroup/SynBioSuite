import excel from "exceljs"
import download from "browser-downloads"
import { titleFromRunFileName } from "./util"

/*
    Takes in a data object of the following shape:

    {
        "run-x.tsd": [
            [ 'time', 'species_x', 'species_y', ... ],
            [ 0, 4, 53, ... ],
            [ 1, 34, 74, ... ],
            [ 2, 32, 52, ... ],
            ...
        ]
    }
*/
export async function exportToExcel(data) {
    // create workbook
    const workbook = new excel.Workbook()

    // loop through data as object entries
    Object.entries(data).forEach(([runFileName, runData]) => {

        const runTitle = titleFromRunFileName(runFileName)

        // create worksheet for each run
        const sheet = workbook.addWorksheet(runTitle, {
            properties: { defaultColWidth: 14 } // widen the columns a bit
        })

        // populate sheet with a table
        sheet.addTable({
            name: runTitle.replace(" ", "_"),
            ref: 'A1',
            headerRow: true,
            totalsRow: false,
            style: {
                // theme: 'TableStyleDark3',
                showRowStripes: true,
            },
            columns: runData[0].map(seriesName => ({
                name: seriesName,
                filterButton: false,
            })),
            rows: runData.slice(1),
        })
    })

    console.debug("download.js will  throw an error here. It can be ignored.")

    download(
        new Blob([await workbook.xlsx.writeBuffer()]),
        `results.xlsx`
    )
}