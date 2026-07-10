from app.api.auth import router as auth_router

routers = [auth_router]


def register_routers(app):
    for router in routers:
        app.include_router(router)
