from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from urllib.parse import quote
from pathlib import Path
import traceback

import requests
from typing import Dict, List, Optional, Tuple, Union

import sbol2
from openpyxl import load_workbook

# NCIT role codes that classify a sample-design module. Role URIs aren't uniform
# (medium uses ``NCIT:C48164``, the strain/chassis use ``NCIT_C97158``/``NCIT_C14419``),
# so callers match with ``endswith`` rather than splitting on a separator. A design's
# strain is modeled as an *engineered strain* (C97158) that carries the plasmid(s) as
# functional components and nests the host *chassis* (C14419) one level down; Flapjack's
# "strain" is that chassis, so :func:`resolve` descends into the engineered strain to it.
MEDIUM_ROLE = "C48164"    # growth medium
STRAIN_ROLE = "C97158"    # engineered strain: its functional components are the plasmids
CHASSIS_ROLE = "C14419"   # host chassis nested in the strain -> Flapjack's "strain"

# 96-well plate layout: rows A-H, cols 1-12, wells in A1..A12,B1..H12 order.
PLATE_ROWS = tuple("ABCDEFGH")
PLATE_COLS = tuple(range(1, 13))
WELLS = ["{0}{1}".format(row, col) for row in PLATE_ROWS for col in PLATE_COLS]


# --------------------------------------------------------------------------- #
# SynBioHub client (PartShop)
# --------------------------------------------------------------------------- #
def get_sbh_client(
    token: Optional[str] = None,
    url: str = "https://synbiohub.org",
    prefix: Optional[str] = None,
) -> sbol2.PartShop:

    print("Connecting to SynBioHub at {0!r}".format(url))
    shop = sbol2.PartShop(url, prefix)
    if token:
        shop.key = token
    else:
        raise ValueError("get_sbh_client needs a token")
    return shop

# --------------------------------------------------------------------------- #
# The one design-domain object type + resolving it from SBOL
# --------------------------------------------------------------------------- #
@dataclass
class Supplement:
    """A chemical added to a sample design, with its concentration."""

    chemical: str  # name
    uri: str
    concentration: float


@dataclass
class SampleDesign:
    """A sample design resolved from SBOL: media, strain, plasmids, supplements.

    ``media``/``strain`` are ``(name, uri)``; ``strain`` is the host **chassis**
    (role C14419), nested inside the engineered strain (C97158) whose functional
    components become the Flapjack DNA (plasmids). Each field is enough to
    get-or-create the matching Flapjack object.
    """

    id: str  # the design name
    uri: str
    media: Optional[Tuple[str, str]] = None
    strain: Optional[Tuple[str, str]] = None
    plasmids: List[Tuple[str, str]] = field(default_factory=list)
    supplements: List[Supplement] = field(default_factory=list)


def _name_from_uri(uri: str) -> str:
    """displayId at the end of a SynBioHub URI (handles a trailing ``/1`` version)."""
    parts = uri.rstrip("/").split("/")
    return parts[-2] if parts[-1].isdigit() else parts[-1]


def _has_role(module_definition, codes) -> bool:
    """True if any of the module's roles ends with one of ``codes``."""
    codes = (codes,) if isinstance(codes, str) else codes
    return any(
        str(role).rstrip("/").endswith(code)
        for role in module_definition.roles
        for code in codes
    )


def _concentration(module_definition) -> Optional[float]:
    """The Flapjack#concentration value if the module carries one, else None."""
    for key, values in module_definition.properties.items():
        if str(key).endswith("concentration") and values:
            return float(values[0])
    return None


def resolve(shop: sbol2.PartShop, name: str, uri: str) -> SampleDesign:
    """Get a sample design from SBH and resolve it into a :class:`SampleDesign`.

    One recursive pull, then a purely local walk of the design's modules: classify
    each as medium (role C48164), engineered strain (C97158), or supplement (no
    role but a concentration, whose functional component is the chemical). The
    engineered strain's functional components are the plasmids, and its nested
    chassis (C14419) is the host strain Flapjack keys on -- so the strain field is
    that chassis, not the engineered-strain wrapper.
    """
    # one recursive pull brings the whole design tree (design + medium + strain +
    # chassis) in a single round-trip; plasmids/chemicals ride as URI references
    document = sbol2.Document()
    shop.pull(uri, document, recursive=True)
    by_uri = {md.identity: md for md in document.moduleDefinitions}
    design = SampleDesign(id=name, uri=uri)
    for module in by_uri[uri].modules:
        sub = by_uri[str(module.definition)]
        if _has_role(sub, MEDIUM_ROLE):
            design.media = (sub.displayId, sub.identity)
        elif _has_role(sub, STRAIN_ROLE):
            # the engineered strain carries the plasmids as functional components;
            # Flapjack's strain is the chassis (C14419) nested one level inside it
            design.plasmids = [
                (_name_from_uri(str(fc.definition)), str(fc.definition))
                for fc in sub.functionalComponents
            ]
            chassis = None
            for child_module in sub.modules:
                child = by_uri.get(str(child_module.definition))
                if child is not None and _has_role(child, CHASSIS_ROLE):
                    chassis = child
                    break
            if chassis is None:
                raise ValueError(
                    "engineered strain {0!r} has no chassis (role {1}) submodule"
                    .format(sub.displayId, CHASSIS_ROLE)
                )
            design.strain = (chassis.displayId, chassis.identity)
        elif (concentration := _concentration(sub)) is not None:
            for fc in sub.functionalComponents:
                uri_ = str(fc.definition)
                design.supplements.append(Supplement(_name_from_uri(uri_), uri_, concentration))
        else:
            raise ValueError(
                "Cannot classify module {0!r} of design {1}".format(sub.displayId, name)
            )
    return design


# --------------------------------------------------------------------------- #
# Flapjack client + get-or-create
# --------------------------------------------------------------------------- #
def _find_sheet(workbook, name: str):
    """Case-insensitive worksheet lookup."""
    try:
        return next(w for w in (workbook[n] for n in workbook.sheetnames) if w.title.lower() == name.lower())
    except StopIteration:
        raise ValueError("workbook has no {0!r} sheet".format(name))


def _header_index(sheet) -> Dict[str, int]:
    """``{normalized column name -> column index}`` from the sheet's first row."""
    return {
        str(cell.value).strip().lower(): index
        for index, cell in enumerate(next(sheet.iter_rows()))
        if cell.value is not None
    }


def _read_well_designs(
    workbook_path: Union[str, Path],
    assay_id: Optional[str] = None,
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """``({well -> design name}, {design name -> URI})`` for an assay's wells.

    The single reader for the ``sample`` + ``SBH_sampledesigns_collection`` sheets.
    Skips entirely empty rows and validates each well is inside the 96-well plate.
    """
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        collection = _find_sheet(workbook, "SBH_sampledesigns_collection")
        cols = _header_index(collection)
        uris = {
            str(r[cols["name"]]): str(r[cols["uri"]])
            for r in collection.iter_rows(min_row=2, values_only=True)
            if r[cols["name"]] and r[cols["uri"]]
        }
        samples = _find_sheet(workbook, "sample")
        scols = _header_index(samples)
        well_design: Dict[str, str] = {}
        for r in samples.iter_rows(min_row=2, values_only=True):
            if assay_id is not None and r[scols["assay id"]] != assay_id:
                continue
            cells = (r[scols["row"]], r[scols["column"]], r[scols["sample design"]])
            if all(_blank(c) for c in cells):
                continue
            if any(_blank(c) for c in cells):
                raise ValueError(
                    "sample row {0!r}, column {1!r}, design {2!r} is partly filled in"
                    .format(*cells)
                )
            row_name, column = _plate_row(r[scols["row"]]), _plate_column(r[scols["column"]])
            if row_name not in PLATE_ROWS or column not in PLATE_COLS:
                raise ValueError(
                    "sample well {0}{1} is outside the 96-well plate (rows A-H, cols 1-12)"
                    .format(row_name, column)
                )
            well = "{0}{1}".format(row_name, column)
            design = str(r[scols["sample design"]])
            if well_design.get(well, design) != design:
                raise ValueError(
                    "sample well {0} is assigned to both {1!r} and {2!r}"
                    .format(well, well_design[well], design)
                )
            well_design[well] = design
    finally:
        workbook.close()
    return well_design, uris

def read_unique_designs(
    workbook_path: Union[str, Path],
    assay_id: Optional[str] = None,
) -> List[Tuple[str, str]]:
    """The distinct ``(design name, SynBioHub URI)`` used by an assay, first-seen order.

    With ``assay_id`` given, only that assay's wells count; otherwise all wells.
    Raises if a referenced design is missing from ``SBH_sampledesigns_collection``.
    """
    well_design, uris = _read_well_designs(workbook_path, assay_id)
    names = list(dict.fromkeys(well_design.values()))
    missing = [n for n in names if n not in uris]
    if missing:
        raise ValueError("designs missing from SBH_sampledesigns_collection: {0}".format(missing))
    return [(name, uris[name]) for name in names]


def resolve_designs(
    shop: sbol2.PartShop,
    workbook_path: Union[str, Path],
    assay_id: Optional[str] = None,
) -> Dict[str, SampleDesign]:
    """``{design name -> SampleDesign}`` for every unique design used by an assay."""
    return {name: resolve(shop, name, uri)
            for name, uri in read_unique_designs(workbook_path, assay_id)}


def read_signals(workbook_path: Union[str, Path]) -> List[Tuple[str, str, str]]:
    """Ordered ``[(name, description, color)]`` from the workbook's ``signal`` sheet.

    Row order matters: it is matched to the reader's read order to build the
    reader-channel -> signal-name mapping (see :func:`import_study`). Description
    falls back to the name, color to a neutral gray.
    """
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        sheet = _find_sheet(workbook, "signal")
        cols = _header_index(sheet)
        name_i, desc_i, color_i = (cols.get("signal name"), cols.get("signal description"),
                                   cols.get("signal color"))
        signals: List[Tuple[str, str, str]] = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            name = row[name_i] if name_i is not None else None
            if not name:
                continue
            description = str(row[desc_i]) if desc_i is not None and row[desc_i] else str(name)
            color = str(row[color_i]) if color_i is not None and row[color_i] else "#888888"
            signals.append((str(name), description, color))
    finally:
        workbook.close()
    return signals


def read_study(workbook_path: Union[str, Path]) -> Tuple[str, Optional[str]]:
    """``(study name, description)`` from the workbook's ``study`` sheet (first data row)."""
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        sheet = _find_sheet(workbook, "study")
        cols = _header_index(sheet)
        row = next(sheet.iter_rows(min_row=2, values_only=True))
        name = str(row[cols["study name"]])
        desc = row[cols["study description"]] if "study description" in cols else None
        return name, (str(desc) if desc else None)
    finally:
        workbook.close()


def read_assays(workbook_path: Union[str, Path]) -> List[Tuple[str, str, Optional[float]]]:
    """``[(assay_id, assay_name, temperature)]`` for assays that have wells in ``sample``.

    The ``assay`` sheet lists every planned assay; only those actually populated in the
    ``sample`` sheet are returned (first-seen order), each paired with its name and
    temperature from the ``assay`` sheet (falling back to the id / None).
    """
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        samples = _find_sheet(workbook, "sample")
        scols = _header_index(samples)
        present = list(dict.fromkeys(
            str(r[scols["assay id"]])
            for r in samples.iter_rows(min_row=2, values_only=True)
            if r[scols["assay id"]]
        ))
        assay = _find_sheet(workbook, "assay")
        acols = _header_index(assay)
        meta: Dict[str, Tuple[str, Optional[float]]] = {}
        for r in assay.iter_rows(min_row=2, values_only=True):
            aid = r[acols["assay id"]]
            if aid:
                temp = r[acols["temperature"]] if "temperature" in acols else None
                meta[str(aid)] = (str(r[acols["assay name"]]), temp)
        return [(aid, *meta.get(aid, (aid, None))) for aid in present]
    finally:
        workbook.close()


# --------------------------------------------------------------------------- #
# Construct WB -- build the Flapjack input template (no Flapjack writes)
# --------------------------------------------------------------------------- #
_INT_RE = re.compile(r"[+-]?\d+")
_NUM_RE = re.compile(r"[+-]?(?:\d+\.\d*|\d*\.\d+|\d+)(?:[eE][+-]?\d+)?")


def _excel_value(text):
    """A raw plate-file cell string -> int / float / str / None."""
    text = (text or "").strip()
    if not text:
        return None
    if _INT_RE.fullmatch(text):
        return int(text)
    if _NUM_RE.fullmatch(text):
        return float(text)
    return text




def _blank(value) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _whole_number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else None
    return None


def _plate_row(value) -> str:
    whole = _whole_number(value)
    if whole is not None:
        if 1 <= whole <= len(PLATE_ROWS):
            return PLATE_ROWS[whole - 1]
        raise ValueError("sample row {0!r} is not a row number 1-8".format(value))
    text = str(value).strip().upper()
    if text in PLATE_ROWS:
        return text
    raise ValueError(
        "sample row {0!r} is neither a plate row A-H nor a row number 1-8".format(value)
    )


def _plate_column(value) -> int:
    whole = _whole_number(value)
    if whole is None:
        raise ValueError(
            "sample column {0!r} is not a whole column number 1-12".format(value)
        )
    return whole


TIMEOUT = 120
TEXT_EXPORTS = (".txt", ".csv", ".tsv")


def mapping_for(plates):
    text = {name.lower().endswith(TEXT_EXPORTS) for name, _ in plates}
    if len(text) > 1:
        raise ValueError("Send Gen5 text exports and Excel exports to BOB in separate uploads")
    return "biotek-gen5-kinetic-text" if text == {True} else "biotek-gen5-kinetic"


def _fields(sbh_prefix, sbh_token, plate_assays):
    return {
        "synbiohub_token": sbh_token or "",
        "synbiohub_instance": (sbh_prefix or "").rstrip("/") if sbh_token else "",
        "plate_assays": json.dumps(plate_assays) if plate_assays else "",
    }


def _validate_wells(workbook_path):
    """Refuse an unusable well map before anything is sent.

    A file that is not a readable Assay workbook is left to BOB's own check, which reports it.
    """
    try:
        assay_ids = [a[0] for a in read_assays(workbook_path)]
    except ValueError:
        raise
    except Exception:
        return
    for assay_id in assay_ids or [None]:
        _read_well_designs(workbook_path, assay_id)


def _send(bob_url, bob_token, study_id, path, workbook_path, workbook_name, plates, fields, expected):
    _validate_wells(workbook_path)
    with open(workbook_path, "rb") as workbook:
        files = [("workbook", (workbook_name, workbook.read(), "application/octet-stream"))]
    files += [("plates", (name, data, "application/octet-stream")) for name, data in plates]
    response = requests.post(
        "{0}/api/studies/{1}/{2}".format(bob_url.rstrip("/"), quote(str(study_id), safe=""), path),
        headers={"Authorization": "Bearer {0}".format(bob_token)},
        files=files,
        data={"mapping_key": mapping_for(plates), **{k: v for k, v in fields.items() if v}},
        timeout=TIMEOUT,
        allow_redirects=False,
    )
    if response.status_code != expected:
        try:
            detail = response.json().get("detail")
        except ValueError:
            detail = None
        raise RuntimeError("BOB answered {0}: {1}".format(
            response.status_code,
            detail if isinstance(detail, str) else response.text[:300]))
    return response.json()


def check_bob(bob_url, bob_token, study_id, workbook_path, workbook_name, plates,
              sbh_prefix="", sbh_token="", plate_assays=None):
    """What BOB would do with this upload, with nothing saved."""
    return _send(bob_url, bob_token, study_id, "workbook/check", workbook_path, workbook_name,
                 plates, _fields(sbh_prefix, sbh_token, plate_assays), 200)


def upload_to_bob(bob_url, bob_token, study_id, workbook_path, workbook_name, plates,
                  synbiohub_collection="", sbh_prefix="", sbh_token="", plate_assays=None):
    """BOB's import summary: assays with their action, samples_created, samples_updated, warnings."""
    fields = {"synbiohub_collection": synbiohub_collection or "",
              **_fields(sbh_prefix, sbh_token, plate_assays)}
    return _send(bob_url, bob_token, study_id, "workbook", workbook_path, workbook_name,
                 plates, fields, 201)


def preflight_designs(shop: sbol2.PartShop, workbook_path, assay_id=None):
    """Resolve this assay's designs against SynBioHub before uploading.

    Optional. BOB resolves the same designs itself during import and its plan is what gets
    stored; this only reports earlier and more plainly.
    """
    return resolve_designs(shop, workbook_path, assay_id)


def import_study(bob_url, bob_token, study_id, workbook_path, workbook_name, plates,
                 synbiohub_collection="", sbh_prefix="", sbh_token="", plate_assays=None):
    """Run the whole workflow: ask BOB what it would do, then import if it would accept.

    ``study_id`` must already exist. ``plates`` is a list of (file name, bytes); the workbook
    and the plate files are sent exactly as supplied.
    """
    found = check_bob(bob_url, bob_token, study_id, workbook_path, workbook_name, plates,
                      sbh_prefix, sbh_token, plate_assays)
    if not found.get("ok"):
        raise RuntimeError("BOB cannot import this upload: "
                           + "; ".join(found.get("problems", [])))
    return upload_to_bob(bob_url, bob_token, study_id, workbook_path, workbook_name, plates,
                         synbiohub_collection, sbh_prefix, sbh_token, plate_assays)
