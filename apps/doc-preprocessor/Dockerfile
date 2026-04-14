FROM python:3.13-slim AS builder

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR='/tmp/poetry_cache'

RUN pip install poetry==1.8.2

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-root --without dev && rm -rf $POETRY_CACHE_DIR

FROM python:3.13-slim AS runtime

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

CMD ["python", "main.py"]

