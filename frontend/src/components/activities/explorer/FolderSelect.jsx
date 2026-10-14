import { Button } from '@mantine/core';
import React from 'react';
import { readStudy } from "../../../modules/util";

export default function FolderSelect({ onOpenStudy, onNewStudy, children }) {

    const handleClick = async () => {
        let directoryHandle;

        try {
            directoryHandle = await window.showDirectoryPicker({
                id: 'studies',
                mode: 'readwrite',
                startIn: 'documents'
            });
        } catch (err) {
            // User cancelled the picker.
            if (err?.name === "AbortError") {
                return;
            }
            throw err;
        }

        try {
            await readStudy(directoryHandle);
            await onOpenStudy?.(directoryHandle);
        } catch (err) {
            if (err?.name === "NotFoundError") {
                await onNewStudy?.(directoryHandle);
                return;
            }
            throw err;
        }
    };

    return (
        <Button onClick={handleClick}>
            {children || "Open Study"}
        </Button>
    );
}