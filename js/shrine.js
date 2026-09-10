/* ═══════════════════════════════════════════════════
   shrine.js — 사당 시련 프레임워크 · 확인 문제 · 엔딩
   ═══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   사당 시련 프레임워크
   ══════════════════════════════════════════════════════════ */
const shCv=$('#shCv'), G2=shCv.getContext('2d');
let curPuz=null, curShrine=null, shT=0, shRAF=0, shLast=0;
let shrineSession=0;
function shrineDelay(fn, ms){
  const session=shrineSession;
  return setTimeout(()=>{
    if(session===shrineSession && STATE.mode==='shrine') fn();
  }, ms);
}

/* 캔버스 헬퍼 */
function rr(g,x,y,w,h,r){ r=Math.min(r,w/2,h/2); g.beginPath();
  g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function TX(g,s,x,y,size,col,align,weight){
  g.font=(weight||800)+' '+size+'px "Gothic A1", sans-serif';
  g.textAlign=align||'left'; g.fillStyle=col||'#dce8f5'; g.fillText(s,x,y); }
function NUM(g,s,x,y,size,col,align){
  g.font='800 '+size+'px Oxanium, "Gothic A1", monospace'; g.textAlign=align||'left'; g.fillStyle=col||'#fff'; g.fillText(s,x,y); }
function bgGrid(g,c1,c2){
  const gr=g.createLinearGradient(0,0,0,540); gr.addColorStop(0,c1||'#16283f'); gr.addColorStop(1,c2||'#0d1626');
  g.fillStyle=gr; g.fillRect(0,0,960,540);
  g.strokeStyle='rgba(255,255,255,.035)'; g.lineWidth=1;
  for(let x=0;x<960;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,540);g.stroke();}
  for(let y=0;y<540;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(960,y);g.stroke();}
}
function gauge(g,x,y,w,h,v,col,label,valTxt){
  rr(g,x,y,w,h,h/2); g.fillStyle='rgba(255,255,255,.12)'; g.fill();
  rr(g,x,y,Math.max(h,w*clamp(v,0,1)),h,h/2); g.fillStyle=col; g.fill();
  if(label) TX(g,label,x,y-9,14,'#9fb6cd');
  if(valTxt) NUM(g,valTxt,x+w,y-9,16,col,'right');
}

/* API */
function makeApi(s){
  const ctrl=$('#shCtrl'); ctrl.innerHTML='';
  const api={ s, st:{}, stepEls:[], doneSteps:new Set(), nSteps:0, locked:false };
  api.mission=(text, steps)=>{
    const d=document.createElement('div'); d.className='mission';
    d.innerHTML='<span class="tag">시련</span><b>'+text+'</b><div class="steps"></div>';
    const holder=d.querySelector('.steps');
    steps.forEach((t,i)=>{ const e=document.createElement('div'); e.className='step';
      e.innerHTML='<i>'+(i+1)+'</i><span>'+t+'</span>'; holder.appendChild(e); api.stepEls.push(e); });
    const tip=document.createElement('div'); tip.className='holdTip';
    tip.innerHTML='⏱ 조건을 <b>잠깐 유지</b>해야 단계가 완료됩니다. 값을 스쳐 지나가는 것만으로는 통과되지 않아요.';
    d.appendChild(tip);
    ctrl.appendChild(d); api.nSteps=steps.length;
  };
  api.step=i=>{
    if(api.doneSteps.has(i)||api.locked) return;
    api.doneSteps.add(i);
    AUDIO.sfx('step');
    const e=api.stepEls[i]; e.classList.add('done'); e.querySelector('i').textContent='✓';
    e.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:420});
    if(api.doneSteps.size>=api.nSteps){ api.locked=true; shrineDelay(()=>showQuiz(api),650); }
  };
  api.has=i=>api.doneSteps.has(i);

  /* 조건을 sec초 동안 "계속" 유지해야 단계가 완료된다.
     슬라이더를 끝에서 끝까지 훑기만 해도 켜지던 문제를 막는 장치.
     draw() 안에서 매 프레임 호출한다 → api.hold(단계, 조건, dt, 초) */
  api.holdT = {};
  api.hold = (i, ok, dt, sec)=>{
    if(api.doneSteps.has(i) || api.locked) return 1;
    sec = (sec || 2.0) * 1.4;
    const cur = clamp((api.holdT[i]||0) + (ok ? dt : -dt*3.0), 0, sec);
    api.holdT[i] = cur;
    const e = api.stepEls[i];
    if(e){
      e.style.setProperty('--p', (cur/sec).toFixed(3));
      e.style.setProperty('--po', cur>0.02 ? 1 : 0);
      e.querySelector('i').classList.toggle('hold', cur>0.02);
    }
    if(cur >= sec){ api.step(i); return 1; }
    return cur/sec;
  };

  api.slider=(label,min,max,step,val,fmt,fn)=>{
    const d=document.createElement('div'); d.className='ctrl';
    d.innerHTML='<label>'+label+'<span></span></label>';
    const inp=document.createElement('input'); inp.type='range'; inp.min=min; inp.max=max; inp.step=step; inp.value=val;
    d.appendChild(inp); ctrl.appendChild(d);
    const out=d.querySelector('span');
    const upd=()=>{ out.innerHTML=fmt(+inp.value); fn&&fn(+inp.value); };
    inp.addEventListener('input',upd); upd(); return inp;
  };
  api.buttons=(label,items,fn)=>{
    const d=document.createElement('div'); d.className='ctrl';
    if(label) d.innerHTML='<label>'+label+'</label>';
    const wrap=document.createElement('div'); wrap.className='chips'; d.appendChild(wrap); ctrl.appendChild(d);
    const els=items.map((it,i)=>{ const b=document.createElement('button'); b.className='chip'; b.innerHTML=it;
      b.onclick=()=>fn(i,b,els); wrap.appendChild(b); return b; });
    return els;
  };
  api.bigBtn=(label,fn)=>{
    const b=document.createElement('button'); b.className='btn gold'; b.style.width='100%'; b.innerHTML=label;
    b.onclick=()=>fn(b); ctrl.appendChild(b); return b;
  };
  api.stats=list=>{
    const d=document.createElement('div'); d.className='readout'; ctrl.appendChild(d);
    const els=list.map(o=>{ const e=document.createElement('div'); e.className='stat';
      e.innerHTML='<div class="k">'+o.k+'</div><div class="v">'+o.v+'</div>'; d.appendChild(e); return e.querySelector('.v'); });
    return (vals)=>vals.forEach((v,i)=>{ if(els[i].innerHTML!==v) els[i].innerHTML=v; });
  };
  api.note=html=>{ const d=document.createElement('div'); d.className='note'; d.innerHTML=html; ctrl.appendChild(d); };
  return api;
}

/* 정답을 맞히면 사당 창을 맨 위(무대·클리어 화면)로 부드럽게 올린다.
   태블릿처럼 화면이 좁아 문제가 아래에 놓일 때 꼭 필요하다. */
function scrollShrineTop(){
  const list=[$('#shrineBox'), $('#shrine')];
  /* 레이아웃이 달라져 다른 요소가 스크롤을 맡고 있어도 찾아낸다 */
  let el=document.querySelector('.stagePane');
  while(el && el!==document.body){
    if(el.scrollHeight-el.clientHeight>8 && list.indexOf(el)<0) list.push(el);
    el=el.parentElement;
  }
  list.forEach(e=>{
    if(!e) return;
    try{ e.scrollTo({top:0, behavior:'smooth'}); }catch(err){ e.scrollTop=0; }
    setTimeout(()=>{ e.scrollTop=0; }, 900);   // smooth 스크롤을 지원하지 않는 브라우저 대비
  });
}

/* 확인 문제 — 사당의 정령이 "물어보는" 대화 형식 (3회 실패 시 재도전) */
/* 확인 문제 — 사당의 정령이 연속으로 물어보는 시련 (총 3문제, 3회 실패 시 재도전) */
function showQuiz(api){
  const rawQ = QUIZ[api.s.id];
  const qList = Array.isArray(rawQ) ? rawQ : [rawQ];
  const totalQ = qList.length;
  let qIdx = 0;

  const defaultAsk = {who:'사당의 정령', face:api.s.icon, lead:'배운 원리를 제대로 이해했는지 확인해 보마.', wrong:'다시 한 번 곰곰이 생각해 보렴.', right:'그래, 바로 그거야!'};
  const A = (typeof QUIZ_ASK!=='undefined' && QUIZ_ASK[api.s.id]) || defaultAsk;

  const por = (typeof spiritPortrait==='function') ? spiritPortrait(api.s.id) : '';
  const FACE = por ? '<span class="face por" style="background:center/contain no-repeat url('+por+')"></span>'
                   : '<span class="face">'+A.face+'</span>';
  const ctrl = $('#shCtrl');
  const d = document.createElement('div'); d.className = 'quizBox askBox';
  ctrl.appendChild(d);

  let tries = 0;

  function renderHearts(){
    const hearts = tries===0 ? '❤️❤️❤️' : (tries===1 ? '💔❤️❤️' : (tries===2 ? '💔💔❤️' : '💔💔💔'));
    return '<div class="quizHearts">' +
           '<span>정령의 시험 생명력: <span class="hIcons" id="qHearts">'+hearts+'</span></span>' +
           '<span class="qProgBadge" style="font-weight:900;color:#1e6bb8;background:#eef6fc;padding:2px 8px;border-radius:6px;font-size:12px">문제 '+(qIdx+1)+' / '+totalQ+'</span>' +
           '</div>';
  }

  function renderCurrentQuestion(){
    const q = qList[qIdx];
    const leadText = q.lead || (qIdx===0 ? A.lead : '다음 질문이야. 잘 듣고 답해 보렴.');

    d.innerHTML =
      '<div class="askWho">'+FACE+'<b>'+A.who+'</b><i>이(가) 말을 건다</i></div>' +
      renderHearts() +
      '<div class="askLead">'+leadText+'</div>' +
      '<div class="q askQ"><b>Q'+(qIdx+1)+'.</b> '+q.q+'</div>' +
      '<div class="askYou">나의 대답</div>';

    const react = document.createElement('div'); react.className = 'askReact'; react.style.display = 'none';
    const ex = document.createElement('div'); ex.className = 'explain'; ex.style.display = 'none'; ex.innerHTML = q.e;

    const btns = [0,1,2,3].map(i=>{
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = '“'+q.o[i]+'”';
      b.onclick = ()=>{
        if(d.dataset.busy) return;
        if(i === q.a){
          d.dataset.busy = '1';
          b.classList.add('ok');
          btns.forEach(o=>{ if(o!==b) o.disabled = true; });
          AUDIO.sfx('right');
          react.className = 'askReact ok'; react.style.display = 'block';
          react.innerHTML = FACE + '<span>' + (qIdx + 1 < totalQ ? '정답이야! 다음 문제도 맞혀 보렴.' : A.right) + '</span>';
          ex.style.display = 'block';

          shrineDelay(()=>{
            if(qIdx + 1 < totalQ){
              qIdx++;
              delete d.dataset.busy;
              renderCurrentQuestion();
              d.scrollIntoView({behavior:'smooth', block:'center'});
            } else {
              shrineDelay(scrollShrineTop, 200);
              shrineDelay(()=>clearShrine(api.s), 1100);
            }
          }, 1400);
        } else {
          tries++;
          b.classList.add('no'); b.disabled = true;
          AUDIO.sfx('wrong');
          const qH = d.querySelector('#qHearts');
          if(qH){
            qH.textContent = tries===1 ? '💔❤️❤️' : (tries===2 ? '💔💔❤️' : '💔💔💔');
          }

          react.className = 'askReact no'; react.style.display = 'block';
          react.innerHTML = FACE + '<span>' + A.wrong + '</span>';

          if(tries === 2){
            react.innerHTML += '<div class="askNote">📘 ' + api.s.note + '</div>';
          }

          if(tries >= 3){
            d.dataset.busy = '1';
            btns.forEach(o=>{ o.disabled = true; });
            react.innerHTML = FACE + '<span style="color:#ff6b6b">"아직 원리를 온전히 깨닫지 못했구나. 시뮬레이션 목표를 다시 달성하여 기운을 모아오렴."</span>';
            AUDIO.sfx('bossRoar');
            shrineDelay(()=>{
              d.remove();
              // 마지막 목표 단계 리셋 (단순 찍기 방지 및 재도전 유도)
              const lastStep = Math.max(0, api.nSteps - 1);
              api.doneSteps.delete(lastStep);
              api.holdT[lastStep] = 0;
              api.locked = false;
              const el = api.stepEls[lastStep];
              if(el){
                el.classList.remove('done');
                const iconEl = el.querySelector('i');
                if(iconEl) iconEl.textContent = (lastStep + 1);
              }
              if(typeof toast==='function') toast('⚠️', '시험 실패! 원리를 다시 조작하여 목표를 달성하세요.', 3600);
              scrollShrineTop();
            }, 2200);
          }
        }
      };
      d.appendChild(b);
      return b;
    });

    d.appendChild(react);
    d.appendChild(ex);
  }

  renderCurrentQuestion();
  d.scrollIntoView({behavior:'smooth', block:'center'});
}

/* 클리어 */
let justCleared = null;
function clearShrine(s){
  if(s.final) return clearFinal(s);
  const first = !STATE.cores[s.id];
  justCleared = first ? s.id : null;   /* 나가면 그 사당의 정령이 축하해 준다 */
  STATE.cores[s.id]=true; STATE.hp=maxPlayerHp(); STATE.inv=2; save(); refreshHud(); updateCityLight();
  $('#clearIcon').textContent='💠';
  $('#clearTitle').textContent = first ? s.short+' 에너지 코어 획득!' : '시련을 다시 완수했다';
  $('#clearText').innerHTML = s.note + '<br><br><b style="color:#ffe08a">도시 전력 '+(coreCount()*10)+'%</b>' + (first?' &nbsp;·&nbsp; <b style="color:#8ef0a8">이 지역의 오염이 걷혔다</b>':'') + (first?'<div style="margin-top:10px;font-size:13px;color:#a5d8ff">📖 <b>신재생에너지 지식 도감</b>에 ['+s.short+' 발전] 카드가 등록되었습니다! (단축키 J)</div>':'');
  AUDIO.sfx('core');
  $('#shClear').classList.add('on');
  scrollShrineTop();
  $('#clearBtn').textContent = coreCount()>=10 ? '빛의 도시로 돌아가기 ▶' : '코어를 가지고 나가기';
}

/* 마지막 시련 — 에너지 믹스 설계 완료 */
function clearFinal(s){
  const first = !STATE.finalDone;
  STATE.finalDone = true; STATE.hp=maxPlayerHp(); STATE.inv=2; save(); refreshHud();
  AUDIO.sfx('clear');
  $('#clearIcon').textContent='🌇';
  $('#clearTitle').textContent = first ? '에너지 믹스 설계 완료!' : '다시 한 번 설계를 완성했다';
  $('#clearText').innerHTML =
    '하루 24시간, 단 한 시간도 불이 꺼지지 않는 전력 계획이 완성되었다.<br><br>'+
    '<b style="color:#ffe08a">서로 다른 에너지가 약점을 메워 주도록 알맞게 섞는 것 — 그것이 에너지 믹스다.</b>'+
    (first?'<div style="margin-top:10px;font-size:13px;color:#a5d8ff">📖 <b>신재생에너지 지식 도감</b>에 최종 [에너지 믹스] 카드가 등록되었습니다!</div>':'');
  $('#shClear').classList.add('on');
  scrollShrineTop();
  $('#clearBtn').textContent = '빛의 도시로 돌아가기 ▶';
}
$('#clearBtn').onclick=()=>{
  const sid = justCleared, wasFinal = STATE.finalDone && $('#clearIcon').textContent==='🌇';
  justCleared=null;
  closeShrine();
  if(wasFinal){ setTimeout(showFinalEnding,600); return; }
  if(coreCount()>=10) setTimeout(showEnding,600);
  else {
    const left=10-coreCount();
    setQuest('열 개의 사당을 깨워라','남은 사당 <b>'+left+'곳</b>을 찾아 코어를 모으자.');
    toast('💠','에너지 코어 획득! 도시 전력 '+(coreCount()*10)+'%',3000);
    if(sid && typeof SH!=='undefined' && SH[sid]){
      setTimeout(()=>toast('📖', `지식 도감에 [${SH[sid].short} 발전] 카드가 등록되었습니다!`, 3400), 1600);
    }
    /* 처음 깬 사당이면 밖에서 정령이 축하해 준다 */
    if(sid && typeof spiritOf!=='undefined' && spiritOf[sid]){
      setTimeout(()=>{ if(STATE.mode==='play') talkSpirit(spiritOf[sid]); }, 1400);
    }
    /* 코어 3, 6, 9개 — 환경 재앙 보스 3단계 등장 */
    const cnt = coreCount();
    if(cnt >= 9 && (STATE.bossStage||0) < 3){
      STATE.bossPending = true;
    } else if(cnt >= 6 && (STATE.bossStage||0) < 2){
      STATE.bossPending = true;
    } else if(cnt >= 3 && (STATE.bossStage||0) < 1){
      STATE.bossPending = true;
    }
  }
};
$('#shClose').onclick=()=>closeShrine();

function openShrine(s){
  shrineSession++;
  curShrine=s; STATE.mode='shrine';
  $('#shrine').classList.add('on'); $('#prompt').classList.remove('on');
  $('#shIcon').textContent=s.icon;
  $('#shIcon').style.background='#'+new THREE.Color(s.col).getHexString();
  $('#shTitle').textContent=s.name; $('#shSub').textContent=s.sub;
  $('#shNote').innerHTML='📘 <b>배움 노트</b> — '+s.note;
  $('#shClear').classList.remove('on');
  const api=makeApi(s);
  curPuz=PUZZLES[s.id](api);
  /* 힌트 */
  const hb=document.createElement('button');
  hb.className='btn ghost'; hb.style.width='100%'; hb.style.fontSize='13px';
  hb.innerHTML='✨ 힌트 보기 <span style="opacity:.65">(파편 3개 소모)</span>';
  const showHint=()=>{
    hb.outerHTML='<div class="ctrl" style="border-color:#f4c04f;background:#fff8e6"><b style="font-size:13px">💡 힌트</b><div class="note" style="margin-top:6px">'+(PUZ_HINT[s.id]||s.note)+'</div></div>';
  };
  hb.onclick=()=>{
    if(STATE.hintUsed[s.id]) return;
    if(STATE.sparks<3){ hb.innerHTML='✨ 파편이 부족해요 ('+STATE.sparks+'/3)'; return; }
    STATE.sparks-=3; STATE.hintUsed[s.id]=true; save(); refreshHud();
    showHint();
  };
  $('#shCtrl').appendChild(hb);
  if(STATE.hintUsed[s.id]) showHint();
  shLast=performance.now(); shT=0;
  cancelAnimationFrame(shRAF); shLoop();
}
function shLoop(){
  shRAF=requestAnimationFrame(shLoop);
  const now=performance.now(), dt=Math.min((now-shLast)/1000,0.05); shLast=now; shT+=dt;
  if(curPuz&&curPuz.draw) curPuz.draw(G2, shT, dt);
}
function closeShrine(){
  shrineSession++;
  cancelAnimationFrame(shRAF); curPuz=null;
  $('#shrine').classList.remove('on'); STATE.mode='play';
}

/* 엔딩 */
let endingKind='core';
function showEnding(){
  STATE.mode='ending'; endingKind='core';
  $('#endEmoji').textContent='🌇';
  $('#endTitle').innerHTML='빛의 도시가 <em>다시 켜졌다</em>';
  $('#endBtn').textContent='마지막 임무를 받으러 가기 ▶';
  $('#endText').innerHTML='열 개의 사당이 모두 깨어났다. 태양의 빛과 열, 바람과 물, 땅속의 열, 밀물과 썰물, '+
    '들판의 작물과 버려진 쓰레기, 그리고 물에서 태어난 수소까지 —<br>'+
    '<b>어느 하나도 혼자서는 도시를 밝히지 못했다.</b><br>서로 다른 열 가지 에너지를 알맞게 섞었을 때, 비로소 도시의 밤이 끝났다.';
  $('#endSum').innerHTML = SHRINES.map(s=>'<span>'+s.icon+' '+s.short+'</span>').join('')
    + '<span style="background:#7ae0a8">✨ 파편 '+STATE.sparks+'개</span>';
  $('#ending').classList.add('on');
}

/* 마지막 시련까지 끝낸 진짜 엔딩 */
function showFinalEnding(){
  STATE.mode='ending'; endingKind='final';
  $('#endEmoji').textContent='🌈';
  $('#endTitle').innerHTML='도시의 하루가 <em>완성되었다</em>';
  $('#endText').innerHTML=
    '한밤중에는 땅속의 열과 바이오·연료전지가 도시를 지키고, 새벽 바람이 그 뒤를 받쳤다. '+
    '해가 뜨면 태양광과 태양열이 이어받고, 저녁 여섯 시 가장 전기가 많이 필요한 시간에는 '+
    '댐의 물과 저장해 둔 수소가 한꺼번에 쏟아져 나왔다.<br>'+
    '<b>어느 하나도 혼자서는 하루를 지킬 수 없었지만, 열 가지가 함께라면 단 한 시간도 불이 꺼지지 않는다.</b><br>'+
    '이것이 우리가 찾던 <b>에너지 믹스</b>다.';
  $('#endSum').innerHTML = SHRINES.map(s=>'<span>'+s.icon+' '+s.short+'</span>').join('')
    + '<span style="background:#ffd166">🏙️ 에너지 믹스 설계 완료</span>'
    + '<span style="background:#7ae0a8">✨ 파편 '+STATE.sparks+'개</span>';
  $('#endBtn').textContent='섬으로 돌아가기';
  $('#ending').classList.add('on');
}
$('#endBtn').onclick=()=>{ $('#ending').classList.remove('on'); STATE.mode='play';
  if(endingKind==='core'){
    setQuest('마지막 임무 — 에너지 관제탑',
      '도시 광장 중앙 전력탑 앞에 <b>에너지 관제 콘솔</b>이 나타났다. 그곳에서 도시의 하루 24시간 전기를 '+
      '열 가지 에너지로 어떻게 나누어 만들지 <b>에너지 믹스</b>를 직접 설계하자.');
    toast('📜','새 목표: 도시 중앙 에너지 관제탑으로!',4200);
  } else {
    setQuest('모든 임무 완료',
      '열 개의 사당과 에너지 믹스 설계까지 모두 끝냈다. 자유롭게 섬을 둘러보거나 사당·관제탑에 다시 들어가 복습해 보자.');
  }
};
