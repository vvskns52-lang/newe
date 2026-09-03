/* ═══════════════════════════════════════════════════
   game.js — 상태·HUD·입력·카메라·메인 루프
   ═══════════════════════════════════════════════════ */
/* ══════════════ 게임 상태 ══════════════ */
const STATE = {
  cores:{}, sparks:0, hintUsed:{}, talked:{}, started:false, hp:3, inv:0, heal:0, monLevel:2, finalDone:false, runes:{}, metSpirit:{},
  mode:'play',   // play | dialog | shrine | ending
  quest:{t:'빛의 도시로', b:'도시 광장의 시장 하람에게 말을 걸어 무슨 일이 벌어졌는지 들어보자.'}
};
try{ const sv=JSON.parse(localStorage.getItem('energyChronicle')||'null');
     if(sv){ STATE.cores=sv.cores||{}; STATE.sparks=sv.sparks||0; STATE.talked=sv.talked||{}; STATE.finalDone=!!sv.finalDone; STATE.runes=sv.runes||{}; STATE.metSpirit=sv.metSpirit||{};
       if(sv.monLevel!==undefined && sv.mv===2) STATE.monLevel=sv.monLevel;   /* 밀도 기본값이 '적당히'로 바뀌어, 옛 저장값은 한 번만 무시한다 */ } }catch(e){}
function save(){ try{ localStorage.setItem('energyChronicle', JSON.stringify({cores:STATE.cores,sparks:STATE.sparks,talked:STATE.talked,monLevel:STATE.monLevel, mv:2,finalDone:STATE.finalDone,runes:STATE.runes,metSpirit:STATE.metSpirit})); }catch(e){} }
const coreCount = ()=>Object.keys(STATE.cores).length;
const runeCount = ()=>Object.keys(STATE.runes).length;

/* ══════════════ HUD ══════════════ */
(function initHud(){
  const hp=$('#hpHud');
  for(let i=0;i<3;i++){ const h=document.createElement('span'); h.className='heart'; h.id='hp'+i; h.textContent='💚'; hp.appendChild(h); }
  const dots=$('#coreDots');
  SHRINES.forEach(s=>{
    const d=document.createElement('div'); d.className='cdot'; d.id='cd_'+s.id; d.textContent=s.icon;
    d.title=s.name; dots.appendChild(d);
  });
})();
function refreshHud(){
  const n=coreCount(), pct=n*10;
  $('#powerBar>i').style.width=pct+'%';
  $('#pwPct').textContent=pct+'%';
  $('#pwCnt').textContent='코어 '+n+' / 10';
  $('#sparkN').textContent=STATE.sparks;
  const rh=$('#runeHud'), rn=$('#runeN');
  if(rh){ rn.textContent=runeCount()+' / 10'; rh.style.display = runeCount()>0 ? '' : 'none'; }
  SHRINES.forEach(s=>$('#cd_'+s.id).classList.toggle('got', !!STATE.cores[s.id]));
  for(let i=0;i<3;i++){ const e=$('#hp'+i); if(e) e.classList.toggle('off', i>=STATE.hp); }
  $('#qTitle').textContent=STATE.quest.t; $('#qBody').innerHTML=STATE.quest.b;
}
function setQuest(t,b){ STATE.quest={t,b}; refreshHud(); }
function toast(icon, text, ms){
  const d=document.createElement('div'); d.className='toastItem panel';
  d.innerHTML='<span style="font-size:19px">'+icon+'</span><span>'+text+'</span>';
  $('#toast').appendChild(d);
  setTimeout(()=>{ d.style.transition='.4s'; d.style.opacity=0; d.style.transform='translateY(-12px)';
                   setTimeout(()=>d.remove(),420); }, ms||2400);
}

/* ══════════════ 입력 ══════════════ */
const keys={};
addEventListener('keydown', e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(k==='h'&&STATE.mode!=='shrine'){ $('#help').classList.toggle('on'); }
  if(k==='escape'){ if(STATE.mode==='shrine') closeShrine(); else if(STATE.mode==='dialog') endDialog(); else $('#help').classList.remove('on'); }
  if(k==='m'&&STATE.mode==='play'){ $('#minimap').classList.toggle('big'); resizeMinimap(); }
  if(k==='e'&&STATE.mode==='play'){ interact(); }
  if((k==='f')&&STATE.mode==='play'){ firePurify(); }
  if(k===' '){ if(STATE.mode==='dialog'){ e.preventDefault(); nextLine(); } }
  if((k===' '||k==='arrowup'||k==='arrowdown')&&STATE.mode==='play') e.preventDefault();
});
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

const CAM={yaw:0, pitch:0.34, dist:12, tYaw:0, tPitch:0.34, tDist:12};
const TOUCH={x:0, z:0, mag:0, run:false, jump:false};
const cv=renderer.domElement;

/* 포인터(마우스·터치 공용) — 1손가락 시점 회전, 2손가락 핀치 줌 */
const ptrs=new Map(); let pinchD=0;
const pdist=()=>{ const a=[...ptrs.values()]; return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y); };
let tapX=0, tapY=0, tapT=0;
cv.addEventListener('pointerdown', e=>{
  if(STATE.mode==='dialog'){ nextLine(); return; }
  if(STATE.mode!=='play') return;
  tapX=e.clientX; tapY=e.clientY; tapT=performance.now();
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  if(ptrs.size===2) pinchD=pdist();
});
cv.addEventListener('pointermove', e=>{
  const p=ptrs.get(e.pointerId); if(!p) return;
  const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
  if(STATE.mode!=='play') return;
  if(ptrs.size===1){
    CAM.tYaw   -= dx*0.0055;
    CAM.tPitch  = clamp(CAM.tPitch + dy*0.004, -0.15, 1.05);
  } else if(ptrs.size===2){
    const d=pdist(); if(pinchD) CAM.tDist=clamp(CAM.tDist+(pinchD-d)*0.05, 7, 26); pinchD=d;
  }
});
const pdrop=e=>{
  if(!TOUCH_DEV && ptrs.has(e.pointerId) && ptrs.size===1 && STATE.mode==='play'
     && performance.now()-tapT<260 && Math.hypot(e.clientX-tapX, e.clientY-tapY)<7) firePurify();
  ptrs.delete(e.pointerId); if(ptrs.size<2) pinchD=0;
};
cv.addEventListener('pointerup',pdrop); cv.addEventListener('pointercancel',pdrop); cv.addEventListener('lostpointercapture',pdrop);
addEventListener('wheel', e=>{ if(STATE.mode!=='play')return; CAM.tDist=clamp(CAM.tDist+e.deltaY*0.014, 7, 26); }, {passive:true});

/* ── 가상 조이스틱 ── */
(function initTouch(){
  const stick=$('#stick'), knob=$('#knob');
  let sid=null, cx=0, cy=0, R=1;
  const grab=e=>{
    const r=stick.getBoundingClientRect();
    cx=r.left+r.width/2; cy=r.top+r.height/2; R=r.width*0.40;
    sid=e.pointerId; stick.setPointerCapture(e.pointerId); move(e); e.preventDefault();
  };
  const move=e=>{
    if(e.pointerId!==sid) return;
    let dx=e.clientX-cx, dy=e.clientY-cy;
    const d=Math.hypot(dx,dy), m=Math.min(d,R);
    if(d>0){ dx=dx/d*m; dy=dy/d*m; }
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
    TOUCH.x = dx/R; TOUCH.z = dy/R; TOUCH.mag = m/R;
  };
  const rel=e=>{ if(e.pointerId!==sid) return; sid=null;
    knob.style.transform='translate(0,0)'; TOUCH.x=TOUCH.z=TOUCH.mag=0; };
  stick.addEventListener('pointerdown',grab);
  stick.addEventListener('pointermove',move);
  stick.addEventListener('pointerup',rel);
  stick.addEventListener('pointercancel',rel);

  const jb=$('#tJump');
  jb.addEventListener('pointerdown',e=>{ TOUCH.jump=true; e.preventDefault(); });
  ['pointerup','pointercancel','pointerleave'].forEach(k=>jb.addEventListener(k,()=>TOUCH.jump=false));
  const rb=$('#tRun');
  rb.addEventListener('click',()=>{ TOUCH.run=!TOUCH.run; rb.classList.toggle('on',TOUCH.run); });
  const lb2=$('#tLight');
  lb2.addEventListener('pointerdown',e=>{ e.preventDefault(); firePurify(); });
  $('#tE').addEventListener('click',()=>{
    if(STATE.mode==='dialog') nextLine();
    else if(STATE.mode==='play') interact();
  });
  $('#fsBtn').addEventListener('click',()=>{
    const d=document.documentElement;
    try{
      if(!document.fullscreenElement){ const r=(d.requestFullscreen||d.webkitRequestFullscreen||function(){}).call(d); if(r&&r.catch) r.catch(()=>{}); }
      else if(document.exitFullscreen){ const r=document.exitFullscreen(); if(r&&r.catch) r.catch(()=>{}); }
    }catch(err){}
  });
  if(TOUCH_DEV){
    const tk=$('#touchKeys'); if(tk){ tk.style.display='flex'; }
    $$('#title .keys')[0].style.display='none';
    $('#hint').textContent='';
    $('#prompt .ekey').textContent='탭';
    $('#dialog .next').textContent='화면 탭 — 다음 ▶';
  }
})();
addEventListener('resize', ()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ══════════════ 대화 ══════════════ */
let dlg=null;
function startDialog(npc){
  const first = !STATE.talked[npc.id];
  const lines = first ? npc.lines : (npc.after&&npc.after.length ? npc.after : npc.lines.slice(-2));
  dlg={npc, lines, i:0};
  STATE.mode='dialog';
  const dgf=$('#dgFace');
  if(npc.spiritOf && typeof spiritPortrait==='function'){
    dgf.textContent=''; dgf.classList.add('por');
    dgf.style.background='#fff center/contain no-repeat url('+spiritPortrait(npc.spiritOf)+')';
  } else { dgf.classList.remove('por'); dgf.style.background=''; dgf.textContent=npc.icon; } $('#dgName').textContent=npc.name; $('#dgRole').textContent=npc.role;
  $('#dialog').classList.add('on'); $('#prompt').classList.remove('on');
  showLine();
}
function showLine(){ $('#dgSay').innerHTML = dlg.lines[dlg.i]; }
/* 정령과의 대화 — 아직 시련을 안 깼으면 안내, 깼으면 축하 */
function talkSpirit(sp, forced){
  const done = !!STATE.cores[sp.shrine.id];
  const lines = done ? sp.done : sp.hello;
  startDialog({ id:sp.id, name:sp.name, role:sp.role, icon:sp.shrine.icon,
                spiritOf:sp.shrine.id, lines, after:lines });
  if(!STATE.metSpirit[sp.id]){ STATE.metSpirit[sp.id]=true; save(); }
  sp.mark.visible = false;
}

function nextLine(){
  if(!dlg) return;
  dlg.i++;
  if(dlg.i>=dlg.lines.length){
    const id=dlg.npc.id;
    if(dlg.npc.spiritOf){ endDialog(); return; }
    if(!STATE.talked[id]){
      STATE.talked[id]=true; save();
      if(id==='mayor'){ setQuest('열 개의 사당을 깨워라','섬 곳곳의 사당에서 발전 원리 시련을 풀고 <b>에너지 코어 10개</b>를 모으자. 지도(우측 하단)의 색 점이 사당이다.'); toast('📜','새 목표: 열 개의 사당을 깨워라'); }
    }
    endDialog();
  } else showLine();
}
function endDialog(){ dlg=null; $('#dialog').classList.remove('on'); STATE.mode='play'; }
$('#dialog').addEventListener('click', nextLine);

/* ══════════════ 상호작용 ══════════════ */
let nearTarget=null;
function findNear(){
  const p=P.pos; let best=null, bd=1e9;
  for(const s of SHRINES){
    const d=Math.hypot(p.x-s.x, p.z-s.z);
    if(d<10 && d<bd){ bd=d; best={type:'shrine', s, d}; }
  }
  for(const n of npcObjs){
    const d=Math.hypot(p.x-n.data.x, p.z-n.data.z);
    if(d<6 && d<bd){ bd=d; best={type:'npc', n, d}; }
  }
  for(const sp of spiritObjs){               // 사당의 정령
    const d=Math.hypot(p.x-sp.x, p.z-sp.z);
    if(d<SPIRIT_TALK && d<bd){ bd=d; best={type:'spirit', sp, d}; }
  }
  if(coreCount()>=10){                       // 마지막 시련 — 에너지 관제탑
    const d=Math.hypot(p.x-FINAL.x, p.z-FINAL.z);
    if(d<8 && d<bd){ bd=d; best={type:'final', d}; }
  }
  return best;
}
function interact(){
  if(!nearTarget) return;
  if(nearTarget.type==='npc') startDialog(nearTarget.n.data);
  else if(nearTarget.type==='spirit') talkSpirit(nearTarget.sp);
  else if(nearTarget.type==='final') openShrine(FINAL);
  else openShrine(nearTarget.s);
}

/* ══════════════ 미니맵 ══════════════ */
const mm=$('#mmCv'), mg=mm.getContext('2d');
function resizeMinimap(){}
function drawMinimap(){
  const W=mm.width, H=mm.height, S=W/230;
  mg.clearRect(0,0,W,H);
  mg.fillStyle='#2b6f9e'; mg.fillRect(0,0,W,H);
  mg.save(); mg.translate(W/2,H/2);
  // 섬
  mg.beginPath(); mg.arc(0,0,86*S,0,6.283); mg.fillStyle='#9ed177'; mg.fill();
  mg.beginPath(); mg.arc(0,0,80*S,0,6.283); mg.fillStyle='#8ec96c'; mg.fill();
  // 산
  mg.fillStyle='rgba(150,140,120,.75)';
  mg.beginPath(); mg.ellipse(10*S,-76*S,26*S,20*S,0,0,6.283); mg.fill();
  mg.beginPath(); mg.ellipse(64*S,-54*S,15*S,13*S,0,0,6.283); mg.fill();
  // 도시
  mg.beginPath(); mg.arc(0,0,17*S,0,6.283); mg.fillStyle='#e6d9b8'; mg.fill();
  mg.strokeStyle='#c7b48f'; mg.lineWidth=1.5; mg.stroke();
  // 오염 지대
  SHRINES.forEach(s=>{
    if(STATE.cores[s.id]) return;
    mg.beginPath(); mg.arc(s.x*S, s.z*S, 23*S, 0, 6.283);
    mg.fillStyle='rgba(74,68,85,.28)'; mg.fill();
  });
  // 사당
  SHRINES.forEach(s=>{
    const got=!!STATE.cores[s.id];
    mg.beginPath(); mg.arc(s.x*S, s.z*S, got?6:7, 0, 6.283);
    mg.fillStyle = got ? '#ffffff' : '#'+new THREE.Color(s.col).getHexString();
    mg.fill(); mg.lineWidth=2.4; mg.strokeStyle= got? '#7bd67b':'#1b2b3d'; mg.stroke();
  });
  // 에너지 관제탑 (코어 10개 이후)
  if(coreCount()>=10){
    mg.beginPath(); mg.arc(FINAL.x*S, FINAL.z*S, 8, 0, 6.283);
    mg.fillStyle = STATE.finalDone? '#ffffff' : '#ffd166';
    mg.fill(); mg.lineWidth=2.6; mg.strokeStyle= STATE.finalDone? '#7bd67b':'#1b2b3d'; mg.stroke();
  }
  // 숨은 룬 (가까이 갔을 때만 물음표로 표시)
  RUNES.forEach(r=>{
    if(STATE.runes[r.id]) return;
    if(Math.hypot(r.x-P.pos.x, r.z-P.pos.z) > RUNE_SHOW+16) return;
    mg.beginPath(); mg.arc(r.x*S, r.z*S, 4.2, 0, 6.283);
    mg.fillStyle='#9fe6ff'; mg.fill(); mg.lineWidth=2; mg.strokeStyle='#1b2b3d'; mg.stroke();
  });
  // NPC
  npcObjs.forEach(n=>{ mg.beginPath(); mg.arc(n.data.x*S,n.data.z*S,3.4,0,6.283); mg.fillStyle='#ffe08a'; mg.fill(); });
  // 플레이어
  mg.save(); mg.translate(P.pos.x*S, P.pos.z*S); mg.rotate(-P.yaw);
  mg.beginPath(); mg.moveTo(0,-9); mg.lineTo(6.4,7); mg.lineTo(0,3.6); mg.lineTo(-6.4,7); mg.closePath();
  mg.fillStyle='#ff5b5b'; mg.fill(); mg.strokeStyle='#fff'; mg.lineWidth=2; mg.stroke(); mg.restore();
  mg.restore();
}

/* ══════════════ 도시 점등 ══════════════ */
function updateCityLight(){
  const t = coreCount()/10;
  CITY.beaconMat.color.setHSL(0.12, 0.85, 0.16+0.42*t);
  CITY.bLight.intensity = 1.3*t;
  cityLights.forEach((o,i)=>{
    const on = i/cityLights.length < t*1.05;
    if(o.isLight) o.intensity = on? 0.5 : 0;
    else o.color.set(on? 0xffdd93 : 0x3b4a5c);
  });
}

/* ══════════════ 루프 ══════════════ */
/* 사당 조명은 가장 가까운 한 곳만 켠다 (포인트라이트 10개 → 1개) */
const shrineLight = new THREE.PointLight(0xffffff, 0, 34); scene.add(shrineLight);

/* 프레임이 무거우면 자동으로 품질을 낮춘다 */
const PERF={acc:0, n:0, step:0, waterEvery:2};
function autoQuality(dt){
  PERF.acc+=dt; PERF.n++;
  if(PERF.acc<2.5) return;
  const fps=PERF.n/PERF.acc; PERF.acc=0; PERF.n=0;
  if(fps<34 && PERF.step===0){
    PERF.step=1;
    renderer.setPixelRatio(1); renderer.setSize(innerWidth,innerHeight);
  } else if(fps<26 && PERF.step===1){
    PERF.step=2; PERF.waterEvery=4;
  }
}

const clock=new THREE.Clock();
let mmTick=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  if(STATE.mode==='shrine'||STATE.mode==='ending') return;   // 사당/엔딩 중엔 3D 렌더 정지 (성능 절약)

  if(STATE.started && STATE.mode!=='shrine'){
    /* 이동 */
    let ix=0, iz=0;
    if(STATE.mode==='play'){
      if(keys['w']||keys['arrowup'])   iz-=1;
      if(keys['s']||keys['arrowdown']) iz+=1;
      if(keys['a']||keys['arrowleft']) ix-=1;
      if(keys['d']||keys['arrowright'])ix+=1;
      if(TOUCH.mag>0.12){ ix+=TOUCH.x; iz+=TOUCH.z; }
    }
    const run = (keys['shift']||TOUCH.run||TOUCH.mag>0.86)?1.75:1;
    const len=Math.hypot(ix,iz);
    let moveX=0, moveZ=0;
    if(len>0){
      const nl=Math.min(len,1); ix=ix/len*nl; iz=iz/len*nl;
      const cy=Math.cos(CAM.yaw), sy=Math.sin(CAM.yaw);
      // 카메라 기준 이동: 전방 = 카메라가 바라보는 쪽(-sin,-cos), 우측 = (cos,-sin)
      moveX = (ix*cy + iz*sy);
      moveZ = (iz*cy - ix*sy);
      P.yaw = Math.atan2(moveX, moveZ);
      P.speed = lerp(P.speed, 9.4*run*Math.max(TOUCH.mag>0.12?TOUCH.mag:1,0.35), 0.2);
    } else P.speed = lerp(P.speed, 0, 0.28);

    if(P.speed>0.05){
      const nx = P.pos.x + moveX*P.speed*dt, nz = P.pos.z + moveZ*P.speed*dt;
      const ny = hAt(nx,nz);
      const slope = Math.abs(ny - hAt(P.pos.x,P.pos.z))/(P.speed*dt+1e-5);
      if(ny > 0.55 && slope < 1.5 && Math.hypot(nx,nz) < 104){ P.pos.x=nx; P.pos.z=nz; }
      else P.speed*=0.4;
      P.walk += P.speed*dt*1.5;
    }
    /* 점프·중력 */
    const gy=hAt(P.pos.x,P.pos.z);
    if(STATE.mode==='play' && (keys[' ']||TOUCH.jump) && P.onGround){ P.vy=9.6; P.onGround=false; }
    P.vy -= 26*dt; P.pos.y += P.vy*dt;
    if(P.pos.y<=gy){ P.pos.y=gy; P.vy=0; P.onGround=true; }
    /* 캐릭터 애니메이션 */
    const sw=Math.sin(P.walk*2.1)*Math.min(P.speed/9,1);
    player.g.rotation.y = P.yaw;
    /* 발밑 원반 그림자 — 점프하면 작아지고 옅어진다 */
    const gsy=hAt(P.pos.x,P.pos.z), lift=Math.max(0,P.pos.y-gsy);
    playerShadow.position.set(P.pos.x, gsy+0.07, P.pos.z);
    const psc=Math.max(1.5, 2.5-lift*0.14);
    playerShadow.scale.setScalar(psc);
    playerShadow.material.opacity=clamp(0.95-lift*0.10, 0.2, 0.95);
    player.lL.rotation.x =  sw*0.85; player.lR.rotation.x = -sw*0.85;
    player.aL.rotation.x = -sw*0.7;  player.aR.rotation.x =  sw*0.7;
    player.torso.rotation.z = sw*0.05;

    /* 카메라 */
    CAM.yaw=lerp(CAM.yaw,CAM.tYaw,0.16); CAM.pitch=lerp(CAM.pitch,CAM.tPitch,0.16); CAM.dist=lerp(CAM.dist,CAM.tDist,0.12);
    const cd=CAM.dist, cp=CAM.pitch;
    let cx=P.pos.x + Math.sin(CAM.yaw)*Math.cos(cp)*cd;
    let cz=P.pos.z + Math.cos(CAM.yaw)*Math.cos(cp)*cd;
    let cyy=P.pos.y + 2.7 + Math.sin(cp)*cd;
    const gcy=hAt(cx,cz)+2.2; if(cyy<gcy) cyy=gcy;
    camera.position.set(cx,cyy,cz);
    camera.lookAt(P.pos.x, P.pos.y+1.9, P.pos.z);


    /* 상호작용 대상 */
    if(STATE.mode==='play'){
      nearTarget=findNear();
      const pr=$('#prompt');
      if(nearTarget){
        pr.classList.add('on');
        pr.querySelector('.txt').textContent =
            nearTarget.type==='spirit'? nearTarget.sp.name+'에게 말 걸기'
          : nearTarget.type==='npc'   ? nearTarget.n.data.name+'와(과) 대화하기'
          : nearTarget.type==='final' ? (STATE.finalDone ? '에너지 관제탑 — 다시 설계해 보기' : '에너지 관제탑 — 하루 전력 설계 시작')
          : (STATE.cores[nearTarget.s.id] ? nearTarget.s.name+' 다시 들어가기 (클리어)' : nearTarget.s.name+' 시련 시작');
      } else pr.classList.remove('on');
    }
    /* 사당의 정령 — 가까이 가면 나타나 플레이어를 바라본다 */
    for(const o of spiritObjs){
      const d=Math.hypot(o.x-P.pos.x, o.z-P.pos.z);
      if(d>SPIRIT_SHOW){ if(o.sp.g.visible) o.sp.g.visible=false; continue; }
      o.sp.g.visible=true;
      const done=!!STATE.cores[o.shrine.id];
      /* 떠다니기 */
      o.sp.g.position.y = o.gy + 1.9 + Math.sin(t*1.5 + o.x*0.1)*0.22;
      /* 플레이어를 바라본다 (가까울 때만) */
      const face = Math.atan2(P.pos.x-o.x, P.pos.z-o.z);
      o.sp.g.rotation.y = d<24 ? lerp(o.sp.g.rotation.y, face, 0.06) : o.sp.g.rotation.y + dt*0.25;
      o.sp.crest.rotation.y += dt*(o.shrine.id==='wind'? 2.4 : 0.8);
      o.sp.ring.rotation.z += dt*0.7;
      o.sp.motes.forEach((m,k)=>{
        const a2=t*1.5+k*Math.PI;
        m.position.set(Math.cos(a2)*0.95, 0.30+Math.sin(a2*1.6)*0.4, Math.sin(a2)*0.95);
      });
      /* 시련을 깬 사당의 정령은 더 밝고, 아직이면 살짝 옅다 */
      o.sp.bodyMat.opacity = done ? 0.96 : 0.86;
      o.sp.aura.material.opacity = done ? 0.42 : 0.26;
      /* 아직 말 안 걸어 본 정령 머리 위에 ! 표시 */
      o.mark.visible = !STATE.metSpirit[o.id];
      if(o.mark.visible) o.mark.position.y = 2.24 + Math.sin(t*3)*0.10;
      /* 처음 다가오면 스스로 말을 건다 */
      if(!STATE.metSpirit[o.id] && d<8.5 && STATE.mode==='play' && P.onGround){
        talkSpirit(o);
      }
    }

    /* 숨은 룬 조각 — 가까이 가야 나타나고, 더 가까이 가면 줍는다 */
    for(const r of runeObjs){
      if(STATE.runes[r.data.id]){ r.g.visible=false; continue; }
      const d=Math.hypot(r.data.x-P.pos.x, r.data.z-P.pos.z);
      if(d>RUNE_SHOW){ r.g.visible=false; continue; }
      r.g.visible=true;
      const near=1-Math.min(1, (d-RUNE_TAKE)/(RUNE_SHOW-RUNE_TAKE));   /* 0 멀다 → 1 코앞 */
      const bob = Math.sin(t*1.8)*0.20;
      r.spin.rotation.y += dt*0.9;  r.spin.rotation.x = Math.sin(t*0.7)*0.16;
      r.spin.position.y = 1.55 + bob;
      r.orbit.position.y = 1.55 + bob;
      r.orbit.rotation.y += dt*1.6;
      r.motes.forEach((m,k)=>{
        const a2 = t*1.3 + k*2.094;
        m.position.set(Math.cos(a2)*0.98, 1.55 + bob + Math.sin(a2*1.7)*0.38, Math.sin(a2)*0.98);
        m.material.opacity = 1;
      });
      r.shell.material.opacity = 0.28 + near*0.26;
      r.halo.material.opacity  = 0.08 + near*0.16;
      r.orbit.material.opacity = 0.35 + near*0.5;
      r.ring.material.opacity  = 0.18 + near*0.5;
      r.ring2.material.opacity = 0.12 + near*0.4;
      const sc = 0.85 + near*0.35;
      r.ring.scale.set(sc,sc,sc); r.ring2.scale.set(sc,sc,sc);
      if(d<RUNE_TAKE){
        STATE.runes[r.data.id]=true; r.g.visible=false; save(); refreshHud();
        toast('🔷','고대 룬 조각 '+runeCount()+' / 10 &nbsp;<span style="color:#6d7f92;font-weight:700">(관제탑 설비 예산 +'+RUNE_BONUS+'억)</span>',2600);
      }
    }

    /* 파편 수집 */
    for(const sp of sparks){
      if(sp.got) continue;
      sp.m.rotation.y+=dt*1.6; sp.m.rotation.x+=dt*0.8;
      sp.m.position.y = sp.base + Math.sin(t*1.6+sp.ph)*0.36;
      if(Math.hypot(sp.m.position.x-P.pos.x, sp.m.position.z-P.pos.z)<2.6 && Math.abs(sp.m.position.y-P.pos.y)<4){
        sp.got=true; sp.m.visible=false; STATE.sparks++; save(); refreshHud();
        toast('✨','에너지 파편 +1 &nbsp;<span style="color:#6d7f92;font-weight:700">(3개 = 사당 힌트 1회)</span>',1700);
      }
    }
  }

  /* 사당 연출 */
  for(const s of SHRINES){
    const o=shrineObjs[s.id], got=!!STATE.cores[s.id];
    o.core.rotation.y+=dt*0.9; o.core.rotation.x+=dt*0.4;
    o.halo.rotation.y-=dt*0.5;
    o.core.position.y = 5.6 + Math.sin(t*1.3)*0.22;
    o.halo.position.y = o.core.position.y;
    o.core.visible = !got; o.halo.visible=!got;
    o.rune.material.color.set(got?0x8ef0a8:s.col);
    o.rune.rotation.z += dt*(got?0.5:0.16);
    o.spin.forEach(sp=>{ sp.m.rotation[sp.axis] += dt*sp.spd; });
    o.flow.forEach(f=>{
      if(f.m.userData.y0===undefined) f.m.userData.y0=f.m.position.y;
      if(f.rise){
        f.m.position.y += dt*(f.spd||1)*1.5*Math.sign(f.amp||1);
        const span=Math.abs(f.amp||1)*3.2;
        if(Math.abs(f.m.position.y-f.m.userData.y0)>span) f.m.position.y=f.m.userData.y0;
      } else if(f.amp){
        f.m.position.y = f.m.userData.y0 + Math.sin(t*(f.spd||1))*f.amp;
      }
      if(f.glow) f.m.material.color.setHSL(0.11,1,0.55+Math.sin(t*3)*0.08);
    });
    o.label.material.opacity = clamp(1.6 - Math.hypot(P.pos.x-s.x,P.pos.z-s.z)/70, 0.15, 1);
  }
  updateMonsters(dt, t);

  /* 가장 가까운 사당에만 조명 */
  {
    let near=null, nd=42;
    for(const s2 of SHRINES){ const d=Math.hypot(P.pos.x-s2.x, P.pos.z-s2.z); if(d<nd){ nd=d; near=s2; } }
    if(near){
      const got=!!STATE.cores[near.id];
      shrineLight.position.set(near.x, near.gy+5.6, near.z);
      shrineLight.color.set(got?0x8ef0a8:near.col);
      shrineLight.intensity = (got?2.0:1.5) * (1-nd/42) * (0.85+Math.sin(t*2.4)*0.15) * 1.9;
    } else shrineLight.intensity=0;
  }
  /* 에너지 관제 콘솔 */
  {
    const open = coreCount()>=10;
    finalConsole.g.visible = open;
    if(!open){ finalConsole.light.intensity = 0; }
    else {
      finalConsole.frame.rotation.z += dt*0.6;
      finalConsole.label.material.opacity = clamp(1.6-Math.hypot(P.pos.x-FINAL.x,P.pos.z-FINAL.z)/60, 0.2, 1);
      finalConsole.bars.forEach((b,i)=>{
        const v = 0.35 + 0.65*Math.abs(Math.sin(t*0.9 + i*0.42));
        b.scale.y = v; b.position.y = 3.1 - (1-v)*0.5;
      });
      finalConsole.light.intensity = STATE.finalDone? 1.4 : (1.0+Math.sin(t*2.6)*0.45);
      finalConsole.scr.material.opacity = STATE.finalDone? 0.42 : (0.30+Math.sin(t*2.6)*0.1);
    }
  }
  /* NPC 마커 */
  npcObjs.forEach(n=>{
    n.mark.rotation.y+=dt*2; n.mark.position.y=3.7+Math.sin(t*2.4)*0.16;
    n.mark.visible = !STATE.talked[n.data.id];
    const ld=Math.hypot(P.pos.x-n.data.x,P.pos.z-n.data.z);
    n.h.g.children.forEach(c=>{ if(c.isSprite) c.material.opacity=clamp(1.5-ld/34,0,1); });
  });
  /* 물결 (몇 프레임에 한 번만 계산) */
  if(mmTick % PERF.waterEvery === 0){
    const wp=water.geometry.attributes.position;
    for(let i=0;i<wp.count;i++){
      const x=waterBase[i*3], z=waterBase[i*3+2];
      wp.setY(i, Math.sin(x*0.045+t*1.1)*0.42 + Math.cos(z*0.052+t*0.86)*0.36);
    }
    wp.needsUpdate=true;
  }
  /* 구름 */
  clouds.forEach(c=>{ c.position.x += c.userData.spd*dt; if(c.position.x>170) c.position.x=-170; });

  autoQuality(dt);
  mmTick++;
  if(mmTick%3===0) drawMinimap();
  renderer.render(scene,camera);
}

/* ══════════════ 시작 ══════════════ */
let lb=0;
const lbTimer=setInterval(()=>{ lb=Math.min(100,lb+8+Math.random()*14); $('#loadbar>i').style.width=lb+'%'; if(lb>=100) clearInterval(lbTimer); },70);
$('#startBtn').addEventListener('click', ()=>{
  $('#title').style.transition='.6s'; $('#title').style.opacity=0;
  setTimeout(()=>$('#title').style.display='none',620);
  $('#hud').classList.add('on');
  STATE.started=true; STATE.mode='play';
  refreshHud(); updateCityLight();
  if(coreCount()>0){ toast('💾','이전 진행 상황을 불러왔습니다 (코어 '+coreCount()+'개)',3000);
    if(STATE.finalDone) setQuest('모든 임무 완료','열 개의 사당과 에너지 믹스 설계까지 끝냈다. 사당·관제탑에 다시 들어가 복습해 보자.');
    else if(coreCount()>=10) setQuest('마지막 임무 — 에너지 관제탑','도시 광장 중앙의 <b>에너지 관제탑</b>으로 가서 하루 24시간 전력 계획을 직접 설계하자.');
    else setQuest('열 개의 사당을 깨워라','남은 사당에서 시련을 풀고 코어를 모으자.'); }
  else toast('🎒','시장 하람에게 먼저 말을 걸어보자',3200);
});
$$('#monLv .chip').forEach((c,i)=>c.addEventListener('click',()=>setMonLevel(i)));
setMonLevel(STATE.monLevel);
$('#helpX').addEventListener('click',()=>$('#help').classList.remove('on'));
$('#helpX2').addEventListener('click',()=>$('#help').classList.remove('on'));
$('#help').addEventListener('click',e=>{ if(e.target.id==='help') $('#help').classList.remove('on'); });
refreshHud(); updateCityLight(); animate();
window.__gameReady = true;   // 여기까지 오면 시작 버튼이 정상 연결된 것
