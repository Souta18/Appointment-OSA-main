import os
import sys
from flask import send_from_directory, Flask, abort

# Ensure backend package and its venv site-packages are importable when running "python app.py"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
VENV_SITE = os.path.join(BACKEND_DIR, ".venv", "Lib", "site-packages")
if os.path.isdir(BACKEND_DIR) and BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if os.path.isdir(VENV_SITE) and VENV_SITE not in sys.path:
    sys.path.insert(0, VENV_SITE)
    
from backend.app import create_app  # noqa: E402
from backend import config  # noqa: E402

app = create_app()

# Serve the built React app from /dist
DIST_DIR = os.path.join(BASE_DIR, "dist")
IMAGES_DIR = os.path.join(BASE_DIR, "Images")
LOGOS_DIR = os.path.join(BASE_DIR, "Logos")

if os.path.isdir(DIST_DIR):
    @app.route("/assets/<path:path>")
    def assets(path):
        return send_from_directory(os.path.join(DIST_DIR, "assets"), path)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path):
        if path.startswith("api/"):
            abort(404)
        candidate = os.path.join(DIST_DIR, path)
        if os.path.isfile(candidate):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, "index.html")

if os.path.isdir(IMAGES_DIR):
    @app.route("/Images/<path:path>")
    def images(path):
        return send_from_directory(IMAGES_DIR, path)

if os.path.isdir(LOGOS_DIR):
    @app.route("/Logos/<path:path>")
    def logos(path):
        return send_from_directory(LOGOS_DIR, path)


if __name__ == "__main__":
    app.run(host=config.API_HOST, port=config.API_PORT, debug=True)
