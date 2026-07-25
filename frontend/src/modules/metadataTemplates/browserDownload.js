export const XLSM_MIME_TYPE = 'application/vnd.ms-excel.sheet.macroEnabled.12';
export const MAX_TEMPLATE_BYTES = 25 * 1024 * 1024;

export async function fetchTemplate(templateUrl, signal) {
    try {
        const response = await fetch(templateUrl, { signal });
        if (!response.ok) throw new Error(`Template download failed (${response.status}).`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_TEMPLATE_BYTES) throw new Error('Template is larger than the permitted size.');
        return buffer;
    } catch (caught) {
        if (caught?.name === 'AbortError') {
            caught.code = 'ABORTED';
            throw caught;
        }
        caught.code = 'TEMPLATE_FETCH_FAILED';
        throw caught;
    }
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
