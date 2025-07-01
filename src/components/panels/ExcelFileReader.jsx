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
            const content = utils.sheet_to_json(ws, {blankrows: true});
            setData(content);
        })();
    }, [excelFile]);

    useEffect(() => {
        if (!excelFile || !selectedSheet) return;
        const wb = read(excelFile);
        const ws = wb.Sheets[selectedSheet];
        const content = utils.sheet_to_json(ws, {blankrows: true});
        setData(content);
    }, [selectedSheet, excelFile]);

    const exportFile = useCallback(() => {
        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "SheetJSReactAoO.xlsx");
    }, [data]);

    if (!data || data.length === 0) return <div>No data loaded.</div>;

    const columns = Object.keys(data[0]);

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
                        {columns.map(col => (
                            <th key={col}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={idx}>
                            {columns.map(col => (
                                <td key={col}>{row[col]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={columns.length}>
                            <button onClick={exportFile}>Export XLSX</button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}