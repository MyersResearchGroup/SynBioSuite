import { ScrollArea } from '@mantine/core';
import { createContext } from 'react';

import PanelSaver from '../PanelSaver';
import BuildCompilerWizard from './BuildCompilerWizard';

export const BuildCompilerPanelContext = createContext(null);

export default function BuildCompilerPanel({ id }) {
    return (
        <BuildCompilerPanelContext.Provider value={id}>
            <ScrollArea style={{ height: 'calc(100vh - 52px)' }}>
                <BuildCompilerWizard />
            </ScrollArea>
            <PanelSaver id={id} />
        </BuildCompilerPanelContext.Provider>
    );
}
