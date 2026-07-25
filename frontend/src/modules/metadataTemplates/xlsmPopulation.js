import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MAX_UNZIPPED_BYTES = 100 * 1024 * 1024;

function workbookError(message) {
    const error = new Error(message);
    error.code = 'WORKBOOK_STRUCTURE';
    return error;
}

function parseXml(bytes, label) {
    const document = new DOMParser().parseFromString(strFromU8(bytes), 'application/xml');
    if (document.querySelector('parsererror')) throw workbookError(`Invalid ${label} XML.`);
    return document;
}

function serializeXml(document) {
    return strToU8(new XMLSerializer().serializeToString(document));
}

function elementChildren(element, localName) {
    return [...element.children].filter((child) => child.localName === localName);
}

function relationshipMap(bytes, label) {
    const document = parseXml(bytes, label);
    return new Map(elementChildren(document.documentElement, 'Relationship').map((relationship) => [relationship.getAttribute('Id'), relationship.getAttribute('Target')]));
}

function resolvePartPath(sourcePart, target) {
    if (!target || target.startsWith('/') || /^[a-z]+:/i.test(target)) throw workbookError('Workbook relationship target is unsafe.');
    const stack = sourcePart.split('/').slice(0, -1);
    target.split('/').forEach((piece) => {
        if (!piece || piece === '.') return;
        if (piece === '..') {
            if (stack.length <= 1) throw workbookError('Workbook relationship escapes the workbook package.');
            stack.pop();
            return;
        }
        stack.push(piece);
    });
    const resolved = stack.join('/');
    if (!resolved.startsWith('xl/')) throw workbookError('Workbook relationship target escapes the xl package.');
    return resolved;
}

function relationshipPartName(part) {
    const pieces = part.split('/');
    return `${pieces.slice(0, -1).join('/')}/_rels/${pieces.at(-1)}.rels`;
}

function columnNumber(column) {
    return [...column].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
}

function columnName(number) {
    let result = '';
    for (let current = number; current > 0; current = Math.floor((current - 1) / 26)) result = String.fromCharCode(65 + ((current - 1) % 26)) + result;
    return result;
}

function parseRange(ref) {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(ref || '');
    if (!match) throw workbookError(`Unsupported table range: ${ref || '(missing)'}.`);
    return { firstColumn: columnNumber(match[1].toUpperCase()), firstRow: Number(match[2]), lastColumn: columnNumber(match[3].toUpperCase()), lastRow: Number(match[4]) };
}

function formatRange(range) {
    return `${columnName(range.firstColumn)}${range.firstRow}:${columnName(range.lastColumn)}${range.lastRow}`;
}

function getSheetPart(entries, sheetName) {
    const workbook = parseXml(entries['xl/workbook.xml'], 'workbook');
    const sheet = elementChildren(workbook.documentElement.querySelector('sheets'), 'sheet').find((candidate) => candidate.getAttribute('name') === sheetName);
    if (!sheet) throw workbookError(`Worksheet "${sheetName}" was not found.`);
    const relationships = relationshipMap(entries['xl/_rels/workbook.xml.rels'], 'workbook relationships');
    const target = relationships.get(sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id'));
    const part = resolvePartPath('xl/workbook.xml', target);
    if (!entries[part]) throw workbookError(`Worksheet part for "${sheetName}" was not found.`);
    return part;
}

function getTablePart(entries, sheetPart, sheetDocument, tableName) {
    const sheetRelationshipsName = relationshipPartName(sheetPart);
    if (!entries[sheetRelationshipsName]) throw workbookError(`Worksheet "${sheetPart}" has no relationships.`);
    const relationships = relationshipMap(entries[sheetRelationshipsName], 'worksheet relationships');
    const tableParts = sheetDocument.querySelector('tableParts');
    for (const tableReference of tableParts ? elementChildren(tableParts, 'tablePart') : []) {
        const relationId = tableReference.getAttributeNS(REL_NS, 'id') || tableReference.getAttribute('r:id');
        const part = resolvePartPath(sheetPart, relationships.get(relationId));
        if (!entries[part]) throw workbookError(`Table relationship for "${tableName}" is missing.`);
        const table = parseXml(entries[part], 'table');
        const root = table.documentElement;
        if (root.getAttribute('name') === tableName || root.getAttribute('displayName') === tableName) return { part, document: table };
    }
    throw workbookError(`Structured table "${tableName}" was not found.`);
}

function cellReference(cell) {
    return /^([A-Z]+)(\d+)$/i.exec(cell.getAttribute('r') || '');
}

function hasMeaningfulCellContent(cell) {
    return Boolean(cell.querySelector('v, is, f'));
}

function findRow(sheetData, rowNumber) {
    return elementChildren(sheetData, 'row').find((row) => Number(row.getAttribute('r')) === rowNumber);
}

function copyCellStyle(templateRow, column, rowNumber, document) {
    const template = elementChildren(templateRow, 'c').find((cell) => cellReference(cell)?.[1].toUpperCase() === column);
    const cell = document.createElementNS(XML_NS, 'c');
    cell.setAttribute('r', `${column}${rowNumber}`);
    if (template?.getAttribute('s')) cell.setAttribute('s', template.getAttribute('s'));
    if (template?.getAttribute('t')) cell.setAttribute('t', template.getAttribute('t'));
    return cell;
}

function setInlineString(cell, value, document) {
    cell.setAttribute('t', 'inlineStr');
    const inlineString = document.createElementNS(XML_NS, 'is');
    const text = document.createElementNS(XML_NS, 't');
    text.textContent = value;
    inlineString.appendChild(text);
    cell.appendChild(inlineString);
}

function updateDimension(sheetDocument, finalRow) {
    const dimension = sheetDocument.querySelector('dimension');
    if (!dimension) return;
    const current = parseRange(dimension.getAttribute('ref'));
    if (finalRow > current.lastRow) dimension.setAttribute('ref', formatRange({ ...current, lastRow: finalRow }));
}

function assertNoCollision(sheetData, range, finalLastRow) {
    for (let rowNumber = range.lastRow + 1; rowNumber <= finalLastRow; rowNumber += 1) {
        const row = findRow(sheetData, rowNumber);
        if (!row) continue;
        const collision = elementChildren(row, 'c').some((cell) => {
            const reference = cellReference(cell);
            return reference && columnNumber(reference[1].toUpperCase()) >= range.firstColumn && columnNumber(reference[1].toUpperCase()) <= range.lastColumn && hasMeaningfulCellContent(cell);
        });
        if (collision) throw workbookError('The populated table would overwrite non-table worksheet content.');
    }
}

function populateOne(entries, population, rows, changedParts) {
    const sheetPart = getSheetPart(entries, population.sheetName);
    const sheet = parseXml(entries[sheetPart], 'worksheet');
    const tableResult = getTablePart(entries, sheetPart, sheet, population.tableName);
    const tableRoot = tableResult.document.documentElement;
    const range = parseRange(tableRoot.getAttribute('ref'));
    if (range.firstColumn !== 1 || range.lastColumn !== 2 || range.firstRow !== 1) throw workbookError(`Table "${population.tableName}" must occupy columns A:B starting at row 1.`);
    const columns = elementChildren(tableRoot.querySelector('tableColumns'), 'tableColumn').map((column) => column.getAttribute('name'));
    if (columns[0] !== 'Name' || columns[1] !== 'URI') throw workbookError(`Table "${population.tableName}" must have Name and URI columns.`);
    const sheetData = sheet.querySelector('sheetData');
    if (!sheetData) throw workbookError(`Worksheet for "${population.tableName}" lacks sheet data.`);
    const templateRow = findRow(sheetData, range.firstRow + 1);
    if (!templateRow) throw workbookError(`Table "${population.tableName}" lacks a styled template data row.`);
    const dataRows = rows.length > 0 ? rows : [{ name: '', uri: '' }];
    const finalLastRow = range.firstRow + dataRows.length;
    assertNoCollision(sheetData, range, finalLastRow);
    for (let rowNumber = range.firstRow + 1; rowNumber <= range.lastRow; rowNumber += 1) findRow(sheetData, rowNumber)?.remove();
    dataRows.forEach((data, index) => {
        const rowNumber = range.firstRow + 1 + index;
        const row = templateRow.cloneNode(false);
        row.setAttribute('r', String(rowNumber));
        const nameCell = copyCellStyle(templateRow, 'A', rowNumber, sheet);
        const uriCell = copyCellStyle(templateRow, 'B', rowNumber, sheet);
        if (data.name) setInlineString(nameCell, data.name, sheet);
        if (data.uri) setInlineString(uriCell, data.uri, sheet);
        row.append(nameCell, uriCell);
        const before = elementChildren(sheetData, 'row').find((candidate) => Number(candidate.getAttribute('r')) > rowNumber);
        sheetData.insertBefore(row, before || null);
    });
    const finalRange = formatRange({ ...range, lastRow: finalLastRow });
    tableRoot.setAttribute('ref', finalRange);
    tableRoot.querySelector('autoFilter')?.setAttribute('ref', finalRange);
    updateDimension(sheet, finalLastRow);
    entries[sheetPart] = serializeXml(sheet);
    entries[tableResult.part] = serializeXml(tableResult.document);
    changedParts.add(sheetPart);
    changedParts.add(tableResult.part);
}

export function populateXlsm(templateBuffer, populations) {
    const entries = unzipSync(new Uint8Array(templateBuffer));
    const totalSize = Object.values(entries).reduce((sum, bytes) => sum + bytes.byteLength, 0);
    if (totalSize > MAX_UNZIPPED_BYTES) throw workbookError('Template expands beyond the permitted workbook size.');
    if (!entries['xl/workbook.xml'] || !entries['xl/_rels/workbook.xml.rels']) throw workbookError('Template is not a valid OOXML workbook.');
    const changedParts = new Set();
    populations.forEach(({ population, rows }) => populateOne(entries, population, rows, changedParts));
    return { bytes: zipSync(entries, { level: 6 }), changedParts: [...changedParts].sort() };
}

export async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function verifyWorkbookPreservation(beforeBuffer, afterBuffer, allowedChangedParts) {
    const before = unzipSync(new Uint8Array(beforeBuffer));
    const after = unzipSync(new Uint8Array(afterBuffer));
    const beforeNames = Object.keys(before).sort();
    const afterNames = Object.keys(after).sort();
    if (beforeNames.join('\n') !== afterNames.join('\n')) throw workbookError('Workbook ZIP entry names changed.');
    const allowed = new Set(allowedChangedParts);
    const changedParts = [];
    for (const name of beforeNames) {
        const same = before[name].length === after[name].length && before[name].every((value, index) => value === after[name][index]);
        if (!same) changedParts.push(name);
        if (!same && !allowed.has(name)) throw workbookError(`Unexpected OOXML change: ${name}`);
    }
    const vbaHashBefore = before['xl/vbaProject.bin'] ? await sha256(before['xl/vbaProject.bin']) : null;
    const vbaHashAfter = after['xl/vbaProject.bin'] ? await sha256(after['xl/vbaProject.bin']) : null;
    if (vbaHashBefore !== vbaHashAfter) throw workbookError('VBA project bytes changed.');
    return { changedParts, vbaHashBefore, vbaHashAfter, vbaMatches: vbaHashBefore === vbaHashAfter };
}
