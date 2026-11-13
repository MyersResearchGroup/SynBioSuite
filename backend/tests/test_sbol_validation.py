"""utils.sbol_validation_disabled.

With VALIDATE on -- sbol2's default -- every Document.write() POSTs the whole
document to validator.sbolstandard.org (H3).
"""
import pytest
import sbol2

from sbs_server.app.utils import sbol_validation_disabled

VALIDATE = sbol2.ConfigOptions.VALIDATE


def validating():
    return sbol2.Config.getOption(VALIDATE)


def test_validation_is_on_when_a_test_starts():
    """sbol2's default, as in a fresh uwsgi worker.

    If this fails, something in the suite turned validation off for the whole
    process -- which is how H3 went unnoticed.
    """
    assert validating() is True


def test_validation_is_off_inside_the_block():
    with sbol_validation_disabled():
        assert validating() is False


def test_validation_is_restored_afterwards():
    with sbol_validation_disabled():
        pass

    assert validating() is True


def test_validation_is_restored_when_the_block_raises():
    with pytest.raises(RuntimeError):
        with sbol_validation_disabled():
            raise RuntimeError('write failed')

    assert validating() is True


def test_restores_the_previous_value_rather_than_forcing_it_on():
    sbol2.Config.setOption(VALIDATE, False)

    with sbol_validation_disabled():
        pass

    assert validating() is False
