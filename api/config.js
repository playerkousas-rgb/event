export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 支援多活動 API Key，參考 scoutbadge TROOP_XXX_APIKEY 設計
  // 優先讀取 ISD2026_APIKEY，其次 API_KEY，最後 fallback
  const apiKey = process.env.ISD2026_APIKEY || process.env.API_KEY || process.env.EVENT_API_KEY || 'scout_e6451624b1f340078ec6a111';

  // GAS URL 也可從環境變數讀取，方便全前端控制切換
  const gasUrl = process.env.GAS_URL || process.env.ISD2026_GAS_URL || 'https://script.google.com/macros/s/AKfycbwT1dZuvymSVaHrBmW31RcnKxWoNHSabRnJVxIkPCevlHvIsPVYJFBDjgwhPS5t_ZQ8mw/exec';

  res.status(200).json({
    success: true,
    gasUrl: gasUrl,
    apiKey: apiKey,
    version: 'v6.0 frontend bulk mobile',
    features: {
      frontendControl: true,
      bulkOnboarding: true,
      mobileFriendly: true,
      mockMode: true,
      batchOnboard: 'CSV/JSON/GS 三軌',
      ref: 'scoutbadge https://github.com/playerkousas-rgb/scoutbadge.git'
    }
  });
}
