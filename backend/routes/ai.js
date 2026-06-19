const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { callAIService, getAIHealth } = require('../services/aiService');

function proxy(path) {
  return async (req, res) => {
    try {
      const result = await callAIService(path, { body: req.body });
      res.json(result);
    } catch (error) {
      res.status(error.status || 503).json({
        error: error.message,
        fallbackAvailable: true,
      });
    }
  };
}

router.get('/health', auth, async (req, res) => {
  try {
    res.json(await getAIHealth());
  } catch (error) {
    res.status(503).json({ status: 'offline', error: error.message, fallbackAvailable: true });
  }
});

router.post('/prescriptions/parse', auth, proxy('/v1/prescriptions/parse'));
router.post('/risk/score', auth, proxy('/v1/risk/score'));
router.post('/labs/parse', auth, proxy('/v1/labs/parse'));
router.post('/reports/analyze', auth, proxy('/v1/reports/analyze'));
router.post('/faq/search', auth, proxy('/v1/faq/search'));

module.exports = router;
