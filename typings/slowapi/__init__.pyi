from typing import Any, Callable, TypeVar
from fastapi import Request, Response

__all__ = ["Limiter", "_rate_limit_exceeded_handler"]

F = TypeVar('F', bound=Callable[..., Any])

class Limiter:
    def __init__(self, key_func: Callable[..., str], **kwargs: Any) -> None: ...
    def limit(self, limit_value: str) -> Callable[[F], F]: ...

def _rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response: ...
