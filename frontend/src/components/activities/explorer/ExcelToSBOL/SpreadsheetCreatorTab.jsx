import { useState, useEffect } from 'react';
import { showNotification } from "@mantine/notifications";

const API_BASE = '/api/excel2sbol';

const TEMPLATE_TYPES = {
    resources: { label: 'Parts Library', desc: 'Genetic parts: promoters, RBS, CDS, terminators, proteins, and more' },
    strains: { label: 'Strains', desc: 'Engineered organism strains with chassis and plasmid references' },
    sample_design: { label: 'Sample Design', desc: 'Experimental sample designs with strains, media, and supplements' },
    study: { label: 'Study', desc: 'Experimental studies with assays, samples, and measurements' },
    custom: { label: 'Custom', desc: 'Pick any combination of sheets from all available types' },
};

const STEP_MAP = {
    resources: [1, 2, 3, 4],
    strains: [1, 3, 4],
    sample_design: [1, 3, 4],
    study: [1, 3, 4],
    custom: [1, 2, 3, 4],
};

export default function SpreadsheetCreatorTab() {
    const [step, setStep] = useState(1);
    const [templateType, setTemplateType] = useState(null);
    const [selectedParts, setSelectedParts] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [libraryName, setLibraryName] = useState('');
    const [author, setAuthor] = useState('');
    const [email, setEmail] = useState('');
    const [lab, setLab] = useState('');
    const [institution, setInstitution] = useState('');
    const [description, setDescription] = useState('');
    const [pubmedId, setPubmedId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sbolVersion, setSbolVersion] = useState('2');
    const [outputFolder, setOutputFolder] = useState('');
    const [loading, setLoading] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState('Ready');

    // Load catalog when entering step 2
    useEffect(() => {
        if (step === 2 && templateType) {
            fetchCatalog(templateType);
        }
    }, [step, templateType]);

    // Poll for generation status
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/generation/${jobId}`);
                const data = await response.json();

                setStatus(data.message);

                if (data.finished) {
                    clearInterval(interval);
                    setLoading(false);
                    setJobId(null);

                    if (data.success) {
                        showNotification({
                            color: 'green',
                            title: 'Spreadsheet Created',
                            message: data.message,
                        });
                    } else {
                        showNotification({
                            color: 'red',
                            title: 'Generation Failed',
                            message: data.message,
                        });
                    }
                }
            } catch (err) {
                console.error('Error polling status:', err);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [jobId]);

    const fetchCatalog = async (type) => {
        try {
            const response = await fetch(`${API_BASE}/sheet-catalog/${type}`);
            const data = await response.json();
            setCatalog(data);
        } catch (err) {
            showNotification({
                color: 'red',
                message: 'Could not load sheet catalog',
            });
        }
    };

    const handleTypeSelect = (type) => {
        setTemplateType(type);
        setStep(2);
    };

    const handlePartToggle = (partName) => {
        setSelectedParts(prev =>
            prev.includes(partName)
                ? prev.filter(p => p !== partName)
                : [...prev, partName]
        );
    };

    const handleNextStep = () => {
        const steps = STEP_MAP[templateType] || [1, 2, 3, 4];
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) {
            setStep(steps[idx + 1]);
        }
    };

    const handleBackStep = () => {
        const steps = STEP_MAP[templateType] || [1, 2, 3, 4];
        const idx = steps.indexOf(step);
        if (idx > 0) {
            setStep(steps[idx - 1]);
        }
    };

    const handleGenerate = async () => {
        if (!libraryName.trim()) {
            showNotification({ color: 'red', message: 'Library name is required' });
            return;
        }
        if (!outputFolder) {
            showNotification({ color: 'red', message: 'Output folder is required' });
            return;
        }

        setLoading(true);
        setStatus('Starting generation...');

        const config = {
            template_type: templateType,
            selected_parts: selectedParts,
            output_folder: outputFolder,
            metadata: {
                library_name: libraryName,
                author: author,
                email: email,
                lab: lab,
                institution: institution,
                description: description,
                pubmed_id: pubmedId,
                date: date,
                sbol_version: parseInt(sbolVersion),
            },
        };

        try {
            const response = await fetch(`${API_BASE}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const { job_id } = await response.json();
            setJobId(job_id);
        } catch (error) {
            setLoading(false);
            setStatus('Ready');
            showNotification({
                color: 'red',
                title: 'Error',
                message: error.message,
            });
        }
    };

    const handleBrowseFolder = () => {
        // Note: Browser doesn't have native folder picker without Electron/Desktop API
        // This is a placeholder. In production, you'd need a different approach.
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter output folder path';
        const value = prompt('Enter output folder path:');
        if (value) {
            setOutputFolder(value);
        }
    };

    const steps = STEP_MAP[templateType] || [1, 2, 3, 4];
    const isLastStep = steps.indexOf(step) === steps.length - 1;
    const canProceed = step === 1 ? templateType : (step === 2 ? selectedParts.length > 0 : (step === 3 ? libraryName.trim() : outputFolder));

    return (
        <div id="tab-spreadsheet" className="tab-content">
            {/* Step Indicator */}
            <div className="sc-stepper">
                {[1, 2, 3, 4].map(i => {
                    const included = steps.includes(i);
                    const isCurrent = i === step;
                    const isCompleted = steps.indexOf(i) < steps.indexOf(step);

                    return (
                        <div
                            key={i}
                            className={`sc-step-node ${included ? (isCurrent ? 'active' : (isCompleted ? 'completed' : '')) : 'skipped'}`}
                        >
                            <div className="sc-step-circle">{i}</div>
                            <div className="sc-step-label">
                                {i === 1 ? 'Type' : i === 2 ? 'Parts' : i === 3 ? 'Info' : 'Save'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Step 1: Type Selection */}
            {step === 1 && (
                <div className="sc-panel">
                    <div className="sc-panel-title">What would you like to create?</div>
                    <div className="sc-type-grid">
                        {Object.entries(TEMPLATE_TYPES).map(([key, { label, desc }]) => (
                            <button
                                key={key}
                                className={`sc-type-card ${templateType === key ? 'selected' : ''}`}
                                onClick={() => handleTypeSelect(key)}
                            >
                                <div className="sc-type-name">{label}</div>
                                <div className="sc-type-desc">{desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Parts Selection */}
            {step === 2 && templateType && (
                <div className="sc-panel">
                    <div className="sc-panel-title">Which part types do you need?</div>
                    <div className="sc-select-all-row">
                        <button
                            className="btn btn-sm"
                            onClick={() => setSelectedParts(catalog.flatMap(g => g.sheets.map(s => s.name)))}
                        >
                            Select All
                        </button>
                        <button
                            className="btn btn-sm"
                            onClick={() => setSelectedParts([])}
                        >
                            Deselect All
                        </button>
                    </div>
                    <div id="sc-parts-container">
                        {catalog.map((group, idx) => (
                            <div key={idx} className="sc-parts-group">
                                <div className="sc-parts-group-title">{group.group}</div>
                                <div className="sc-parts-grid">
                                    {group.sheets.map(sheet => (
                                        <label key={sheet.name} className={`sc-part-item ${selectedParts.includes(sheet.name) ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="sc-part-chk"
                                                checked={selectedParts.includes(sheet.name)}
                                                onChange={() => handlePartToggle(sheet.name)}
                                            />
                                            <span className="sc-part-name">{sheet.display_name}</span>
                                            {sheet.hint && <span className="sc-part-hint">{sheet.hint}</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Library Info */}
            {step === 3 && (
                <div className="sc-panel">
                    <div className="sc-panel-title">Tell us about your library</div>
                    <section className="card">
                        <div className="form-row">
                            <label className="form-label">Library Name <span className="required-star">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. iGEM_2025_Parts"
                                value={libraryName}
                                onChange={(e) => setLibraryName(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Author</label>
                            <input
                                type="text"
                                placeholder="Your name"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Email</label>
                            <input
                                type="text"
                                placeholder="you@institution.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Lab</label>
                            <input
                                type="text"
                                placeholder="Lab name"
                                value={lab}
                                onChange={(e) => setLab(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Institution</label>
                            <input
                                type="text"
                                placeholder="University or organization"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Description</label>
                            <textarea
                                className="sc-textarea"
                                placeholder="A brief description of this library..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="form-row">
                            <label className="form-label">PubMed ID</label>
                            <input
                                type="text"
                                placeholder="e.g. 12345678"
                                value={pubmedId}
                                onChange={(e) => setPubmedId(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">SBOL Version</label>
                            <div className="option-group option-group-row">
                                <label className="option-row">
                                    <input
                                        type="radio"
                                        name="sc-sbol-version"
                                        value="2"
                                        checked={sbolVersion === '2'}
                                        onChange={(e) => setSbolVersion(e.target.value)}
                                    />
                                    <label>SBOL 2</label>
                                </label>
                                <label className="option-row">
                                    <input
                                        type="radio"
                                        name="sc-sbol-version"
                                        value="3"
                                        checked={sbolVersion === '3'}
                                        onChange={(e) => setSbolVersion(e.target.value)}
                                    />
                                    <label>SBOL 3</label>
                                </label>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Step 4: Save */}
            {step === 4 && (
                <div className="sc-panel">
                    <div className="sc-panel-title">Choose where to save</div>
                    <section className="card">
                        <div className="card-title">Output Folder</div>
                        <div className="folder-row">
                            <input type="text" value={outputFolder} placeholder="No folder selected" readOnly />
                            <button className="btn" onClick={handleBrowseFolder} disabled={loading}>
                                Browse
                            </button>
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-title">File Preview</div>
                        <div className="sc-preview-row">
                            <span className="sc-preview-label">Template</span>
                            <span className="sc-preview-value">{TEMPLATE_TYPES[templateType]?.label || '—'}</span>
                        </div>
                        <div className="sc-preview-row">
                            <span className="sc-preview-label">Library Name</span>
                            <span className="sc-preview-value">{libraryName || '—'}</span>
                        </div>
                    </section>

                    {loading && (
                        <section className="progress-section">
                            <div className="progress-bar-track">
                                <div className="progress-bar-fill indeterminate"></div>
                            </div>
                            <div className="status-text">{status}</div>
                        </section>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div className="sc-nav">
                <button
                    className="btn"
                    onClick={handleBackStep}
                    style={{ visibility: steps.indexOf(step) === 0 ? 'hidden' : 'visible' }}
                    disabled={loading}
                >
                    ← Back
                </button>
                <button
                    className="btn btn-accent"
                    onClick={isLastStep ? handleGenerate : handleNextStep}
                    disabled={!canProceed || loading}
                >
                    {isLastStep ? (loading ? 'Creating...' : 'Create Spreadsheet') : 'Next →'}
                </button>
            </div>
        </div>
    );
}