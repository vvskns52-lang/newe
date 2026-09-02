/* ═══════════════════════════════════════════════════
   puzzles.js — 사당별 미니 시뮬레이션 10종
   ═══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   사당별 시련 (미니 시뮬레이션)
   ══════════════════════════════════════════════════════════ */
const PUZ_HINT={
  pv:'출력 = 햇빛 세기(%) × 모듈 수 × 60W. 300W를 만들려면 예를 들어 <b>모듈 5장 · 세기 100%</b>. 마지막 단계는 세기를 <b>0%</b>로 내려 보세요 — 그것이 태양광의 약점(밤)입니다.',
  st:'각도를 <b>M1 ≈ 45°, M2 ≈ 42°, M3 ≈ 36°</b> 근처로 맞추면 초록 광선이 수신기에 명중합니다. 명중하면 광선이 굵은 초록으로 변해요.',
  wind:'3m/s 시동 → 12m/s 정격(최대) → 25m/s 정지. <b>슬라이더를 12~24 사이</b>에 두면 정격 2.0MW, <b>25 이상</b>으로 올리면 비상 제동이 걸립니다.',
  hyd:'낮(밝은 하늘)에는 <b>수문 개도</b>를 올려 발전하고, 밤(어두운 하늘)에는 <b>양수 펌프</b>를 켜서 물을 다시 퍼올리세요. 수위가 0이 되지 않게!',
  geo:'100m 내려갈 때마다 약 3℃ 상승 → 4km면 약 135℃. 그런데 <b>3.2~4.2km 사이</b>에 뜨거운 물이 고인 <b>열수 대수층</b>이 숨어 있습니다.',
  oce:'수문을 <b>닫고</b> 기다리면 바다와 저수지의 수위차가 벌어집니다. 차이가 <b>3m 이상</b>일 때 수문을 열면 발전 성공!',
  bio:'액체=바이오에탄올(옥수수·사탕수수), 기체=바이오가스(가축분뇨·음식물쓰레기), 고체=목재펠릿(톱밥·나뭇조각).',
  wst:'쓰레기를 넣어 온도를 올리고 <b>공기 공급</b>으로 미세 조절하세요. 850℃ 아래로 내려가면 다이옥신이 생깁니다. 필터 3종도 잊지 마세요.',
  h2:'물 분자 2개를 쪼개면 수소 분자 2개와 산소 분자 1개 → <b>2H₂O → 2H₂ + O₂</b>. 전기는 태양광·풍력으로!',
  fc:'수소 : 산소 = <b>2 : 1</b>. 예를 들어 수소 80, 산소 40으로 맞추면 반응이 가장 잘 일어납니다.',
};
const PUZZLES={};

/* ───────── ☀️ 태양광 ───────── */
PUZZLES.pv=api=>{
  api.mission('빛이 전기가 되는 광전효과를 조작해 목표 출력을 만들어라.',
    ['전구 점등 — 출력 100W 이상','목표 출력 300W (±20W) 맞추기','햇빛 세기 0%에서 출력 확인하기']);
  const st={I:60,M:2,ph:[]};
  api.slider('☀️ 햇빛 세기',0,100,1,60,v=>v+' %',v=>st.I=v);
  api.slider('🔲 태양전지 모듈 수',1,8,1,2,v=>v+' 장',v=>st.M=v);
  const upd=api.stats([{k:'출력',v:'0 W'},{k:'전자 흐름',v:'0'},{k:'목표',v:'300 W'}]);
  api.note('셀 → 모듈 → 어레이. 셀 1장은 작지만 모듈로 묶고 어레이로 모으면 큰 전력이 됩니다. 모듈 1장 = 최대 60W로 계산합니다.');
  for(let i=0;i<90;i++) st.ph.push({x:Math.random()*960,y:Math.random()*400,s:0.6+Math.random()});
  return {draw(g,t,dt){
    const P=st.I/100*st.M*60;
    upd([P.toFixed(0)+' W', (st.I/100*st.M*12).toFixed(0)+' e⁻/s', '300 W']);
    if(P>=100) api.step(0);
    if(Math.abs(P-300)<=20) api.step(1);
    if(api.has(0)&&st.I===0) api.step(2);
    const day=st.I/100;
    const c1=`rgb(${Math.round(18+day*90)},${Math.round(34+day*130)},${Math.round(62+day*110)})`;
    const c2=`rgb(${Math.round(12+day*120)},${Math.round(22+day*110)},${Math.round(40+day*60)})`;
    bgGrid(g,c1,c2);
    // 태양 / 달
    g.save();
    if(day>0.05){ g.globalAlpha=0.25+day*0.75; g.fillStyle='#ffd764'; g.beginPath(); g.arc(120,90,44,0,6.283); g.fill();
      g.globalAlpha=0.16*day; g.beginPath(); g.arc(120,90,76,0,6.283); g.fill(); }
    else { g.fillStyle='#cfd8e6'; g.beginPath(); g.arc(120,90,30,0,6.283); g.fill();
      g.fillStyle='#0d1626'; g.beginPath(); g.arc(104,80,26,0,6.283); g.fill();
      TX(g,'밤 — 태양광 발전 정지',120,180,17,'#9fb6cd','center'); }
    g.restore();
    // 광자
    g.strokeStyle='rgba(255,214,102,.85)'; g.lineWidth=3; g.lineCap='round';
    const nP=Math.round(st.I*0.85);
    for(let i=0;i<nP;i++){
      const p=st.ph[i%st.ph.length];
      const y=(p.y + t*190*p.s)%430;
      const x=(p.x+ y*0.36)%860+40;
      if(x>250&&x<250+st.M*70 && y>330) continue;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x-9,y-16); g.stroke();
    }
    // 패널
    for(let m=0;m<st.M;m++){
      const px=250+m*70;
      g.save(); g.translate(px,392); g.rotate(-0.32);
      rr(g,-32,-9,64,18,4); g.fillStyle='#22406e'; g.fill(); g.strokeStyle='#7ea8dd'; g.lineWidth=2; g.stroke();
      for(let c=0;c<4;c++){ rr(g,-29+c*15,-6,12,12,2); g.fillStyle='rgba(126,168,221,'+(0.35+day*0.5)+')'; g.fill(); }
      g.restore();
      g.strokeStyle='#8a7f6a'; g.lineWidth=4; g.beginPath(); g.moveTo(px,398); g.lineTo(px,430); g.stroke();
    }
    TX(g,'태양전지 어레이 ('+st.M+'모듈)',250+st.M*35-70,470,15,'#9fb6cd');
    // 회로
    const wire=[[250+st.M*70-30,392],[700,392],[700,240],[790,240]];
    g.strokeStyle='#ffe08a'; g.lineWidth=4; g.beginPath(); g.moveTo(wire[0][0],wire[0][1]);
    for(let i=1;i<wire.length;i++) g.lineTo(wire[i][0],wire[i][1]); g.stroke();
    // 전자
    const eN=Math.round(day*st.M*3);
    for(let i=0;i<eN;i++){
      const f=((t*0.42+i/eN)%1);
      let d=f*(Math.abs(700-(250+st.M*70-30))+152+90), x,y;
      const L1=Math.abs(700-(250+st.M*70-30)), L2=152;
      if(d<L1){ x=(250+st.M*70-30)+d; y=392; }
      else if(d<L1+L2){ x=700; y=392-(d-L1); }
      else { x=700+(d-L1-L2); y=240; }
      g.fillStyle='#9fe8ff'; g.beginPath(); g.arc(x,y,5,0,6.283); g.fill();
    }
    // 가로등
    g.strokeStyle='#b9c6d4'; g.lineWidth=8; g.beginPath(); g.moveTo(830,470); g.lineTo(830,250); g.stroke();
    const lit=clamp(P/300,0,1.2);
    g.save(); g.globalAlpha=0.18*lit; g.fillStyle='#ffd764'; g.beginPath(); g.arc(830,235,90,0,6.283); g.fill(); g.restore();
    g.fillStyle = P>=100? 'rgb(255,'+Math.round(200+lit*40)+',120)' : '#2f3d4f';
    g.beginPath(); g.arc(830,235,22,0,6.283); g.fill();
    g.strokeStyle='#b9c6d4'; g.lineWidth=3; g.stroke();
    // 출력 게이지
    rr(g,600,60,320,110,16); g.fillStyle='rgba(10,20,34,.72)'; g.fill();
    TX(g,'발전 출력',620,92,15,'#9fb6cd');
    NUM(g,P.toFixed(0)+' W',900,100,34, P>=100?'#ffd764':'#6d7f92','right');
    gauge(g,620,120,280,14,P/480,'#f6b93b');
    g.strokeStyle='#7ae0a8'; g.lineWidth=2;
    const gx=620+280*(300/480); g.beginPath(); g.moveTo(gx,114); g.lineTo(gx,140); g.stroke();
    TX(g,'목표 300W',gx,158,12,'#7ae0a8','center');
    TX(g,'광전효과: 빛(광자)이 반도체를 때리면 전자가 튀어나와 회로를 흐른다',30,516,15,'rgba(255,255,255,.5)');
  }};
};

/* ───────── 🔥 태양열 ───────── */
PUZZLES.st=api=>{
  api.mission('반사경으로 햇빛을 모아 물을 끓이고 증기 터빈을 돌려라.',
    ['반사경 3개 모두 집열탑에 명중시키기','물을 100℃ 이상 끓이기','150℃ 이상 3초 유지해 터빈 가동']);
  const MX=[190,330,470], REC={x:770,y:170};
  const st={a:[0,0,0],T:20,hold:0};
  MX.forEach((mx,i)=>api.slider('🪞 반사경 '+(i+1)+' 각도',-60,60,1,0,v=>v+'°',v=>st.a[i]=v));
  const upd=api.stats([{k:'명중',v:'0 / 3'},{k:'물 온도',v:'20 ℃'},{k:'터빈',v:'정지'}]);
  api.note('태양열은 빛을 <b>열</b>로 바꿉니다. 모은 열로 물을 끓여 온수·난방에 쓰거나, 증기로 터빈을 돌려 발전합니다.');
  const SUN={x:-0.40,y:0.916};
  return {draw(g,t,dt){
    bgGrid(g,'#20304d','#0d1626');
    g.save(); g.globalAlpha=0.9; g.fillStyle='#ffd764'; g.beginPath(); g.arc(880,70,40,0,6.283); g.fill(); g.restore();
    // 햇빛
    g.strokeStyle='rgba(255,220,120,.35)'; g.lineWidth=2;
    for(let i=0;i<26;i++){ const x0=300+i*28, y0=0; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0-460*0.44,460); g.stroke(); }
    // 지면
    g.fillStyle='#1c2b42'; g.fillRect(0,430,960,110);
    let hits=0;
    MX.forEach((mx,i)=>{
      const th=st.a[i]*Math.PI/180;
      const nx=Math.sin(th), ny=-Math.cos(th);
      const dp=SUN.x*nx+SUN.y*ny;
      const rx=SUN.x-2*dp*nx, ry=SUN.y-2*dp*ny;
      // 광선
      const ox=mx, oy=430;
      let hit=false, best=1e9;
      for(let s=0;s<900;s+=6){
        const px=ox+rx*s, py=oy+ry*s;
        const d=Math.hypot(px-REC.x,py-REC.y); if(d<best) best=d;
        if(px<0||px>960||py<0||py>540) break;
      }
      hit = best<48; if(hit) hits++;
      g.strokeStyle= hit? 'rgba(126,224,168,.95)':'rgba(255,255,255,.25)';
      g.lineWidth= hit?4:2;
      g.beginPath(); g.moveTo(ox,oy); g.lineTo(ox+rx*900, oy+ry*900); g.stroke();
      // 반사경
      g.save(); g.translate(mx,430); g.rotate(th);
      rr(g,-42,-6,84,12,5); g.fillStyle='#dfeaf5'; g.fill(); g.strokeStyle='#8fa9c2'; g.lineWidth=2; g.stroke();
      g.restore();
      g.strokeStyle='#6d7f92'; g.lineWidth=5; g.beginPath(); g.moveTo(mx,432); g.lineTo(mx,470); g.stroke();
      TX(g,'M'+(i+1),mx,492,14,hit?'#7ae0a8':'#6d7f92','center');
    });
    // 타워
    g.fillStyle='#c7bda8'; g.fillRect(REC.x-16,REC.y,32,262);
    g.save(); g.globalAlpha=0.16+hits*0.2; g.fillStyle='#ffd764'; g.beginPath(); g.arc(REC.x,REC.y,58,0,6.283); g.fill(); g.restore();
    g.fillStyle= hits>0? '#ffd764':'#6d7f92'; g.beginPath(); g.arc(REC.x,REC.y,20,0,6.283); g.fill();
    TX(g,'집열탑 수신기',REC.x,REC.y-40,15,'#ffd764','center');
    // 열/온도
    st.T += (hits*16 - 6)*dt; st.T=clamp(st.T,20,340);
    if(hits===3) api.step(0);
    if(st.T>=100) api.step(1);
    if(st.T>=150){ st.hold+=dt; if(st.hold>=3) api.step(2); } else st.hold=Math.max(0,st.hold-dt*0.6);
    upd([hits+' / 3', st.T.toFixed(0)+' ℃', st.T>=150?'가동 중':'정지']);
    // 보일러 · 터빈
    rr(g,60,120,150,190,14); g.fillStyle='rgba(10,20,34,.75)'; g.fill();
    TX(g,'물 탱크',80,150,15,'#9fb6cd');
    const fill=clamp((st.T-20)/300,0,1);
    rr(g,80,170,110,120,8); g.fillStyle='rgba(255,255,255,.08)'; g.fill();
    rr(g,80,290-120*fill,110,120*fill,8);
    g.fillStyle= st.T>=100? '#ef7a5a':'#4ea3e0'; g.fill();
    NUM(g,st.T.toFixed(0)+'℃',135,240,26,'#fff','center');
    if(st.T>=100){ for(let i=0;i<6;i++){ const y=170-((t*40+i*20)%60);
      g.globalAlpha=0.5; g.fillStyle='#fff'; g.beginPath(); g.arc(100+i*16,y,7,0,6.283); g.fill(); g.globalAlpha=1; } }
    // 터빈
    g.save(); g.translate(135,390); g.rotate(st.T>=150? t*4:0);
    g.strokeStyle= st.T>=150? '#7ae0a8':'#4a5a6d'; g.lineWidth=6;
    for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(i*1.57)*34,Math.sin(i*1.57)*34); g.stroke(); }
    g.restore();
    TX(g,'증기 터빈',135,450,14, st.T>=150?'#7ae0a8':'#6d7f92','center');
    TX(g,'태양열 = 빛을 모아 열로! 100℃ 온수·난방 → 150℃ 이상 증기로 발전',30,516,15,'rgba(255,255,255,.5)');
  }};
};

/* ───────── 🌪️ 풍력 ───────── */
PUZZLES.wind=api=>{
  api.mission('풍속에 따라 달라지는 풍력 발전기의 작동 구간을 모두 체험하라.',
    ['시동 풍속을 넘겨 발전 시작 (출력 > 0)','정격 출력 2.0MW 달성','25m/s 이상 — 비상 제동 확인']);
  const st={v:0,rot:0,streak:[]};
  for(let i=0;i<70;i++) st.streak.push({x:Math.random()*960,y:60+Math.random()*420,l:20+Math.random()*60,s:0.5+Math.random()});
  api.slider('🌬️ 풍속',0,35,0.5,0,v=>v.toFixed(1)+' m/s',v=>st.v=v);
  const upd=api.stats([{k:'출력',v:'0.00 MW'},{k:'상태',v:'정지'},{k:'날개 rpm',v:'0'}]);
  api.note('시동 3m/s · 정격 12m/s · 정지(컷아웃) 25m/s. 바람이 2배면 에너지는 <b>8배</b>(속도의 세제곱)라서 정격 전까지 급격히 늘어납니다.');
  const out=v=> v<3?0 : v<12? 2.0*Math.pow((v-3)/9,3) : v<25? 2.0 : 0;
  return {draw(g,t,dt){
    const P=out(st.v);
    const state = st.v<3?'대기(시동 전)' : st.v<12?'가변속 발전' : st.v<25?'정격 발전':'⚠ 비상 제동';
    const rpm = st.v>=25?0 : P>0? 8+st.v*1.1 : 0;
    st.rot += rpm*dt*0.5;
    upd([P.toFixed(2)+' MW', state, rpm.toFixed(0)]);
    if(P>0) api.step(0);
    if(P>=1.99) api.step(1);
    if(st.v>=25) api.step(2);
    bgGrid(g, st.v>=25? '#3a2b3f':'#1b3350', '#0d1626');
    // 바람선
    g.lineCap='round';
    st.streak.forEach(s=>{
      s.x += (20+st.v*22)*dt*s.s; if(s.x>1000){ s.x=-80; s.y=60+Math.random()*420; }
      g.strokeStyle='rgba(160,220,255,'+(0.08+st.v*0.014)+')'; g.lineWidth=2;
      g.beginPath(); g.moveTo(s.x,s.y); g.lineTo(s.x-s.l*(0.4+st.v/35),s.y); g.stroke();
    });
    // 지면
    g.fillStyle='#1e3b2e'; g.beginPath(); g.moveTo(0,460); g.bezierCurveTo(240,440,600,480,960,450); g.lineTo(960,540); g.lineTo(0,540); g.fill();
    // 타워
    const TX0=330, TY=460;
    g.fillStyle='#e8e4d6'; g.beginPath(); g.moveTo(TX0-13,TY); g.lineTo(TX0+13,TY); g.lineTo(TX0+6,150); g.lineTo(TX0-6,150); g.fill();
    g.fillStyle='#d8d2c2'; rr(g,TX0-14,132,42,26,8); g.fill();
    // 날개
    g.save(); g.translate(TX0+24,145); g.rotate(st.rot);
    for(let i=0;i<3;i++){ g.save(); g.rotate(i*2.094);
      g.fillStyle= st.v>=25? '#e07a7a':'#ffffff';
      g.beginPath(); g.moveTo(-7,0); g.lineTo(7,0); g.lineTo(3,-125); g.lineTo(-2,-125); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle='#c9c2b0'; g.beginPath(); g.arc(0,0,12,0,6.283); g.fill(); g.restore();
    if(st.v>=25){
      g.save(); g.globalAlpha=0.55+Math.sin(t*8)*0.35; g.fillStyle='#ff6b6b';
      rr(g,TX0-96,196,200,44,12); g.fill(); g.restore();
      TX(g,'⚠ 비상 제동 작동',TX0+4,225,20,'#fff','center');
    }
    // 출력 곡선
    const GX=560,GY=120,GW=350,GH=230;
    rr(g,GX-20,GY-34,GW+50,GH+80,16); g.fillStyle='rgba(10,20,34,.72)'; g.fill();
    TX(g,'풍속 – 출력 곡선',GX,GY-10,16,'#9fb6cd');
    g.strokeStyle='rgba(255,255,255,.2)'; g.lineWidth=1.5;
    g.beginPath(); g.moveTo(GX,GY); g.lineTo(GX,GY+GH); g.lineTo(GX+GW,GY+GH); g.stroke();
    g.strokeStyle='#5ad3c4'; g.lineWidth=3.5; g.beginPath();
    for(let i=0;i<=140;i++){ const v=i/4, p=out(v), x=GX+ (v/35)*GW, y=GY+GH-(p/2.2)*GH;
      i?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke();
    [[3,'시동'],[12,'정격'],[25,'정지']].forEach(([v,l])=>{
      const x=GX+(v/35)*GW;
      g.strokeStyle='rgba(255,255,255,.22)'; g.setLineDash([4,5]); g.lineWidth=1.5;
      g.beginPath(); g.moveTo(x,GY); g.lineTo(x,GY+GH); g.stroke(); g.setLineDash([]);
      TX(g,l+' '+v,x,GY+GH+22,12,'#8fa9c2','center');
    });
    const mx=GX+(st.v/35)*GW, my=GY+GH-(P/2.2)*GH;
    g.fillStyle='#ffd764'; g.beginPath(); g.arc(mx,my,8,0,6.283); g.fill();
    g.strokeStyle='#fff'; g.lineWidth=2.5; g.stroke();
    NUM(g,P.toFixed(2)+' MW',GX+GW,GY+22,26, P>0?'#ffd764':'#6d7f92','right');
    TX(g,'풍속 '+st.v.toFixed(1)+' m/s · '+state,30,516,15,'rgba(255,255,255,.55)');
  }};
};

/* ───────── 💧 수력 ───────── */
PUZZLES.hyd=api=>{
  api.mission('낮에는 방류해 발전하고, 밤에는 남는 전기로 물을 퍼올려라 (양수발전).',
    ['낮에 200MW 이상 발전하기','밤에 양수 펌프로 저수지 80% 이상 채우기','저수지를 마르지 않게 하루(1사이클) 버티기']);
  const st={gate:0,pump:false,level:52,cyc:0,dry:false,prevDay:true,rot:0,made:0};
  api.slider('🚪 수문 개도',0,100,1,0,v=>v+' %',v=>st.gate=v);
  let pumpBtn;
  pumpBtn=api.bigBtn('⚙️ 양수 펌프 켜기',b=>{ st.pump=!st.pump;
    b.innerHTML = st.pump? '⏹ 양수 펌프 끄기 (작동 중)':'⚙️ 양수 펌프 켜기'; b.classList.toggle('gold',!st.pump); });
  const upd=api.stats([{k:'발전 출력',v:'0 MW'},{k:'저수지',v:'52 %'},{k:'시간대',v:'낮'}]);
  api.note('낙차가 클수록(수위가 높을수록) 출력이 큽니다. 밤에 남는 전기로 물을 올려두는 <b>양수발전</b>은 거대한 물 배터리입니다.');
  return {draw(g,t,dt){
    const cyc=(t%30)/30, isDay = cyc<0.5;
    const flow = st.gate/100 * (st.level>1?1:0);
    const P = flow*300*(0.45+st.level/180);
    st.level -= flow*2.6*dt;
    if(st.pump) st.level += 5.0*dt;
    st.level=clamp(st.level,0,100);
    if(st.level<=0.5) st.dry=true;
    if(isDay && P>=200) api.step(0);
    if(!isDay && st.level>=80) api.step(1);
    if(st.prevDay && !isDay) st.prevDay=false;
    if(!st.prevDay && isDay){ st.prevDay=true; if(!st.dry && api.has(0)) api.step(2); st.dry=false; }
    st.rot += P*dt*0.02;
    upd([P.toFixed(0)+' MW', st.level.toFixed(0)+' %', isDay?'☀️ 낮':'🌙 밤']);
    // 배경
    const k=isDay?1:0;
    bgGrid(g, isDay?'#2a5c86':'#101d33', isDay?'#14263c':'#080f1c');
    g.save(); g.globalAlpha=0.9;
    if(isDay){ g.fillStyle='#ffd764'; g.beginPath(); g.arc(120,80,34,0,6.283); g.fill(); }
    else { g.fillStyle='#dfe8f5'; g.beginPath(); g.arc(120,80,26,0,6.283); g.fill();
           g.fillStyle='#101d33'; g.beginPath(); g.arc(106,70,22,0,6.283); g.fill(); }
    g.restore();
    // 산 · 댐
    g.fillStyle='#22364f'; g.beginPath(); g.moveTo(0,470); g.lineTo(0,200); g.lineTo(360,140); g.lineTo(430,300); g.lineTo(430,470); g.fill();
    // 저수지 물
    const wTop=300-(st.level/100)*150;
    g.fillStyle='rgba(78,163,224,.9)'; g.fillRect(40,wTop,390,300-wTop+0);
    g.fillStyle='rgba(150,215,255,.35)'; g.fillRect(40,wTop,390,6);
    // 댐 벽
    g.fillStyle='#cfc6b2'; g.beginPath(); g.moveTo(430,150); g.lineTo(470,150); g.lineTo(492,470); g.lineTo(430,470); g.fill();
    // 수문 · 낙수
    const gh=st.gate/100*54;
    g.fillStyle='#0d1626'; g.fillRect(438,300,44,60);
    g.fillStyle='#7f8fa6'; g.fillRect(438,300,44,60-gh);
    if(flow>0.02){
      g.fillStyle='rgba(159,216,245,.85)';
      for(let i=0;i<3;i++){ const off=(t*260*(1+i*0.2))%120;
        g.fillRect(452+i*8, 352+off*0.1, 10, 90); }
      g.fillRect(470,352,60,14);
    }
    // 발전소 · 터빈
    rr(g,500,360,150,100,10); g.fillStyle='#e0d3b6'; g.fill();
    g.save(); g.translate(575,410); g.rotate(st.rot);
    g.strokeStyle= P>10? '#5b9df9':'#4a5a6d'; g.lineWidth=7;
    for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(i*1.047)*30,Math.sin(i*1.047)*30); g.stroke(); }
    g.restore();
    TX(g,'수차·발전기',575,478,14,'#9fb6cd','center');
    // 하류
    g.fillStyle='rgba(78,163,224,.75)'; g.fillRect(490,455,470,85);
    // 양수 파이프
    g.strokeStyle= st.pump? '#7ae0a8':'rgba(255,255,255,.18)'; g.lineWidth=9;
    g.beginPath(); g.moveTo(660,455); g.lineTo(700,455); g.lineTo(700,250); g.lineTo(300,250); g.lineTo(300,wTop+10); g.stroke();
    if(st.pump){ for(let i=0;i<7;i++){ const f=((t*0.5+i/7)%1);
      let x,y; if(f<0.2){x=660+40*(f/0.2);y=455;} else if(f<0.55){x=700;y=455-205*((f-0.2)/0.35);} else {x=700-400*((f-0.55)/0.45);y=250;}
      g.fillStyle='#bdf5d8'; g.beginPath(); g.arc(x,y,5,0,6.283); g.fill(); } }
    TX(g, st.pump?'양수 펌프 작동 — 물을 위로!':'양수 펌프 정지', 700, 232, 14, st.pump?'#7ae0a8':'#6d7f92','center');
    // 계기
    rr(g,690,60,240,130,16); g.fillStyle='rgba(10,20,34,.75)'; g.fill();
    TX(g,'발전 출력',710,90,14,'#9fb6cd'); NUM(g,P.toFixed(0)+' MW',910,92,24,'#5b9df9','right');
    gauge(g,710,102,200,12,P/380,'#5b9df9');
    TX(g,'저수지 수위',710,146,14,'#9fb6cd'); NUM(g,st.level.toFixed(0)+' %',910,148,24, st.level<15?'#ff6b6b':'#7ae0a8','right');
    gauge(g,710,158,200,12,st.level/100, st.level<15?'#ff6b6b':'#7ae0a8');
    if(st.level<8){ TX(g,'⚠ 저수지가 마르고 있다!',830,220,17,'#ff6b6b','center'); }
    TX(g,(isDay?'☀️ 낮 — 전기 수요가 많다. 방류해서 발전!':'🌙 밤 — 남는 전기로 물을 퍼올릴 시간'),30,516,16,'rgba(255,255,255,.65)');
  }};
};

/* ───────── 🌋 지열 ───────── */
PUZZLES.geo=api=>{
  api.mission('땅속 열을 찾아 24시간 멈추지 않는 발전소를 세워라.',
    ['지하 온도 150℃ 이상까지 시추하기','열수 대수층(증기층) 찾아내기','24시간 관측 — 밤낮·날씨와 무관한 출력 확인']);
  const st={d:0,obs:0,observing:false,rot:0};
  api.slider('🛠️ 시추 깊이',0,5,0.1,0,v=>v.toFixed(1)+' km',v=>st.d=v);
  const upd=api.stats([{k:'지하 온도',v:'15 ℃'},{k:'증기',v:'없음'},{k:'출력',v:'0 MW'}]);
  let obsBtn=api.bigBtn('🕐 24시간 관측 시작',b=>{ if(st.observing)return;
    if(!inBand()){ b.innerHTML='먼저 증기층을 찾으세요'; setTimeout(()=>b.innerHTML='🕐 24시간 관측 시작',1400); return; }
    st.observing=true; st.obs=0; b.innerHTML='관측 중…'; b.disabled=true; });
  api.note('땅속은 100m마다 약 3℃씩 뜨거워집니다. 마그마가 데운 <b>열수 대수층</b>을 만나면 증기가 솟구쳐 터빈을 돌립니다.');
  const inBand=()=>st.d>=3.2&&st.d<=4.2;
  const temp=()=> 15+30*st.d + (inBand()? 90:0);
  const LAYERS=[['표토·자갈',0,0.4,'#6b5a44'],['퇴적암',0.4,1.6,'#7d6b52'],['화강암',1.6,3.2,'#5f6572'],
                ['열수 대수층',3.2,4.2,'#c96a55'],['마그마 접근층',4.2,5,'#8e3b2c']];
  return {draw(g,t,dt){
    const T=temp(), steam=inBand(), P=steam? 48+Math.sin(t)*0.6 : (T>=150? 12:0);
    if(T>=150) api.step(0);
    if(steam) api.step(1);
    if(st.observing){ st.obs+=dt; if(!steam){ st.observing=false; obsBtn.disabled=false; obsBtn.innerHTML='🕐 24시간 관측 시작'; }
      else if(st.obs>=8){ st.observing=false; obsBtn.innerHTML='✅ 관측 완료'; api.step(2); } }
    st.rot+=P*dt*0.04;
    upd([T.toFixed(0)+' ℃', steam?'분출 중':'없음', P.toFixed(0)+' MW']);
    bgGrid(g,'#20344e','#0d1626');
    // 지상
    const GY0=120;
    g.fillStyle='#1e3b2e'; g.fillRect(0,GY0,960,12);
    // 지층
    LAYERS.forEach(([n,a,b,c])=>{
      const y1=GY0+12+(a/5)*386, y2=GY0+12+(b/5)*386;
      g.fillStyle=c; g.fillRect(0,y1,960,y2-y1);
      g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(0,y1,960,2);
      TX(g,n,20,y1+24,14,'rgba(255,255,255,.72)');
      NUM(g,a.toFixed(1)+'–'+b.toFixed(1)+'km',250,y1+24,13,'rgba(255,255,255,.45)');
    });
    // 열수 반짝임
    if(true){ const y1=GY0+12+(3.2/5)*386, y2=GY0+12+(4.2/5)*386;
      for(let i=0;i<26;i++){ const x=(i*41+ (t*22)%41)%960;
        g.globalAlpha=0.35+0.3*Math.sin(t*2+i); g.fillStyle='#ffd0a8';
        g.beginPath(); g.arc(x, y1+18+((i*37)%(y2-y1-30)), 4,0,6.283); g.fill(); g.globalAlpha=1; } }
    // 시추공
    const dy=GY0+12+(st.d/5)*386;
    g.strokeStyle='#e8e0cb'; g.lineWidth=13; g.beginPath(); g.moveTo(480,GY0); g.lineTo(480,dy); g.stroke();
    g.fillStyle='#ffd764'; g.beginPath(); g.arc(480,dy,11,0,6.283); g.fill();
    NUM(g,st.d.toFixed(1)+'km / '+T.toFixed(0)+'℃',500,dy+6,17, steam?'#ffd0a8':'#dce8f5');
    // 지상 설비
    g.fillStyle='#e6dcc6'; rr(g,560,GY0-58,150,58,6); g.fill();
    g.fillStyle='#cfc6b2'; rr(g,368,GY0-92,64,92,8); g.fill();
    g.save(); g.translate(635,GY0-28); g.rotate(st.rot);
    g.strokeStyle=P>0?'#e8674f':'#4a5a6d'; g.lineWidth=6;
    for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(i*1.257)*22,Math.sin(i*1.257)*22); g.stroke(); }
    g.restore();
    TX(g,'증기 터빈',635,GY0-100,14,'#9fb6cd','center');
    if(steam){ for(let i=0;i<9;i++){ const y=GY0-92-((t*70+i*34)%200);
      g.globalAlpha=clamp((GY0-92-y)/200,0,1)*0.55; g.fillStyle='#fff';
      g.beginPath(); g.arc(400+Math.sin((y+i)*0.05)*16, y, 12+i*1.6,0,6.283); g.fill(); g.globalAlpha=1; } }
    // 온도계
    rr(g,780,150,150,330,14); g.fillStyle='rgba(10,20,34,.7)'; g.fill();
    TX(g,'지하 온도',800,180,14,'#9fb6cd');
    rr(g,812,196,26,244,13); g.fillStyle='rgba(255,255,255,.12)'; g.fill();
    const hh=clamp(T/300,0,1)*244;
    rr(g,812,440-hh,26,hh,13); g.fillStyle= T>=150?'#e8674f':'#5b9df9'; g.fill();
    NUM(g,T.toFixed(0)+'℃',855,320,22, T>=150?'#e8674f':'#9fb6cd');
    g.strokeStyle='#7ae0a8'; g.lineWidth=2; g.beginPath(); g.moveTo(806,440-244*(150/300)); g.lineTo(844,440-244*(150/300)); g.stroke();
    TX(g,'150℃',855,440-244*0.5+5,13,'#7ae0a8');
    // 관측
    if(st.observing||api.has(2)){
      rr(g,300,20,360,74,14); g.fillStyle='rgba(10,20,34,.8)'; g.fill();
      const hrs=Math.floor((st.observing? st.obs:8)/8*24);
      TX(g,'24시간 관측: '+String(hrs).padStart(2,'0')+':00',320,48,16,'#9fb6cd');
      const ic=['☀️','⛅','🌧️','🌙','❄️','☀️'];
      TX(g,ic[Math.floor(((st.observing?st.obs:8)/8)*6)%6]+'  날씨가 바뀌어도 출력 '+P.toFixed(0)+'MW 그대로!',320,78,15,'#7ae0a8');
    }
    TX(g,'지열은 날씨·밤낮과 무관하게 24시간 발전하는 유일한 재생에너지급 기저 전원',30,516,15,'rgba(255,255,255,.5)');
  }};
};

/* ───────── 🌊 해양 ───────── */
PUZZLES.oce=api=>{
  api.mission('밀물과 썰물의 수위차를 이용해 조력 발전을 성공시켜라.',
    ['수문을 닫고 기다려 수위차 만들기','수위차 3m 이상일 때 수문 열어 발전','발전 사이클 3회 성공']);
  const st={open:false, tide:0, basin:0, cycles:0, gen:0, armed:false, best:0, rot:0, hist:[]};
  let gb=api.bigBtn('🚪 수문 열기',b=>{
    st.open=!st.open;
    b.innerHTML = st.open? '🚪 수문 닫기 (열림)':'🚪 수문 열기';
    if(st.open){ st.armed = Math.abs(st.tide-st.basin)>=3.0; }
    else if(st.armed && Math.abs(st.tide-st.basin)<0.6){ st.cycles++; st.armed=false; }
  });
  const upd=api.stats([{k:'바다 수위',v:'0.0 m'},{k:'수위차',v:'0.0 m'},{k:'성공',v:'0 / 3'}]);
  api.note('조력(시화호)은 방조제로 수위차를 만들고, 조류(울돌목)는 댐 없이 빠른 물살을 씁니다. 파력(제주 용수리)은 파도로 공기를 밀어 터빈을 돌립니다.');
  return {draw(g,t,dt){
    st.tide = 4*Math.sin(t*0.55);
    if(st.open){ const d=st.tide-st.basin; st.basin += clamp(d,-1,1)*1.7*dt*Math.min(Math.abs(d),1.4);
      st.gen = Math.abs(d)*230; st.rot += st.gen*dt*0.02;
      if(st.armed && Math.abs(st.tide-st.basin)<0.6){ st.cycles++; st.armed=false; } }
    else st.gen = Math.max(0, st.gen-260*dt);
    const diff=Math.abs(st.tide-st.basin);
    if(!st.open && diff>=3.0) api.step(0);
    if(st.open && st.armed) api.step(1);
    if(st.cycles>=3) api.step(2);
    st.hist.push(st.tide); if(st.hist.length>300) st.hist.shift();
    upd([st.tide.toFixed(1)+' m', diff.toFixed(1)+' m', Math.min(st.cycles,3)+' / 3']);
    bgGrid(g,'#1b3f60','#0a1424');
    // 하늘/달
    g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(860,70,24,0,6.283); g.fill();
    g.fillStyle='#132a45'; g.beginPath(); g.arc(848,62,20,0,6.283); g.fill();
    const SEAY=380, SC=22;
    // 바다 (왼쪽)
    const sy=SEAY-st.tide*SC;
    g.fillStyle='rgba(83,182,224,.9)'; g.beginPath(); g.moveTo(0,sy);
    for(let x=0;x<=420;x+=12) g.lineTo(x, sy+Math.sin(x*0.05+t*2.2)*4);
    g.lineTo(420,540); g.lineTo(0,540); g.fill();
    TX(g,'바다 (밀물·썰물)',36,540-24,15,'rgba(255,255,255,.55)');
    // 저수지 (오른쪽)
    const by=SEAY-st.basin*SC;
    g.fillStyle='rgba(120,160,220,.9)'; g.beginPath(); g.moveTo(500,by);
    for(let x=500;x<=960;x+=12) g.lineTo(x, by+Math.sin(x*0.04+t*1.3)*2);
    g.lineTo(960,540); g.lineTo(500,540); g.fill();
    TX(g,'저수지 (방조제 안쪽)',700,540-24,15,'rgba(255,255,255,.55)');
    // 방조제
    g.fillStyle='#cfc6b2'; g.fillRect(420,220,80,320);
    g.fillStyle='#b3a892'; g.fillRect(420,220,80,14);
    // 수문
    g.fillStyle= st.open? '#0a1424':'#7f8fa6';
    g.fillRect(432,330,56,120);
    if(!st.open){ g.fillStyle='#9aaabf'; for(let i=0;i<4;i++) g.fillRect(436,336+i*30,48,22); }
    else {
      // 물 흐름
      const dir = Math.sign(st.tide-st.basin);
      for(let i=0;i<6;i++){ const f=((t*1.4+i/6)%1);
        const x = dir>0? 432+56*f : 488-56*f;
        g.fillStyle='rgba(200,240,255,.8)'; g.beginPath(); g.arc(x, 356+i*16, 6,0,6.283); g.fill(); }
    }
    // 터빈
    g.save(); g.translate(460,480); g.rotate(st.rot);
    g.strokeStyle= st.gen>10? '#8f7ef0':'#4a5a6d'; g.lineWidth=6;
    for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(i*1.047)*24,Math.sin(i*1.047)*24); g.stroke(); }
    g.restore();
    // 수위 표시선
    g.strokeStyle='rgba(255,255,255,.5)'; g.setLineDash([6,6]); g.lineWidth=2;
    g.beginPath(); g.moveTo(0,sy); g.lineTo(960,sy); g.stroke();
    g.beginPath(); g.moveTo(0,by); g.lineTo(960,by); g.stroke(); g.setLineDash([]);
    // 수위차 표시
    const mid=(sy+by)/2;
    g.strokeStyle= diff>=3? '#7ae0a8':'#ffd764'; g.lineWidth=4;
    g.beginPath(); g.moveTo(520,sy); g.lineTo(520,by); g.stroke();
    rr(g,536,mid-20,150,40,10); g.fillStyle='rgba(10,20,34,.8)'; g.fill();
    NUM(g,'Δ '+diff.toFixed(1)+' m',556,mid+8,22, diff>=3?'#7ae0a8':'#ffd764');
    // 조석 그래프
    rr(g,600,40,330,130,14); g.fillStyle='rgba(10,20,34,.75)'; g.fill();
    TX(g,'조석 곡선 (하루 두 번)',620,66,14,'#9fb6cd');
    g.strokeStyle='#8f7ef0'; g.lineWidth=2.5; g.beginPath();
    st.hist.forEach((v,i)=>{ const x=620+i*(290/300), y=120-v*11; i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
    NUM(g,st.gen.toFixed(0)+' MW',910,164,20, st.gen>10?'#8f7ef0':'#6d7f92','right');
    TX(g, st.open? '수문 열림 — 물이 흐르며 터빈이 돈다' : '수문 닫힘 — 수위차가 벌어지는 중',30,516,16,'rgba(255,255,255,.65)');
    if(st.armed) TX(g,'⚡ 발전 사이클 진행 중… 수위가 같아질 때까지 열어두세요',430,206,15,'#7ae0a8','center');
  }};
};

/* ───────── 🌽 바이오 ───────── */
PUZZLES.bio=api=>{
  api.mission('농장의 원료를 알맞은 바이오 연료로 바꾸고, 식량 문제까지 생각하라.',
    ['원료 6가지를 액체·기체·고체로 모두 분류','발효조를 가동해 전기 만들기','식량 vs 연료 — 지속가능한 선택 고르기']);
  const ITEMS=[{n:'옥수수',i:'🌽',t:0},{n:'사탕수수',i:'🎋',t:0},{n:'가축 분뇨',i:'🐄',t:1},
               {n:'음식물 쓰레기',i:'🍚',t:1},{n:'톱밥',i:'🪵',t:2},{n:'나뭇조각',i:'🌳',t:2}];
  const BINS=[{n:'바이오 에탄올',s:'액체',i:'🧪',c:'#f0c94a'},{n:'바이오 가스',s:'기체',i:'💨',c:'#8dc63f'},{n:'목재 펠릿',s:'고체',i:'🟫',c:'#c08457'}];
  const st={sel:-1, place:[-1,-1,-1,-1,-1,-1], run:0, bub:[], choice:-1};
  for(let i=0;i<24;i++) st.bub.push({x:Math.random(),y:Math.random(),s:0.4+Math.random()});
  const itemEls=api.buttons('① 원료를 고르세요', ITEMS.map(o=>o.i+' '+o.n), (i,b,els)=>{
    if(st.place[i]>=0) return; st.sel=i; els.forEach((e,k)=>e.classList.toggle('sel',k===i&&st.place[k]<0));
  });
  const binWrap=document.createElement('div'); binWrap.className='ctrl';
  binWrap.innerHTML='<label>② 알맞은 통에 넣기</label><div class="bins"></div>';
  $('#shCtrl').appendChild(binWrap);
  BINS.forEach((b,bi)=>{
    const d=document.createElement('div'); d.className='bin';
    d.innerHTML='<div class="bi">'+b.i+'</div><div class="bn">'+b.n+'</div><div class="bc">'+b.s+' 연료</div>';
    d.onclick=()=>{
      if(st.sel<0) return;
      const it=ITEMS[st.sel];
      if(it.t===bi){ st.place[st.sel]=bi; itemEls[st.sel].classList.remove('sel'); itemEls[st.sel].classList.add('ok');
        st.sel=-1; if(st.place.every(p=>p>=0)) api.step(0); }
      else { d.animate([{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],{duration:280});
        itemEls[st.sel].classList.add('no'); setTimeout(()=>itemEls[st.sel>=0?st.sel:0]&&itemEls.forEach(e=>e.classList.remove('no')),600); }
    };
    binWrap.querySelector('.bins').appendChild(d);
  });
  const runBtn=api.bigBtn('🫧 발효조 가동',b=>{
    if(!api.has(0)){ b.innerHTML='먼저 6가지를 모두 분류하세요'; setTimeout(()=>b.innerHTML='🫧 발효조 가동',1400); return; }
    st.run=0.001; b.disabled=true; b.innerHTML='발효 중… 메탄가스 생성';
  });
  let choiceMade=false;
  const chBox=document.createElement('div'); chBox.className='ctrl';
  chBox.innerHTML='<label>③ 마을 회의 — 어떤 길을 택할까?</label>';
  const chWrap=document.createElement('div'); chWrap.className='chips'; chWrap.style.flexDirection='column'; chBox.appendChild(chWrap);
  [['사람이 먹을 옥수수를 더 많이 연료로 돌린다',false],
   ['숲가꾸기 부산물·폐목재·음식물 쓰레기 활용을 늘린다',true],
   ['바이오 에너지를 전면 금지한다',false]].forEach(([txt,ok],i)=>{
    const b=document.createElement('button'); b.className='chip'; b.style.textAlign='left'; b.textContent=(i+1)+'. '+txt;
    b.onclick=()=>{ if(choiceMade)return;
      if(ok){ choiceMade=true; b.classList.add('ok'); st.choice=1;
        chBox.insertAdjacentHTML('beforeend','<div class="explain">사람의 <strong>식량</strong>과 다투지 않는 원료를 쓰는 것이 핵심입니다. 옥수수를 연료로 많이 돌리면 <strong>곡물값 폭등</strong>이 일어나고, 전면 금지는 탄소중립 자원을 버리는 셈이 됩니다.</div>');
        api.step(2); }
      else { b.classList.add('no'); }
    };
    chWrap.appendChild(b);
  });
  $('#shCtrl').appendChild(chBox);
  api.note('바이오 에너지는 액체·기체·고체 세 형태. 식물이 흡수한 CO₂만큼만 되돌려주어 <b>탄소중립</b>에 가깝지만, 식량과 경쟁하면 곡물값이 오릅니다.');
  return {draw(g,t,dt){
    if(st.run>0){ st.run+=dt; if(st.run>3) api.step(1); }
    bgGrid(g,'#243d24','#101c14');
    // 하늘·해
    g.fillStyle='#ffd764'; g.beginPath(); g.arc(870,66,32,0,6.283); g.fill();
    // 밭
    g.fillStyle='#3d5c2e'; g.fillRect(0,400,960,140);
    for(let i=0;i<14;i++){ g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(i*70,400,34,140); }
    for(let i=0;i<12;i++){ const x=30+i*54;
      g.strokeStyle='#7ab54a'; g.lineWidth=4; g.beginPath(); g.moveTo(x,470); g.lineTo(x,420); g.stroke();
      g.fillStyle='#f0d564'; g.beginPath(); g.ellipse(x,412,7,15,0,0,6.283); g.fill(); }
    // 축사
    g.fillStyle='#d9b98c'; rr(g,60,270,170,110,8); g.fill();
    g.fillStyle='#a8724a'; g.beginPath(); g.moveTo(50,272); g.lineTo(145,224); g.lineTo(240,272); g.fill();
    TX(g,'🐄 축사',145,340,22,'#5c4630','center');
    // 저장통 3개
    BINS.forEach((b,i)=>{
      const x=390+i*170, cnt=st.place.filter(p=>p===i).length;
      rr(g,x,180,130,190,14); g.fillStyle='rgba(10,20,34,.6)'; g.fill();
      g.strokeStyle=b.c; g.lineWidth=3; g.stroke();
      const h=(cnt/2)*150;
      rr(g,x+10,360-h,110,h,10); g.fillStyle=b.c; g.globalAlpha=0.75; g.fill(); g.globalAlpha=1;
      TX(g,b.i+' '+b.n,x+65,208,15,'#fff','center');
      TX(g,b.s+' 연료 · '+cnt+'/2',x+65,232,13,b.c,'center');
    });
    // 발효조
    if(st.run>0){
      g.save(); g.globalAlpha=0.9;
      st.bub.forEach((b,i)=>{
        const y=370-((t*90*b.s+i*40)%210);
        g.fillStyle='rgba(180,240,150,.7)'; g.beginPath(); g.arc(560+Math.sin(y*0.05+i)*40, y, 4+b.s*5,0,6.283); g.fill();
      });
      g.restore();
      TX(g,'미생물이 유기물을 분해 → 메탄가스(CH₄) 발생',560,140,16,'#8dc63f','center');
      rr(g,700,60,230,60,12); g.fillStyle='rgba(10,20,34,.8)'; g.fill();
      NUM(g,(st.run>3?'2.4':(st.run*0.8).toFixed(1))+' MW',815,102,26,'#8dc63f','center');
      TX(g,'바이오가스 발전',815,80,13,'#9fb6cd','center');
    }
    const done=st.place.filter(p=>p>=0).length;
    TX(g,'분류 완료 '+done+' / 6' + (st.choice===1?'   ·   지속가능한 원료 전환 선택 완료':''),30,516,16,'rgba(255,255,255,.65)');
  }};
};

/* ───────── ♻️ 폐기물 ───────── */
PUZZLES.wst=api=>{
  api.mission('쓰레기를 태워 전기와 온수를 얻되, 유해물질은 반드시 막아라.',
    ['소각로 온도를 850℃ 이상으로 올리기','850~1100℃ 안전 구간 8초 유지','정화장치 3종을 모두 가동해 다이옥신 제거']);
  const st={fuel:0,air:50,T:260,hold:0,f:[false,false,false],smoke:[]};
  for(let i=0;i<30;i++) st.smoke.push({p:Math.random(),x:Math.random()*30-15});
  api.bigBtn('🗑️ 쓰레기 투입 (+연료)',b=>{ st.fuel=Math.min(100,st.fuel+34); });
  api.slider('💨 공기 공급',0,100,1,50,v=>v+' %',v=>st.air=v);
  api.buttons('🧯 배기가스 정화장치',['집진기','촉매 필터','세정기'],(i,b)=>{
    st.f[i]=!st.f[i]; b.classList.toggle('ok',st.f[i]);
    if(st.f.every(Boolean)&&api.has(1)) api.step(2);
  });
  const upd=api.stats([{k:'소각 온도',v:'260 ℃'},{k:'연료',v:'0 %'},{k:'다이옥신',v:'위험'}]);
  api.note('850℃ 이상 고온에서 태워야 <b>다이옥신</b>이 분해됩니다. 여기에 집진기·촉매·세정기를 더해야 안전한 배기가스가 됩니다.');
  return {draw(g,t,dt){
    st.fuel=Math.max(0,st.fuel-5.5*dt);
    const target = 250 + st.fuel*7*(0.4+st.air/100*0.8);
    st.T += (target-st.T)*1.5*dt;
    const safe = st.T>=850&&st.T<=1100;
    if(st.T>=850) api.step(0);
    if(safe){ st.hold+=dt; if(st.hold>=8) api.step(1); } else st.hold=Math.max(0,st.hold-dt*1.4);
    const clean=st.f.every(Boolean);
    if(clean&&api.has(1)) api.step(2);
    upd([st.T.toFixed(0)+' ℃', st.fuel.toFixed(0)+' %', (st.T>=850&&clean)?'안전':'위험']);
    bgGrid(g,'#2b2438','#100d18');
    // 건물
    g.fillStyle='#dfd6c4'; rr(g,120,250,420,230,12); g.fill();
    g.fillStyle='#c9bfa9'; g.fillRect(120,250,420,16);
    // 소각로
    rr(g,180,300,180,150,10); g.fillStyle='#221a2c'; g.fill();
    const fl=clamp((st.T-250)/900,0,1);
    for(let i=0;i<12;i++){
      const h=(40+fl*90)*(0.6+0.4*Math.sin(t*7+i));
      g.fillStyle= safe? 'rgba(255,'+Math.round(140+80*Math.sin(t*6+i))+',60,.85)' : (st.T>1100? 'rgba(255,255,220,.9)':'rgba(255,'+Math.round(80+50*fl)+',40,.8)');
      g.beginPath(); g.moveTo(196+i*14,446); g.quadraticCurveTo(196+i*14-6,446-h*0.6, 196+i*14,446-h);
      g.quadraticCurveTo(196+i*14+6,446-h*0.6,196+i*14,446); g.fill();
    }
    TX(g,'소각로',270,478,15,'#9fb6cd','center');
    // 굴뚝
    g.fillStyle='#ece4d2'; g.fillRect(430,90,64,200);
    g.fillStyle='#c58bd6'; g.fillRect(430,120,64,16);
    // 필터 3단
    ['집진기','촉매','세정기'].forEach((n,i)=>{
      rr(g,412,160+i*40,100,30,6); g.fillStyle= st.f[i]? '#7ae0a8':'#4a4356'; g.fill();
      TX(g,n,462,180+i*40,13, st.f[i]?'#0d1626':'#9a92ad','center');
    });
    // 연기
    st.smoke.forEach((s,i)=>{
      s.p+=dt*0.22; if(s.p>1)s.p=0;
      const y=90-s.p*120, a=(1-s.p)*0.55;
      g.globalAlpha=a; g.fillStyle= clean? 'rgba(240,248,255,1)' : 'rgba(120,110,90,1)';
      g.beginPath(); g.arc(462+s.x+Math.sin(s.p*4+i)*18, y, 10+s.p*22,0,6.283); g.fill(); g.globalAlpha=1;
    });
    // 온도계
    rr(g,600,70,150,400,14); g.fillStyle='rgba(10,20,34,.72)'; g.fill();
    TX(g,'소각 온도',620,100,14,'#9fb6cd');
    rr(g,634,120,30,320,15); g.fillStyle='rgba(255,255,255,.1)'; g.fill();
    const th=clamp(st.T/1300,0,1)*320;
    rr(g,634,440-th,30,th,15); g.fillStyle= safe?'#7ae0a8':(st.T>1100?'#ffd764':'#ff6b6b'); g.fill();
    // 안전구간
    const y1=440-320*(1100/1300), y2=440-320*(850/1300);
    g.strokeStyle='rgba(126,224,168,.75)'; g.lineWidth=2; g.setLineDash([5,4]);
    g.beginPath(); g.moveTo(624,y1); g.lineTo(676,y1); g.moveTo(624,y2); g.lineTo(676,y2); g.stroke(); g.setLineDash([]);
    TX(g,'안전 850~1100℃',690,(y1+y2)/2,13,'#7ae0a8');
    NUM(g,st.T.toFixed(0)+'℃',675,470,24, safe?'#7ae0a8':'#ffd764');
    // 다이옥신 · 지역난방
    rr(g,780,70,150,150,14); g.fillStyle='rgba(10,20,34,.72)'; g.fill();
    TX(g,'다이옥신',800,100,14,'#9fb6cd');
    const dx = (st.T>=850?0.25:1) * (clean?0:1) + (st.T>=850&&clean?0:0);
    NUM(g, (st.T>=850&&clean)?'0 ng':'위험', 855,140,24, (st.T>=850&&clean)?'#7ae0a8':'#ff6b6b','center');
    TX(g, st.T>=850? '고온 분해 ✓':'850℃ 미만 ✗',855,168,13, st.T>=850?'#7ae0a8':'#ff6b6b','center');
    TX(g, clean? '필터 3종 ✓':'필터 '+st.f.filter(Boolean).length+'/3',855,190,13, clean?'#7ae0a8':'#ff6b6b','center');
    rr(g,780,240,150,120,14); g.fillStyle='rgba(10,20,34,.72)'; g.fill();
    TX(g,'지역난방 온수',800,270,14,'#9fb6cd');
    NUM(g,(st.T>500? (st.T/12).toFixed(0):'0')+'℃',855,312,24,'#c58bd6','center');
    TX(g,'안전 유지 '+st.hold.toFixed(1)+' / 8.0초',30,516,16, safe?'#7ae0a8':'rgba(255,255,255,.6)');
  }};
};

/* ───────── ⚛️ 수소 ───────── */
PUZZLES.h2=api=>{
  api.mission('물을 쪼개 수소를 얻고, 탄소 배출 없는 그린 수소를 만들어라.',
    ['전기분해 반응식의 계수 맞추기 (□H₂O → □H₂ + □O₂)','재생에너지 전기를 골라 그린 수소 만들기','저장 탱크 압력을 700기압에 맞추기']);
  const st={a:1,b:1,c:1,src:-1,pres:0,bub:[]};
  for(let i=0;i<40;i++) st.bub.push({x:Math.random(),y:Math.random(),s:0.5+Math.random()});
  api.slider('계수 ①  □H₂O',1,4,1,1,v=>v+'',v=>st.a=v);
  api.slider('계수 ②  □H₂',1,4,1,1,v=>v+'',v=>st.b=v);
  api.slider('계수 ③  □O₂',1,4,1,1,v=>v+'',v=>st.c=v);
  const SRC=[{n:'⚫ 석탄 화력',co2:820,t:'그레이 수소'},{n:'🔵 LNG + 포집',co2:180,t:'블루 수소'},{n:'🟢 태양광 + 풍력',co2:0,t:'그린 수소'}];
  api.buttons('⚡ 전기분해에 쓸 전력원',SRC.map(s=>s.n),(i,b,els)=>{
    st.src=i; els.forEach((e,k)=>{ e.classList.toggle('sel',k===i); });
    if(i===2 && api.has(0)) api.step(1);
  });
  api.slider('🛢️ 저장 탱크 압력',0,900,10,0,v=>v+' 기압',v=>st.pres=v);
  const upd=api.stats([{k:'반응식',v:'✗'},{k:'CO₂',v:'—'},{k:'압력',v:'0 기압'}]);
  api.note('물 분자 2개에는 수소 원자 4개·산소 원자 2개가 있습니다. 양쪽의 원자 수가 같아야 반응식이 성립합니다.');
  return {draw(g,t,dt){
    const ok = (st.a===2&&st.b===2&&st.c===1);
    if(ok) api.step(0);
    if(ok && st.src===2) api.step(1);
    if(Math.abs(st.pres-700)<=20 && api.has(1)) api.step(2);
    upd([ok?'✓ 균형':'✗ 불균형', st.src<0?'—':SRC[st.src].co2+' g/kWh', st.pres+' 기압']);
    bgGrid(g,'#123246','#08131f');
    // 전력원
    rr(g,40,40,250,120,14); g.fillStyle='rgba(10,20,34,.7)'; g.fill();
    TX(g,'전력원',60,70,14,'#9fb6cd');
    TX(g, st.src<0? '선택하세요' : SRC[st.src].n, 60,102,18, st.src===2?'#7ae0a8':(st.src<0?'#6d7f92':'#ffd764'));
    TX(g, st.src<0? '' : SRC[st.src].t+' · CO₂ '+SRC[st.src].co2+'g/kWh', 60,132,14, st.src===2?'#7ae0a8':'#ff9b8a');
    if(st.src>=0&&st.src<2){ for(let i=0;i<6;i++){ const y=40-((t*40+i*20)%60);
      g.globalAlpha=0.4; g.fillStyle='#8a8070'; g.beginPath(); g.arc(240+i*8,y+30,10,0,6.283); g.fill(); g.globalAlpha=1; } }
    // 전해조
    const TXc=480, TYc=300;
    rr(g,TXc-160,TYc-150,320,270,16); g.fillStyle='rgba(90,170,220,.22)'; g.fill();
    g.strokeStyle='#5ad3c4'; g.lineWidth=3; g.stroke();
    TX(g,'전해조 (물 + 전기)',TXc,TYc-166,16,'#9fb6cd','center');
    // 전극
    g.fillStyle='#cfd8e6'; g.fillRect(TXc-90,TYc-120,22,210); g.fillRect(TXc+68,TYc-120,22,210);
    TX(g,'(−) 수소 발생',TXc-79,TYc+118,13,'#4fd0e0','center');
    TX(g,'(+) 산소 발생',TXc+79,TYc+118,13,'#a8d8ff','center');
    // 기포 (계수 비율대로)
    st.bub.forEach((b,i)=>{
      const left = i%3!==2;              // 2:1 비율 느낌
      const rate = left? st.b : st.c;
      const y = TYc+80 - (((t*(50+rate*24)*b.s + i*30)%200));
      const x = left? TXc-79+Math.sin(y*0.06+i)*10 : TXc+79+Math.sin(y*0.06+i)*10;
      g.fillStyle= left? 'rgba(79,208,224,.85)':'rgba(168,216,255,.85)';
      g.beginPath(); g.arc(x,y,3+rate*1.4,0,6.283); g.fill();
    });
    // 반응식
    rr(g,300,430,600,74,14); g.fillStyle='rgba(10,20,34,.82)'; g.fill();
    g.font='800 34px Oxanium, sans-serif'; g.textAlign='center';
    g.fillStyle= ok? '#7ae0a8':'#ffd764';
    g.fillText(st.a+'H₂O  →  '+st.b+'H₂  +  '+st.c+'O₂', 600, 478);
    TX(g, ok? '✓ 양쪽 원자 수가 같습니다 (H 4개, O 2개)' : 'H: '+(st.a*2)+' vs '+(st.b*2)+'   ·   O: '+st.a+' vs '+(st.c*2),
       600, 452, 14, ok?'#7ae0a8':'#9fb6cd','center');
    // 저장 탱크
    rr(g,730,60,190,330,18); g.fillStyle='rgba(10,20,34,.7)'; g.fill();
    TX(g,'수소 저장 탱크',825,92,15,'#9fb6cd','center');
    const pOK=Math.abs(st.pres-700)<=20;
    g.save(); g.translate(825,235);
    g.beginPath(); g.arc(0,0,80,Math.PI*0.75,Math.PI*2.25); g.strokeStyle='rgba(255,255,255,.14)'; g.lineWidth=16; g.stroke();
    g.beginPath(); g.arc(0,0,80,Math.PI*0.75,Math.PI*0.75+Math.PI*1.5*(st.pres/900));
    g.strokeStyle= pOK? '#7ae0a8': (st.pres>780?'#ff6b6b':'#4fd0e0'); g.lineWidth=16; g.stroke();
    const ta=Math.PI*0.75+Math.PI*1.5*(700/900);
    g.strokeStyle='#ffd764'; g.lineWidth=4; g.beginPath();
    g.moveTo(Math.cos(ta)*64,Math.sin(ta)*64); g.lineTo(Math.cos(ta)*96,Math.sin(ta)*96); g.stroke();
    g.restore();
    NUM(g,st.pres+'',825,242,32, pOK?'#7ae0a8':'#dce8f5','center');
    TX(g,'기압 (목표 700)',825,268,13,'#9fb6cd','center');
    TX(g, pOK? '✓ 안전 저장 압력':'수소는 분자가 작아 잘 샙니다',825,330,13, pOK?'#7ae0a8':'#9fb6cd','center');
    TX(g,'2H₂O → 2H₂ + O₂   ·  재생에너지로 만든 수소 = 그린 수소',30,524,15,'rgba(255,255,255,.5)');
  }};
};

/* ───────── 🔋 연료전지 ───────── */
PUZZLES.fc=api=>{
  api.mission('수소와 산소를 알맞은 비율로 넣어 전기를 만들고, 배출물을 확인하라.',
    ['수소 : 산소 = 2 : 1 비율 맞추기','출력 5kW 이상을 6초 유지','배출된 물 500mL 모으기']);
  const st={H:0,O:0,hold:0,water:0,drops:[]};
  api.slider('🔵 수소(H₂) 공급',0,100,1,0,v=>v+' %',v=>st.H=v);
  api.slider('⚪ 산소(O₂) 공급',0,100,1,0,v=>v+' %',v=>st.O=v);
  const upd=api.stats([{k:'공급비',v:'—'},{k:'출력',v:'0.0 kW'},{k:'배출 물',v:'0 mL'}]);
  api.note('연료극(−)에서 수소가 전자를 내놓고, 공기극(+)에서 산소와 만나 물이 됩니다. 전자가 바깥 회로를 도는 것이 곧 전기입니다.');
  return {draw(g,t,dt){
    const r = st.O>0? st.H/st.O : 0;
    const eff = st.O>0&&st.H>0? Math.exp(-Math.pow(r-2,2)/0.35) : 0;
    const P = Math.min(st.H, st.O*2)/100*6.5*eff;
    const ratioOK = st.H>0&&st.O>0&&Math.abs(r-2)<0.12;
    if(ratioOK) api.step(0);
    if(P>=5){ st.hold+=dt; if(st.hold>=6) api.step(1); } else st.hold=Math.max(0,st.hold-dt);
    st.water += P*dt*26;
    if(st.water>=500) api.step(2);
    upd([st.O>0? r.toFixed(2)+' : 1':'—', P.toFixed(1)+' kW', st.water.toFixed(0)+' mL']);
    bgGrid(g,'#13303c','#08161d');
    const CX=430, CY=270;
    // 셀 본체
    rr(g,CX-200,CY-160,400,300,18); g.fillStyle='rgba(255,255,255,.05)'; g.fill();
    g.strokeStyle='#7ae0a8'; g.lineWidth=3; g.stroke();
    // 전극
    g.fillStyle='rgba(79,208,224,.28)'; g.fillRect(CX-190,CY-150,120,280);
    g.fillStyle='rgba(168,216,255,.28)'; g.fillRect(CX+70,CY-150,120,280);
    g.fillStyle='#cfd8e6'; g.fillRect(CX-16,CY-150,32,280);
    TX(g,'전해질막',CX,CY-162,13,'#9fb6cd','center');
    TX(g,'연료극 (−)  H₂',CX-130,CY-162,14,'#4fd0e0','center');
    TX(g,'공기극 (+)  O₂',CX+130,CY-162,14,'#a8d8ff','center');
    // H2 입력
    for(let i=0;i<Math.round(st.H/9);i++){
      const y=CY+120-(((t*70+i*33)%270));
      g.fillStyle='#4fd0e0'; g.beginPath(); g.arc(CX-150+Math.sin(y*0.05+i)*22, y, 6,0,6.283); g.fill();
    }
    for(let i=0;i<Math.round(st.O/9);i++){
      const y=CY+120-(((t*66+i*35)%270));
      g.fillStyle='#a8d8ff'; g.beginPath(); g.arc(CX+150+Math.sin(y*0.05+i)*22, y, 7,0,6.283); g.fill();
    }
    // H+ 막 통과
    for(let i=0;i<Math.round(eff*12);i++){
      const f=((t*0.8+i/12)%1);
      const x=CX-70+f*140;
      g.fillStyle='#ffd764'; g.beginPath(); g.arc(x, CY-60+((i*23)%180), 5,0,6.283); g.fill();
    }
    // 외부 회로 (전자)
    g.strokeStyle='#ffe08a'; g.lineWidth=4;
    g.beginPath(); g.moveTo(CX-130,CY-160); g.lineTo(CX-130,90); g.lineTo(CX+130,90); g.lineTo(CX+130,CY-160); g.stroke();
    for(let i=0;i<Math.round(P*2.5);i++){
      const f=((t*0.5+i/Math.max(1,Math.round(P*2.5)))%1);
      const L1=180, L2=260, L3=180, tot=L1+L2+L3; let d=f*tot,x,y;
      if(d<L1){x=CX-130;y=CY-160-d;} else if(d<L1+L2){x=CX-130+(d-L1);y=90;} else {x=CX+130;y=90+(d-L1-L2);}
      g.fillStyle='#9fe8ff'; g.beginPath(); g.arc(x,y,5,0,6.283); g.fill();
    }
    // 전구
    g.save(); g.globalAlpha=clamp(P/6,0,1)*0.3; g.fillStyle='#ffd764'; g.beginPath(); g.arc(CX,90,60,0,6.283); g.fill(); g.restore();
    g.fillStyle= P>1? 'rgb(255,'+Math.round(190+P*8)+',120)':'#3a4756'; g.beginPath(); g.arc(CX,90,22,0,6.283); g.fill();
    g.strokeStyle='#b9c6d4'; g.lineWidth=3; g.stroke();
    NUM(g,P.toFixed(1)+' kW',CX,50,24, P>=5?'#7ae0a8':'#9fb6cd','center');
    // 물 배출
    if(P>0.3){ if(Math.random()<0.35) st.drops.push({y:CY+140,x:CX+20+Math.random()*30});
      st.drops.forEach(d=>d.y+=240*dt); st.drops=st.drops.filter(d=>d.y<430); }
    st.drops.forEach(d=>{ g.fillStyle='#9fe8ff'; g.beginPath(); g.arc(d.x,d.y,5,0,6.283); g.fill(); });
    // 비커
    const bx=760, by=250;
    g.strokeStyle='#cfd8e6'; g.lineWidth=4;
    g.beginPath(); g.moveTo(bx,by); g.lineTo(bx,by+200); g.lineTo(bx+120,by+200); g.lineTo(bx+120,by); g.stroke();
    const wh=clamp(st.water/600,0,1)*190;
    g.fillStyle='rgba(120,200,240,.75)'; g.fillRect(bx+3,by+198-wh,114,wh);
    for(let i=1;i<=3;i++){ const y=by+200-190*(i*200/600);
      g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=1.5;
      g.beginPath(); g.moveTo(bx+80,y); g.lineTo(bx+120,y); g.stroke();
      TX(g,(i*200)+'mL',bx+128,y+5,12,'rgba(255,255,255,.5)'); }
    NUM(g,st.water.toFixed(0)+' mL',bx+60,by+240,22, st.water>=500?'#7ae0a8':'#9fe8ff','center');
    TX(g,'배출물 = 물!',bx+60,by-16,15,'#7ae0a8','center');
    // 비율 표시
    rr(g,40,60,240,110,14); g.fillStyle='rgba(10,20,34,.75)'; g.fill();
    TX(g,'공급 비율 (H₂ : O₂)',60,90,14,'#9fb6cd');
    NUM(g, st.O>0? r.toFixed(2)+' : 1' : '— : —', 60,132,30, ratioOK?'#7ae0a8':'#ffd764');
    TX(g, ratioOK? '✓ 완벽한 2 : 1' : '2 : 1 에 맞추세요', 60,158,14, ratioOK?'#7ae0a8':'#9fb6cd');
    g.font='800 26px Oxanium, sans-serif'; g.textAlign='center'; g.fillStyle='rgba(255,255,255,.85)';
    g.fillText('2H₂ + O₂ → 2H₂O + 전기', 480, 500);
    TX(g,'5kW 유지 '+st.hold.toFixed(1)+' / 6.0초',30,524,15, P>=5?'#7ae0a8':'rgba(255,255,255,.5)');
  }};
};
