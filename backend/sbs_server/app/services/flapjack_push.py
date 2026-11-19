"""Push an XDC upload's plate reader output on to Flapjack.

The second half of services/xdc.py's run(): SynBioHub already holds the
upload by the time this is called.
"""
from __future__ import annotations

import os
import traceback
from typing import TYPE_CHECKING, Dict

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..errors import ApiError
from .common import Workspace

if TYPE_CHECKING:
    from .xdc import XdcRequest

# A frontend on the developer's machine names Flapjack by its published port;
# from inside the backend's container it is the Compose service instead.
LOCAL_FLAPJACK_URL = 'http://localhost:8000'
DOCKER_FLAPJACK_URL = 'http://flapjack-api-1:8000'
DEFAULT_TEMPERATURE = 37


def push(req: XdcRequest, metadata_path: str,
         plate_files_by_title: Dict[str, FileStorage], workspace: Workspace) -> str:
    """Import each plate file into the Flapjack study; return the URL used.

    Any failure is a 400, although SynBioHub already holds the upload. The
    plate files saved for the reader are the workspace's to remove.
    """
    try:
        # Imported here: a Flapjack install that will not load fails this
        # request, not the server.
        from .. import uploadFlapjack as fj_import

        fj_url = DOCKER_FLAPJACK_URL if req.fj_url == LOCAL_FLAPJACK_URL else req.fj_url

        # SynBioHub client (token) + Flapjack client (access token only)
        shop = fj_import.get_sbh_client(
            token=req.sbh_token, url=req.sbh_url, prefix=req.sbh_prefix,
        )
        flapjack = fj_import.get_flapjack_client(
            access_token=req.fj_token, refresh_token=req.fj_refresh_token,
            url=fj_url.split('://')[-1],
        )

        plate_paths = [
            _save_plate(plate_file, workspace)
            for plate_file in plate_files_by_title.values()
        ]

        # one plate file per populated assay (in order), uploaded into the SBS
        # study; zip() drops whichever side has more
        for (assay_id, assay_name, temperature), plate in zip(
                fj_import.read_assays(metadata_path), plate_paths):
            template_out = workspace.path('flapjack_input.xlsx')
            fj_import.import_study(
                shop, flapjack, metadata_path, plate,
                int(req.fj_study_id), assay_name, template_out,
                assay_id=assay_id, temperature=temperature or DEFAULT_TEMPERATURE)
            # Raises if import_study left no template, as it always has.
            os.remove(template_out)
        return fj_url
    except Exception as e:
        traceback.print_exc()
        print('Error uploading to Flapjack')
        raise ApiError(400, f'Error uploading to Flapjack: {e}') from e


def _save_plate(plate_file: FileStorage, workspace: Workspace) -> str:
    # SynBioHub has just been sent this stream, so it is at its end.
    plate_file.stream.seek(0)
    path = workspace.path(secure_filename(plate_file.filename))
    plate_file.save(path)
    return path
