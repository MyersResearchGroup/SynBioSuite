import { useState } from 'react';
import ConverterTab from './ConverterTab';
import SpreadsheetCreatorTab from './SpreadsheetCreatorTab';
import './ExcelToSBOL.css';

export default function ExcelToSBOL() {
    const [activeTab, setActiveTab] = useState('converter');

    return (
        <div className="app excel-to-sbol">
            <header className="header">
                <img 
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'%3E%3Ctext x='10' y='45' font-size='36' font-weight='bold' fill='%2348A9AE'%3EExcel2SBOL%3C/text%3E%3C/svg%3E"
                    alt="Excel2SBOL"
                    className="header-banner"
                />
            </header>

            <nav className="tab-bar" id="tab-bar">
                <div 
                    className="tab-indicator" 
                    id="tab-indicator"
                    style={{
                        transform: activeTab === 'converter' ? 'translateX(0)' : 'translateX(100%)',
                    }}
                ></div>
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