/* 90-bootstrap.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
const app=window.app=new ScoutEventApp();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));}});
// v12.2 紀念章防呆：TICK／備註先存本機，撳「儲存到後端」先批次寫入。
// 關閉／重新整理前若有未儲存改動：彈提示＋用 sendBeacon 盡量送出（本機已有備份，唔會丟）。
window.addEventListener('beforeunload',e=>{
  try{
    const n=(app._stampSyncQueue?app._stampSyncQueue.size:0)+(app._stampCustomSyncQueue?app._stampCustomSyncQueue.size:0);
    if(n>0){
      app.flushStampSyncBeforeUnload();
      e.preventDefault();
      e.returnValue='有 '+n+' 項紀念章紀錄未儲存到後端（本機已暫存），確定離開？';
      return e.returnValue;
    }
  }catch(err){}
});
