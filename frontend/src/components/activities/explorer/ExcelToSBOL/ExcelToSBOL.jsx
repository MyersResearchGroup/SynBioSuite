import { useState } from 'react';
import ConverterTab from './ConverterTab';
import SpreadsheetCreatorTab from './SpreadsheetCreatorTab';
import './ExcelToSBOL.css';

export default function ExcelToSBOL() {
    const [activeTab, setActiveTab] = useState('converter');

    return (
        <div className="app excel-to-sbol">
            <header className="header">
                <img src="/E2S.png" alt="Excel2SBOL" className="header-banner" />
            </header>

            <nav className="tab-bar" id="tab-bar">
                <div className="tab-indicator" id="tab-indicator"></div>
                <button 
                    className={`tab ${activeTab === 'converter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('converter')}
                >
                    Converter
                </button>
                <button 
                    className={`tab ${activeTab === 'spreadsheet' ? 'active' : ''}`}
                    onClick={() => setActiveTab('spreadsheet')}
                >
                    Spreadsheet Creator
                </button>
            </nav>

            {activeTab === 'converter' && <ConverterTab />}
            {activeTab === 'spreadsheet' && <SpreadsheetCreatorTab />}
        </div>
    );
}