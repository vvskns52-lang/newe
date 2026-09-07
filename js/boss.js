/* ═══════════════════════════════════════════════════════════════
   boss.js — 환경 재앙 보스 3단계 고난이도 시스템
   코어 3개: 1차 보스 「스모그 타이탄」 (HP 50, 흑연 탄환 투척)
   코어 6개: 2차 보스 「슬러지 골렘」 (HP 110, 5연발 집중 슬러지 폭격 + 거대 오염 장판)
   코어 9개: 3차 최종 보스 「대재앙의 카본 콜로서스」 (HP 220, 5연발 화염탄 + 점프로 피하는 지진 충격파)
   ═══════════════════════════════════════════════════════════════ */

const BOSS_CONFIGS = [
  {
    stage: 1,
    name: '스모그 타이탄',
    icon: '☠️',
    title: '도시를 덮친 스모그 타이탄',
    desc: '화석연료 시대의 매연 덩어리가 <b>도시 남쪽 어귀</b>를 막아섰다! 날아오는 흑연 탄환을 회피하며 <b>핵이 열렸을 때</b> 정화의 빛을 집중 타격하라!',
    spawnToast: '☠️ 1차 보스: 스모그 타이탄 출현! 흑연 탄환을 회피하라!',
    defeatToast: '🌅 스모그 타이탄 정화 완료! 에너지 파편 +15',
    at: { x: 0, z: 46 },
    maxHp: 50,
    speed: 3.2,
    scale: 1.05,
    sparks: 15,
    openDur: 2.2,
    closeDur: 3.0,
    colors: {
      smoke1: 0x4a4a55, smoke2: 0x3b3b45,
      eyes: 0xff6b4a, eyesOpen: 0xffd166,
      core: 0xffb347, shell: 0x2c2c34,
      aura: 0x2a2a33, light: 0xff6b4a
    },
    hasProjectiles: true,
    projInterval: 3.6,
    projSpeed: 20,
    projCount: 1,
    projColor: 0x718093,
    hasShockwave: false,
    hasPuddle: false
  },
  {
    stage: 2,
    name: '슬러지 골렘',
    icon: '☣️',
    title: '독성 오염체: 슬러지 골렘',
    desc: '산업 폐수와 중유 폐기물이 뭉쳐진 거대 슬러지 골렘! <b>플레이어 주변을 뒤덮는 5연발 슬러지 폭격</b>과 거대한 <b>독성 슬러지 장판</b>을 피해 끊임없이 탈출하라!',
    spawnToast: '☣️ 2차 보스: 슬러지 골렘 출현! 5연발 슬러지 폭격과 대형 장판을 주의하라!',
    defeatToast: '🌿 슬러지 골렘 정화 완료! 서쪽 토양이 정화되었다! 파편 +25',
    at: { x: -46, z: 12 },
    maxHp: 110,
    speed: 4.0,
    scale: 1.35,
    sparks: 25,
    openDur: 1.8,
    closeDur: 3.4,
    colors: {
      smoke1: 0x2c3e50, smoke2: 0x1e272e,
      eyes: 0xbe2edd, eyesOpen: 0x00d2d3,
      core: 0x00cec9, shell: 0x1a1a24,
      aura: 0x130f40, light: 0xbe2edd
    },
    hasProjectiles: true,
    projInterval: 2.5,
    projSpeed: 21,
    projCount: 5,
    projColor: 0x8e44ad,
    hasShockwave: false,
    hasPuddle: true
  },
  {
    stage: 3,
    name: '대재앙의 카본 콜로서스',
    icon: '🌋',
    title: '최후의 시련: 대재앙의 카본 콜로서스',
    desc: '기후 재앙의 온실가스가 폭주하는 초대형 탄소 거신! <b>5연발 탄소 화염탄</b>과 바닥을 울리는 <b>지진 충격파(점프로 회피!)</b>를 뚫고 핵을 파괴하라!',
    spawnToast: '🌋 최종 보스: 카본 콜로서스 강림! [Space] 점프로 지진파를 뛰어넘어라!',
    defeatToast: '✨ 대재앙의 탄소 콜로서스를 완전히 정화했다! 섬의 기후가 회복되었다! 파편 +40',
    at: { x: 0, z: -48 },
    maxHp: 220,
    speed: 4.8,
    scale: 1.75,
    sparks: 40,
    openDur: 1.4,
    closeDur: 3.8,
    colors: {
      smoke1: 0x2c130f, smoke2: 0x140503,
      eyes: 0xff3838, eyesOpen: 0xffd32a,
      core: 0xff1744, shell: 0x2d0c03,
      aura: 0x3d0c02, light: 0xff3838
    },
    hasProjectiles: true,
    projInterval: 2.0,
    projSpeed: 27,
    projCount: 5,
    projColor: 0xff4757,
    hasShockwave: true,
    shockInterval: 5.2,
    hasPuddle: false
  }
];

const BOSS = {
  currentStage: 1,
  at: { x: 0, z: 46 },
  maxHp: 50, hp: 50,
  alive: false, phase: 0, open: false, t: 0, openT: 0, die: 0,
  speed: 3.2, openDur: 2.2, closeDur: 3.0, projTimer: 0, shockTimer: 0,
  g: null, core: null, body: null, shell: null, pool: null, gy: 0,
  arms: [], puffs: [], eyes: [], bodyMeshes: [], armMeshes: [], projs: [], puddles: [], shockWave: null, light: null
};

(function buildBoss(){
  const g = new THREE.Group();
  const gy = hAt(BOSS.at.x, BOSS.at.z);
  g.position.set(BOSS.at.x, gy, BOSS.at.z);

  const smoke = c => new THREE.MeshLambertMaterial({
    color: c, flatShading: true, transparent: true, opacity: 0.92
  });

  /* 몸통 — 매연/오염 덩어리 */
  const body = new THREE.Group(); body.position.y = 6.2; g.add(body);
  [[0,0,0,3.4],[2.2,1.4,0.4,2.4],[-2.4,1.0,-0.4,2.6],[0.6,2.8,0.2,2.2],[-1.2,-1.8,0.6,2.4],[1.6,-2.2,-0.5,2.0]]
    .forEach(([x,y,z,r], i)=>{
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), smoke(i % 2 ? 0x4a4a55 : 0x3b3b45));
      m.position.set(x, y, z); body.add(m); BOSS.bodyMeshes.push(m);
    });

  /* 눈 두 개 */
  [-1.25, 1.25].forEach(x=>{
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 7),
      new THREE.MeshBasicMaterial({color: 0xff6b4a}));
    e.position.set(x, 1.5, 2.9); body.add(e); BOSS.eyes.push(e);
  });

  /* 가슴의 핵 — 열렸을 때만 타격 가능 */
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 0),
    new THREE.MeshBasicMaterial({color: 0xffb347}));
  core.position.set(0, -0.4, 3.0); body.add(core);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 0),
    new THREE.MeshBasicMaterial({color: 0x2c2c34, flatShading: true}));
  shell.position.copy(core.position); body.add(shell);

  /* 팔 */
  [-1, 1].forEach(s=>{
    const a = new THREE.Group(); a.position.set(s * 3.6, 0.6, 0); body.add(a);
    const up = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), smoke(0x44444f));
    up.position.set(s * 1.2, -1.0, 0); a.add(up); BOSS.armMeshes.push(up);
    const lo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), smoke(0x3a3a44));
    lo.position.set(s * 2.1, -2.6, 0); a.add(lo); BOSS.armMeshes.push(lo);
    BOSS.arms.push({g: a, s});
  });

  /* 발밑 오염 웅덩이 */
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({color: 0x2a2a33, transparent: true, opacity: 0.45}));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.08; g.add(pool);

  /* 주변 연기 파티클 */
  for(let i=0; i<8; i++){
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.7, 0),
      new THREE.MeshBasicMaterial({color: 0x55555f, transparent: true, opacity: 0.35}));
    g.add(p); BOSS.puffs.push({m: p, a: Math.random() * 6.283, r: 5 + Math.random() * 4, y: 2 + Math.random() * 8, sp: 0.4 + Math.random() * 0.6});
  }

  /* 보스 주변 불길한 조명 */
  const bLight = new THREE.PointLight(0xff6b4a, 1.6, 28);
  bLight.position.set(0, 6, 2); g.add(bLight); BOSS.light = bLight;

  g.visible = false; scene.add(g);
  Object.assign(BOSS, {g, body, core, shell, pool, gy});

  /* 원거리 탄환 오브젝트 풀 (24개) */
  const projs = [];
  for(let i=0; i<24; i++){
    const pm = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({color: 0x8e44ad}));
    pm.visible = false; scene.add(pm);
    projs.push({ mesh: pm, on: false, vx: 0, vy: 0, vz: 0, life: 0, gravity: 0 });
  }
  BOSS.projs = projs;

  /* 2차 보스: 독성 슬러지 장판 풀 (16개, 초대형 반경 4.5m) */
  const puddles = [];
  for(let i=0; i<16; i++){
    const pdm = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 20),
      new THREE.MeshBasicMaterial({color: 0x5f27cd, transparent: true, opacity: 0.72})
    );
    pdm.rotation.x = -Math.PI / 2; pdm.visible = false; scene.add(pdm);
    puddles.push({ mesh: pdm, on: false, pos: new THREE.Vector3(), life: 0 });
  }
  BOSS.puddles = puddles;

  /* 3차 보스: 지진 충격파 링 */
  const swMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 1.4, 32),
    new THREE.MeshBasicMaterial({color: 0xff3838, side: THREE.DoubleSide, transparent: true, opacity: 0.85})
  );
  swMesh.rotation.x = -Math.PI / 2; swMesh.visible = false; scene.add(swMesh);
  BOSS.shockWave = { mesh: swMesh, on: false, r: 1.0, pos: new THREE.Vector3(), hit: false };
})();

function applyBossVisuals(cfg){
  BOSS.g.scale.setScalar(cfg.scale);
  BOSS.bodyMeshes.forEach((m, idx)=>{
    m.material.color.setHex(idx % 2 ? cfg.colors.smoke1 : cfg.colors.smoke2);
  });
  BOSS.armMeshes.forEach(m=>{
    m.material.color.setHex(cfg.colors.smoke1);
  });
  BOSS.eyes.forEach(e=>{
    e.material.color.setHex(cfg.colors.eyes);
  });
  BOSS.core.material.color.setHex(cfg.colors.core);
  BOSS.shell.material.color.setHex(cfg.colors.shell);
  BOSS.pool.material.color.setHex(cfg.colors.aura);
  if(BOSS.light) BOSS.light.color.setHex(cfg.colors.light);
}

function bossBar(show){
  const el = $('#bossBar');
  if(!el) return;
  el.classList.toggle('on', !!show);
  if(show){
    const cfg = BOSS_CONFIGS[(BOSS.currentStage || 1) - 1] || BOSS_CONFIGS[0];
    const bIcon = $('#bossIcon');
    const bName = $('#bossName');
    if(bIcon) bIcon.textContent = cfg.icon;
    if(bName) bName.textContent = cfg.name;
    $('#bossHp').style.width = Math.max(0, BOSS.hp / BOSS.maxHp * 100) + '%';
    $('#bossPhase').textContent = BOSS.open ? '핵이 열렸다 — 지금이다!' : '오염에 싸여 있다 (빛이 통하지 않는다)';
    $('#bossBarWrap').classList.toggle('open', BOSS.open);
  }
}

function spawnBoss(){
  const stage = Math.min(3, Math.max(1, (STATE.bossStage || 0) + 1));
  const cfg = BOSS_CONFIGS[stage - 1];
  BOSS.currentStage = stage;
  BOSS.maxHp = cfg.maxHp;
  BOSS.hp = cfg.maxHp;
  BOSS.speed = cfg.speed;
  BOSS.openDur = cfg.openDur;
  BOSS.closeDur = cfg.closeDur;
  BOSS.alive = true;
  BOSS.phase = 1;
  BOSS.open = false;
  BOSS.openT = 0;
  BOSS.t = 0;
  BOSS.die = 0;
  BOSS.projTimer = 0;
  BOSS.shockTimer = 0;
  BOSS.at = cfg.at;
  BOSS.gy = hAt(cfg.at.x, cfg.at.z);

  applyBossVisuals(cfg);
  BOSS.g.position.set(cfg.at.x, BOSS.gy, cfg.at.z);
  BOSS.g.visible = true;

  clearBossHazard();

  bossBar(true);
  setQuest(cfg.title, cfg.desc);
  toast(cfg.icon, cfg.spawnToast, 4800);
  AUDIO.setMood('boss');
}

function clearBossHazard(){
  if(BOSS.projs) BOSS.projs.forEach(p => { p.on = false; p.mesh.visible = false; });
  if(BOSS.puddles) BOSS.puddles.forEach(pd => { pd.on = false; pd.mesh.visible = false; });
  if(BOSS.shockWave){ BOSS.shockWave.on = false; BOSS.shockWave.mesh.visible = false; }
}

function hitBoss(customDmg){
  if(!BOSS.alive || !BOSS.open || BOSS.die > 0) return;
  const baseDmg = (typeof customDmg === 'number' && customDmg > 0) ? customDmg : lightDmg();
  const dmg = baseDmg * 2; // 체력이 2배 빠르게 닳도록 피해량 2배 적용
  BOSS.hp -= dmg;
  BOSS.core.material.color.setHex(0xffffff);
  const cfg = BOSS_CONFIGS[(BOSS.currentStage || 1) - 1] || BOSS_CONFIGS[0];
  setTimeout(()=>{ if(BOSS.core) BOSS.core.material.color.setHex(cfg.colors.core); }, 90);
  if(BOSS.hp <= 0){ defeatBoss(); return; }
  bossBar(true);
}

function defeatBoss(){
  BOSS.die = 1.6;
  BOSS.open = false;
  const stage = BOSS.currentStage || 1;
  const cfg = BOSS_CONFIGS[stage - 1] || BOSS_CONFIGS[0];

  STATE.bossStage = stage;
  if(STATE.bossStage >= 3) STATE.bossDone = true;
  STATE.bossPending = false;
  STATE.sparks += cfg.sparks;
  save(); refreshHud();

  clearBossHazard();

  bossBar(false);
  AUDIO.sfx('clear');
  setTimeout(()=>{
    BOSS.alive = false; BOSS.g.visible = false;
    toast(cfg.icon, cfg.defeatToast, 5200);
    const rem = 10 - coreCount();
    if(STATE.bossStage < 3){
      const nextStage = STATE.bossStage + 1;
      const nextCores = nextStage * 3;
      setQuest('열 개의 사당을 깨워라',
        '오염체가 정화되었다! 남은 사당 <b>' + rem + '곳</b>을 찾아 코어를 모으자. (코어 ' + nextCores + '개 시 다음 오염체 출현)');
    } else {
      setQuest('모든 오염체 정화 완료!',
        '섬의 3대 환경 재앙이 모두 정화되었다! 남은 사당 <b>' + rem + '곳</b>과 중앙 관제탑을 가동하자.');
    }
    AUDIO.setMood('city');
  }, 1700);
}

function launchBossProj(fromPos, toTarget, speed, color, isLobbed = false){
  if(!BOSS.projs) return;
  const p = BOSS.projs.find(pj => !pj.on);
  if(!p) return;
  p.on = true;
  p.mesh.position.copy(fromPos);
  p.mesh.material.color.setHex(color);
  p.mesh.visible = true;
  p.life = 4.0;

  if(isLobbed){
    // 포물선 곡사 투척: 플레이어 발밑/주변 착탄 지점을 정밀 계산하여 과도한 오버슛 방지
    const gravity = 14.0;
    const hDist = Math.hypot(toTarget.x - fromPos.x, toTarget.z - fromPos.z);
    const T = Math.max(0.65, Math.min(1.5, hDist / speed));
    p.vx = (toTarget.x - fromPos.x) / T;
    p.vz = (toTarget.z - fromPos.z) / T;
    p.vy = (toTarget.y - fromPos.y + 0.5 * gravity * T * T) / T;
    p.gravity = gravity;
  } else {
    // 직사 조준: 플레이어 상체를 향해 직선 직격
    const dx = toTarget.x - fromPos.x;
    const dy = (toTarget.y + 0.9) - fromPos.y;
    const dz = toTarget.z - fromPos.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    p.vx = (dx / dist) * speed;
    p.vy = (dy / dist) * speed;
    p.vz = (dz / dist) * speed;
    p.gravity = 1.6;
  }
}

function updateBoss(dt, t){
  /* 코어 수에 따른 보스 대기 상태 체크 */
  const cnt = coreCount();
  const targetStage = cnt >= 9 ? 3 : (cnt >= 6 ? 2 : (cnt >= 3 ? 1 : 0));
  if((STATE.bossStage || 0) < targetStage && !BOSS.alive){
    STATE.bossPending = true;
  }

  /* 등장 대기 — 대화·사당 화면이 끝나고 조작이 돌아왔을 때 스폰 */
  if(STATE.bossPending && !BOSS.alive && (STATE.bossStage || 0) < 3 && STATE.mode === 'play'){
    BOSS.wait = (BOSS.wait || 0) + dt;
    if(BOSS.wait > 1.2){
      STATE.bossPending = false;
      BOSS.wait = 0;
      spawnBoss();
    }
    return;
  }

  const stage = BOSS.currentStage || 1;
  const cfg = BOSS_CONFIGS[stage - 1] || BOSS_CONFIGS[0];

  /* 탄환 업데이트 */
  if(BOSS.projs){
    for(const p of BOSS.projs){
      if(!p.on) continue;
      p.life -= dt;
      if(p.life <= 0){ p.on = false; p.mesh.visible = false; continue; }
      p.vy -= (p.gravity || 6.5) * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // 지면 충돌 체크
      const gy = hAt(p.mesh.position.x, p.mesh.position.z);
      if(p.mesh.position.y < gy + 0.25){
        p.on = false; p.mesh.visible = false;
        // 2차 보스: 지면에 닿은 곳에 대형 독성 슬러지 웅덩이 생성
        if(cfg.hasPuddle && BOSS.puddles){
          const pd = BOSS.puddles.find(item => !item.on);
          if(pd){
            pd.on = true;
            pd.life = 6.5;
            pd.pos.set(p.mesh.position.x, gy + 0.08, p.mesh.position.z);
            pd.mesh.position.copy(pd.pos);
            pd.mesh.visible = true;
          }
        }
        continue;
      }

      // 플레이어 피격 판정
      const dp = Math.hypot(p.mesh.position.x - P.pos.x, p.mesh.position.z - P.pos.z);
      if(dp < 1.9 && Math.abs(p.mesh.position.y - (P.pos.y + 1.0)) < 2.2){
        p.on = false; p.mesh.visible = false;
        if(STATE.inv <= 0){
          hurtPlayer({ g: { position: p.mesh.position } });
        }
      }
    }
  }

  /* 2차 보스: 독성 슬러지 장판 처리 */
  if(BOSS.puddles){
    for(const pd of BOSS.puddles){
      if(!pd.on) continue;
      pd.life -= dt;
      if(pd.life <= 0){ pd.on = false; pd.mesh.visible = false; continue; }
      pd.mesh.material.opacity = Math.min(0.72, pd.life / 1.5);
      const dp = Math.hypot(P.pos.x - pd.pos.x, P.pos.z - pd.pos.z);
      if(dp < 4.2 && P.onGround){
        P.vx *= 0.82; P.vz *= 0.82; // 심각한 이동 둔화!
        if(STATE.inv <= 0){
          hurtPlayer({ g: { position: pd.pos } });
          toast('☣️', '독성 슬러지 오염! 신속히 벗어나라!', 1500);
        }
      }
    }
  }

  /* 3차 보스: 지진 충격파 업데이트 */
  if(BOSS.shockWave && BOSS.shockWave.on){
    BOSS.shockWave.r += 17.5 * dt;
    const sr = BOSS.shockWave.r;
    BOSS.shockWave.mesh.scale.set(sr, sr, sr);
    BOSS.shockWave.mesh.material.opacity = Math.max(0, 0.85 * (1 - sr / 26));

    const dp = Math.hypot(P.pos.x - BOSS.shockWave.pos.x, P.pos.z - BOSS.shockWave.pos.z);
    if(!BOSS.shockWave.hit && Math.abs(dp - sr) < 1.8){
      if(P.onGround && STATE.inv <= 0){
        BOSS.shockWave.hit = true;
        hurtPlayer({ g: { position: BOSS.shockWave.pos } });
        toast('💥', '지진파 피격! [Space] 점프로 뛰어넘어야 합니다!', 1800);
      }
    }

    if(sr > 26){
      BOSS.shockWave.on = false;
      BOSS.shockWave.mesh.visible = false;
    }
  }

  if(!BOSS.alive) return;
  const g = BOSS.g;

  /* 쓰러지는 중 */
  if(BOSS.die > 0){
    BOSS.die -= dt;
    g.scale.setScalar(Math.max(0.02, (BOSS.die / 1.6) * cfg.scale));
    g.rotation.y += dt * 4;
    return;
  }

  BOSS.t += dt;
  const d = Math.hypot(P.pos.x - g.position.x, P.pos.z - g.position.z);

  /* 핵 여닫기 주기 */
  BOSS.openT += dt;
  const half = BOSS.hp <= BOSS.maxHp * 0.5;
  if(half && BOSS.phase === 1){
    BOSS.phase = 2;
    toast(cfg.icon, cfg.name + ' 광폭화! 움직임과 공격 속도가 극대화된다!', 3400);
  }
  const curOpen = half ? cfg.openDur * 0.72 : cfg.openDur;
  const curClose = half ? cfg.closeDur * 0.82 : cfg.closeDur;
  const cycle = BOSS.open ? curOpen : curClose;

  if(BOSS.openT > cycle){
    BOSS.openT = 0;
    BOSS.open = !BOSS.open;
    if(BOSS.open) AUDIO.sfx('step');
    bossBar(true);
  }
  BOSS.shell.visible = !BOSS.open;
  BOSS.core.scale.setScalar(BOSS.open ? 1 + Math.sin(t * 8) * 0.16 : 0.6);
  BOSS.eyes.forEach(e => e.material.color.setHex(BOSS.open ? cfg.colors.eyesOpen : cfg.colors.eyes));

  /* 플레이어를 향해 선회 및 추적 */
  const face = Math.atan2(P.pos.x - g.position.x, P.pos.z - g.position.z);
  g.rotation.y = lerp(g.rotation.y, face, 0.055);
  const minStopDist = 9.0 * cfg.scale;
  if(d > minStopDist && d < 82){
    const sp = (half ? cfg.speed * 1.3 : cfg.speed) * dt;
    const nx = g.position.x + Math.sin(face) * sp, nz = g.position.z + Math.cos(face) * sp;
    if(Math.hypot(nx, nz) > 28 && Math.hypot(nx, nz) < 95){
      g.position.x = nx; g.position.z = nz; g.position.y = hAt(nx, nz);
    }
  }

  /* 원거리 탄환 발사 패턴 */
  if(cfg.hasProjectiles && d < 70){
    BOSS.projTimer = (BOSS.projTimer || 0) + dt;
    const interval = half ? cfg.projInterval * 0.7 : cfg.projInterval;
    if(BOSS.projTimer >= interval){
      BOSS.projTimer = 0;
      const shootPos = g.position.clone();
      shootPos.y += 5.5 * cfg.scale;
      AUDIO.sfx('step');

      if(stage === 1){
        // 1차: 플레이어를 향해 흑연 탄환 1발 직사
        launchBossProj(shootPos, P.pos, cfg.projSpeed, cfg.projColor, false);
      } else if(stage === 2){
        // 2차: 플레이어 발밑 및 주변 5방향으로 대량의 슬러지 폭탄 집중 투하!
        const targets = [
          { x: P.pos.x, y: P.pos.y, z: P.pos.z },
          { x: P.pos.x + 3.4, y: P.pos.y, z: P.pos.z + 1.8 },
          { x: P.pos.x - 3.4, y: P.pos.y, z: P.pos.z - 1.8 },
          { x: P.pos.x + 1.8, y: P.pos.y, z: P.pos.z - 3.4 },
          { x: P.pos.x - 1.8, y: P.pos.y, z: P.pos.z + 3.4 }
        ];
        targets.forEach(tgt => {
          launchBossProj(shootPos, tgt, cfg.projSpeed, cfg.projColor, true);
        });
      } else if(stage === 3){
        // 3차: 5방향 확산 탄소 화염탄 난사
        [-0.30, -0.15, 0, 0.15, 0.30].forEach(ang => {
          const cos = Math.cos(ang), sin = Math.sin(ang);
          const dx = P.pos.x - shootPos.x, dz = P.pos.z - shootPos.z;
          const tgt = {
            x: shootPos.x + (dx * cos - dz * sin),
            y: P.pos.y,
            z: shootPos.z + (dx * sin + dz * cos)
          };
          launchBossProj(shootPos, tgt, cfg.projSpeed, cfg.projColor, false);
        });
      }
    }
  }

  /* 3차 보스 전용: 지진 충격파 패턴 */
  if(cfg.hasShockwave && d < 70){
    BOSS.shockTimer = (BOSS.shockTimer || 0) + dt;
    const sInterval = half ? cfg.shockInterval * 0.72 : cfg.shockInterval;
    if(BOSS.shockTimer >= sInterval){
      BOSS.shockTimer = 0;
      BOSS.shockWave.on = true;
      BOSS.shockWave.r = 1.0;
      BOSS.shockWave.pos.set(g.position.x, hAt(g.position.x, g.position.z) + 0.12, g.position.z);
      BOSS.shockWave.mesh.position.copy(BOSS.shockWave.pos);
      BOSS.shockWave.mesh.scale.set(1, 1, 1);
      BOSS.shockWave.mesh.material.opacity = 0.85;
      BOSS.shockWave.mesh.visible = true;
      BOSS.shockWave.hit = false;
      toast('⚠️', '쾅!! 지진 충격파 발생! [Space] 점프로 뛰어넘어라!', 2200);
      AUDIO.sfx('hurt');
      if(typeof triggerCamShake === 'function') triggerCamShake(0.5);
    }
  }

  /* 부유 연출 */
  BOSS.body.position.y = 6.2 + Math.sin(t * (half ? 2.8 : 1.7)) * 0.58;
  BOSS.body.rotation.z = Math.sin(t * 1.1) * 0.08;
  BOSS.arms.forEach((a, i)=>{ a.g.rotation.z = Math.sin(t * (half ? 2.2 : 1.4) + i * 2) * 0.35; });
  BOSS.puffs.forEach(p=>{
    p.a += dt * p.sp;
    p.m.position.set(Math.cos(p.a) * p.r, p.y + Math.sin(t * 0.9 + p.a) * 0.9, Math.sin(p.a) * p.r);
  });

  /* 근접 접촉 피해 */
  if(STATE.inv <= 0 && d < 10.0 * cfg.scale && Math.abs(P.pos.y - g.position.y) < 13 * cfg.scale){
    hurtPlayer({ g: { position: g.position } });
  }
  bossBar(true);
}
