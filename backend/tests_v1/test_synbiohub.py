"""sbs_v1.synbiohub: row merging, the /metadata rule, and how failures map to statuses."""
from urllib.parse import unquote_plus

import pytest
import requests

from conftest import FakeResponse, sparql_answer
from sbs_v1 import synbiohub
from sbs_v1.errors import ApiError
from sbs_v1.http import BlockedDestinationError

COLLECTION = "https://sbh.example.org/user/alice/study1/Strains/1"
A = "https://sbh.example.org/user/alice/study1/a/1"
B = "https://sbh.example.org/user/alice/study1/b/1"


def test_rows_for_one_object_are_merged_into_one_item(ctx, fake_sbh):
    fake_sbh({"/sparql?": sparql_answer(
        {"s": A, "id": "a", "name": "A", "type": "t1", "role": "r1"},
        {"s": A, "id": "a", "name": "A", "type": "t1", "role": "r2"},
        {"s": A, "id": "a", "name": "A", "type": "t2", "role": "r1"},
        {"s": B, "id": "b"},
    )})

    items = synbiohub.list_items(ctx, COLLECTION)

    assert items == [
        {"uri": A, "displayId": "a", "name": "A", "description": None,
         "type": ["t1", "t2"], "role": ["r1", "r2"]},
        {"uri": B, "displayId": "b", "name": None, "description": None,
         "type": [], "role": []},
    ]


def test_query_goes_to_the_api_host_and_names_the_graph_and_collection(ctx, fake_sbh):
    requested = fake_sbh({"/sparql?": sparql_answer()})

    synbiohub.list_items(ctx, COLLECTION)

    (url,) = requested
    assert url.startswith("https://api.sbh.example.org/sparql?query=")
    assert unquote_plus(url).count(f"<{COLLECTION}>") == 1


@pytest.mark.parametrize("answer, status", [
    (FakeResponse(500, text="boom"), 502),
    (FakeResponse(200, json_body=None, text="<html>"), 502),
    (requests.ConnectionError("refused"), 502),
    (requests.ReadTimeout("slow"), 504),
    (requests.ConnectTimeout("slow"), 504),
    (BlockedDestinationError("Refusing to connect to 127.0.0.1"), 400),
])
def test_synbiohub_failures_map_to_statuses(ctx, fake_sbh, answer, status):
    fake_sbh({"/sparql?": answer})

    with pytest.raises(ApiError) as raised:
        synbiohub.list_items(ctx, COLLECTION)

    assert raised.value.status == status


@pytest.mark.parametrize("bad", ["> } DROP ALL #", "a b", 'a"b', "a{b", "a|b", "a^b", "a`b", "a\\b", "a\nb"])
def test_unsafe_uri_is_rejected_before_any_request(ctx, fake_sbh, bad):
    requested = fake_sbh({})

    with pytest.raises(ApiError) as raised:
        synbiohub.list_items(ctx, COLLECTION + bad)

    assert raised.value.status == 400
    assert requested == []


@pytest.mark.parametrize("answer, exists", [
    (FakeResponse(404), False),
    (FakeResponse(200, json_body=[]), False),
    (FakeResponse(200, json_body=[{"uri": "x"}]), True),
])
def test_study_exists_reads_metadata(ctx, fake_sbh, answer, exists):
    requested = fake_sbh({"/metadata": answer})

    assert synbiohub.study_exists(ctx) is exists
    assert requested == ["https://api.sbh.example.org/user/alice/study1/study1_collection/1/metadata"]


def test_study_exists_other_error_is_502(ctx, fake_sbh):
    fake_sbh({"/metadata": FakeResponse(500, text="no")})

    with pytest.raises(ApiError) as raised:
        synbiohub.study_exists(ctx)

    assert raised.value.status == 502


@pytest.mark.parametrize("call, url", [
    (lambda ctx: synbiohub.list_items(ctx, COLLECTION), "/sparql?"),
    (synbiohub.study_exists, "/metadata"),
])
def test_502_names_the_status_and_at_most_200_characters_of_the_answer(ctx, fake_sbh, call, url):
    fake_sbh({url: FakeResponse(500, text="x" * 200 + "TAIL")})

    with pytest.raises(ApiError) as raised:
        call(ctx)

    assert "(500)" in raised.value.message
    assert "x" * 200 in raised.value.message
    assert "TAIL" not in raised.value.message


@pytest.mark.parametrize("status", [401, 403])
@pytest.mark.parametrize("call, url", [
    (lambda ctx: synbiohub.list_items(ctx, COLLECTION), "/sparql?"),
    (synbiohub.study_exists, "/metadata"),
])
def test_refused_token_is_named(ctx, fake_sbh, call, url, status):
    fake_sbh({url: FakeResponse(status, text="Login required")})

    with pytest.raises(ApiError) as raised:
        call(ctx)

    assert raised.value.status == 502
    assert raised.value.message == f"SynBioHub refused the token ({status}); it may have expired"


def test_transport_error_message_is_short_and_names_the_host(ctx, fake_sbh):
    fake_sbh({"/sparql?": requests.ConnectionError("pool... url: /sparql?query=" + "q" * 2000)})

    with pytest.raises(ApiError) as raised:
        synbiohub.list_items(ctx, COLLECTION)

    assert raised.value.message == "Could not reach SynBioHub at https://api.sbh.example.org (ConnectionError)"
