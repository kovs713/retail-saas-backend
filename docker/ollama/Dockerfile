FROM ollama/ollama:latest

RUN ollama serve > /dev/null 2>&1 & sleep 5 && ollama pull embedding-gemma
