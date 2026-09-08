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
/* 몬스터 밀도 — 학생 피로도 완화 (동시 스폰 상한 및 스폰 주기 쾌적화) */
function monLv(){ return { cap: LOWQ ? 5 : 7, every: 1.8 }; }
function setMonLevel(i){ STATE.monLevel=2; save(); }
const SAFE_R = 34;                       // 빛의 도시 안전지대

/* ── 오염 지대 (사당마다 하나, 사당을 깨우면 걷힌다) ── */
(function buildZones(){
  const ringMat = new THREE.MeshBasicMaterial({color:ART.smog.ring, transparent:true, opacity:0.55, depthWrite:false});
  const puffGeo = new THREE.IcosahedronGeometry(1,0);
  const puffMat = new THREE.MeshLambertMaterial({color:ART.smog.puff, transparent:true, opacity:0.72, flatShading:true, depthWrite:false});
  const PER = LOWQ?8:12;
  const puffs = new THREE.InstancedMesh(puffGeo, puffMat, SHRINES.length*PER);
  puffs.frustumCulled=false; scene.add(puffs);
  const D=new THREE.Object3D();
  SHRINES.forEach((s,zi)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(23,1.15,5,44), ringMat);
    ring.rotation.x=Math.PI/2; ring.position.set(s.x, s.gy+0.5, s.z); scene.add(ring);
    const list=[];
    for(let k=0;k<PER;k++) list.push({a:rnd()*6.283, rr:20.5+rnd()*4.5, h:1.0+rnd()*3.0, sc:0.45+rnd()*0.4, sp:0.10+rnd()*0.2});
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
  const bs = blobShadow(T.r*2.6); scene.add(bs); bs.visible=false;
  g.visible = false; scene.add(g);
  return {g, shadow:bs, body:built.body, wisp, type:T, alive:false, hp:0, ph:rnd()*6.28, die:0, vx:0, vz:0, stun:0};
}

(function initMon(){
  const N=LOWQ?10:15;
  const kinds=['smog','dust','co2'];
  for(let i=0;i<N;i++) MON.pool.push(makeMonster(kinds[i%3]));
  // 정화의 빛 (탄환) — 멀티샷을 위해 18개 생성
  const bg=new THREE.IcosahedronGeometry(0.42,0);
  for(let i=0;i<18;i++){
    const m=new THREE.Mesh(bg, new THREE.MeshBasicMaterial({color:0xfff0b0}));
    const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8,0), new THREE.MeshBasicMaterial({color:0xffe08a, transparent:true, opacity:0.35}));
    m.add(halo); m.visible=false; scene.add(m);
    MON.bolts.push({m, halo, on:false, tgt:null, life:0, isExplode:false, dmg:1});
  }
  // 정화하면 나오는 파편
  const dg=new THREE.IcosahedronGeometry(0.34,0);
  for(let i=0;i<14;i++){
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
/* 빛의 세기는 모은 코어에 비례 + 파편 교환소 업그레이드 */
const maxPlayerHp = ()=> 3 + (STATE.upgrades?.maxHp || 0);
const weaponLevel = ()=> (STATE.upgrades?.weaponLevel || 1);
const lightDmg   = ()=> 1 + Math.floor(coreCount()/4) + (STATE.upgrades?.lightPower || 0);
const lightRange = ()=> 18 + coreCount()*1.0;
const lightCool  = ()=>{
  const base = Math.max(0.22, 0.46 - coreCount()*0.02);
  return STATE.upgrades?.rapidFire ? base * 0.6 : base;
};

/* ── 발사 (무기 단계별 멀티샷 & 폭발포) ── */
let fireCD=0;
function firePurify(){
  AUDIO.sfx('light');
  if(fireCD>0 || STATE.mode!=='play' || !MON.ready) return;

  const wLv = weaponLevel();
  const maxTargets = wLv >= 3 ? 3 : (wLv === 2 ? 2 : 1);
  const isExplode = wLv >= 4;
  const range = lightRange();

  /* 주변 살아있는 적 탐색 (일반 몬스터 + 보스 통합) */
  const allTargets = [];
  for(const m of MON.pool){
    if(!m.alive || m.die>0) continue;
    const d = Math.hypot(m.g.position.x-P.pos.x, m.g.position.z-P.pos.z);
    if(d < range){ allTargets.push({ tgt:m, dist:d, pos:m.g.position, isBoss:false }); }
  }

  /* 보스 타겟 후보 추가 */
  if(typeof BOSS!=='undefined' && BOSS.alive && BOSS.die<=0){
    const db = Math.hypot(BOSS.g.position.x-P.pos.x, BOSS.g.position.z-P.pos.z);
    if(db < range + 14){
      // 핵이 열려 있으면 우선 순위를 높이기 위해 가중 거리 -8m 적용
      const effDist = BOSS.open ? Math.max(0, db - 8) : db + 8;
      allTargets.push({ tgt:{g:BOSS.g, alive:true, die:0, __boss:true}, dist:effDist, rawDist:db, pos:BOSS.g.position, isBoss:true });
    }
  }

  /* 거리순(플레이어에게 가장 가까운 위험 대상 우선) 정렬 */
  allTargets.sort((a,b)=> a.dist - b.dist);

  const fireList = [];
  if(allTargets.length > 0){
    for(let k=0; k<maxTargets; k++){
      fireList.push(allTargets[k % allTargets.length]);
    }
  }

  if(fireList.length === 0){
    fireCD = 0.16;
    return;
  }

  /* 첫 번째 타겟 방향으로 캐릭터 회전 */
  const p0 = fireList[0].pos;
  P.yaw = Math.atan2(p0.x-P.pos.x, p0.z-P.pos.z);

  /* 볼트 발사 */
  fireList.forEach((it, idx)=>{
    const b = MON.bolts.find(o=>!o.on);
    if(!b) return;
    b.on = true;
    b.tgt = it.tgt;
    b.life = 1.6;
    b.isExplode = isExplode;
    b.dmg = lightDmg();
    b.m.visible = true;

    /* 무기 레벨별 크기 & 색상 연출 */
    const sc = wLv >= 4 ? 1.5 : (wLv >= 3 ? 1.25 : (wLv === 2 ? 1.12 : 1.0));
    b.m.scale.setScalar(sc);
    const col = wLv >= 4 ? 0xffb732 : (wLv >= 3 ? 0x4fe6ff : (wLv === 2 ? 0xfff0b0 : 0xfff0b0));
    b.m.material.color.setHex(col);

    const off = (idx - (fireList.length - 1)/2) * 0.42;
    const sx = P.pos.x + Math.sin(P.yaw + off + Math.PI/2)*0.45;
    const sz = P.pos.z + Math.cos(P.yaw + off + Math.PI/2)*0.45;
    b.m.position.set(sx, P.pos.y + 1.9, sz);
  });

  fireCD = lightCool();
}

function explodePurify(pos, dmg){
  AUDIO.sfx('core');
  for(const m of MON.pool){
    if(!m.alive || m.die>0) continue;
    const d = Math.hypot(m.g.position.x - pos.x, m.g.position.z - pos.z);
    if(d <= 6.5){
      hitMonster(m, Math.max(1, Math.floor(dmg * 0.85)));
    }
  }
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

  /* 스폰 — 사당 오염 지대 + 이동 경로/필드 전역 스폰 */
  MON.spawnT-=dt;
  if(MON.spawnT<=0){
    const LV=monLv();
    MON.spawnT=LV.every;
    const cap=Math.min(LV.cap, LOWQ?6:9);
    const live=MON.pool.filter(m=>m.alive).length;
    if(live<cap){
      const near=MON.zones.filter(zn=>zoneAlive(zn) && Math.hypot(P.pos.x-zn.s.x,P.pos.z-zn.s.z)<65);
      let spawnCenter = null;
      if(near.length && rnd()<0.6){
        const zn=near[(rnd()*near.length)|0];
        spawnCenter = { x:zn.s.x, z:zn.s.z, rMin:5, rMax:20 };
      } else {
        // 사당 사이 길목 및 들판: 플레이어 주변 반경 18~36m
        spawnCenter = { x:P.pos.x, z:P.pos.z, rMin:18, rMax:36 };
      }
      for(let tryN=0; tryN<10; tryN++){
        const a=rnd()*6.283, rr=spawnCenter.rMin + rnd()*(spawnCenter.rMax-spawnCenter.rMin);
        const x=spawnCenter.x+Math.cos(a)*rr, z=spawnCenter.z+Math.sin(a)*rr;
        const dp=Math.hypot(x-P.pos.x, z-P.pos.z);
        if(dp<16||dp>42) continue;
        if(Math.hypot(x,z)<SAFE_R) continue;
        const y=hAt(x,z); if(y<1.2) continue;
        const m=MON.pool.find(o=>!o.alive); if(!m) break;
        m.alive=true; m.die=0; m.hp=m.type.hp; m.g.visible=true; m.shadow.visible=true;
        m.g.position.set(x, y+m.type.r+0.5, z);
        m.g.scale.setScalar(1); m.body.material.opacity=0.94;
        break;
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
      if(m.die<=0){ m.alive=false; m.g.visible=false; m.shadow.visible=false; }
      continue;
    }
    const dx=P.pos.x-p.x, dz=P.pos.z-p.z, d=Math.hypot(dx,dz);
    // 도시 안전지대·먼 거리면 소멸
    if(Math.hypot(p.x,p.z)<SAFE_R-2 || d>58){ m.alive=false; m.g.visible=false; m.shadow.visible=false; continue; }

    /* 피격 스턴 중이면 이동 멈춤 & 스케일 복원 */
    if(m.stun>0){
      m.stun -= dt;
      m.g.scale.lerp(new THREE.Vector3(1,1,1), dt*12);
    } else {
      m.g.scale.lerp(new THREE.Vector3(1,1,1), dt*12);
      const spd=m.type.spd*(d<26?1:0.55);
      const wob = m.type.key==='dust' ? Math.sin(t*7+m.ph)*0.55 : 0;
      if(d>0.5){
        p.x += (dx/d)*spd*dt - (dz/d)*wob*dt*spd;
        p.z += (dz/d)*spd*dt + (dx/d)*wob*dt*spd;
      }
    }
    const gy=hAt(p.x,p.z)+m.type.r+0.5;
    p.y = lerp(p.y, gy + (m.type.key==='co2'?1.4:0) + Math.abs(Math.sin(t*3+m.ph))*0.45, 0.16);
    const sy=hAt(p.x,p.z);
    m.shadow.position.set(p.x, sy+0.06, p.z);
    const lift=Math.max(0, p.y-sy);
    m.shadow.material.opacity = clamp(0.9 - lift*0.09, 0.18, 0.9);
    m.g.rotation.y = Math.atan2(dx,dz);
    m.body.rotation.x += dt*0.6; m.body.rotation.z += dt*0.4;
    m.wisp.forEach((w,i)=>{
      const a=t*1.6+i*2.1+m.ph, rr=m.type.r*1.5;
      w.position.set(Math.cos(a)*rr, Math.sin(a*1.3)*m.type.r*0.6, Math.sin(a)*rr);
    });
    /* 접촉 피해 — 닿는 순간 즉각 판정 */
    if(!inv && d < m.type.r+0.95 && Math.abs(p.y-P.pos.y)<3.2){ hurtPlayer(m); }
  }

  /* 빛 탄환 */
  for(const b of MON.bolts){
    if(!b.on) continue;
    b.life-=dt;
    const tg=b.tgt;
    if(!tg || !tg.alive || tg.die>0 || b.life<=0){ b.on=false; b.m.visible=false; continue; }
    const tp=tg.g.position, bp=b.m.position;
    const dx=tp.x-bp.x, dy=tp.y-bp.y, dz=tp.z-bp.z, d=Math.hypot(dx,dy,dz);
    const step=36*dt;
    if(d<=step+0.6){
      if(tg.__boss) hitBoss(b.dmg);
      else {
        hitMonster(tg, b.dmg);
        if(b.isExplode){
          explodePurify(tp, b.dmg);
        }
      }
      b.on=false; b.m.visible=false; continue;
    }
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
  const bossOn = (typeof BOSS!=='undefined' && BOSS.alive && BOSS.die<=0);
  const mHp = maxPlayerHp();
  if(!bossOn && Math.hypot(P.pos.x,P.pos.z)<SAFE_R && STATE.hp<mHp){
    STATE.heal=(STATE.heal||0)+dt;
    if(STATE.heal>4){ STATE.heal=0; STATE.hp++; refreshHud(); toast('💚','빛의 도시에서 기운을 되찾았다',1800); }
  } else STATE.heal=0;

  if(STATE.inv>0) {
    STATE.inv-=dt;
    player.g.visible = (Math.floor(STATE.inv*12)%2===0);
    if(STATE.inv<=0) player.g.visible=true;
  }
}

function hitMonster(m, customDmg){
  const dmg = customDmg !== undefined ? customDmg : lightDmg();
  m.hp -= dmg;
  AUDIO.sfx('spark');   // 즉각적인 명쾌한 타격음
  // 몬스터 즉시 피격 넉백 & 스턴 & 찌그러짐
  const dx=m.g.position.x-P.pos.x, dz=m.g.position.z-P.pos.z, d=Math.hypot(dx,dz)||1;
  m.g.position.x += dx/d*1.8;
  m.g.position.z += dz/d*1.8;
  m.stun = 0.25;
  m.g.scale.set(1.35, 0.7, 1.35);
  if(typeof triggerCamShake==='function') triggerCamShake(0.12);
  m.body.material.color.setHex(0xffffff);
  setTimeout(()=>{ if(m.body) m.body.material.color.setHex(m.type.col); }, 80);
  if(m.hp<=0){
    m.die=0.45;
    if(!MON.seen[m.type.key]){ MON.seen[m.type.key]=true;
      toast('🌀','<b>'+m.type.name+'</b> 정화! '+m.type.fact, 5200); }
    if(rnd()<0.5){
      const dp=MON.drops.find(d=>!d.on);
      if(dp){ dp.on=true; dp.t=0; dp.m.visible=true; dp.m.position.copy(m.g.position); }
    }
  }
}
function hurtPlayer(m){
  if(STATE.inv > 0) return;
  // 상점, 지식 도감 창이 열려 있거나 대화 중일 때는 안전 보호 (피격 무효화)
  const shopOn = $('#sparkShop') && $('#sparkShop').classList.contains('on');
  const archOn = $('#archive') && $('#archive').classList.contains('on');
  if(shopOn || archOn || STATE.mode !== 'play') return;

  AUDIO.sfx('hurt');
  STATE.hp--; STATE.inv=1.8; refreshHud();
  const pos = (m && m.g && m.g.position) ? m.g.position : (m && m.position ? m.position : (m && m.x !== undefined ? m : P.pos));
  const dx=P.pos.x-pos.x, dz=P.pos.z-pos.z, d=Math.hypot(dx,dz)||1;
  // 플레이어 즉각 넉백
  P.pos.x += dx/d*2.8; P.pos.z += dz/d*2.8; P.vy=4.6; P.onGround=false;

  // 섬 경계선(바다) 밖으로 튕겨 나가지 않도록 안전 클램핑
  const pDist = Math.hypot(P.pos.x, P.pos.z);
  const maxSafeR = (typeof WALK_R !== 'undefined' ? WALK_R : 148) - 1.5;
  if(pDist > maxSafeR){
    P.pos.x = (P.pos.x / pDist) * maxSafeR;
    P.pos.z = (P.pos.z / pDist) * maxSafeR;
  }
  // 일반 몬스터인 경우에만 반대 방향 즉각 넉백 + 스턴 적용 (보스나 투사체는 g.scale이 없으므로 예외 방지)
  if(m && m.g && m.g.position && m.g.scale && typeof m.stun !== 'undefined'){
    m.g.position.x -= dx/d*3.2;
    m.g.position.z -= dz/d*3.2;
    m.stun = 0.45;
    m.g.scale.set(1.4, 0.6, 1.4);
  }
  // 즉각적인 카메라 쉐이크
  if(typeof triggerCamShake==='function') triggerCamShake(0.38);
  const f=$('#hurt'); if(f){ f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  if(STATE.hp<=0) downPlayer();
}
function downPlayer(){
  STATE.hp=maxPlayerHp(); STATE.inv=2.4; refreshHud();
  P.pos.set(0, hAt(0,7), 7); P.vy=0; CAM.tYaw=0;
  if(typeof player !== 'undefined' && player && player.g){
    player.g.position.copy(P.pos);
    player.g.visible = true;
  }
  if(MON && MON.pool){
    MON.pool.forEach(m=>{ m.alive=false; if(m.g) m.g.visible=false; if(m.shadow) m.shadow.visible=false; });
  }
  if(typeof BOSS!=='undefined' && BOSS.alive){
    BOSS.hp = BOSS.maxHp;
    if(BOSS.at && BOSS.g){
      BOSS.g.position.set(BOSS.at.x, BOSS.gy || hAt(BOSS.at.x, BOSS.at.z), BOSS.at.z);
    }
    if(typeof clearBossHazard === 'function') clearBossHazard();
    if(typeof bossBar==='function') bossBar(true);
  }
  const f=$('#downFlash'); if(f){ f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  toast('🌫️','오염에 쓰러져 빛의 도시에서 깨어났다 — 진행 상황은 그대로입니다', 4200);
  if(typeof AUDIO !== 'undefined' && AUDIO.ready){
    AUDIO.setMood('city');
  }
}
