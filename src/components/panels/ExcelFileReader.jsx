import React, { useCallback, useEffect, useState, useContext } from "react";
import { read, utils, writeFileXLSX } from 'xlsx';
import { PanelContext } from "./ExcelFIlePanel";
import { usePanelProperty } from "../../redux/hooks/panelsHooks";
import { useFile } from "../../redux/hooks/workingDirectoryHooks";

export default function ExcelFileReader() {
    const panelId = useContext(PanelContext)
    const [excelFile, setExcelFile] = usePanelProperty(panelId, "file", false)
    const [fileID, setFileID] = usePanelProperty(panelId, "fileHandle", false, "Excel File");

    const [data, setData] = useState([]);
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(null);

    useEffect(() => {
        (async () => {
            setExcelFile(excelFile);
        })();
    }, [fileID]);

    useEffect(() => {
        (async () => {
            if (!excelFile) return;
            const wb = read(excelFile);
            setSheetNames(wb.SheetNames);
            const initialSheet = wb.SheetNames[0];
            setSelectedSheet(initialSheet);
            const ws = wb.Sheets[initialSheet];
            // Set header:1 to get all rows as arrays, including the first row
            const content = utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null });
            setData(content);
        })();
    }, [excelFile]);

    useEffect(() => {
        if (!excelFile || !selectedSheet) return;
        const wb = read(excelFile);
        const ws = wb.Sheets[selectedSheet];
        const content = utils.sheet_to_json(ws, { raw: false, header: 1, blankrows: true, defval: null });
        setData(content);
    }, [selectedSheet, excelFile]);

    /*const exportFile = useCallback(() => {
        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "SheetJSReactAoO.xlsx");
    }, [data]);*/

    if (!data || data.length === 0) return <div>No data loaded.</div>;

    const columns = data[0] || [];

    return (
        <div>
            <div>
                {sheetNames.map(name => (
                    <button
                        key={name}
                        onClick={() => setSelectedSheet(name)}
                        style={{
                            fontWeight: selectedSheet === name ? "bold" : "normal",
                            marginRight: 5
                        }}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <table>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(1).map((row, idx) => (
                        <tr key={idx}>
                            {columns.map((_, colIdx) => (
                                <td key={colIdx}>{row[colIdx]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                {/* <tfoot>
                    <tr>
                        <td colSpan={columns.length}>
                            <button onClick={exportFile}>Export XLSX</button>
                        </td>
                    </tr>
                </tfoot> */}
            </table>
        </div>
    );
}