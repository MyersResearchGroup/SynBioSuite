import { Button } from '@mantine/core';
import React from 'react';
import { readStudy } from "../../../modules/util";

export default function FolderSelect({ onOpenStudy, onNewStudy, children }) {

    const handleClick = async () => {
        try {
            const directoryHandle = await window.showDirectoryPicker({
                id: 'studies',
                mode: 'readwrite',
                startIn: 'documents'
            });

            await readStudy(directoryHandle);
            await onOpenStudy?.(directoryHandle);

        } catch (err) {
            if (err?.name === "NotFoundError" || err?.name === "AbortError") {
                return; // user canceled
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