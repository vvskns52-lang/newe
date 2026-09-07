/* ═══════════════════════════════════════════════════════════════
   boss.js — 스모그 타이탄 (코어 5개를 모으면 나타나는 보스)

   설계 의도
     · 화석연료 시대가 남긴 매연 덩어리라는 설정. 정화의 빛으로만 밀어낸다.
     · 가슴의 "핵"이 열렸을 때만 피해가 들어간다 — 아무 때나 난사하는 대신
       타이밍을 보게 만든다.
     · 피해량은 lightDmg() 를 그대로 쓴다. 코어가 많을수록 빨리 잡힌다는
       기존 원칙("재생에너지를 늘릴수록 오염이 밀려난다")을 그대로 잇는다.
     · 져도 잃는 것이 없다. 쓰러지면 도시에서 깨어나고 보스는 체력만 회복한다.
   ═══════════════════════════════════════════════════════════════ */
const BOSS = {
  at:{x:0, z:44},          // 도시 남쪽 어귀 — 광장에서 바로 보인다
  maxHp:30, hp:30,
  alive:false, phase:0, open:false, t:0, openT:0, die:0,
  g:null, core:null, body:null, arms:[], puffs:[], eyes:[],
};

(function buildBoss(){
  const g = new THREE.Group();
  const gy = hAt(BOSS.at.x, BOSS.at.z);
  g.position.set(BOSS.at.x, gy, BOSS.at.z);

  const smoke = c => new THREE.MeshLambertMaterial({
    color:c, flatShading:true, transparent:true, opacity:0.92 });

  /* 몸통 — 뭉게뭉게한 매연 덩어리 */
  const body = new THREE.Group(); body.position.y = 6.2; g.add(body);
  [[0,0,0,3.4],[2.2,1.4,0.4,2.4],[-2.4,1.0,-0.4,2.6],[0.6,2.8,0.2,2.2],[-1.2,-1.8,0.6,2.4],[1.6,-2.2,-0.5,2.0]]
    .forEach(([x,y,z,r],i)=>{
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r,0), smoke(i%2?0x4a4a55:0x3b3b45));
      m.position.set(x,y,z); body.add(m);
    });

  /* 눈 두 개 — 붉게 빛난다 */
  [-1.25, 1.25].forEach(x=>{
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 7),
      new THREE.MeshBasicMaterial({color:0xff6b4a}));
    e.position.set(x, 1.5, 2.9); body.add(e); BOSS.eyes.push(e);
  });

  /* 가슴의 핵 — 열렸을 때만 때릴 수 있다 */
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 0),
    new THREE.MeshBasicMaterial({color:0xffb347}));
  core.position.set(0, -0.4, 3.0); body.add(core);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 0),
    new THREE.MeshBasicMaterial({color:0x2c2c34, flatShading:true}));
  shell.position.copy(core.position); body.add(shell);

  /* 팔 */
  [-1,1].forEach(s=>{
    const a = new THREE.Group(); a.position.set(s*3.6, 0.6, 0); body.add(a);
    const up = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,0), smoke(0x44444f));
    up.position.set(s*1.2,-1.0,0); a.add(up);
    const lo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,0), smoke(0x3a3a44));
    lo.position.set(s*2.1,-2.6,0); a.add(lo);
    BOSS.arms.push({g:a, s});
  });

  /* 발밑 매연 웅덩이 */
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({color:0x2a2a33, transparent:true, opacity:0.4}));
  pool.rotation.x = -Math.PI/2; pool.position.y = 0.08; g.add(pool);

  /* 흩날리는 연기 */
  for(let i=0;i<7;i++){
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9+Math.random()*0.7, 0),
      new THREE.MeshBasicMaterial({color:0x55555f, transparent:true, opacity:0.35}));
    g.add(p); BOSS.puffs.push({m:p, a:Math.random()*6.283, r:5+Math.random()*4, y:2+Math.random()*8, sp:0.4+Math.random()*0.6});
  }

  g.visible = false; scene.add(g);
  Object.assign(BOSS, {g, body, core, shell, pool, gy});
})();

function bossBar(show){
  const el = $('#bossBar');
  if(!el) return;
  el.classList.toggle('on', !!show);
  if(show){
    $('#bossHp').style.width = Math.max(0, BOSS.hp/BOSS.maxHp*100)+'%';
    $('#bossPhase').textContent = BOSS.open ? '핵이 열렸다 — 지금이다!' : '연기에 싸여 있다 (빛이 통하지 않는다)';
    $('#bossBarWrap').classList.toggle('open', BOSS.open);
  }
}

function spawnBoss(){
  if(STATE.bossDone || BOSS.alive) return;
  BOSS.alive = true; BOSS.hp = BOSS.maxHp; BOSS.phase = 1;
  BOSS.open = false; BOSS.openT = 0; BOSS.t = 0; BOSS.die = 0;
  BOSS.g.position.set(BOSS.at.x, BOSS.gy, BOSS.at.z);
  BOSS.g.visible = true;
  bossBar(true);
  setQuest('도시를 덮친 스모그 타이탄',
    '화석연료 시대가 남긴 매연 덩어리가 <b>도시 남쪽 어귀</b>를 막아섰다. '+
    '가슴의 <b>핵이 열렸을 때</b>만 정화의 빛이 통한다. 열릴 때를 노려라!');
  toast('☠️','스모그 타이탄이 나타났다! 도시 남쪽으로!', 4600);
  AUDIO.setMood('tense');
}

function hitBoss(){
  if(!BOSS.alive || !BOSS.open || BOSS.die>0) return;
  BOSS.hp -= lightDmg();
  BOSS.core.material.color.setHex(0xffffff);
  setTimeout(()=>{ if(BOSS.core) BOSS.core.material.color.setHex(0xffb347); }, 90);
  if(BOSS.hp <= 0){ defeatBoss(); return; }
  /* 열려 있는 동안에는 계속 때릴 수 있다.
     한 대 맞을 때마다 닫히게 했더니 한 판이 100초를 넘겨 수업에 쓰기 어려웠다. */
  bossBar(true);
}

function defeatBoss(){
  BOSS.die = 1.6; BOSS.open = false;
  STATE.bossDone = true; STATE.bossPending = false; STATE.sparks += 12; save(); refreshHud();
  bossBar(false);
  AUDIO.sfx('clear');
  setTimeout(()=>{
    BOSS.alive = false; BOSS.g.visible = false;
    toast('🌅','스모그 타이탄을 정화했다! 에너지 파편 +12', 5200);
    setQuest('열 개의 사당을 깨워라',
      '매연 덩어리가 걷혔다. 남은 사당 <b>'+(10-coreCount())+'곳</b>을 찾아 코어를 모으자.');
    AUDIO.setMood('city');
  }, 1700);
}

function updateBoss(dt, t){
  /* 등장 대기 — 대화·사당 화면이 끝나고 조작이 돌아왔을 때 나온다 */
  if(STATE.bossPending && !BOSS.alive && !STATE.bossDone && STATE.mode==='play'){
    BOSS.wait = (BOSS.wait||0) + dt;
    if(BOSS.wait > 1.2){ STATE.bossPending=false; BOSS.wait=0; spawnBoss(); }
    return;
  }
  if(!BOSS.alive) return;
  const g = BOSS.g;

  /* 쓰러지는 중 */
  if(BOSS.die > 0){
    BOSS.die -= dt;
    g.scale.setScalar(Math.max(0.02, BOSS.die/1.6));
    g.rotation.y += dt*4;
    return;
  }

  BOSS.t += dt;
  const d = Math.hypot(P.pos.x-g.position.x, P.pos.z-g.position.z);

  /* 핵 여닫기 — 3.4초 닫힘 / 2.6초 열림 */
  BOSS.openT += dt;
  /* 체력이 절반 아래로 떨어지면 더 자주, 더 짧게 연다 (2단계) */
  const half = BOSS.hp <= BOSS.maxHp*0.5;
  const cycle = BOSS.open ? (half?2.4:3.2) : (half?2.2:2.8);
  if(half && BOSS.phase===1){ BOSS.phase=2; toast('☠️','타이탄이 몸부림친다 — 핵이 더 자주 열린다!', 3200); }
  if(BOSS.openT > cycle){
    BOSS.openT = 0; BOSS.open = !BOSS.open;
    if(BOSS.open) AUDIO.sfx('step');
    bossBar(true);
  }
  BOSS.shell.visible = !BOSS.open;
  BOSS.core.scale.setScalar(BOSS.open ? 1 + Math.sin(t*7)*0.12 : 0.6);
  BOSS.eyes.forEach(e=>e.material.color.setHex(BOSS.open ? 0xffd166 : 0xff6b4a));

  /* 느릿하게 플레이어를 향한다 (도시 광장 안으로는 들어오지 않는다) */
  const face = Math.atan2(P.pos.x-g.position.x, P.pos.z-g.position.z);
  g.rotation.y = lerp(g.rotation.y, face, 0.04);
  if(d > 9 && d < 70){   /* 9m 밖에서 멈춘다 — 더 가까우면 화면을 뒤덮는다 */
    const sp = 2.6*dt;
    const nx = g.position.x + Math.sin(face)*sp, nz = g.position.z + Math.cos(face)*sp;
    if(Math.hypot(nx,nz) > 30 && Math.hypot(nx,nz) < 86){
      g.position.x = nx; g.position.z = nz; g.position.y = hAt(nx,nz);
    }
  }

  /* 흔들거리는 연출 */
  BOSS.body.position.y = 6.2 + Math.sin(t*1.6)*0.5;
  BOSS.body.rotation.z = Math.sin(t*1.1)*0.06;
  BOSS.arms.forEach((a,i)=>{ a.g.rotation.z = Math.sin(t*1.3+i*2)*0.28; });
  BOSS.puffs.forEach(p=>{
    p.a += dt*p.sp;
    p.m.position.set(Math.cos(p.a)*p.r, p.y + Math.sin(t*0.9+p.a)*0.9, Math.sin(p.a)*p.r);
  });

  /* 접촉 피해 */
  if(STATE.inv<=0 && d < 10.5 && Math.abs(P.pos.y-g.position.y) < 12){
    hurtPlayer({g:{position:g.position}});
  }
  bossBar(true);
}
