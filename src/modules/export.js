import excel from "exceljs"
import browserDownload from "browser-downloads"
import { exportComponentAsPNG } from 'react-component-export-image'
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
export async function exportToExcel(data, fileBaseName = 'results') {
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

    download(
        new Blob([await workbook.xlsx.writeBuffer()]),
        `${fileBaseName}.xlsx`
    )
}


export function exportToPNG(componentRef, fileBaseName = 'results', backgroundColor) {
    exportComponentAsPNG(componentRef, {
        fileName: fileBaseName + '.png',
        html2CanvasOptions: { backgroundColor }
    })
}


export function exportToCSV(data, fileBaseName = 'results') {
    Object.entries(data).forEach(([runFileName, runData]) => {

        const runTitle = titleFromRunFileName(runFileName)

        download(
            runData.reduce(
                (accum, current) => accum + current.join(",") + "\r\n",
                "data:text/csv;charset=utf-8,"
            ),
            `${fileBaseName} - ${runTitle}.csv`
        )
    })
}


function download(...args) {
    console.debug("download.js will  throw an error here. It can be ignored.")
    browserDownload(...args)
}