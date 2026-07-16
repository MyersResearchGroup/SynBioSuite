import os
import json
import threading
import tempfile
from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
from uuid import uuid4

# Import excel2sbol from the installed package
import excel2sbol
from excel2sbol.converter import converter as excel2sbol_converter

excel2sbol_bp = Blueprint('excel2sbol', __name__, url_prefix='/api/excel2sbol')

# Global state for tracking conversions
_conversions = {}  # {job_id: {finished, success, message}}

# ============================================================================
# CONVERTER ROUTES
# ============================================================================

@excel2sbol_bp.route('/metadata', methods=['POST'])
def get_metadata():
    """Extract SBOL version, domain, email from uploaded Excel file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Save to temporary file
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    try:
        result = {"sbol_version": None, "domain": None, "email": None}

        # Extract SBOL version from Init sheet
        try:
            df = pd.read_excel(temp_path, sheet_name="Init", header=None, usecols="B", nrows=1)
            result["sbol_version"] = int(df.iloc[0, 0])
        except Exception as e:
            print(f"Could not read SBOL version: {e}")

        # Extract domain and email from Welcome sheet
        try:
            df_w = pd.read_excel(temp_path, sheet_name="welcome", header=None, usecols="B,C")
            labels = df_w.iloc[:, 0].astype(str).str.strip()

            def _get_field(label):
                match = df_w[labels == label]
                if match.empty:
                    return None
                value = match.iloc[0, 1]
                return None if pd.isna(value) else str(value)

            domain = _get_field("Domain")
            if domain:
                result["domain"] = domain.rstrip("/")

            email = _get_field("Email")
            if email:
                result["email"] = email

        except Exception as e:
            print(f"Could not read domain/email: {e}")

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@excel2sbol_bp.route('/convert', methods=['POST'])
def start_conversion():
    """Start an async conversion from Excel to SBOL."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    sbol_version = request.form.get('sbol_version', '2')
    use_signin = request.form.get('use_signin', 'false').lower() == 'true'
    domain = request.form.get('domain', '').strip()
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')

    job_id = str(uuid4())
    _conversions[job_id] = {
        "finished": False,
        "success": False,
        "message": "Starting conversion...",
    }

    # Save file to temp location
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    # Start conversion in background thread
    thread = threading.Thread(
        target=_do_conversion,
        args=(job_id, temp_path, int(sbol_version), use_signin, domain, email, password),
        daemon=True
    )
    thread.start()

    return jsonify({"job_id": job_id}), 202


def _do_conversion(job_id, file_path, sbol_version, use_signin, domain, email, password):
    """Background worker for conversion."""
    try:
        _conversions[job_id]["message"] = "Validating credentials..."

        # Validate domain if signing in
        if use_signin:
            import requests
            for attempt in range(1, 4):
                try:
                    requests.get(domain, timeout=10)
                    break
                except requests.exceptions.RequestException:
                    if attempt == 3:
                        raise Exception("Invalid domain after 3 attempts.")

            _conversions[job_id]["message"] = "Signing in..."
            for attempt in range(1, 4):
                try:
                    resp = requests.post(
                        f"{domain}/login",
                        headers={"Accept": "text/plain"},
                        data={"email": email, "password": password},
                        timeout=10
                    )
                    if resp.status_code == 200:
                        break
                    if attempt == 3:
                        raise Exception("Incorrect email or password.")
                except requests.exceptions.RequestException:
                    if attempt == 3:
                        raise Exception("Could not connect to domain.")

        _conversions[job_id]["message"] = "Converting Excel to SBOL..."

        # Generate output filename with timestamp
        dt = datetime.now().strftime("%y.%m.%d.%H.%M.%S")
        base = os.path.splitext(os.path.basename(file_path))[0]
        output_path = f"{base}_{dt}.xml"

        # Call excel2sbol converter
        excel2sbol_converter(
            file_path,
            output_path,
            sbol_version=sbol_version,
            username=email if use_signin else None,
            password=password if use_signin else None,
            url=domain if use_signin else None,
        )

        _conversions[job_id].update({
            "finished": True,
            "success": True,
            "message": f"Conversion complete. File saved to: {output_path}",
            "output_file": output_path,
        })

    except Exception as e:
        _conversions[job_id].update({
            "finished": True,
            "success": False,
            "message": str(e.args[0]) if e.args else str(e),
        })

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@excel2sbol_bp.route('/conversion/<job_id>', methods=['GET'])
def get_conversion_status(job_id):
    """Get the status of a conversion job."""
    if job_id not in _conversions:
        return jsonify({"error": "Job not found"}), 404

    return jsonify(_conversions[job_id]), 200