// Vercel Serverless Function：回傳後端（Google Apps Script）連線設定。
// v8.13：改用 CommonJS 寫法（project 冇 package.json，Node 預設行 CJS；
// 以前用 `export default` 喺部分 Vercel 專案設定下會當 ESM 處理失敗，令 /api/config 回 4xx，
// 前端就攞唔到 GAS 網址 → 最高層管理帳號等只存喺後端嘅帳戶全部登入唔到）。
// 而家前端 00-config.js 已內建同一組預設值，就算呢個 function 死咗都唔會再連唔到後端。
module.exports = function handler(req, res) {
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
};

// 同時支援 ESM 專案設定（export default）以免 Vercel 用 ESM loader 時出錯
module.exports.default = module.exports;
