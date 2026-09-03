/* 90-bootstrap.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
const app=window.app=new ScoutEventApp();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));}});
// v12.1 防呆：關閉／重新整理頁面前，把紀念章 TICK 未同步嘅改動盡量送出去（唔會靜默掉資料）
window.addEventListener('beforeunload',()=>{ try{ app.flushStampSyncBeforeUnload(); }catch(e){} });
