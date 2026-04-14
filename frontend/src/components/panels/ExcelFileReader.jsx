import React, { useEffect, useState, useContext } from "react";
import { read, utils } from 'xlsx';
import { PanelContext } from "./ExcelFIlePanel";
import { usePanelProperty } from "../../redux/hooks/panelsHooks";

export default function ExcelFileReader() {
    const panelId = useContext(PanelContext)
    const excelFile = usePanelProperty(panelId, "file")

    const [data, setData] = useState([]);
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(null);

    useEffect(() => {
        (async () => {
            if (!excelFile) return;

            let workbookData = excelFile;
            if (excelFile instanceof Blob) {
                workbookData = await excelFile.arrayBuffer();
            }

            if (workbookData instanceof ArrayBuffer) {
                workbookData = new Uint8Array(workbookData);
            }

            const wb = read(workbookData, { type: 'array' });
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

        (async () => {
            let workbookData = excelFile;
            if (excelFile instanceof Blob) {
                workbookData = await excelFile.arrayBuffer();
            }

            if (workbookData instanceof ArrayBuffer) {
                workbookData = new Uint8Array(workbookData);
            }

            const wb = read(workbookData, { type: 'array' });
            const ws = wb.Sheets[selectedSheet];
            const content = utils.sheet_to_json(ws, { raw: false, header: 1, blankrows: true, defval: null });
            setData(content);
        })();
    }, [selectedSheet, excelFile]);

    /*const exportFile = useCallback(() => {
        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "SheetJSReactAoO.xlsx");
    }, [data]);*/

    if (!excelFile) {
        return <div style={styles.emptyState}>No spreadsheet loaded.</div>;
    }

    if (!data || data.length === 0) {
        return <div style={styles.emptyState}>No data loaded.</div>;
    }

    const columns = data[0] || [];
    const rows = data.slice(1);
    const maxColumnCount = Math.max(
        columns.length,
        ...rows.map(row => (Array.isArray(row) ? row.length : 0))
    );
    const columnIndexes = Array.from({ length: maxColumnCount }, (_, idx) => idx);

    return (
        <div style={styles.container}>
            <div style={styles.sheetSelector}>
                {sheetNames.map(name => (
                    <button
                        key={name}
                        onClick={() => setSelectedSheet(name)}
                        style={selectedSheet === name ? styles.activeSheetButton : styles.sheetButton}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <div style={styles.tableFrame}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            {columnIndexes.map(colIdx => (
                                <th key={colIdx} style={styles.th}>
                                    {columns[colIdx] ?? `Column ${colIdx + 1}`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr key={rowIdx} style={rowIdx % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                {columnIndexes.map(colIdx => (
                                    <td key={colIdx} style={styles.td}>{row?.[colIdx] ?? ""}</td>
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
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: 12,
        height: "100%",
        minHeight: 0,
        padding: 12,
        background: "#f5f7fb",
        color: "#1f2937",
        boxSizing: "border-box",
        overflowY: "hidden",
        overflowX: "hidden",
    },
    sheetSelector: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
    },
    sheetButton: {
        background: "#ffffff",
        color: "#334155",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
    },
    activeSheetButton: {
        background: "#1d4ed8",
        color: "#ffffff",
        border: "1px solid #1d4ed8",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
    },
    tableFrame: {
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "auto",
        background: "#ffffff",
        borderRadius: 10,
        border: "1px solid #dbe3ef",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "auto",
        fontSize: 13,
    },
    th: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left",
        background: "#eef2ff",
        color: "#1e3a8a",
        padding: "10px 12px",
        borderBottom: "1px solid #c7d2fe",
        whiteSpace: "nowrap",
    },
    td: {
        padding: "8px 12px",
        borderBottom: "1px solid #edf2f7",
        color: "#0f172a",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        verticalAlign: "top",
    },
    evenRow: {
        background: "#ffffff",
    },
    oddRow: {
        background: "#f8fafc",
    },
    emptyState: {
        padding: 16,
        color: "#334155",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
    },
};