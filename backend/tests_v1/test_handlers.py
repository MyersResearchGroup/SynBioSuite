"""GET /<collection> through handlers.handle, inside a Flask request carrying the spec's headers."""
from conftest import STUDY_URI, FakeResponse, sparql_answer

ITEM_URI = "https://sbh.example.org/user/alice/study1/a/1"


def test_items_are_returned(get_strains, fake_sbh):
    requested = fake_sbh({"/sparql?": sparql_answer({"s": ITEM_URI, "id": "a"})})

    body, status, _ = get_strains()

    assert status == 200
    assert [item["uri"] for item in body] == [ITEM_URI]
    assert len(requested) == 1  # a populated collection never asks about the study


def test_empty_list_and_missing_study_is_404(get_strains, fake_sbh):
    fake_sbh({"/sparql?": sparql_answer(), "/metadata": FakeResponse(404)})

    body, status, _ = get_strains()

    assert status == 404
    assert STUDY_URI in body["error"]


def test_empty_list_and_existing_study_is_200_empty(get_strains, fake_sbh):
    fake_sbh({"/sparql?": sparql_answer(), "/metadata": FakeResponse(200, json_body=[{"uri": STUDY_URI}])})

    assert get_strains()[:2] == ([], 200)


def test_synbiohub_error_becomes_error_body(get_strains, fake_sbh):
    fake_sbh({"/sparql?": FakeResponse(500, text="boom")})

    body, status, _ = get_strains()

    assert status == 502
    assert set(body) == {"error"}
    assert "test-token" not in body["error"]


def test_rdf_is_not_implemented_yet(get_strains, fake_sbh):
    requested = fake_sbh({})

    body, status, _ = get_strains(Accept="application/rdf+xml")

    assert status == 501
    assert requested == []
