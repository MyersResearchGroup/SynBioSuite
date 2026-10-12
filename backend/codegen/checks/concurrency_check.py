"""Spike check, not shipped: do concurrent uploads share sbol2's homespace?

sbol2 keeps the homespace in one process-global setting. An SBOL upload sets
it (api/ingest.py) and, after a SynBioHub query, creates the sub-collection
object under it (synbiohubUpload.py). Two uploads running at once in one
process could therefore submit a sub-collection under the other's homespace.

This file plays three parts, all inside the backend container:

  uwsgi module    `application` is the combined app with POST /devices and
                  POST /designs wired to the existing view, recording which
                  process and thread served each request.
  synbiohub       `python concurrency_check.py synbiohub` is a stand-in
                  SynBioHub that records the sub-collection URI of every
                  submitted document. Its SPARQL answer is slow on purpose, to
                  hold the window between the two sbol2 calls open.
  fire            `python concurrency_check.py fire [count]` sends that many
                  uploads at once, alternating the two collections, and prints
                  what was recorded.
"""
import json
import os
import re
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REQUEST_LOG = '/tmp/sbs-check-requests.jsonl'
SUBMIT_LOG = '/tmp/sbs-check-submits.jsonl'

STUB_HOST = '127.0.0.1'
STUB_PORT = 9999
STUB_URL = f'http://{STUB_HOST}:{STUB_PORT}'
SPARQL_DELAY_SECONDS = 0.3

BACKEND_URL = 'http://127.0.0.1:5003'
STUDY_URI = 'https://synbiohub.org/user/tester/Study/Study_collection/1'
DEFAULT_UPLOADS = 60
CLIENT_THREADS = 20
REQUEST_TIMEOUT_SECONDS = 120

# collection path -> (sub-collection displayId, the homespace it must be under)
EXPECTED = {
    'devices': ('Devices', 'https://example.com/'),
    'designs': ('Designs', 'https://sbolcanvas.org/'),
}
SUBCOLLECTION_URI = re.compile(rb'rdf:about="([^"]+/(?:Devices|Designs)/1)"')

SBOL_TEMPLATE = """<?xml version="1.0" ?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:sbol="http://sbols.org/v2#">
  <sbol:ComponentDefinition rdf:about="https://upload.example/{name}/1">
    <sbol:persistentIdentity rdf:resource="https://upload.example/{name}"/>
    <sbol:displayId>{name}</sbol:displayId>
    <sbol:version>1</sbol:version>
    <sbol:type rdf:resource="http://www.biopax.org/release/biopax-level3.owl#DnaRegion"/>
  </sbol:ComponentDefinition>
</rdf:RDF>
"""


def _append(path, record):
    with open(path, 'a', encoding='utf-8') as handle:
        handle.write(json.dumps(record) + '\n')


def _read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as handle:
        return [json.loads(line) for line in handle if line.strip()]


# ------------------------------------------------------------------ uwsgi module

def _build_application():
    from app.api import impl, views
    from app.api.registry import COLLECTIONS
    from app.connexion_app import application as combined

    in_flight = 0
    lock = threading.Lock()

    def instrumented(spec):
        def handler(file, params=None):
            nonlocal in_flight
            with lock:
                in_flight += 1
                seen = in_flight
            try:
                _append(REQUEST_LOG, {
                    'pid': os.getpid(),
                    'thread': threading.get_ident(),
                    'in_flight': seen,
                })
                return views.create_in_collection(spec)
            finally:
                with lock:
                    in_flight -= 1
        return handler

    for path in EXPECTED:
        setattr(impl, f'create_{path}', instrumented(COLLECTIONS[path]))
    return combined


# ------------------------------------------------------------------- synbiohub

class _FakeSynBioHub(BaseHTTPRequestHandler):
    def do_GET(self):
        if '/metadata' in self.path:
            self._json([{'displayId': 'Study_collection'}])
        elif '/sparql' in self.path:
            time.sleep(SPARQL_DELAY_SECONDS)
            self._json({'results': {'bindings': []}})
        else:
            self.send_error(404)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if not self.path.endswith('/submit'):
            self.send_error(404)
            return
        for match in SUBCOLLECTION_URI.finditer(body):
            _append(SUBMIT_LOG, {'collection': match.group(1).decode()})
        self._send(200, 'text/plain', b'Successfully uploaded')

    def _json(self, payload):
        self._send(200, 'application/json', json.dumps(payload).encode())

    def _send(self, status, content_type, body):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def serve_synbiohub():
    ThreadingHTTPServer((STUB_HOST, STUB_PORT), _FakeSynBioHub).serve_forever()


# ------------------------------------------------------------------------ fire

def _upload(index):
    import requests

    path = 'devices' if index % 2 == 0 else 'designs'
    name = f'{path}_{index}'
    response = requests.post(
        f'{BACKEND_URL}/api/v1/{path}',
        headers={
            'Authorization': 'Bearer check-not-a-token',
            'X-Study-Collection': STUDY_URI,
            'X-SynBioHub-Url': STUB_URL,
        },
        files={'file': (f'{name}.xml', SBOL_TEMPLATE.format(name=name), 'application/rdf+xml')},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    return response.status_code, response.text[:200]


def fire(count):
    for path in (REQUEST_LOG, SUBMIT_LOG):
        open(path, 'w').close()

    with ThreadPoolExecutor(CLIENT_THREADS) as pool:
        results = list(pool.map(_upload, range(count)))

    statuses = Counter(status for status, _ in results)
    print(f'uploads sent: {count}; statuses: {dict(statuses)}')
    for status, text in results:
        if status != 201:
            print(f'  first non-201: {status} {text}')
            break

    requests_seen = _read(REQUEST_LOG)
    print('per worker process: requests, distinct threads, most in flight at once')
    for pid in sorted({r['pid'] for r in requests_seen}):
        mine = [r for r in requests_seen if r['pid'] == pid]
        print(f'  pid {pid}: {len(mine)}, {len({r["thread"] for r in mine})}, '
              f'{max(r["in_flight"] for r in mine)}')

    submitted = Counter(r['collection'] for r in _read(SUBMIT_LOG))
    correct = {home + name + '/1' for name, home in EXPECTED.values()}
    print('sub-collection URIs in the submitted documents:')
    for uri, total in sorted(submitted.items()):
        print(f'  {total:4d}  {uri}  {"ok" if uri in correct else "WRONG HOMESPACE"}')
    wrong = sum(total for uri, total in submitted.items() if uri not in correct)
    print(f'verdict: {wrong} of {sum(submitted.values())} submitted documents '
          f'had the wrong homespace')


if __name__ == '__main__':
    if sys.argv[1:2] == ['synbiohub']:
        serve_synbiohub()
    elif sys.argv[1:2] == ['fire']:
        fire(int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_UPLOADS)
    else:
        sys.exit(__doc__)
else:
    application = _build_application()
