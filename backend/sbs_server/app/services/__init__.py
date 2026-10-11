"""What the legacy /api/* routes do, apart from HTTP.

route.py decides nothing: each handler hands request.files to a service here
and renders what comes back. A service module has parse_request(files), which
validates and returns a frozen request object, and run(request), which does
the work. Both raise ApiError (app/errors.py) for anything the route should
answer with a status of its own.
"""
