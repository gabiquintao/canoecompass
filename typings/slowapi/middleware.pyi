from typing import Any, Awaitable, Callable, MutableMapping
class SlowAPIMiddleware:
    def __init__(self, app: Any) -> None: ...
    async def __call__(
        self,
        scope: MutableMapping[str, Any],
        receive: Callable[[], Awaitable[MutableMapping[str, Any]]],
        send: Callable[[MutableMapping[str, Any]], Awaitable[None]],
    ) -> None: ...
