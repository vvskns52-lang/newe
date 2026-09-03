/* ═══════════════════════════════════════════════════════════════
   art.js — 아트 디렉션 레이어
   색, 재질, 형태를 여기서 모두 정의합니다.
   톤을 바꾸고 싶다면 아래 ART 팔레트부터 만지세요.
   ═══════════════════════════════════════════════════════════════ */

const ART = {
  /* ── 하늘 · 대기 ── */
  sky:  { top:0x2f6fae, mid:0x8ecbe8, bot:0xffe6c0 },
  fog:  { color:0xb6dcec, near:150, far:340 },
  /* ── 조명 ── */
  sun:  { color:0xffefd0, intensity:0.82, dir:[70,110,50] },
  hemi: { sky:0xc3e0fb, ground:0x8f7856, intensity:0.40 },
  rim:  { color:0x8fc4f5, intensity:0.30, dir:[-70,42,-58] },   // 실루엣을 살리는 역광
  /* ── 지형 ── */
  ground: {
    under : 0x7fa48c,   // 물속 모래
    sand  : 0xdfcb9d,
    grassL: 0x76b95f,   // 낮은 초지
    grassD: 0x3f8a52,   // 깊은 숲
    rock  : 0x9a927f,
    snow  : 0xdfe8f0,
    soil  : 0xb9986c,   // 동쪽 농지
  },
  /* ── 초목 ── */
  foliage: [0x63b45c, 0x4f9f52, 0x82c96a, 0x3c8248],
  trunk  : 0x7d5a3c,
  bush   : [0x5aa858, 0x74bd63],
  flower : [0xff9ec0, 0xffd76a, 0xb79aff, 0xfff6ee],
  /* ── 물 ── */
  water: { surface:0x4fb2dd, deep:0x2a6d94, foam:0xdaf1ff },
  /* ── 도시 ── */
  city: {
    plaza : 0xd2c096, plazaEdge:0xb8a074,
    wall  : [0xf5e7cc, 0xead4b2, 0xfaf0da, 0xe0c9a6],
    roof  : [0xcf6f57, 0xb95d4f, 0x7fa8cf, 0xd9a04f],
    stone : 0xcdc2a8, wood:0x9a7550,
  },
  /* ── 사당 ── */
  shrine: { stone:0xded4bc, stone2:0xc3b699, metal:0xb9c3cc },
  /* ── 캐릭터 ── */
  player: { skin:0xf6d3b0, tunic:0x4fbf7d, pants:0x40607f, hair:0x6b4327, cape:0x2f9b68, boot:0x6b4a2f },
  /* ── 오염 ── */
  smog: { puff:0x585361, ring:0x4a4455 },
};

/* 공통 재질 — 로우폴리 각면을 살린 무광 */
const MAT_CACHE = {};
function matte(color, opts){
  const key = color+'|'+JSON.stringify(opts||{});
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  const m = new THREE.MeshLambertMaterial(Object.assign({color, flatShading:true}, opts||{}));
  MAT_CACHE[key]=m; return m;
}
/* 부드러운 면 (머리처럼 둥글게 보여야 하는 것) */
function soft(color, opts){
  return new THREE.MeshLambertMaterial(Object.assign({color, flatShading:false}, opts||{}));
}
const glow = (color, o) => new THREE.MeshBasicMaterial(Object.assign({color}, o||{}));

/* ── 하늘 돔 ── */
function makeSky(){
  const geo = new THREE.SphereGeometry(430, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false,
    uniforms:{ top:{value:new THREE.Color(ART.sky.top)}, mid:{value:new THREE.Color(ART.sky.mid)},
               bot:{value:new THREE.Color(ART.sky.bot)} },
    vertexShader:'varying float vY; void main(){ vY=normalize(position).y;\
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying float vY; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;\
      void main(){ float t=vY*0.5+0.5;\
        vec3 c = t>0.52 ? mix(mid,top,smoothstep(0.52,1.0,t)) : mix(bot,mid,smoothstep(0.02,0.52,t));\
        gl_FragColor=vec4(c,1.0); }'
  });
  return new THREE.Mesh(geo, mat);
}

/* ── 나무: 원뿔이 아니라 둥근 캐노피 ── */
const TREE_GEO = {
  trunk : new THREE.CylinderGeometry(0.17, 0.30, 2.5, 6),
  canopy: new THREE.IcosahedronGeometry(1, 1),
  bush  : new THREE.IcosahedronGeometry(1, 0),
};
/* 나무 한 그루의 인스턴스 배치를 계산해 돌려준다 (그리기는 world.js) */
function treeInstance(x, y, z, rand){
  const s   = 0.72 + rand()*0.85;
  const ry  = rand()*6.283;
  const lean= (rand()-0.5)*0.13;
  const parts = { trunk:[x, y+1.25*s, z, s, ry, lean], canopy:[] };
  const blobs = 2 + ((rand()*2)|0);
  let cy = 2.5*s;
  for(let i=0;i<blobs;i++){
    const cs = s*(0.95 - i*0.17) * (0.9+rand()*0.3);
    parts.canopy.push([
      x + (rand()-0.5)*0.9*s, y + cy + i*0.62*s, z + (rand()-0.5)*0.9*s,
      cs*1.15, cs*0.86, cs*1.15,          // 살짝 눌린 구 — 둥근 수관
      rand()*6.283, (rand()-0.5)*0.4,
      (rand()*ART.foliage.length)|0
    ]);
  }
  return parts;
}

/* ── 바위: 밑면이 평평한 자연스러운 덩어리 ── */
const ROCK_GEO = new THREE.DodecahedronGeometry(1, 0);
(function flattenRockBase(){
  const p = ROCK_GEO.attributes.position;
  for(let i=0;i<p.count;i++) if(p.getY(i) < -0.35) p.setY(i, -0.35);
  ROCK_GEO.computeVertexNormals();
})();

/* ═══════════════════════════════════════════
   귀여운 네모 캐릭터 (약 3등신)
   각진 실루엣은 그대로 두고, 머리를 크게 키운 뒤
   큰 눈·하이라이트·볼터치·미소로 귀여움을 살립니다.
   비율을 바꾸려면 아래 CHAR 값만 만지면 됩니다.
   ═══════════════════════════════════════════ */
const CHAR = {
  headW:1.09, headH:1.06, headD:1.02, headY:1.60,   // 머리 — 전체 키의 약 1/3
  bodyW:0.96, bodyH:0.86, bodyD:0.62, bodyY:0.76,   // 발바닥이 0 에 닿도록 맞춘 값
  legH :0.80, armH :0.74,
};
/* ══════════════ 값싼 원반 그림자 ══════════════ */
/* 실제 그림자 맵 대신 발밑에 부드러운 원반 하나를 깐다.
   조명 계산도, 그림자 맵 렌더링도 하지 않으므로 사실상 공짜다. */
const BLOB_TEX = (function(){
  const cv=document.createElement('canvas'); cv.width=cv.height=64;
  const c=cv.getContext('2d');
  const gr=c.createRadialGradient(32,32,2,32,32,31);
  gr.addColorStop(0,'rgba(0,0,0,.58)');
  gr.addColorStop(0.5,'rgba(0,0,0,.34)');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=gr; c.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(cv); return t;
})();
const BLOB_GEO = new THREE.PlaneGeometry(1,1);
function blobShadow(size){
  const m=new THREE.Mesh(BLOB_GEO, new THREE.MeshBasicMaterial({
    map:BLOB_TEX, transparent:true, depthWrite:false, fog:false, opacity:0.9}));
  m.rotation.x=-Math.PI/2; m.scale.setScalar(size||2.4);
  m.renderOrder=-1;
  return m;
}

function makeHumanoid(o){
  o = o || {};
  const skinM  = matte(o.skin  || ART.player.skin);
  const clothC = o.cloth || ART.player.tunic;
  const clothM = matte(clothC);
  const sleeveM= matte(new THREE.Color(clothC).multiplyScalar(0.84).getHex());
  const pantsM = matte(o.pants || ART.player.pants);
  const hairM  = matte(o.hair  || ART.player.hair);
  const bootM  = matte(o.boot  || ART.player.boot);
  const g = new THREE.Group();
  const C = CHAR;

  /* 몸통 */
  const torso = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW, C.bodyH, C.bodyD), clothM);
  torso.position.y = C.bodyY + C.bodyH/2; g.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW*1.04, 0.17, C.bodyD*1.04), matte(ART.city.wood));
  belt.position.y = C.bodyY + 0.10; g.add(belt);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW*0.74, 0.16, C.bodyD*1.07),
                                matte(o.cape === false ? (o.cloth || ART.player.tunic) : (o.cape || ART.player.cape)));
  collar.position.y = C.bodyY + C.bodyH - 0.03; g.add(collar);

  /* 머리 — 크게 */
  const head = new THREE.Mesh(new THREE.BoxGeometry(C.headW, C.headH, C.headD), skinM);
  head.position.y = C.headY + C.headH/2; g.add(head);
  const hy = head.position.y;
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(C.headW*1.06, 0.30, C.headD*1.06), hairM);
  hairTop.position.y = hy + C.headH/2 - 0.03; g.add(hairTop);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(C.headW*1.06, 0.26, 0.16), hairM);
  fringe.position.set(0, hy + C.headH/2 - 0.26, C.headD/2 + 0.02); g.add(fringe);
  [-1,1].forEach(sx=>{
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, C.headD*1.02), hairM);
    side.position.set(sx*(C.headW/2 + 0.02), hy + 0.10, 0); g.add(side);
  });

  /* 얼굴 — 큰 눈 + 하이라이트 + 볼터치 + 미소 */
  const fz = C.headD/2 + 0.015;
  const white = matte(0xffffff), ink = matte(0x2a3441), blush = matte(0xffa9b4);
  [-1,1].forEach(sx=>{
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.30, 0.03), white);
    eye.position.set(sx*0.26, hy + 0.02, fz); g.add(eye);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.20, 0.03), ink);
    pupil.position.set(sx*0.26, hy - 0.005, fz + 0.012); g.add(pupil);
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), white);
    spark.position.set(sx*0.30, hy + 0.09, fz + 0.024); g.add(spark);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.03), blush);
    bl.position.set(sx*0.44, hy - 0.22, fz - 0.004); g.add(bl);
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), ink);
  mouth.position.set(0, hy - 0.27, fz); g.add(mouth);
  [-1,1].forEach(sx=>{
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), ink);
    up.position.set(sx*0.10, hy - 0.235, fz); g.add(up);
  });

  /* 팔·다리 — 어깨/골반에서 회전하도록 피벗을 위로 */
  function limb(w, h, d, m, capM){
    const grp = new THREE.Group();
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    s.position.y = -h/2; grp.add(s);
    if(capM){
      const c = new THREE.Mesh(new THREE.BoxGeometry(w*1.05, h*0.26, d*1.05), capM);
      c.position.y = -h + h*0.13; grp.add(c);
    }
    return grp;
  }
  const shY = C.bodyY + C.bodyH - 0.10;
  const aL = limb(0.29, C.armH, 0.31, sleeveM, skinM); aL.position.set(-(C.bodyW/2 + 0.17), shY, 0); g.add(aL);
  const aR = limb(0.29, C.armH, 0.31, sleeveM, skinM); aR.position.set( (C.bodyW/2 + 0.17), shY, 0); g.add(aR);
  const lL = limb(0.36, C.legH, 0.38, pantsM, bootM); lL.position.set(-0.24, C.bodyY + 0.04, 0); g.add(lL);
  const lR = limb(0.36, C.legH, 0.38, pantsM, bootM); lR.position.set( 0.24, C.bodyY + 0.04, 0); g.add(lR);

  /* 망토 — 납작한 판 하나 */
  let cape = null;
  if(o.cape !== false){
    cape = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW*1.02, C.bodyH*1.35, 0.10),
      matte(o.cape || ART.player.cape));
    cape.position.set(0, C.bodyY + C.bodyH*0.55, -(C.bodyD/2 + 0.06)); g.add(cape);
  }
  if(o.hat){
    const brim = new THREE.Mesh(new THREE.BoxGeometry(C.headW*1.5, 0.09, C.headD*1.5), matte(o.hat));
    brim.position.y = hy + C.headH/2 + 0.16; g.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(C.headW*0.72, 0.42, C.headD*0.72), matte(o.hat));
    top.position.y = hy + C.headH/2 + 0.40; g.add(top);
  }
  return { g, aL, aR, lL, lR, head, torso, cape };
}

/* ═══════════════════════════════════════════
   오염 몬스터 형태
   ═══════════════════════════════════════════ */
function makeMonsterBody(kind, r, color){
  const g = new THREE.Group();
  const bodyM = new THREE.MeshLambertMaterial({color, flatShading:true, transparent:true, opacity:0.94});
  let body;
  if(kind === 'smog'){                       // 흘러내리는 매연 덩어리
    body = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), bodyM);
    body.scale.set(1.12, 0.88, 1.05);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(r*0.62, 8, 6), bodyM);
    drip.position.y = -r*0.62; drip.scale.set(1.1, 0.7, 1.1); g.add(drip);
  } else if(kind === 'dust'){                // 잘게 흩어지는 먼지 무리
    body = new THREE.Mesh(new THREE.IcosahedronGeometry(r*0.72, 0), bodyM);
    for(let i=0;i<5;i++){
      const sp = new THREE.Mesh(new THREE.TetrahedronGeometry(r*0.26, 0), bodyM);
      const a = i/5*6.283;
      sp.position.set(Math.cos(a)*r*0.95, Math.sin(a*1.7)*r*0.4, Math.sin(a)*r*0.95);
      g.add(sp);
    }
  } else {                                   // 유령처럼 아래가 흩어지는 CO2
    body = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bodyM);
    body.scale.set(1, 1.05, 0.95);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(r*0.92, r*1.7, 8), bodyM);
    tail.position.y = -r*1.05; tail.rotation.x = Math.PI; g.add(tail);
  } g.add(body);
  /* 눈 */
  const eyeM = glow(0xffe08a);
  [-1,1].forEach(s=>{
    const e = new THREE.Mesh(new THREE.SphereGeometry(r*0.16, 7, 6), eyeM);
    e.position.set(s*r*0.34, r*0.20, r*0.80); e.scale.set(1,1.3,1); g.add(e);
  });
  return { g, body, bodyM };
}

/* 이전 코드 호환용 별칭 */
const mat = matte;

/* ══════════════════════════════════════════════════════════
   사당의 정령 — 로우폴리 유령형 캐릭터
   조명을 쓰지 않는다(MeshBasicMaterial). 그림자를 없앤 세계에서도
   항상 또렷하고, 발광체처럼 보여 "정령"이라는 설정에도 맞는다.
   ══════════════════════════════════════════════════════════ */
const SP_GEO = {
  head : new THREE.IcosahedronGeometry(0.62, 1),
  tail : new THREE.ConeGeometry(0.50, 0.78, 7),
  eye  : new THREE.SphereGeometry(0.088, 7, 6),
  hi   : new THREE.SphereGeometry(0.036, 6, 5),
  ring : new THREE.TorusGeometry(0.80, 0.035, 4, 22),
  mote : new THREE.OctahedronGeometry(0.075, 0),
  disc : new THREE.CylinderGeometry(0.26, 0.26, 0.07, 10),
  cone : new THREE.ConeGeometry(0.20, 0.38, 7),
  drop : new THREE.SphereGeometry(0.19, 8, 7),
  blade: new THREE.BoxGeometry(0.30, 0.05, 0.10),
  torus: new THREE.TorusGeometry(0.22, 0.05, 4, 16),
  leaf : new THREE.SphereGeometry(0.17, 7, 6),
  box  : new THREE.BoxGeometry(0.26, 0.34, 0.20),
  wave : new THREE.TorusGeometry(0.20, 0.055, 4, 14, Math.PI),
  smile: new THREE.TorusGeometry(0.105, 0.022, 4, 10, Math.PI*0.9),
};

/* 사당별 머리 위 문장(紋章) — 한눈에 어느 사당의 정령인지 알 수 있게 */
function spiritCrest(kind, hex){
  const g = new THREE.Group();
  const M = c => new THREE.MeshBasicMaterial({color:c});
  const light = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.45).getHex();
  switch(kind){
    case 'pv': {                                   // ☀️ 해 — 원반 + 광선
      const d = new THREE.Mesh(SP_GEO.disc, M(light)); d.rotation.x = Math.PI/2; d.scale.set(1.35,1,1.35); g.add(d);
      for(let i=0;i<4;i++){ const s=new THREE.Mesh(SP_GEO.mote, M(hex));
        const a=i/4*Math.PI*2+0.78; s.position.set(Math.cos(a)*0.46, Math.sin(a)*0.46, 0); s.scale.setScalar(1.5); g.add(s); }
      break; }
    case 'st': {                                   // 🔥 불꽃
      const c1=new THREE.Mesh(SP_GEO.cone, M(hex)); c1.position.y=0.14; g.add(c1);
      const c2=new THREE.Mesh(SP_GEO.cone, M(light)); c2.scale.setScalar(0.55); c2.position.y=0.10; g.add(c2);
      break; }
    case 'wind': {                                 // 🌪️ 바람개비
      for(let i=0;i<3;i++){ const b=new THREE.Mesh(SP_GEO.blade, M(i?light:hex));
        b.rotation.z=i/3*Math.PI*2; b.position.set(Math.cos(i/3*Math.PI*2)*0.16, Math.sin(i/3*Math.PI*2)*0.16, 0); g.add(b); }
      break; }
    case 'hyd': {                                  // 💧 물방울
      const d=new THREE.Mesh(SP_GEO.drop, M(light)); g.add(d);
      const t=new THREE.Mesh(SP_GEO.cone, M(light)); t.scale.set(0.8,0.6,0.8); t.position.y=0.22; g.add(t);
      break; }
    case 'geo': {                                  // 🌋 화산
      const c=new THREE.Mesh(SP_GEO.cone, M(hex)); c.scale.set(1.3,1,1.3); g.add(c);
      const l=new THREE.Mesh(SP_GEO.mote, M(0xffd764)); l.position.y=0.22; g.add(l);
      break; }
    case 'oce': {                                  // 🌊 파도
      const w=new THREE.Mesh(SP_GEO.wave, M(light)); w.rotation.z=Math.PI; g.add(w);
      const w2=new THREE.Mesh(SP_GEO.wave, M(hex)); w2.scale.setScalar(0.6); w2.rotation.z=Math.PI; w2.position.y=-0.10; g.add(w2);
      break; }
    case 'bio': {                                  // 🌽 잎 두 장
      [-1,1].forEach(s=>{ const l=new THREE.Mesh(SP_GEO.leaf, M(s>0?hex:light));
        l.scale.set(1.5,0.6,0.9); l.position.set(s*0.17,0,0); l.rotation.z=s*0.5; g.add(l); });
      break; }
    case 'wst': {                                  // ♻️ 순환 고리
      const t=new THREE.Mesh(SP_GEO.torus, M(light)); g.add(t);
      for(let i=0;i<2;i++){ const s=new THREE.Mesh(SP_GEO.mote, M(hex));
        const a=i*Math.PI; s.position.set(Math.cos(a)*0.22, Math.sin(a)*0.22, 0); g.add(s); }
      break; }
    case 'h2': {                                   // ⚛️ 원자
      const n=new THREE.Mesh(SP_GEO.mote, M(light)); n.scale.setScalar(1.6); g.add(n);
      [0.6,-0.6].forEach(r=>{ const t=new THREE.Mesh(SP_GEO.torus, M(hex));
        t.scale.setScalar(1.25); t.rotation.y=r; g.add(t); });
      break; }
    default: {                                     // 🔋 전지
      const b=new THREE.Mesh(SP_GEO.box, M(light)); g.add(b);
      const c=new THREE.Mesh(SP_GEO.mote, M(hex)); c.position.y=0.21; g.add(c);
    }
  }
  return g;
}

/* 정령 본체 — 몸통 하나에 꼬리·눈·문장을 붙인다 */
function makeSpirit(hex, kind){
  const g = new THREE.Group();
  const col   = new THREE.Color(hex);
  const pale  = col.clone().lerp(new THREE.Color(0xffffff), 0.12).getHex();
  const paler = col.clone().lerp(new THREE.Color(0xffffff), 0.34).getHex();

  /* 몸통 — 반투명한 옅은 색 */
  const bodyMat = new THREE.MeshBasicMaterial({color:paler});   /* 불투명 — 파스텔 로우폴리와 어울린다 */
  const head = new THREE.Mesh(SP_GEO.head, bodyMat); head.position.y = 0.34; g.add(head);
  const tail = new THREE.Mesh(SP_GEO.tail, bodyMat); tail.position.y = -0.30; tail.rotation.x = Math.PI; g.add(tail);

  /* 테두리 후광 — BackSide 라 안쪽을 가리지 않는다 */
  const aura = new THREE.Mesh(SP_GEO.head, new THREE.MeshBasicMaterial({
    color:pale, transparent:true, opacity:0.20, side:THREE.BackSide, depthWrite:false}));
  aura.position.y = 0.34; aura.scale.setScalar(1.20); g.add(aura);

  /* 눈 — 큰 검은 눈 + 하이라이트 (캐릭터와 같은 귀여운 인상) */
  const eyeMat = new THREE.MeshBasicMaterial({color:0x22303f});
  const hiMat  = new THREE.MeshBasicMaterial({color:0xffffff});
  const eyes = [];
  [-0.20, 0.20].forEach(x=>{
    const e = new THREE.Mesh(SP_GEO.eye, eyeMat);
    e.position.set(x, 0.42, 0.555); e.scale.set(1.15, 1.40, 0.7); g.add(e); eyes.push(e);
    const h = new THREE.Mesh(SP_GEO.hi, hiMat);
    h.position.set(x + 0.035, 0.455, 0.60); g.add(h); eyes.push(h);
  });
  /* 볼터치 */
  [-0.36, 0.36].forEach(x=>{
    const b = new THREE.Mesh(SP_GEO.hi, new THREE.MeshBasicMaterial({
      color:0xff9fb0, transparent:true, opacity:0.55}));
    b.position.set(x, 0.28, 0.45); b.scale.set(2.0, 1.3, 0.6); g.add(b);
  });

  /* 미소 — 호 하나 (메시 1개) */
  const mouth=new THREE.Mesh(SP_GEO.smile, eyeMat);
  mouth.position.set(0, 0.255, 0.575); mouth.rotation.z=Math.PI; g.add(mouth);

  /* 머리 위 문장 */
  const crest = spiritCrest(kind, hex);
  crest.position.y = 1.48; crest.scale.setScalar(1.15); g.add(crest);

  /* 허리 고리 + 주위를 도는 반짝임 */
  const ring = new THREE.Mesh(SP_GEO.ring, new THREE.MeshBasicMaterial({
    color:pale, transparent:true, opacity:0.55}));
  ring.rotation.x = 1.30; g.add(ring);
  const motes = [];
  for(let i=0;i<2;i++){
    const m = new THREE.Mesh(SP_GEO.mote, new THREE.MeshBasicMaterial({color:paler}));
    g.add(m); motes.push(m);
  }
  g.scale.setScalar(1.32);
  return {g, head, tail, aura, crest, ring, motes, bodyMat};
}

/* 대화창·확인문제에 쓰는 정령 초상화 — 3D 모델과 같은 디자인을 2D로 그린다.
   (오프스크린 3D 렌더는 기기에 따라 실패할 수 있어 캔버스로 그린다) */
const SP_PORTRAIT = {};
function spiritPortrait(shrineId){
  if(SP_PORTRAIT[shrineId]) return SP_PORTRAIT[shrineId];
  const s = SH[shrineId]; if(!s) return '';
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S*2; const g = cv.getContext('2d'); g.scale(2,2);
  const col   = new THREE.Color(s.col);
  const body  = '#'+col.clone().lerp(new THREE.Color(0xffffff), 0.34).getHexString();
  const glowC = '#'+col.clone().lerp(new THREE.Color(0xffffff), 0.12).getHexString();

  const cx = S/2, cy = S*0.56, r = S*0.29;
  /* 후광 */
  const gr = g.createRadialGradient(cx, cy, r*0.6, cx, cy, r*1.65);
  gr.addColorStop(0, glowC+'55'); gr.addColorStop(1, glowC+'00');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r*1.65, 0, 6.283); g.fill();
  /* 몸통 — 머리 원 + 아래로 뾰족한 꼬리 */
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(cx - r, cy);
  g.arc(cx, cy, r, Math.PI, 0);
  g.lineTo(cx + r*0.72, cy + r*0.55);
  g.lineTo(cx, cy + r*1.5);
  g.lineTo(cx - r*0.72, cy + r*0.55);
  g.closePath(); g.fill();
  /* 볼터치 */
  g.fillStyle = 'rgba(255,150,170,.45)';
  [-1,1].forEach(k=>{ g.beginPath(); g.ellipse(cx + k*r*0.62, cy + r*0.16, r*0.20, r*0.13, 0, 0, 6.283); g.fill(); });
  /* 눈 + 하이라이트 */
  g.fillStyle = '#22303f';
  [-1,1].forEach(k=>{ g.beginPath(); g.ellipse(cx + k*r*0.34, cy - r*0.10, r*0.155, r*0.20, 0, 0, 6.283); g.fill(); });
  g.fillStyle = '#fff';
  [-1,1].forEach(k=>{ g.beginPath(); g.arc(cx + k*r*0.34 + r*0.06, cy - r*0.18, r*0.058, 0, 6.283); g.fill(); });
  /* 미소 */
  g.strokeStyle = '#22303f'; g.lineWidth = r*0.09; g.lineCap='round';
  g.beginPath(); g.arc(cx, cy + r*0.12, r*0.20, 0.25*Math.PI, 0.75*Math.PI); g.stroke();
  /* 머리 위 문장 — 사당 아이콘 */
  g.font = '900 '+Math.round(S*0.20)+'px "Gothic A1", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(s.icon, cx, cy - r*1.55);

  return (SP_PORTRAIT[shrineId] = cv.toDataURL('image/png'));
}
