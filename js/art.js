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
  torso.position.y = C.bodyY + C.bodyH/2; torso.castShadow = true; g.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW*1.04, 0.17, C.bodyD*1.04), matte(ART.city.wood));
  belt.position.y = C.bodyY + 0.10; g.add(belt);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(C.bodyW*0.74, 0.16, C.bodyD*1.07),
                                matte(o.cape === false ? (o.cloth || ART.player.tunic) : (o.cape || ART.player.cape)));
  collar.position.y = C.bodyY + C.bodyH - 0.03; g.add(collar);

  /* 머리 — 크게 */
  const head = new THREE.Mesh(new THREE.BoxGeometry(C.headW, C.headH, C.headD), skinM);
  head.position.y = C.headY + C.headH/2; head.castShadow = true; g.add(head);
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
    s.position.y = -h/2; s.castShadow = true; grp.add(s);
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
    cape.position.set(0, C.bodyY + C.bodyH*0.55, -(C.bodyD/2 + 0.06));
    cape.castShadow = true; g.add(cape);
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
