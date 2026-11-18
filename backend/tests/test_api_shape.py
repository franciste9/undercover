import inspect

from fastapi.routing import APIRoute
from pydantic import BaseModel

from backend.main import app

OPERATIONS = [route for route in app.routes if isinstance(route, APIRoute)]


def test_every_operation_has_an_id_and_a_one_line_docstring():
    for route in OPERATIONS:
        assert route.operation_id, route.path
        docstring = route.endpoint.__doc__ or ""
        assert docstring.strip(), route.path
        assert "\n" not in docstring.strip(), route.path


def test_no_operation_takes_an_optional_input():
    for route in OPERATIONS:
        for parameter in inspect.signature(route.endpoint).parameters.values():
            assert parameter.default is inspect.Parameter.empty, route.path
            body = parameter.annotation
            if isinstance(body, type) and issubclass(body, BaseModel):
                required = [field.is_required() for field in body.model_fields.values()]
                assert all(required), route.path
