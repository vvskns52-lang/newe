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
   5등신 스타일라이즈 캐릭터
   ═══════════════════════════════════════════ */
function makeHumanoid(o){
  o = o || {};
  const skinM  = soft(o.skin  || ART.player.skin);
  const clothM = matte (o.cloth || ART.player.tunic);
  const pantsM = matte (o.pants || ART.player.pants);
  const hairM  = matte (o.hair  || ART.player.hair);
  const bootM  = matte (o.boot  || ART.player.boot);
  const g = new THREE.Group();

  /* 몸통 — 어깨는 넓고 허리로 갈수록 좁아진다 */
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.25, 1.05, 8), clothM);
  torso.position.y = 2.02; torso.castShadow = true; g.add(torso);
  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.355, 10, 6), clothM);
  collar.position.y = 2.5; collar.scale.set(1, 0.5, 0.9); g.add(collar);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 8), matte(ART.city.wood));
  belt.position.y = 1.5; g.add(belt);
  const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.34, 8), pantsM);
  hip.position.y = 1.33; g.add(hip);

  /* 머리 — 전체 키의 1/5 */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.375, 12, 9), skinM);
  head.position.y = 2.98; head.scale.set(1, 1.02, 0.95); head.castShadow = true; g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 6), skinM);
  neck.position.y = 2.62; g.add(neck);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.395, 12, 9, 0, 6.283, 0, 1.30), hairM);
  hair.position.y = 2.99; hair.scale.set(1.02, 1.0, 1.0); g.add(hair);
  const bang = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6, 0, 6.283, 0, 0.9), hairM);
  bang.position.set(0, 3.03, 0.11); bang.rotation.x = 0.42; bang.scale.set(1.05, 0.7, 0.85); g.add(bang);
  const eyeG = new THREE.SphereGeometry(0.052, 7, 6), eyeM = glow(0x27313f);
  const e1 = new THREE.Mesh(eyeG, eyeM), e2 = new THREE.Mesh(eyeG, eyeM);
  e1.position.set(-0.14, 2.97, 0.335); e2.position.set(0.14, 2.97, 0.335);
  e1.scale.set(1,1.25,1); e2.scale.set(1,1.25,1); g.add(e1); g.add(e2);

  /* 팔 — 어깨에서 회전하도록 피벗을 옮긴다 */
  function limb(rTop, rBot, len, m, capM){
    const grp = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 6), m);
    s.position.y = -len/2; s.castShadow = true; grp.add(s);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rBot*1.15, 7, 6), capM || m);
    cap.position.y = -len; grp.add(cap);
    return grp;
  }
  const aL = limb(0.105, 0.085, 0.92, clothM, skinM); aL.position.set(-0.38, 2.42, 0); g.add(aL);
  const aR = limb(0.105, 0.085, 0.92, clothM, skinM); aR.position.set( 0.38, 2.42, 0); g.add(aR);
  const lL = limb(0.135, 0.115, 1.30, pantsM, bootM); lL.position.set(-0.145, 1.33, 0); g.add(lL);
  const lR = limb(0.135, 0.115, 1.30, pantsM, bootM); lR.position.set( 0.145, 1.33, 0); g.add(lR);

  /* 망토 — 뒤를 감싸는 열린 원통 조각 */
  let cape = null;
  if(o.cape !== false){
    const capeM = new THREE.MeshLambertMaterial({
      color:o.cape || ART.player.cape, flatShading:true, side:THREE.DoubleSide });
    cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.46, 1.30, 10, 1, true, Math.PI*0.62, Math.PI*0.76), capeM);
    cape.position.set(0, 2.26, -0.07); cape.castShadow = true; g.add(cape);
  }
  if(o.hat){
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 12), matte(o.hat));
    brim.position.y = 3.16; g.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.28, 0.36, 10), matte(o.hat));
    top.position.y = 3.35; g.add(top);
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
  }
  body.castShadow = true; g.add(body);
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
