FROM python:3.13-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_CACHE_DIR=/tmp/uv_cache

RUN pip install --no-cache-dir uv==0.11.9

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev && rm -rf $UV_CACHE_DIR

FROM python:3.13-slim AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app

EXPOSE 4000

COPY --from=builder /app/.venv /app/.venv

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4000"]
