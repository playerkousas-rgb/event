export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    gasUrl: 'https://script.google.com/macros/s/AKfycbwT1dZuvymSVaHrBmW31RcnKxWoNHSabRnJVxIkPCevlHvIsPVYJFBDjgwhPS5t_ZQ8mw/exec',
    apiKey: process.env.ISD2026_APIKEY || process.env.API_KEY || 'scout_e6451624b1f340078ec6a111'
  });
}
