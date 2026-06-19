class AIServiceError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
  }
}

const baseUrl = () => (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function callAIService(path, { method = 'POST', body, timeoutMs } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(timeoutMs || process.env.AI_SERVICE_TIMEOUT_MS || 4500)
  );

  try {
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (process.env.AI_SERVICE_KEY) headers['X-Service-Key'] = process.env.AI_SERVICE_KEY;
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AIServiceError(payload.detail || payload.error || 'Python analysis request failed', response.status);
    }
    return payload;
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    const message = error.name === 'AbortError'
      ? 'Python analysis service timed out'
      : 'Python analysis service is unavailable';
    throw new AIServiceError(message);
  } finally {
    clearTimeout(timeout);
  }
}

async function getAIHealth(timeoutMs = 800) {
  return callAIService('/health', { method: 'GET', timeoutMs });
}

module.exports = { AIServiceError, callAIService, getAIHealth };
