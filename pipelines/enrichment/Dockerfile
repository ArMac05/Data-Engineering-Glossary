# Enrichment FastAPI service — production image.
# Uses uv for fast, lockfile-pinned dependency installs.

FROM python:3.12-slim

# Copy the uv binary from the official image instead of pip-installing it.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install ONLY dependencies first, from the lockfile, so this layer is cached
# and re-used on every build where pyproject.toml / uv.lock haven't changed.
# --no-dev   : skip ruff/mypy/pytest etc. — not needed to run the service.
# --no-install-project : the app runs from source (app.main:app), so we don't
#                        need to build/install it as a package (it has no build
#                        backend anyway). We only want its dependencies.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Now copy the application source. Because this comes AFTER the dependency
# install, editing app code doesn't bust the (slow) dependency layer.
COPY app ./app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONUNBUFFERED=1

# Stamp the build with its git commit so /health can report what's deployed.
# Pass at deploy time: fly deploy --build-arg GIT_SHA=$(git rev-parse --short HEAD)
ARG GIT_SHA=unknown
ENV BUILD_SHA=$GIT_SHA

# Fly routes external traffic to this internal port (see fly.toml).
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
