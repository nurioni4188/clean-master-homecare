// Preserve 2번 source marketing video and local, client-only consultation helper.
(() => {
 const video=document.getElementById('hero-video'),button=document.getElementById('hero-pause');
 if(video&&button){
  const clip='https://videos.pexels.com/video-files/5744421/5744421-uhd_3840_2160_30fps.mp4';
  const eligible=window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  let loaded=false;
  const show=on=>{video.classList.toggle('is-playing',on);button.hidden=!on;};
  const start=()=>{
   if(loaded||!eligible.matches||document.hidden||navigator.connection?.saveData)return;
   loaded=true;video.muted=true;video.src=clip;
   video.addEventListener('playing',()=>show(true));
   video.addEventListener('error',()=>show(false));
   const attempt=video.play();if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>show(false));
  };
  const stop=()=>{video.pause();show(false);};
  if('IntersectionObserver' in window){
   const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){obs.disconnect();start();}},{rootMargin:'100px'});obs.observe(video);
  }else start();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(eligible.matches){if(loaded)video.play().catch(()=>show(false));else start();}});
  eligible.addEventListener?.('change',e=>{if(!e.matches)stop();else start();});
  button.addEventListener('click',()=>{
   if(video.paused){video.play().catch(()=>show(false));button.textContent='영상 일시정지';button.setAttribute('aria-pressed','false');}
   else{video.pause();video.classList.remove('is-playing');button.hidden=false;button.textContent='영상 재생';button.setAttribute('aria-pressed','true');}
  });
  video.addEventListener('play',()=>{button.textContent='영상 일시정지';button.setAttribute('aria-pressed','false');});
 }
 const get=id=>document.getElementById(id);let helpText='';
 get('help-generate')?.addEventListener('click',()=>{
  const service=get('help-service').value,region=get('help-region').value,memo=get('help-memo').value.trim();
  if(/\b\d{2,3}[- ]?\d{3,4}[- ]?\d{4}\b/.test(memo)){get('help-result').textContent='실제 전화번호를 입력하지 마세요.';return;}
  helpText='[Clean Master 가상 상담 요약]\n서비스: '+service+'\n광역 지역: '+region+'\n가상 메모: '+(memo||'미입력')+'\n\n※ 실제 상담 접수/견적/예약이 아닙니다.';
  get('help-result').textContent=helpText;
 });
 get('help-copy')?.addEventListener('click',async()=>{
  if(!helpText){get('help-result').textContent='먼저 상담 요약을 생성해 주세요.';return;}
  try{await navigator.clipboard.writeText(helpText);get('help-result').textContent=helpText+'\n\n요약 복사 완료';}
  catch{get('help-result').textContent=helpText+'\n\n선택 후 직접 복사해 주세요.';}
 });
})();
