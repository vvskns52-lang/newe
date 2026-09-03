/* ═══════════════════════════════════════════════════════════════
   audio.js — 배경음악·효과음 (Web Audio API로 직접 연주)

   음원 파일을 쓰지 않습니다. 이유:
     · 저작권 걱정이 없다 (전부 이 코드가 만들어 내는 소리)
     · 용량이 0KB — 단일 파일 크기가 그대로다
     · 상황(도시 / 들판 / 오염지대 / 사당 / 엔딩)에 따라 곡이 자연스럽게 바뀐다
   브라우저 정책상 소리는 "사용자가 무언가를 누른 뒤"에만 납니다.
   그래서 타이틀의 [모험 시작하기] 버튼에서 AUDIO.init() 을 부릅니다.
   ═══════════════════════════════════════════════════════════════ */
const AUDIO = (function(){

  const KEY = 'energyChronicleAudio';
  const S = { on:true, vol:0.18, sfx:true };          // 기본: 켜짐 · 아주 작게
  try{ Object.assign(S, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
  const save = ()=>{ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };

  let ctx=null, master=null, musicBus=null, sfxBus=null, wet=null, ready=false;
  let timer=0, beat=0, nextT=0, mood='field', moodGain=null, cur=null;

  const BPM = 72, SPB = 60/BPM;                       // 한 박 0.833초
  const AHEAD = 0.55, TICK = 120;                     // 미리 예약해 두는 시간
  const mtof = m => 440 * Math.pow(2, (m-69)/12);

  /* ── 화음 진행 ──
     밝은 쪽은 D장조(라이언 느낌의 열린 소리), 오염지대는 같은 조의 단화음으로
     자연스럽게 어두워지게 했다. 조를 바꾸지 않아 전환이 튀지 않는다. */
  const PROG = {
    field : [[62,66,69],[69,73,76],[71,74,78],[67,71,74]],   // D  A  Bm G
    city  : [[62,66,69],[67,71,74],[69,73,76],[62,66,69]],   // D  G  A  D
    tense : [[59,62,66],[67,71,74],[64,67,71],[69,72,76]],   // Bm G  Em Am
    shrine: [[62,69,74],[64,71,76],[62,69,74],[67,74,78]],   // 5도 위주 — 조용하고 비어 있게
    ending: [[62,66,69],[69,73,76],[67,71,74],[62,66,69]],
  };
  const PENTA = [62,64,66,69,71,74,76,78,81];         // D 장5음계

  const MOOD = {
    field :{pad:0.30, bell:0.42, bass:0.34, cut:1100, melody:0.45},
    city  :{pad:0.34, bell:0.46, bass:0.36, cut:1300, melody:0.50},
    tense :{pad:0.34, bell:0.20, bass:0.44, cut: 620, melody:0.22},
    shrine:{pad:0.22, bell:0.26, bass:0.18, cut: 800, melody:0.18},
    ending:{pad:0.40, bell:0.55, bass:0.38, cut:1500, melody:0.62},
  };

  /* ── 잔향 — 짧은 잡음 임펄스를 만들어 컨볼버에 넣는다 (파일 불필요) ── */
  function makeVerb(){
    const len = Math.floor(ctx.sampleRate*1.7), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for(let c=0;c<2;c++){
      const d = buf.getChannelData(c);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.6);
    }
    const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
  }

  function init(){
    if(ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;                                    // 지원 안 하면 조용히 넘어간다
    try{ ctx = new AC(); }catch(e){ return; }

    master = ctx.createGain();  master.gain.value = S.on ? S.vol : 0;
    master.connect(ctx.destination);

    const dry = ctx.createGain(); dry.gain.value = 0.78; dry.connect(master);
    wet = ctx.createGain();       wet.gain.value = 0.34;
    try{ const cv = makeVerb(); wet.connect(cv); cv.connect(master); }
    catch(e){ wet.connect(master); }                   // 컨볼버가 막히면 잔향 없이

    musicBus = ctx.createGain(); musicBus.gain.value = 1;
    sfxBus   = ctx.createGain(); sfxBus.gain.value   = 0.9;
    musicBus.connect(dry); musicBus.connect(wet);
    sfxBus.connect(dry);   sfxBus.connect(wet);

    moodGain = ctx.createGain(); moodGain.gain.value = 1; moodGain.connect(musicBus);

    ready = true;
    nextT = ctx.currentTime + 0.15; beat = 0;
    timer = setInterval(schedule, TICK);
    resume();
  }
  function resume(){ if(ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{}); }

  /* ── 소리 한 톨 ── */
  function tone(o){
    if(!ready) return;
    const t = o.t, dur = o.dur;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.value = o.f;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type='lowpass';
    f.frequency.value = o.cut || 2200; f.Q.value = o.q || 0.7;
    osc.connect(f); f.connect(g); g.connect(o.to || musicBus);

    const pk = o.g, at = o.at===undefined ? 0.02 : o.at, rl = o.rl===undefined ? dur*0.7 : o.rl;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(pk,0.0002), t+at);
    g.gain.exponentialRampToValueAtTime(0.0001, t+at+rl);
    if(o.det){ osc.detune.value = o.det; }
    osc.start(t); osc.stop(t+at+rl+0.05);
  }
  function noise(o){
    if(!ready) return;
    const len = Math.floor(ctx.sampleRate*o.dur), b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1-i/len);
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = o.type||'bandpass';
    f.frequency.value = o.f; f.Q.value = o.q||1.2;
    const g = ctx.createGain(); g.gain.value = o.g;
    src.connect(f); f.connect(g); g.connect(o.to || sfxBus);
    src.start(o.t); src.stop(o.t + o.dur + 0.02);
  }

  /* ── 한 박씩 예약 ── */
  function schedule(){
    if(!ready) return;
    while(nextT < ctx.currentTime + AHEAD){
      const M = MOOD[mood] || MOOD.field, P = PROG[mood] || PROG.field;
      const bar = Math.floor(beat/4) % 4, inBar = beat % 4;
      const ch = P[bar];

      if(inBar === 0){
        /* 패드 — 길게 눌러 두는 화음 */
        ch.forEach((n,i)=>tone({t:nextT, f:mtof(n), dur:SPB*4, g:M.pad*(i?0.55:0.75),
          type:'triangle', at:0.9, rl:SPB*3.4, cut:M.cut, to:moodGain}));
        /* 베이스 */
        tone({t:nextT, f:mtof(ch[0]-24), dur:SPB*2, g:M.bass,
          type:'sine', at:0.05, rl:SPB*1.8, cut:320, to:moodGain});
      }
      if(inBar === 2){
        tone({t:nextT, f:mtof(ch[0]-24), dur:SPB*1.6, g:M.bass*0.7,
          type:'sine', at:0.05, rl:SPB*1.4, cut:320, to:moodGain});
      }

      /* 멜로디 — 종소리. 가끔 쉬어서 반복처럼 들리지 않게 한다 */
      if(Math.random() < M.melody){
        const n = PENTA[(Math.random()*PENTA.length)|0] + (Math.random()<0.25 ? 12 : 0);
        const off = (Math.random()<0.3) ? SPB*0.5 : 0;
        tone({t:nextT+off, f:mtof(n), dur:SPB*1.2, g:M.bell,
          type:'triangle', at:0.008, rl:SPB*1.1, cut:M.cut+900, to:moodGain});
        tone({t:nextT+off, f:mtof(n+12), dur:SPB*0.7, g:M.bell*0.22,
          type:'sine', at:0.006, rl:SPB*0.6, cut:5000, to:moodGain});
      }

      nextT += SPB; beat++;
    }
  }

  /* ── 분위기 전환 (짧게 페이드) ── */
  function setMood(m){
    if(!ready || m === mood || !PROG[m]) return;
    mood = m;
    const t = ctx.currentTime;
    moodGain.gain.cancelScheduledValues(t);
    moodGain.gain.setValueAtTime(moodGain.gain.value, t);
    moodGain.gain.linearRampToValueAtTime(0.35, t+0.35);
    moodGain.gain.linearRampToValueAtTime(1.0,  t+1.5);
  }

  /* ── 효과음 ── */
  const SFX = {
    core:   t=>[62,69,74,81].forEach((n,i)=>tone({t:t+i*0.075, f:mtof(n), dur:0.5, g:0.28,
              type:'triangle', at:0.005, rl:0.45, cut:5200, to:sfxBus})),
    rune:   t=>{ [86,90,93].forEach((n,i)=>tone({t:t+i*0.05, f:mtof(n), dur:0.4, g:0.16,
              type:'sine', at:0.004, rl:0.38, cut:8000, to:sfxBus}));
              noise({t:t, dur:0.35, f:4200, g:0.05, q:2.2}); },
    step:   t=>tone({t:t, f:mtof(81), dur:0.3, g:0.17, type:'sine', at:0.004, rl:0.28, cut:6000, to:sfxBus}),
    right:  t=>[74,81].forEach((n,i)=>tone({t:t+i*0.10, f:mtof(n), dur:0.45, g:0.22,
              type:'triangle', at:0.005, rl:0.4, cut:5200, to:sfxBus})),
    wrong:  t=>tone({t:t, f:mtof(56), dur:0.28, g:0.16, type:'sine', at:0.006, rl:0.26, cut:900, to:sfxBus}),
    light:  t=>{ noise({t:t, dur:0.28, f:1800, g:0.09, q:0.9});
              tone({t:t, f:mtof(78), dur:0.25, g:0.10, type:'sine', at:0.004, rl:0.22, cut:4000, to:sfxBus}); },
    hurt:   t=>{ tone({t:t, f:mtof(45), dur:0.3, g:0.22, type:'sine', at:0.004, rl:0.28, cut:400, to:sfxBus});
              noise({t:t, dur:0.18, f:320, g:0.10, q:0.7}); },
    clear:  t=>[62,66,69,74,78].forEach((n,i)=>tone({t:t+i*0.09, f:mtof(n), dur:0.7, g:0.24,
              type:'triangle', at:0.006, rl:0.6, cut:5200, to:sfxBus})),
  };
  function sfx(name){
    if(!ready || !S.sfx || !S.on || !SFX[name]) return;
    resume(); SFX[name](ctx.currentTime + 0.005);
  }

  /* ── 켜기/끄기·음량 ── */
  function apply(){
    if(!master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(S.on ? S.vol : 0, t+0.25);
  }
  function toggle(){ S.on = !S.on; save(); if(S.on) { init(); resume(); } apply(); return S.on; }
  function setVol(v){ S.vol = Math.max(0, Math.min(0.6, v)); S.on = S.vol > 0; save(); apply(); }

  /* 바깥에서 소리를 재거나 시각화할 수 있도록 열어 둔다 */
  return { init, resume, setMood, sfx, toggle, setVol,
           get ctx(){ return ctx; }, get out(){ return master; }, get mood(){ return mood; },
           get on(){ return S.on; }, get vol(){ return S.vol; },
           get ready(){ return ready; } };
})();
