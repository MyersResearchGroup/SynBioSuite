import { Button, Center, Text } from '@mantine/core'
import React from 'react'

export default function FolderSelect({ onOpenStudy, onNewStudy, children }) {

    const handleClick = async () => {
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });

      try {
        await directoryHandle.getFileHandle("study.json");

        await onOpenStudy?.(directoryHandle);

      } catch (err) {
        if (err.name !== "NotFoundError")
          throw err;
        await onNewStudy?.(directoryHandle);
      }
    };

    return (
        <Button onClick={handleClick}>{children || "Open Study"}</Button>
    );
}
