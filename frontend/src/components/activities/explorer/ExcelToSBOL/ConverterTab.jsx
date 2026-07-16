import { useState } from 'react';
import { showNotification } from "@mantine/notifications";

export default function ConverterTab() {
    const [filePath, setFilePath] = useState('');
    const [currentFile, setCurrentFile] = useState(null);
    const [sbolVersion, setSbolVersion] = useState('2');
    const [useSignin, setUseSignin] = useState(false);
    const [domain, setDomain] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Ready');

    const handleBrowseFile = async () => {
        // Use the File API for browser file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xlsm';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setCurrentFile(file);
            setFilePath(file.name);

            // Optionally, read Excel metadata
            try {
                const metadata = await getExcelMetadata(file);
                if (metadata.sbol_version) {
                    setSbolVersion(String(metadata.sbol_version));
                }
                if (metadata.domain) setDomain(metadata.domain);
                if (metadata.email) setEmail(metadata.email);
            } catch (err) {
                console.error('Could not read metadata:', err);
            }
        };
        input.click();
    };

    const handleConvert = async () => {
        if (!currentFile) {
            showNotification({ color: 'red', message: 'No file selected' });
            return;
        }

        setLoading(true);
        setStatus('Converting...');

        try {
            const config = {
                file_path: currentFile,
                sbol_version: parseInt(sbolVersion),
                use_signin: useSignin,
                domain: domain.trim(),
                email: email.trim(),
                password: password,
            };

            // Call backend API
            const response = await fetch('/api/excel-to-sbol/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (!response.ok) throw new Error(await response.text());

            const result = await response.json();
            showNotification({
                color: 'green',
                title: 'Conversion Complete',
                message: result.message,
            });
            setStatus('Ready');
        } catch (error) {
            setStatus('Error: ' + error.message);
            showNotification({ color: 'red', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="tab-converter" className="tab-content active">
            <section className="card">
                <div className="card-title">Excel File</div>
                <div className="folder-row">
                    <input type="text" value={filePath} placeholder="No file selected" readOnly />
                    <button className="btn" onClick={handleBrowseFile}>Browse</button>
                </div>
            </section>

            <section className="card">
                <div className="card-title">SBOL Version</div>
                <div className="option-group option-group-row">
                    <label className="option-row">
                        <input
                            type="radio"
                            name="sbol-version"
                            value="2"
                            checked={sbolVersion === '2'}
                            onChange={(e) => setSbolVersion(e.target.value)}
                        />
                        <label>SBOL 2</label>
                    </label>
                    <label className="option-row">
                        <input
                            type="radio"
                            name="sbol-version"
                            value="3"
                            checked={sbolVersion === '3'}
                            onChange={(e) => setSbolVersion(e.target.value)}
                        />
                        <label>SBOL 3</label>
                    </label>
                </div>
            </section>

            <section className="card">
                <div className="toggle-row">
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={useSignin}
                            onChange={(e) => setUseSignin(e.target.checked)}
                        />
                        <span className="toggle-track"></span>
                    </label>
                    <span className="toggle-label">Sign in to use private repositories</span>
                </div>

                {useSignin && (
                    <div id="signin-fields">
                        <div className="divider"></div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="domain-input">Domain</label>
                            <input
                                type="text"
                                id="domain-input"
                                placeholder="https://synbiohub.org"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="email-input">Email</label>
                            <input
                                type="text"
                                id="email-input"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="password-input">Password</label>
                            <input
                                type="password"
                                id="password-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </section>

            {loading && (
                <section className="progress-section">
                    <div className="progress-bar-track">
                        <div className="progress-bar-fill indeterminate"></div>
                    </div>
                    <div className="status-text">{status}</div>
                </section>
            )}

            <div className="extract-row">
                <button 
                    className="btn btn-accent" 
                    onClick={handleConvert}
                    disabled={!currentFile || loading}
                >
                    Convert
                </button>
            </div>
        </div>
    );
}

async function getExcelMetadata(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/excel-to-sbol/metadata', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) throw new Error('Could not read metadata');
    return response.json();
}