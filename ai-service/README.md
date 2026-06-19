# Medicare.AI Python Analysis Service

This FastAPI service adds explainable prescription-text parsing, relative health-risk screening, lab-value extraction, report analysis, and source-labelled FAQ retrieval.

It does not diagnose disease or prescribe treatment. The Node API remains the public gateway and continues using local fallbacks if this service is unavailable.

## Run locally

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API documentation is available at `http://127.0.0.1:8000/docs`.
