import os
import json
import threading
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from excel2sbol import converter
from generator import generate
import pandas as pd

excel_bp = Blueprint('excel_to_sbol', __name__, url_prefix='/api/excel-to-sbol')

# State for progress tracking
_conversion_progress = {"finished": False, "success": False, "message": "Ready"}
_generation_progress = {"finished": False, "success": False, "message": "Ready"}

@excel_bp.route('/metadata', methods=['POST'])
def get_metadata():
    """Extract SBOL version, domain, email from uploaded Excel file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files['file']
    filepath = f"/tmp/{secure_filename(file.filename)}"
    file.save(filepath)

    try:
        result = {"sbol_version": None, "domain": None, "email": None}
        
        try:
            df = pd.read_excel(filepath, sheet_name="Init", header=None, usecols="B", nrows=1)
            result["sbol_version"] = int(df.iloc[0, 0])
        except:
            pass

        try:
            df_w = pd.read_excel(filepath, sheet_name="welcome", header=None, usecols="B,C")
            labels = df_w.iloc[:, 0].astype(str).str.strip()
            
            for label, col in [("Domain", "domain"), ("Email", "email")]:
                match = df_w[labels == label]
                if not match.empty:
                    value = match.iloc[0, 1]
                    if pd.notna(value):
                        result[col] = str(value).rstrip("/") if col == "domain" else str(value)
        except:
            pass

        os.remove(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@excel_bp.route('/convert', methods=['POST'])
def convert_file():
    """Convert Excel to SBOL."""
    global _conversion_progress
    
    data = request.get_json()
    file_data = data.get('file_path')  # This will be a file object or path
    sbol_version = int(data.get('sbol_version', 2))

    _conversion_progress = {"finished": False, "success": False, "message": "Starting..."}

    def do_convert():
        global _conversion_progress
        try:
            # Save uploaded file
            filepath = f"/tmp/excel_upload_{os.urandom(8).hex()}.xlsx"
            # (Handle file upload here)

            _conversion_progress["message"] = "Converting..."
            
            output_path = filepath.replace('.xlsx', '.xml')
            converter(
                filepath,
                output_path,
                sbol_version=sbol_version,
                # username, password, url if authenticated
            )

            _conversion_progress.update({
                "finished": True,
                "success": True,
                "message": f"Saved to: {output_path}"
            })
            os.remove(filepath)
        except Exception as e:
            _conversion_progress.update({
                "finished": True,
                "success": False,
                "message": str(e)
            })

    thread = threading.Thread(target=do_convert, daemon=True)
    thread.start()
    return jsonify({"status": "processing"})

@excel_bp.route('/progress', methods=['GET'])
def get_progress():
    return jsonify(_conversion_progress)