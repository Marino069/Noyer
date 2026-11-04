import pytest
from rest_framework.test import APIClient

from config.factories import creer_catalogue


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def catalogue(db):
    return creer_catalogue()
