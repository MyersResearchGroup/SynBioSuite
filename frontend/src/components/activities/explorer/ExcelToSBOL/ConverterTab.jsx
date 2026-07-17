import { useState, useEffect } from 'react';
import { showNotification } from "@mantine/notifications";

const API_BASE = '/api/excel2sbol';

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
    const [jobId, setJobId] = useState(null);

    // Poll for job status
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/conversion/${jobId}`);
                const data = await response.json();

                setStatus(data.message);

                if (data.finished) {
                    clearInterval(interval);
                    setLoading(false);
                    setJobId(null);

                    if (data.success) {
                        showNotification({
                            color: 'green',
                            title: 'Conversion Complete',
                            message: data.message,
                        });
                    } else {
                        showNotification({
                            color: 'red',
                            title: 'Conversion Failed',
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

    const handleBrowseFile = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xlsm';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setCurrentFile(file);
            setFilePath(file.name);

            // Get metadata
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${API_BASE}/metadata`, {
                    method: 'POST',
                    body: formData,
                });
                const metadata = await response.json();

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
        setStatus('Starting conversion...');

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('sbol_version', sbolVersion);
        formData.append('use_signin', useSignin);
        formData.append('domain', domain.trim());
        formData.append('email', email.trim());
        formData.append('password', password);

        try {
            const response = await fetch(`${API_BASE}/convert`, {
                method: 'POST',
                body: formData,
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

    return (
        <div id="tab-converter" className="tab-content active">
            <section className="card">
                <div className="card-title">Excel File</div>
                <div className="folder-row">
                    <input type="text" value={filePath} placeholder="No file selected" readOnly />
                    <button className="btn" onClick={handleBrowseFile} disabled={loading}>
                        Browse
                    </button>
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
                            disabled={loading}
                        />
                        <span className="toggle-track"></span>
                    </label>
                    <span className="toggle-label">Sign in to use private repositories</span>
                </div>

                {useSignin && (
                    <div id="signin-fields">
                        <div className="divider"></div>
                        <div className="form-row">
                            <label className="form-label">Domain</label>
                            <input
                                type="text"
                                placeholder="https://synbiohub.org"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Email</label>
                            <input
                                type="text"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
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
                    {loading ? 'Converting...' : 'Convert'}
                </button>
            </div>
        </div>
    );
}