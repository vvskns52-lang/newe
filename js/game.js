/* ═══════════════════════════════════════════════════
   game.js — 상태·HUD·입력·카메라·메인 루프
   ═══════════════════════════════════════════════════ */
/* ══════════════ 게임 상태 ══════════════ */
const STATE = {
  cores:{}, sparks:0, hintUsed:{}, talked:{}, started:false, hp:3, inv:0, heal:0, monLevel:2, finalDone:false, runes:{}, metSpirit:{}, bossDone:false, bossPending:false, bossStage:0,
  upgrades:{ maxHp:0, lightPower:0, magnet:false, weaponLevel:1, rapidFire:false }, speedBoostEnd:0,
  mode:'play',   // play | dialog | shrine | ending
  quest:{t:'빛의 도시로', b:'도시 광장의 시장 하람에게 말을 걸어 무슨 일이 벌어졌는지 들어보자.'}
};
try{ const sv=JSON.parse(localStorage.getItem('energyChronicle')||'null');
     if(sv){ STATE.cores=sv.cores||{}; STATE.sparks=sv.sparks||0; STATE.talked=sv.talked||{}; STATE.finalDone=!!sv.finalDone; STATE.runes=sv.runes||{}; STATE.metSpirit=sv.metSpirit||{}; STATE.bossStage=sv.bossStage!==undefined?sv.bossStage:(sv.bossDone?3:0); STATE.bossDone=(STATE.bossStage>=3); STATE.bossPending=!!sv.bossPending;
       if(sv.upgrades) STATE.upgrades = Object.assign({ maxHp:0, lightPower:0, magnet:false, weaponLevel:1, rapidFire:false }, sv.upgrades);
       STATE.monLevel=2; } }catch(e){}
function save(){ try{ localStorage.setItem('energyChronicle', JSON.stringify({cores:STATE.cores,sparks:STATE.sparks,talked:STATE.talked,monLevel:STATE.monLevel, mv:2,finalDone:STATE.finalDone,runes:STATE.runes,metSpirit:STATE.metSpirit,bossDone:STATE.bossDone,bossPending:STATE.bossPending,bossStage:STATE.bossStage,upgrades:STATE.upgrades})); }catch(e){} }
const coreCount = ()=>Object.keys(STATE.cores).length;
const runeCount = ()=>Object.keys(STATE.runes).length;

/* ══════════════ HUD ══════════════ */
(function initHud(){
  const hp=$('#hpHud');
  for(let i=0;i<5;i++){ const h=document.createElement('span'); h.className='heart'; h.id='hp'+i; h.textContent='💚'; hp.appendChild(h); }
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
  const maxH = 3 + (STATE.upgrades?.maxHp || 0);
  for(let i=0;i<5;i++){
    const e=$('#hp'+i);
    if(e){
      e.style.display = i < maxH ? '' : 'none';
      e.classList.toggle('off', i>=STATE.hp);
    }
  }
  /* 신속 버프 뱃지 */
  const buffBadge = $('#speedBuffBadge');
  if(buffBadge){
    const remainMs = (STATE.speedBoostEnd || 0) - performance.now();
    if(remainMs > 0){
      buffBadge.style.display = 'inline-block';
      buffBadge.textContent = '⚡' + Math.ceil(remainMs/1000) + 's';
    } else {
      buffBadge.style.display = 'none';
    }
  }
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

/* ══════════════ 에너지 파편 교환소 시스템 ══════════════ */
const SHOP_ITEMS = [
  {
    id: 'heal',
    name: '에너지 치유',
    icon: '💚',
    desc: '파편의 순수한 빛으로 즉시 체력을 1칸 회복합니다.',
    cost: ()=> 2,
    canBuy: ()=> STATE.hp < (3 + (STATE.upgrades.maxHp || 0)),
    buyText: ()=> '치유 (파편 2개)',
    onBuy: ()=>{
      STATE.hp++;
      AUDIO.sfx('core');
      toast('💚', '체력이 1칸 회복되었습니다!');
    }
  },
  {
    id: 'weapon',
    name: '빛의 무기 승급',
    icon: '🔮',
    desc: '무기 단계를 승급합니다. (2단계: 트윈 볼트 / 3단계: 트리플 볼트 / 4단계: 태양의 정화포 광역 폭발)',
    cost: ()=>{
      const lv = STATE.upgrades.weaponLevel || 1;
      if(lv === 1) return 10;
      if(lv === 2) return 18;
      if(lv === 3) return 28;
      return 999;
    },
    isMax: ()=> (STATE.upgrades.weaponLevel || 1) >= 4,
    canBuy: ()=> (STATE.upgrades.weaponLevel || 1) < 4,
    level: ()=>{
      const lv = STATE.upgrades.weaponLevel || 1;
      const titles = ['기본 1발', '트윈 볼트', '트리플 볼트', '태양의 정화포'];
      return lv + '단 (' + titles[lv-1] + ')';
    },
    buyText: ()=>{
      const lv = STATE.upgrades.weaponLevel || 1;
      if(lv >= 4) return '최대 승급 완료';
      const costs = [10, 18, 28];
      const nextNames = ['트윈 볼트', '트리플 볼트', '태양의 정화포'];
      return nextNames[lv-1] + ' 승급 (파편 ' + costs[lv-1] + '개)';
    },
    onBuy: ()=>{
      STATE.upgrades.weaponLevel = (STATE.upgrades.weaponLevel || 1) + 1;
      AUDIO.sfx('right');
      const lv = STATE.upgrades.weaponLevel;
      const names = ['', '트윈 볼트', '트리플 볼트', '태양의 정화포'];
      toast('🔮', '무기 승급 완료! ' + lv + '단계 [' + names[lv] + ']');
    }
  },
  {
    id: 'rapidFire',
    name: '정화 가속 렌즈',
    icon: '💠',
    desc: '빛의 발사 간격을 40% 대폭 단축하여 빠른 속도로 연사합니다.',
    cost: ()=> 8,
    isMax: ()=> !!STATE.upgrades.rapidFire,
    canBuy: ()=> !STATE.upgrades.rapidFire,
    buyText: ()=> STATE.upgrades.rapidFire ? '장착 완료' : '장착 (파편 8개)',
    onBuy: ()=>{
      STATE.upgrades.rapidFire = true;
      AUDIO.sfx('right');
      toast('💠', '정화 가속 렌즈 장착! 연사 속도가 빨라졌습니다.');
    }
  },
  {
    id: 'speed',
    name: '신속의 오라',
    icon: '🏃',
    desc: '45초 동안 이동 및 달리기 속도가 35% 빨라집니다.',
    cost: ()=> 3,
    canBuy: ()=> true,
    buyText: ()=> '활성화 (파편 3개)',
    onBuy: ()=>{
      const curEnd = Math.max(performance.now(), STATE.speedBoostEnd || 0);
      STATE.speedBoostEnd = curEnd + 45000;
      AUDIO.sfx('spark');
      toast('⚡', '신속의 오라 발동! (45초간 이동속도 +35%)');
    }
  },
  {
    id: 'magnet',
    name: '파편 자기장 코어',
    icon: '🧲',
    desc: '반경 18m 내의 에너지 파편을 플레이어에게 자동으로 끌어당깁니다.',
    cost: ()=> 8,
    isMax: ()=> !!STATE.upgrades.magnet,
    canBuy: ()=> !STATE.upgrades.magnet,
    buyText: ()=> STATE.upgrades.magnet ? '활성화 완료' : '해금 (파편 8개)',
    onBuy: ()=>{
      STATE.upgrades.magnet = true;
      AUDIO.sfx('right');
      toast('🧲', '파편 자기장 코어 해금! 주변 파편을 끌어당깁니다.');
    }
  },
  {
    id: 'maxHp',
    name: '생명력 코어 확장',
    icon: '💖',
    desc: '최대 체력(하트)을 영구히 1칸 늘립니다. (최대 5칸까지 확장)',
    cost: ()=> ((STATE.upgrades.maxHp || 0) === 0 ? 10 : 20),
    isMax: ()=> (STATE.upgrades.maxHp || 0) >= 2,
    canBuy: ()=> (STATE.upgrades.maxHp || 0) < 2,
    level: ()=> (STATE.upgrades.maxHp || 0) + ' / 2',
    buyText: ()=>{
      const lv = STATE.upgrades.maxHp || 0;
      if(lv >= 2) return '최대 단계 달성';
      return '확장 (파편 ' + (lv === 0 ? 10 : 20) + '개)';
    },
    onBuy: ()=>{
      STATE.upgrades.maxHp = (STATE.upgrades.maxHp || 0) + 1;
      STATE.hp++;
      AUDIO.sfx('core');
      toast('💖', '최대 체력이 ' + (3 + STATE.upgrades.maxHp) + '칸으로 확장되었습니다!');
    }
  },
  {
    id: 'lightPower',
    name: '정화의 빛 증폭기',
    icon: '⚡',
    desc: '정화의 빛(F키) 공격력을 영구히 1 강화합니다. (오염 몬스터 신속 정화)',
    cost: ()=> ((STATE.upgrades.lightPower || 0) === 0 ? 12 : 24),
    isMax: ()=> (STATE.upgrades.lightPower || 0) >= 2,
    canBuy: ()=> (STATE.upgrades.lightPower || 0) < 2,
    level: ()=> (STATE.upgrades.lightPower || 0) + ' / 2',
    buyText: ()=>{
      const lv = STATE.upgrades.lightPower || 0;
      if(lv >= 2) return '최대 단계 달성';
      return '강화 (파편 ' + (lv === 0 ? 12 : 24) + '개)';
    },
    onBuy: ()=>{
      STATE.upgrades.lightPower = (STATE.upgrades.lightPower || 0) + 1;
      AUDIO.sfx('right');
      toast('⚡', '정화의 빛 위력이 ' + STATE.upgrades.lightPower + '단계 강화되었습니다!');
    }
  }
];

function renderShop(){
  const sList = $('#shopItemList');
  if(!sList) return;
  $('#shopSparkN').textContent = STATE.sparks;
  sList.innerHTML = '';
  SHOP_ITEMS.forEach(it => {
    const card = document.createElement('div');
    const isMax = it.isMax ? it.isMax() : false;
    card.className = 'shopCard' + (isMax ? ' maxed' : '');
    const cost = it.cost ? it.cost() : 0;
    const canAfford = STATE.sparks >= cost;
    const canBuy = it.canBuy ? it.canBuy() : true;
    const lvTag = it.level ? '<span class="shopCardLevel">' + it.level() + '</span>' : '';
    
    card.innerHTML = 
      '<div class="shopCardInfo">' +
        '<div class="shopCardIco">' + it.icon + '</div>' +
        '<div class="shopCardTxt">' +
          '<div class="shopCardName">' + it.name + ' ' + lvTag + '</div>' +
          '<div class="shopCardDesc">' + it.desc + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="shopCardAction">' +
        '<button class="btn gold shopBuyBtn" ' + ((!canAfford || !canBuy || isMax) ? 'disabled' : '') + '>' +
          it.buyText() +
        '</button>' +
      '</div>';
    const btn = card.querySelector('.shopBuyBtn');
    if(btn && canAfford && canBuy && !isMax){
      btn.onclick = () => {
        if(STATE.sparks < cost) return;
        STATE.sparks -= cost;
        it.onBuy();
        save();
        refreshHud();
        renderShop();
      };
    }
    sList.appendChild(card);
  });
}

function toggleShop(){
  if($('#sparkShop').classList.contains('on')) closeShop();
  else openShop();
}
function openShop(){
  if(STATE.mode === 'shrine') return;
  $('#sparkShop').classList.add('on');
  $('#help').classList.remove('on');
  $('#minimap').classList.remove('big');
  if(typeof syncPanelBtns==='function') syncPanelBtns();
  renderShop();
}
function closeShop(){
  $('#sparkShop').classList.remove('on');
  if(typeof syncPanelBtns==='function') syncPanelBtns();
}

/* ══════════════ 입력 ══════════════ */
const keys={};
addEventListener('keydown', e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(k==='h'&&STATE.mode!=='shrine'){ toggleHelp(); }
  if(k==='j'&&STATE.mode!=='shrine'){ toggleArchive(); }
  if(k==='b'&&STATE.mode!=='shrine'){ toggleShop(); }
  if(k==='k'){ AUDIO.init(); AUDIO.toggle(); refreshSnd(); }
  if(k==='escape'){
    if($('#archive')&&$('#archive').classList.contains('on')) closeArchive();
    else if($('#sparkShop').classList.contains('on')) closeShop();
    else if(STATE.mode==='shrine') closeShrine();
    else if(STATE.mode==='dialog') endDialog();
    else closeHelp();
  }
  if(k==='m'&&STATE.mode==='play'){ toggleMap(); }
  if(k==='e'&&STATE.mode==='play'){ interact(); }
  if((k==='f')&&STATE.mode==='play'){ firePurify(); }
  if(k===' '){ if(STATE.mode==='dialog'){ e.preventDefault(); nextLine(); } }
  if((k===' '||k==='arrowup'||k==='arrowdown')&&STATE.mode==='play') e.preventDefault();
});
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

const CAM={yaw:0, pitch:0.34, dist:12, tYaw:0, tPitch:0.34, tDist:12, shake:0};
function triggerCamShake(amt){ CAM.shake = Math.max(CAM.shake, amt); }
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
  /* 지도·도움말은 키(H·M)와 버튼(태블릿) 양쪽에서 같은 함수를 쓴다.
     한쪽만 고치면 태블릿에서 다시 열 수 없게 되므로 반드시 여기로 모을 것. */
  $('#tHelp').addEventListener('click',()=>{ if(STATE.mode!=='shrine') toggleHelp(); });
  $('#tMap').addEventListener('click',()=>{ if(STATE.mode==='play'||$('#minimap').classList.contains('big')) toggleMap(); });
  $('#mmCv').addEventListener('click',e=>{ e.stopPropagation();
    if(STATE.mode==='play'||$('#minimap').classList.contains('big')) toggleMap(); });
  $('#fsBtn').addEventListener('click',()=>{
    const d=document.documentElement;
    try{
      if(!document.fullscreenElement){ const r=(d.requestFullscreen||d.webkitRequestFullscreen||function(){}).call(d); if(r&&r.catch) r.catch(()=>{}); }
      else if(document.exitFullscreen){ const r=document.exitFullscreen(); if(r&&r.catch) r.catch(()=>{}); }
    }catch(err){}
  });
  document.addEventListener('fullscreenchange', ()=>{
    const fs = !!document.fullscreenElement;
    const b = $('#fsBtn');
    if(b){
      b.classList.toggle('on', fs);
      b.innerHTML = '⛶<small>' + (fs ? '창모드' : '전체') + '</small>';
      b.title = fs ? '전체 화면 나가기' : '전체 화면';
    }
  });
  if(TOUCH_DEV){
    const tk=$('#touchKeys'); if(tk){ tk.style.display='flex'; }
    $$('#title .keys')[0].style.display='none';
    $('#hint').textContent='';
    $('#prompt .ekey').textContent='탭';
    $('#dialog .next').textContent='화면 탭 — 다음 ▶';
  }
})();
/* ── 도움말 · 지도 · 파편 교환소 · 지식 도감 여닫기 (키보드와 상단 버튼이 공유) ── */
function syncPanelBtns(){
  const h=$('#tHelp'), m=$('#tMap'), s=$('#tShop'), a=$('#tArchive');
  if(h) h.classList.toggle('on', $('#help')&&$('#help').classList.contains('on'));
  if(m) m.classList.toggle('on', $('#minimap')&&$('#minimap').classList.contains('big'));
  if(s) s.classList.toggle('on', $('#sparkShop')&&$('#sparkShop').classList.contains('on'));
  if(a) a.classList.toggle('on', $('#archive')&&$('#archive').classList.contains('on'));
}
function closeHelp(){ $('#help').classList.remove('on'); syncPanelBtns(); }
function toggleHelp(){
  const on = !$('#help').classList.contains('on');
  $('#help').classList.toggle('on', on);
  if(on){
    $('#minimap').classList.remove('big');
    $('#sparkShop').classList.remove('on');
    if($('#archive')) $('#archive').classList.remove('on');
  }
  syncPanelBtns();
}
function toggleMap(){
  const mm=$('#minimap'), on = !mm.classList.contains('big');
  mm.classList.toggle('big', on);
  if(on){
    $('#help').classList.remove('on');
    $('#sparkShop').classList.remove('on');
    if($('#archive')) $('#archive').classList.remove('on');
  }
  resizeMinimap(); buildWarp(); syncPanelBtns();
}
(function initShopEvents(){
  const sh=$('#sparkHud'), sx=$('#shopX'), sm=$('#sparkShop'), ts=$('#tShop');
  if(sh) sh.onclick = ()=> toggleShop();
  if(sx) sx.onclick = ()=> closeShop();
  if(sm) sm.onclick = e => { if(e.target === sm) closeShop(); };
  if(ts) ts.onclick = ()=> toggleShop();
})();

/* ───────── 신재생에너지 지식 도감 ───────── */
let currentArchTab = 'all';
function closeArchive(){
  const ar = $('#archive');
  if(ar) ar.classList.remove('on');
  syncPanelBtns();
}
function toggleArchive(){
  const ar = $('#archive');
  if(!ar) return;
  const on = !ar.classList.contains('on');
  ar.classList.toggle('on', on);
  if(on){
    $('#help').classList.remove('on');
    $('#minimap').classList.remove('big');
    $('#sparkShop').classList.remove('on');
    renderArchive(currentArchTab);
  }
  syncPanelBtns();
}
function renderArchive(filter='all'){
  currentArchTab = filter;
  const grid = $('#archGrid');
  if(!grid || typeof ARCHIVE_DATA==='undefined') return;

  const keys = Object.keys(ARCHIVE_DATA);
  let unlockedCount = 0;
  keys.forEach(k=>{
    const unlocked = (k === 'mix') ? !!STATE.finalDone : !!STATE.cores[k];
    if(unlocked) unlockedCount++;
  });
  const countEl = $('#archCount'), pctEl = $('#archPct'), barFill = $('#archBarFill');
  if(countEl) countEl.textContent = unlockedCount + ' / ' + keys.length;
  const pct = Math.round(unlockedCount / keys.length * 100);
  if(pctEl) pctEl.textContent = pct + '%';
  if(barFill) barFill.style.width = pct + '%';

  $$('.archTab').forEach(tab=>{
    tab.classList.toggle('on', tab.getAttribute('data-filter') === filter);
  });

  grid.innerHTML = '';
  keys.forEach(k=>{
    const data = ARCHIVE_DATA[k];
    if(filter !== 'all' && data.ch !== filter) return;
    const unlocked = (k === 'mix') ? !!STATE.finalDone : !!STATE.cores[k];

    const card = document.createElement('div');
    card.className = 'archCard ' + (unlocked ? 'unlocked' : 'locked');
    if(unlocked){
      card.innerHTML = `
        <div class="archCardTop">
          <div class="archCardHead">
            <div class="archCardIcon" style="background:${data.color}22;border-color:${data.color}">${data.icon}</div>
            <div>
              <div class="archCardName">${data.title}<span class="archCardBadge">${data.ch}</span></div>
              <div style="font-size:11.5px;color:#2b6cb0;font-weight:800">에너지 코어 획득 완료 ✨</div>
            </div>
          </div>
        </div>
        <div class="archCardSummary">${data.summary}</div>
        <div class="archCardDetails">
          <div class="archSec"><b>⚙️ 과학적 발전 원리</b>${data.principle}</div>
          <div class="archSec"><b>👍 장점 & 이점</b>${data.pros}</div>
          <div class="archSec"><b>⚠️ 극복 과제 및 한계</b>${data.cons}</div>
          <div class="archSec"><b>🗺️ 교과서 속 실제 대표 지명</b>${data.caseStudy}</div>
          <div class="archSec archKeyBox"><b>🎯 시험 출제 핵심 키워드</b>${data.examKey}</div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="archCardTop">
          <div class="archCardHead">
            <div class="archCardIcon">🔒</div>
            <div>
              <div class="archCardName">${data.title}<span class="archCardBadge">${data.ch}</span></div>
              <div class="archCardLockedMsg"><span>🔒 아직 잠겨 있습니다</span></div>
            </div>
          </div>
        </div>
        <div class="archCardSummary" style="border-left-color:#cbd5e1;color:#64748b">
          ${data.ch}의 사당 시련을 풀고 <b>에너지 코어</b>를 획득하면 이 지식 카드가 해금됩니다.
        </div>
      `;
    }
    grid.appendChild(card);
  });
}
(function initArchiveEvents(){
  const ta=$('#tArchive'), ax=$('#archX'), ar=$('#archive');
  if(ta) ta.onclick = ()=> toggleArchive();
  if(ax) ax.onclick = ()=> closeArchive();
  if(ar) ar.onclick = e => { if(e.target === ar) closeArchive(); };
  $$('.archTab').forEach(tab=>{
    tab.onclick = ()=> renderArchive(tab.getAttribute('data-filter'));
  });
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
  const W=mm.width, H=mm.height, S=W/360;
  mg.clearRect(0,0,W,H);
  mg.fillStyle='#2b6f9e'; mg.fillRect(0,0,W,H);
  mg.save(); mg.translate(W/2,H/2);
  // 섬
  mg.beginPath(); mg.arc(0,0,150*S,0,6.283); mg.fillStyle='#9ed177'; mg.fill();
  mg.beginPath(); mg.arc(0,0,140*S,0,6.283); mg.fillStyle='#8ec96c'; mg.fill();
  // 지역 — 각 지역의 땅 색으로 옅게 칠해 어디가 어디인지 보이게
  BIOMES.forEach(b=>{
    mg.beginPath(); mg.arc(b.cx*S, b.cz*S, b.r*0.95*S, 0, 6.283);
    mg.fillStyle = '#'+('000000'+b.ground.toString(16)).slice(-6); mg.globalAlpha=0.55; mg.fill();
    mg.globalAlpha=1;
  });
  // 도시
  mg.beginPath(); mg.arc(0,0,26*S,0,6.283); mg.fillStyle='#e6d9b8'; mg.fill();
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
  // 보스 위치
  if(typeof BOSS!=='undefined' && BOSS.alive && BOSS.die<=0){
    const bx = BOSS.g.position.x*S, bz = BOSS.g.position.z*S;
    mg.beginPath(); mg.arc(bx, bz, 8, 0, 6.283);
    mg.fillStyle='#e74c3c'; mg.fill(); mg.lineWidth=2; mg.strokeStyle='#ffffff'; mg.stroke();
    mg.font='10px sans-serif'; mg.textAlign='center'; mg.textBaseline='middle';
    mg.fillText('☠️', bx, bz);
  }
  // 플레이어
  mg.save(); mg.translate(P.pos.x*S, P.pos.z*S); mg.rotate(Math.PI - P.yaw);
  mg.beginPath(); mg.moveTo(0,-9); mg.lineTo(6.4,7); mg.lineTo(0,3.6); mg.lineTo(-6.4,7); mg.closePath();
  mg.fillStyle='#ff5b5b'; mg.fill(); mg.strokeStyle='#fff'; mg.lineWidth=2; mg.stroke(); mg.restore();
  mg.restore();
}

/* ══════════════ 도시 점등 및 단계별 인프라 복구 ══════════════ */
function updateCityLight(){
  const count = coreCount();
  const t = count/10;
  if(CITY.beaconMat) CITY.beaconMat.color.setHSL(0.12, 0.85, 0.16+0.42*t);
  if(CITY.bLight) CITY.bLight.intensity = 1.3*t;
  cityLights.forEach((o,i)=>{
    const on = i/cityLights.length < t*1.05;
    if(o.isLight) o.intensity = on? 0.5 : 0;
    else o.color.set(on? 0xffdd93 : 0x3b4a5c);
  });

  /* 3D 인프라 단계별 활성화 (가로등, 스마트팜, 분수대, 빛의 기둥) */
  if(CITY.lanterns)    CITY.lanterns.visible    = (count >= 2);
  if(CITY.smartFarm)   CITY.smartFarm.visible   = (count >= 5);
  if(CITY.fountain)    CITY.fountain.visible    = (count >= 8);
  if(CITY.lightPillar) CITY.lightPillar.visible = (count >= 10);
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

const SPK = new THREE.Matrix4();   /* 인스턴스 행렬 계산용 임시 객체 */
const clock=new THREE.Clock();
let mmTick=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  updateMood(dt);
  if(typeof updateBoss==='function' && STATE.started) updateBoss(dt, t);
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
    const run = (keys['shift']||TOUCH.run||TOUCH.mag>0.86)?2.05:1;   /* 섬이 넓어져 달리기를 조금 더 빠르게 */
    const len=Math.hypot(ix,iz);
    let moveX=0, moveZ=0;
    if(len>0){
      const nl=Math.min(len,1); ix=ix/len*nl; iz=iz/len*nl;
      const cy=Math.cos(CAM.yaw), sy=Math.sin(CAM.yaw);
      // 카메라 기준 이동: 전방 = 카메라가 바라보는 쪽(-sin,-cos), 우측 = (cos,-sin)
      moveX = (ix*cy + iz*sy);
      moveZ = (iz*cy - ix*sy);
      P.yaw = Math.atan2(moveX, moveZ);
      const isSpeedBoost = performance.now() < (STATE.speedBoostEnd || 0);
      const boostMult = isSpeedBoost ? 1.35 : 1.0;
      P.speed = lerp(P.speed, 11.2*run*boostMult*Math.max(TOUCH.mag>0.12?TOUCH.mag:1,0.35), 0.2);
    } else P.speed = lerp(P.speed, 0, 0.28);

    if(P.speed>0.05){
      const nx = P.pos.x + moveX*P.speed*dt, nz = P.pos.z + moveZ*P.speed*dt;
      const ny = hAt(nx,nz);
      const slope = Math.abs(ny - hAt(P.pos.x,P.pos.z))/(P.speed*dt+1e-5);
      if(ny > 0.55 && slope < 1.5 && Math.hypot(nx,nz) < WALK_R){ P.pos.x=nx; P.pos.z=nz; }
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
    if(CAM.shake > 0){
      CAM.shake = Math.max(0, CAM.shake - dt * 2.8);
      cx += (Math.random()-0.5) * CAM.shake * 2.2;
      cyy += (Math.random()-0.5) * CAM.shake * 1.8;
      cz += (Math.random()-0.5) * CAM.shake * 2.2;
    }
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
        AUDIO.sfx('rune');
        toast('🔷','고대 룬 조각 '+runeCount()+' / 10 &nbsp;<span style="color:#6d7f92;font-weight:700">(관제탑 설비 예산 +'+RUNE_BONUS+'억)</span>',2600);
      }
    }

    /* 파편 수집 — 인스턴스 행렬을 매 프레임 갱신한다 (드로우콜 1개) */
    const hasMagnet = !!(STATE.upgrades && STATE.upgrades.magnet);
    for(let i=0;i<sparks.length;i++){
      const sp=sparks[i];
      if(sp.got){ SPK.makeScale(0,0,0); SPARK_MESH.setMatrixAt(i, SPK); continue; }
      sp.rot += dt*1.6;
      let y = sp.base + Math.sin(t*1.6+sp.ph)*0.36;
      const dSp = Math.hypot(sp.x-P.pos.x, sp.z-P.pos.z);
      /* 파편 자기장 코어: 주변 18m 내 파편을 플레이어에게 끌어당김 */
      if(hasMagnet && dSp < 18){
        const pull = 14*dt;
        sp.x = lerp(sp.x, P.pos.x, pull);
        sp.z = lerp(sp.z, P.pos.z, pull);
        sp.base = lerp(sp.base, P.pos.y + 1.2, pull);
        y = sp.base;
      }
      SPK.makeRotationY(sp.rot);
      SPK.setPosition(sp.x, y, sp.z);
      SPARK_MESH.setMatrixAt(i, SPK);
      if(dSp<2.6 && Math.abs(y-P.pos.y)<4){
        sp.got=true; STATE.sparks++; save(); refreshHud();
        AUDIO.sfx('step');
        toast('✨','에너지 파편 +1', 1500);
      }
    }
    SPARK_MESH.instanceMatrix.needsUpdate = true;

    /* 신속 버프 뱃지 실시간 갱신 */
    if(STATE.speedBoostEnd > 0){
      const rem = STATE.speedBoostEnd - performance.now();
      const badge = $('#speedBuffBadge');
      if(badge){
        if(rem > 0){
          badge.style.display = 'inline-block';
          badge.textContent = '⚡' + Math.ceil(rem/1000) + 's';
        } else {
          badge.style.display = 'none';
          STATE.speedBoostEnd = 0;
        }
      }
    }
  }

  /* 빛의 도시 인프라 애니메이션 (분수대 & 빛의 기둥) */
  if(window.CITY){
    if(CITY.fountain && CITY.fountain.visible){
      if(CITY.fSpout) CITY.fSpout.rotation.y += dt * 1.5;
      if(CITY.fDrops){
        CITY.fDrops.forEach((d, idx)=>{
          const seed = t * 3.5 + idx * 0.45;
          const r = 0.6 + Math.sin(seed * 0.8) * 1.5;
          const angle = idx * (Math.PI * 2 / CITY.fDrops.length) + t * 0.6;
          const dy = Math.sin(seed) * 1.6;
          d.position.set(Math.cos(angle)*r, CITY.gy + 2.5 + Math.max(0, dy), Math.sin(angle)*r);
        });
      }
    }
    if(CITY.lightPillar && CITY.lightPillar.visible){
      CITY.lightPillar.rotation.y += dt * 0.4;
    }
  }

  /* 멀리 있는 것은 그리지 않는다 — 섬이 넓어지면서 한 화면에 들어오는 물체가
     크게 늘었다. 사람·집처럼 가까이서만 의미 있는 것은 거리로 잘라 낸다. */
  if(typeof cityHouses!=='undefined') cityHouses.visible = Math.hypot(P.pos.x,P.pos.z) < 95;
  for(const n of npcObjs){
    const dn = Math.hypot(n.data.x-P.pos.x, n.data.z-P.pos.z);
    if(n.h.g.visible !== (dn < 125)) n.h.g.visible = dn < 125;
  }

  /* 지역의 잔 구조물(반사경·재활용 더미·증기 등)은 멀리서 감춘다.
     큰 실루엣(풍차·창고·탱크·집열탑)은 길잡이라 항상 남긴다. */
  if(typeof REGION_DETAIL!=='undefined'){
    for(const d of REGION_DETAIL){
      const vis = Math.hypot(d.x-P.pos.x, d.z-P.pos.z) < 210;
      if(d.o.visible !== vis) d.o.visible = vis;
    }
  }

  /* 지역 랜드마크 — 풍차가 돌고 증기·물이 흐른다 */
  if(typeof REGION_SPIN!=='undefined'){
    for(const o of REGION_SPIN) o.o.rotation[o.axis] += dt*o.spd;
    for(const f of REGION_FLOW){
      if(f.rise){
        f.m.position.y += dt*f.spd;
        if(f.m.position.y > f.base + f.amp*4){ f.m.position.y = f.base; }
      } else {
        f.m.position.y = f.base + Math.sin(t*f.spd)*f.amp;
      }
    }
  }

  /* 사당 연출 */
  for(const s of SHRINES){
    const o=shrineObjs[s.id], got=!!STATE.cores[s.id];
    /* 섬이 넓어져 한 화면에 사당이 여러 개 들어온다.
       멀리 있는 사당은 발전소 모형을 감춰 그리는 양을 줄인다.
       (기둥·코어·이름표는 남겨서 길잡이 역할은 그대로) */
    const dS = Math.hypot(s.x-P.pos.x, s.z-P.pos.z);
    if(o.dev) o.dev.visible = dS < 105;
    if(o.struct) o.struct.visible = dS < 190;
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
  /* 구름 — 인스턴스 행렬 갱신 (드로우콜 1개) */
  if(CLOUD_MESH){
    for(let i=0;i<clouds.length;i++){
      const c=clouds[i];
      c.x += c.spd*dt; if(c.x > 250) c.x = -250;
      for(let k=0;k<CLOUD_PER;k++){
        const pt=c.parts[k];
        SPK.makeScale(pt.s, pt.s*0.55, pt.s);
        SPK.setPosition(c.x+pt.dx, c.y+pt.dy, c.z+pt.dz);
        CLOUD_MESH.setMatrixAt(i*CLOUD_PER+k, SPK);
      }
    }
    CLOUD_MESH.instanceMatrix.needsUpdate = true;
  }

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
  AUDIO.init();                       /* 소리는 사용자가 누른 뒤에만 켤 수 있다 */
  STATE.started=true; STATE.mode='play';
  refreshHud(); updateCityLight();
  if(coreCount()>0){ toast('💾','이전 진행 상황을 불러왔습니다 (코어 '+coreCount()+'개)',3000);
    if(STATE.finalDone) setQuest('모든 임무 완료','열 개의 사당과 에너지 믹스 설계까지 끝냈다. 사당·관제탑에 다시 들어가 복습해 보자.');
    else if(coreCount()>=10) setQuest('마지막 임무 — 에너지 관제탑','도시 광장 중앙의 <b>에너지 관제탑</b>으로 가서 하루 24시간 전력 계획을 직접 설계하자.');
    else setQuest('열 개의 사당을 깨워라','남은 사당에서 시련을 풀고 코어를 모으자.'); }
  else toast('🎒','시장 하람에게 먼저 말을 걸어보자',3200);
});
STATE.monLevel = 2;

/* ══════════════ 진행 초기화 ══════════════ */
/* 저장은 이 기기·이 브라우저 안에만 있다(localStorage). 지우면 되돌릴 수 없으므로
   실수로 눌리지 않게 "두 번 눌러야" 지워지도록 했다. 브라우저 기본 확인창은
   쓰지 않는다 — 태블릿에서 창이 뜨면 게임 입력이 막힌다. */
function resetProgress(){
  try{ localStorage.removeItem('energyChronicle'); }catch(e){}
  location.reload();
}
function armReset(btn){
  if(btn.dataset.armed){ resetProgress(); return; }
  btn.dataset.armed = '1';
  btn.dataset.old = btn.innerHTML;
  btn.innerHTML = '⚠ 정말 지울까요? 한 번 더 누르면 삭제';
  btn.classList.add('danger');
  clearTimeout(btn.__t);
  btn.__t = setTimeout(()=>{
    delete btn.dataset.armed; btn.innerHTML = btn.dataset.old; btn.classList.remove('danger');
  }, 5000);
}
(function initReset(){
  const r1=$('#resetBtn'), r2=$('#resetBtn2');
  if(r1) r1.addEventListener('click', ()=>armReset(r1));
  if(r2) r2.addEventListener('click', ()=>armReset(r2));
  /* 저장된 기록이 있을 때만 타이틀에 안내를 띄운다 */
  const n = coreCount(), rn = (typeof runeCount==='function') ? runeCount() : 0;
  if(n>0 || rn>0 || STATE.sparks>0){
    const row=$('#saveRow'); if(row) row.classList.add('on');
    const info=$('#saveInfo');
    if(info) info.textContent = '저장된 기록 — 코어 '+n+'/10 · 룬 '+rn+'/10 · 파편 '+STATE.sparks;
    const sb=$('#startBtn'); if(sb) sb.textContent='이어서 하기';
  }
})();
/* ══════════════ 빠른 이동 ══════════════
   섬이 넓어진 만큼, 이미 깬 사당 사이는 걸어 다니지 않아도 되게 한다.
   아직 안 깬 사당으로는 갈 수 없다 — 처음 가는 길은 직접 걸어야 모험이 된다. */
function buildWarp(){
  const box = $('#warpList'); if(!box) return;
  box.innerHTML = '';
  const done = SHRINES.filter(s=>STATE.cores[s.id]);
  if(!done.length){
    box.innerHTML = '<div class="warpEmpty">아직 깨운 사당이 없습니다. 사당을 하나 깨우면 이곳에서 바로 이동할 수 있어요.</div>';
    return;
  }
  const mk=(icon,label,sub,fn)=>{
    const b=document.createElement('button'); b.className='warpBtn';
    b.innerHTML='<span class="wi">'+icon+'</span><span class="wn">'+label+'<small>'+sub+'</small></span>';
    b.onclick=fn; box.appendChild(b);
  };
  mk('🏙️','빛의 도시','광장 · 시장 하람', ()=>warpTo(0, 9));
  done.forEach(s=>{
    const b = (typeof biomeAt==='function') ? biomeAt(s.x,s.z).b : null;
    mk(s.icon, s.name, (b?b.name+' · ':'')+s.ch+'차시', ()=>warpTo(s.x, s.z+11));
  });
}
function warpTo(x,z){
  P.pos.set(x, hAt(x,z), z); P.vy=0;
  STATE.inv = Math.max(STATE.inv, 1.2);
  $('#minimap').classList.remove('big'); resizeMinimap();
  toast('✨','빠르게 이동했다', 1600);
  AUDIO.sfx('step');
}

/* ══════════════ 소리 ══════════════ */
function refreshSnd(){
  const b=$('#sndBtn'); if(!b) return;
  b.innerHTML = (AUDIO.on ? '🔊' : '🔇') + '<small>소리</small>';
  b.classList.toggle('off', !AUDIO.on);
  b.title = AUDIO.on ? '소리 끄기 (K)' : '소리 켜기 (K)';
  const r=$('#volRange'), l=$('#volLabel');
  if(r) r.value = Math.round(AUDIO.vol*100);
  if(l) l.textContent = AUDIO.on ? Math.round(AUDIO.vol*100)+'%' : '꺼짐';
}
$('#sndBtn').addEventListener('click', ()=>{ AUDIO.init(); AUDIO.toggle(); refreshSnd(); });
$('#volRange').addEventListener('input', e=>{ AUDIO.init(); AUDIO.setVol(+e.target.value/100); refreshSnd(); });
refreshSnd();

/* 장면에 맞는 곡으로 — 사당 안은 조용하게, 오염지대는 어둡게 */
let __moodT=0;
function updateMood(dt){
  if(!AUDIO.ready) return;
  if(STATE.mode==='ending'){ AUDIO.setMood('ending'); return; }
  if(STATE.mode==='shrine'){ AUDIO.setMood('shrine'); return; }
  __moodT -= dt; if(__moodT>0) return; __moodT = 1.2;   /* 초당 한 번이면 충분 */
  const r=Math.hypot(P.pos.x,P.pos.z);
  if(typeof MON!=='undefined' && MON.pool && MON.pool.some(m=>m.alive &&
      Math.hypot(m.g.position.x-P.pos.x, m.g.position.z-P.pos.z) < 34)) AUDIO.setMood('tense');
  else if(r < 30) AUDIO.setMood('city');
  else AUDIO.setMood('field');
}

$('#helpX').addEventListener('click',closeHelp);
$('#helpX2').addEventListener('click',closeHelp);
/* 도움말이 열리면 화면 전체를 덮으므로 ❓ 버튼을 다시 누를 수 없다.
   태블릿에는 Esc 도 없으니, 패널 바깥(어두운 배경)을 눌러도 닫히게 한다. */
$('#help').addEventListener('click',e=>{ if(e.target===$('#help')) closeHelp(); });
$('#help').addEventListener('click',e=>{ if(e.target.id==='help') $('#help').classList.remove('on'); });
refreshHud(); updateCityLight(); animate();
window.__gameReady = true;   // 여기까지 오면 시작 버튼이 정상 연결된 것
