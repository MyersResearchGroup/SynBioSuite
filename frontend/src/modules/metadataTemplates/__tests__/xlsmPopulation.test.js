import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { populateXlsm, verifyWorkbookPreservation } from '../xlsmPopulation';

function fixture({ unrelatedCell = '' } = {}) {
    const entries = {
        '[Content_Types].xml': strToU8('<Types/>'),
        'xl/workbook.xml': strToU8('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="SBH_test" sheetId="1" state="hidden" r:id="rId1"/></sheets><definedNames><definedName name="keep">SBH_test[Name]</definedName></definedNames></workbook>'),
        'xl/_rels/workbook.xml.rels': strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
        'xl/worksheets/sheet1.xml': strToU8(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:B2"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>URI</t></is></c></row><row r="2"><c r="A2" s="5"/><c r="B2" s="6"/></row>${unrelatedCell}</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`),
        'xl/worksheets/_rels/sheet1.xml.rels': strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../tables/table1.xml"/></Relationships>'),
        'xl/tables/table1.xml': strToU8('<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="SBH_test" displayName="SBH_test" ref="A1:B2"><autoFilter ref="A1:B2"/><tableColumns count="2"><tableColumn id="1" name="Name"/><tableColumn id="2" name="URI"/></tableColumns><tableStyleInfo name="TableStyleMedium2"/></table>'),
        'xl/vbaProject.bin': new Uint8Array([1, 2, 3, 4]),
        'custom/unrelated.bin': new Uint8Array([9, 8, 7]),
    };
    return zipSync(entries);
}

const population = { sheetName: 'SBH_test', tableName: 'SBH_test' };
function xml(bytes, name) { return strFromU8(unzipSync(bytes)[name]); }

describe('macro-safe workbook population', () => {
    it('expands a table while preserving styles, VBA, definitions, and unrelated parts', async () => {
        const input = fixture();
        const output = populateXlsm(input, [{ population, rows: [{ name: 'A & B', uri: 'https://x/1?a=1&b=2' }, { name: 'Z', uri: 'https://x/2' }] }]);
        expect(xml(output.bytes, 'xl/tables/table1.xml')).toContain('ref="A1:B3"');
        expect(xml(output.bytes, 'xl/worksheets/sheet1.xml')).toContain('r="A2" s="5"');
        expect(xml(output.bytes, 'xl/worksheets/sheet1.xml')).toContain('A &amp; B');
        const report = await verifyWorkbookPreservation(input, output.bytes, output.changedParts);
        expect(report.vbaMatches).toBe(true);
        expect(report.changedParts).toEqual(['xl/tables/table1.xml', 'xl/worksheets/sheet1.xml']);
        expect(xml(output.bytes, 'xl/workbook.xml')).toContain('SBH_test[Name]');
    });

    it('keeps one blank styled row for zero results', () => {
        const output = populateXlsm(fixture(), [{ population, rows: [] }]);
        expect(xml(output.bytes, 'xl/tables/table1.xml')).toContain('ref="A1:B2"');
        expect(xml(output.bytes, 'xl/worksheets/sheet1.xml')).toContain('r="B2" s="6"');
    });

    it('rejects a collision with unrelated content', () => {
        expect(() => populateXlsm(fixture({ unrelatedCell: '<row r="3"><c r="A3"><v>7</v></c></row>' }), [{ population, rows: [{ name: 'x', uri: 'https://x' }, { name: 'y', uri: 'https://y' }] }])).toThrow('overwrite non-table');
    });

    it('rejects missing worksheets and tables', () => {
        expect(() => populateXlsm(fixture(), [{ population: { ...population, sheetName: 'missing' }, rows: [] }])).toThrow('Worksheet');
        expect(() => populateXlsm(fixture(), [{ population: { ...population, tableName: 'missing' }, rows: [] }])).toThrow('Structured table');
    });
});
