/* ═══════════════════════════════════════════════════
   monsters.js — 오염 지대 · 오염 몬스터 · 정화의 빛
   ═══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   오염 지대 · 오염 몬스터 · 정화의 빛
   ══════════════════════════════════════════════════════════ */
const MTYPES = {
  smog:{ key:'smog', name:'매연 슬라임', hp:2, spd:3.5, r:1.5, col:0x5f646d,
         fact:'석탄·석유를 태울 때 나오는 <b>매연과 미세먼지</b> 덩어리입니다.' },
  dust:{ key:'dust', name:'미세먼지 무리', hp:1, spd:5.4, r:1.2, col:0xa2937c,
         fact:'입자가 아주 작아 폐 깊숙이 들어가는 <b>초미세먼지</b>입니다.' },
  co2 :{ key:'co2',  name:'이산화탄소 유령', hp:3, spd:2.7, r:1.9, col:0x8073a0,
         fact:'지구를 데우는 대표 <b>온실가스</b>. 눈에 보이지 않아 더 위험합니다.' },
};
const MON = { pool:[], bolts:[], drops:[], zones:[], seen:{}, spawnT:0, ready:false };
/* 몬스터 밀도 — 0 없음 · 1 적게(기본) · 2 보통 */
const MON_LEVELS = [
  {name:'없음',  cap:0, every:99, desc:'몬스터가 나오지 않습니다. 사당 학습에만 집중할 때.'},
  {name:'적게',  cap:3, every:2.6, desc:'가끔 한두 마리. 수업 중 이동이 편합니다. (기본)'},
  {name:'보통',  cap:6, every:1.2, desc:'꾸준히 나타납니다. 자유 탐험·과제용.'},
];
function monLv(){ return MON_LEVELS[STATE.monLevel!==undefined?STATE.monLevel:1]; }
function setMonLevel(i){
  STATE.monLevel=i; save();
  if(i===0) MON.pool.forEach(m=>{ m.alive=false; m.g.visible=false; });
  MON.spawnT=1.2;
  document.querySelectorAll('#monLv .chip').forEach((c,k)=>c.classList.toggle('sel',k===i));
  const d=$('#monLvDesc'); if(d) d.textContent=MON_LEVELS[i].desc;
}
const SAFE_R = 24;                       // 빛의 도시 안전지대

/* ── 오염 지대 (사당마다 하나, 사당을 깨우면 걷힌다) ── */
(function buildZones(){
  const ringMat = new THREE.MeshBasicMaterial({color:ART.smog.ring, transparent:true, opacity:0.55, depthWrite:false});
  const puffGeo = new THREE.IcosahedronGeometry(1,0);
  const puffMat = new THREE.MeshLambertMaterial({color:ART.smog.puff, transparent:true, opacity:0.72, flatShading:true, depthWrite:false});
  const PER = LOWQ?18:34;
  const puffs = new THREE.InstancedMesh(puffGeo, puffMat, SHRINES.length*PER);
  puffs.frustumCulled=false; scene.add(puffs);
  const D=new THREE.Object3D();
  SHRINES.forEach((s,zi)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(23,1.15,5,44), ringMat);
    ring.rotation.x=Math.PI/2; ring.position.set(s.x, s.gy+0.5, s.z); scene.add(ring);
    const list=[];
    for(let k=0;k<PER;k++) list.push({a:rnd()*6.283, rr:4+rnd()*18, h:1.0+rnd()*6.0, sc:0.45+rnd()*0.75, sp:0.10+rnd()*0.26});
    MON.zones.push({ s, ring, list, base:zi*PER, fade:1 });
  });
  MON.puffs=puffs; MON.PER=PER; MON.D=D;
})();

/* ── 몬스터 모델 ── */
function makeMonster(type){
  const T = MTYPES[type];
  const built = makeMonsterBody(T.key, T.r, T.col);
  const g = built.g;
  const wisp = [];
  for(let i=0;i<3;i++){
    const w = new THREE.Mesh(new THREE.IcosahedronGeometry(T.r*0.4, 0),
      new THREE.MeshLambertMaterial({color:T.col, flatShading:true, transparent:true, opacity:0.45, depthWrite:false}));
    g.add(w); wisp.push(w);
  }
  g.visible = false; scene.add(g);
  return {g, body:built.body, wisp, type:T, alive:false, hp:0, ph:rnd()*6.28, die:0, vx:0, vz:0};
}

(function initMon(){
  const N=LOWQ?6:8;
  const kinds=['smog','dust','co2'];
  for(let i=0;i<N;i++) MON.pool.push(makeMonster(kinds[i%3]));
  // 정화의 빛 (탄환)
  const bg=new THREE.IcosahedronGeometry(0.42,0);
  for(let i=0;i<7;i++){
    const m=new THREE.Mesh(bg, new THREE.MeshBasicMaterial({color:0xfff0b0}));
    const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8,0), new THREE.MeshBasicMaterial({color:0xffe08a, transparent:true, opacity:0.35}));
    m.add(halo); m.visible=false; scene.add(m);
    MON.bolts.push({m, on:false, tgt:null, life:0});
  }
  // 정화하면 나오는 파편
  const dg=new THREE.IcosahedronGeometry(0.34,0);
  for(let i=0;i<10;i++){
    const m=new THREE.Mesh(dg, new THREE.MeshBasicMaterial({color:0xffd75e}));
    m.visible=false; scene.add(m);
    MON.drops.push({m, on:false, t:0});
  }
  MON.ready=true;
})();

const zoneAlive = z => !STATE.cores[z.s.id];
function inPollution(x,z){
  for(const zn of MON.zones){ if(zoneAlive(zn) && Math.hypot(x-zn.s.x, z-zn.s.z)<23) return zn; }
  return null;
}
/* 빛의 세기는 모은 코어에 비례 */
const lightDmg   = ()=> 1 + Math.floor(coreCount()/4);
const lightRange = ()=> 15 + coreCount()*0.9;
const lightCool  = ()=> Math.max(0.28, 0.52 - coreCount()*0.022);

/* ── 발사 ── */
let fireCD=0;
function firePurify(){
  if(fireCD>0 || STATE.mode!=='play' || !MON.ready) return;
  let best=null, bd=lightRange();
  for(const m of MON.pool){
    if(!m.alive||m.die>0) continue;
    const d=Math.hypot(m.g.position.x-P.pos.x, m.g.position.z-P.pos.z);
    if(d<bd){ bd=d; best=m; }
  }
  if(!best){ fireCD=0.18; return; }
  const b=MON.bolts.find(b=>!b.on); if(!b) return;
  b.on=true; b.tgt=best; b.life=1.4;
  b.m.visible=true; b.m.position.set(P.pos.x, P.pos.y+2.0, P.pos.z);
  fireCD=lightCool();
  P.yaw = Math.atan2(best.g.position.x-P.pos.x, best.g.position.z-P.pos.z);
}

/* ── 매 프레임 ── */
function updateMonsters(dt, t){
  if(!MON.ready) return;
  fireCD=Math.max(0, fireCD-dt);

  /* 오염 지대 연출 */
  const D=MON.D;
  MON.zones.forEach(zn=>{
    const want = zoneAlive(zn)?1:0;
    zn.fade = lerp(zn.fade, want, dt*1.6);
    zn.ring.material.opacity = 0.55*zn.fade;
    zn.ring.visible = zn.fade>0.02;
    zn.list.forEach((p,k)=>{
      p.a += p.sp*dt;
      const x=zn.s.x+Math.cos(p.a)*p.rr, z=zn.s.z+Math.sin(p.a)*p.rr;
      D.position.set(x, zn.s.gy+p.h+Math.sin(t*0.7+p.a*3)*0.7, z);
      D.rotation.set(p.a*1.7, p.a, 0);
      D.scale.setScalar(p.sc*zn.fade);
      D.updateMatrix(); MON.puffs.setMatrixAt(zn.base+k, D.matrix);
    });
  });
  MON.puffs.instanceMatrix.needsUpdate=true;

  if(STATE.mode!=='play') return;

  /* 스폰 */
  MON.spawnT-=dt;
  if(MON.spawnT<=0){
    const LV=monLv();
    MON.spawnT=LV.every;
    const cap=Math.min(LV.cap, LOWQ?4:6);
    const live=MON.pool.filter(m=>m.alive).length;
    if(live<cap){
      const near=MON.zones.filter(zn=>zoneAlive(zn) && Math.hypot(P.pos.x-zn.s.x,P.pos.z-zn.s.z)<62);
      if(near.length){
        const zn=near[(rnd()*near.length)|0];
        for(let tryN=0; tryN<8; tryN++){
          const a=rnd()*6.283, rr=6+rnd()*17;
          const x=zn.s.x+Math.cos(a)*rr, z=zn.s.z+Math.sin(a)*rr;
          const dp=Math.hypot(x-P.pos.x, z-P.pos.z);
          if(dp<19||dp>40) continue;
          if(Math.hypot(x,z)<SAFE_R) continue;
          const y=hAt(x,z); if(y<1.2) continue;
          const m=MON.pool.find(o=>!o.alive); if(!m) break;
          m.alive=true; m.die=0; m.hp=m.type.hp; m.g.visible=true;
          m.g.position.set(x, y+m.type.r+0.5, z);
          m.g.scale.setScalar(1); m.body.material.opacity=0.94;
          break;
        }
      }
    }
  }

  /* 몬스터 이동 */
  const inv = STATE.inv>0;
  for(const m of MON.pool){
    if(!m.alive) continue;
    const p=m.g.position;
    if(m.die>0){                       // 정화 연출
      m.die-=dt;
      const k=clamp(m.die/0.45,0,1);
      m.g.scale.setScalar(k*1.25);
      m.body.material.opacity=0.94*k;
      p.y += dt*2.2;
      if(m.die<=0){ m.alive=false; m.g.visible=false; }
      continue;
    }
    const dx=P.pos.x-p.x, dz=P.pos.z-p.z, d=Math.hypot(dx,dz);
    // 도시 안전지대·먼 거리면 소멸
    if(Math.hypot(p.x,p.z)<SAFE_R-2 || d>58){ m.alive=false; m.g.visible=false; continue; }
    const spd=m.type.spd*(d<26?1:0.55);
    const wob = m.type.key==='dust' ? Math.sin(t*7+m.ph)*0.55 : 0;
    if(d>0.5){
      p.x += (dx/d)*spd*dt - (dz/d)*wob*dt*spd;
      p.z += (dz/d)*spd*dt + (dx/d)*wob*dt*spd;
    }
    const gy=hAt(p.x,p.z)+m.type.r+0.5;
    p.y = lerp(p.y, gy + (m.type.key==='co2'?1.4:0) + Math.abs(Math.sin(t*3+m.ph))*0.45, 0.16);
    m.g.rotation.y = Math.atan2(dx,dz);
    m.body.rotation.x += dt*0.6; m.body.rotation.z += dt*0.4;
    m.wisp.forEach((w,i)=>{
      const a=t*1.6+i*2.1+m.ph, rr=m.type.r*1.5;
      w.position.set(Math.cos(a)*rr, Math.sin(a*1.3)*m.type.r*0.6, Math.sin(a)*rr);
    });
    /* 접촉 피해 */
    if(!inv && d < m.type.r+1.25 && Math.abs(p.y-P.pos.y)<4){ hurtPlayer(m); }
  }

  /* 빛 탄환 */
  for(const b of MON.bolts){
    if(!b.on) continue;
    b.life-=dt;
    const tg=b.tgt;
    if(!tg || !tg.alive || tg.die>0 || b.life<=0){ b.on=false; b.m.visible=false; continue; }
    const tp=tg.g.position, bp=b.m.position;
    const dx=tp.x-bp.x, dy=tp.y-bp.y, dz=tp.z-bp.z, d=Math.hypot(dx,dy,dz);
    const step=34*dt;
    if(d<=step+0.6){ hitMonster(tg); b.on=false; b.m.visible=false; continue; }
    bp.x+=dx/d*step; bp.y+=dy/d*step; bp.z+=dz/d*step;
  }

  /* 파편 회수 연출 */
  for(const dp of MON.drops){
    if(!dp.on) continue;
    dp.t+=dt;
    const p=dp.m.position;
    p.x=lerp(p.x,P.pos.x,dt*4.4); p.y=lerp(p.y,P.pos.y+1.8,dt*4.4); p.z=lerp(p.z,P.pos.z,dt*4.4);
    dp.m.rotation.y+=dt*6;
    if(dp.t>0.75){ dp.on=false; dp.m.visible=false; STATE.sparks++; save(); refreshHud(); }
  }

  /* 안전지대 회복 */
  if(Math.hypot(P.pos.x,P.pos.z)<SAFE_R && STATE.hp<3){
    STATE.heal=(STATE.heal||0)+dt;
    if(STATE.heal>4){ STATE.heal=0; STATE.hp++; refreshHud(); toast('💚','빛의 도시에서 기운을 되찾았다',1800); }
  } else STATE.heal=0;

  if(STATE.inv>0) {
    STATE.inv-=dt;
    player.g.visible = (Math.floor(STATE.inv*12)%2===0);
    if(STATE.inv<=0) player.g.visible=true;
  }
}

function hitMonster(m){
  m.hp -= lightDmg();
  m.body.material.color.setHex(0xffffff);
  setTimeout(()=>{ if(m.body) m.body.material.color.setHex(m.type.col); }, 90);
  if(m.hp<=0){
    m.die=0.45;
    if(!MON.seen[m.type.key]){ MON.seen[m.type.key]=true;
      toast('🌀','<b>'+m.type.name+'</b> 정화! '+m.type.fact, 5200); }
    if(rnd()<0.45){
      const dp=MON.drops.find(d=>!d.on);
      if(dp){ dp.on=true; dp.t=0; dp.m.visible=true; dp.m.position.copy(m.g.position); }
    }
  }
}
function hurtPlayer(m){
  STATE.hp--; STATE.inv=1.8; refreshHud();
  const dx=P.pos.x-m.g.position.x, dz=P.pos.z-m.g.position.z, d=Math.hypot(dx,dz)||1;
  P.pos.x += dx/d*2.6; P.pos.z += dz/d*2.6; P.vy=4.2; P.onGround=false;
  const f=$('#hurt'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  if(STATE.hp<=0) downPlayer();
}
function downPlayer(){
  STATE.hp=3; STATE.inv=2.4; refreshHud();
  P.pos.set(0, hAt(0,7), 7); P.vy=0; CAM.tYaw=0;
  MON.pool.forEach(m=>{ m.alive=false; m.g.visible=false; });
  const f=$('#downFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  toast('🌫️','오염에 쓰러져 빛의 도시에서 깨어났다 — 진행 상황은 그대로입니다', 4200);
}
