/* ═══════════════════════════════════════════════════════════════
   world.js — 렌더러 · 조명 · 지형 · 바다 · 초목 · 빛의 도시
   색과 형태는 art.js(ART)에서 가져옵니다.
   ═══════════════════════════════════════════════════════════════ */

/* ── 렌더러 ── */
let renderer;
try{
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
}catch(err){
  try{ renderer = new THREE.WebGLRenderer({antialias:false}); }
  catch(err2){ if(window.__webglHint) window.__webglHint(); throw err2; }
}
renderer.setPixelRatio(Math.min(devicePixelRatio, LOWQ?1.3:1.8));
renderer.setSize(innerWidth, innerHeight);
/* 그림자 맵은 쓰지 않는다 — 시작할 때 가장 무거운 비용이었다.
   입체감은 캐릭터 발밑의 값싼 원반 그림자(blobShadow)로 대신한다. */
renderer.shadowMap.enabled = false;
renderer.outputEncoding = THREE.sRGBEncoding;
/* 하늘 돔 밖(먼 거리)이 검게 보이지 않도록 배경색을 안개색으로 맞춘다 */
renderer.setClearColor(ART.fog.color, 1);
document.getElementById('scene').appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.fog    = new THREE.Fog(ART.fog.color, ART.fog.near, ART.fog.far);
const camera = new THREE.PerspectiveCamera(56, innerWidth/innerHeight, 0.5, 720);
scene.add(makeSky());

/* ── 조명: 따뜻한 주광 + 시원한 환경광 + 실루엣을 살리는 역광 ── */
const hemi = new THREE.HemisphereLight(ART.hemi.sky, ART.hemi.ground, ART.hemi.intensity);
scene.add(hemi);
const sun = new THREE.DirectionalLight(ART.sun.color, ART.sun.intensity);
sun.position.set.apply(sun.position, ART.sun.dir);
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(ART.rim.color, ART.rim.intensity);
rim.position.set.apply(rim.position, ART.rim.dir); scene.add(rim);

/* ══════════════ 지형 ══════════════ */
const GC = ART.ground;
const C_UNDER=new THREE.Color(GC.under), C_SAND=new THREE.Color(GC.sand),
      C_GL=new THREE.Color(GC.grassL), C_GD=new THREE.Color(GC.grassD),
      C_ROCK=new THREE.Color(GC.rock), C_SNOW=new THREE.Color(GC.snow), C_SOIL=new THREE.Color(GC.soil);
const C_BIOME = {}; BIOMES.forEach(b=>C_BIOME[b.id]=new THREE.Color(b.ground));
function terrainColor(y, slope, x, z){
  const c = new THREE.Color();
  if(y < 0.35)      c.copy(C_UNDER).lerp(C_SAND, smooth(-2.2,0.35,y));
  else if(y < 2.4)  c.copy(C_SAND).lerp(C_GL, smooth(1.0,2.6,y));
  else if(y < 18)   c.copy(C_GL).lerp(C_GD, smooth(3,17,y));
  else if(y < 32)   c.copy(C_GD).lerp(C_ROCK, smooth(18,31,y));
  else              c.copy(C_ROCK).lerp(C_SNOW, smooth(32,44,y));

  /* 지역 색을 섞는다 — 도시에서 멀수록, 그 지역의 중심에 가까울수록 진하게 */
  if(y > 0.6){
    const bi = biomeAt(x,z);
    if(bi.w > 0.12){
      const city = Math.exp(-(x*x+z*z)/(2*46*46));
      c.lerp(C_BIOME[bi.b.id], Math.min(0.62, bi.w*0.78) * (1-city));
    }
  }
  if(slope > 0.62 && y > 2) c.lerp(C_ROCK, smooth(0.62,0.95,slope)*0.72);
  c.offsetHSL(0, 0, (rnd()-0.5)*0.04);
  return c;
}
let terrain;
(function buildTerrain(){
  const SEG = LOWQ?96:124;   /* 섬이 넓어진 만큼 격자도 늘린다 (칸 약 2.6m 유지) */
  let g = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
  g.rotateX(-Math.PI/2);
  const p = g.attributes.position;
  for(let i=0;i<p.count;i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  g = g.toNonIndexed();
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n*3);
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c2=new THREE.Vector3(),
        ab=new THREE.Vector3(), ac=new THREE.Vector3(), nv=new THREE.Vector3();
  for(let i=0;i<n;i+=3){
    a.fromBufferAttribute(pos,i); b.fromBufferAttribute(pos,i+1); c2.fromBufferAttribute(pos,i+2);
    ab.subVectors(b,a); ac.subVectors(c2,a); nv.crossVectors(ab,ac).normalize();
    const y=(a.y+b.y+c2.y)/3, slope=1-Math.abs(nv.y);
    const cc = terrainColor(y, slope, (a.x+b.x+c2.x)/3, (a.z+b.z+c2.z)/3);
    for(let k=0;k<3;k++){ col[(i+k)*3]=cc.r; col[(i+k)*3+1]=cc.g; col[(i+k)*3+2]=cc.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col,3));
  g.computeVertexNormals();
  terrain = new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors:true, flatShading:true})); scene.add(terrain);
})();

/* ══════════════ 바다 ══════════════ */
const waterGeo = new THREE.PlaneGeometry(760,760,40,40); waterGeo.rotateX(-Math.PI/2);
const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
  color:ART.water.surface, transparent:true, opacity:0.85, flatShading:true }));
water.position.y = 0.18; scene.add(water);
const waterBase = waterGeo.attributes.position.array.slice();
const deep = new THREE.Mesh(new THREE.PlaneGeometry(820,820), glow(ART.water.deep));
deep.rotation.x = -Math.PI/2; deep.position.y = -3.2; scene.add(deep);
/* 해안 포말 — 섬 둘레를 감싸는 밝은 띠 */
const foam = new THREE.Mesh(new THREE.RingGeometry(140, 150, 84, 1),
  glow(ART.water.foam, {transparent:true, opacity:0.5, side:THREE.DoubleSide}));
foam.rotation.x = -Math.PI/2; foam.position.y = 0.34; scene.add(foam);

/* ══════════════ 초목 · 바위 ══════════════ */
const props = new THREE.Group(); scene.add(props);
const clouds = [];
let CLOUD_MESH=null, CLOUD_PER=4;
function nearShrine(x,z,r){ for(const s of SHRINES) if(Math.hypot(x-s.x,z-s.z)<r) return true; return false; }

(function scatter(){
  const D = new THREE.Object3D();
  const trunks=[], canopies=[[],[],[],[]], rocks=[[],[],[]], flowers=[[],[],[],[]], bushes=[[],[]];

  /* ── 지역마다 다른 초목 ──
     후보 지점을 섬 전체에 뿌린 뒤, 그 자리의 지역이 정한 배율(tree/grass/rock)로
     받아들일지 결정한다. 화산·고원·갯벌은 tree 가 0 이라 나무가 아예 자라지 않는다. */
  const FOLI = [];                                  // 지역별 잎 색을 하나로 모은다
  BIOMES.forEach(b=>b.foliage.forEach(c=>{ if(FOLI.indexOf(c)<0) FOLI.push(c); }));
  const ROCKC = [];
  BIOMES.forEach(b=>{ if(ROCKC.indexOf(b.rockC)<0) ROCKC.push(b.rockC); });
  canopies.length = 0; FOLI.forEach(()=>canopies.push([]));
  rocks.length    = 0; ROCKC.forEach(()=>rocks.push([]));

  const R_MAX = 150, R_CITY = 34;
  function spot(){
    const a = rnd()*Math.PI*2, rr = R_CITY + rnd()*(R_MAX-R_CITY);
    const x = Math.cos(a)*rr, z = Math.sin(a)*rr;
    return {x, z, y:hAt(x,z), b:biomeAt(x,z).b};
  }

  /* 나무 */
  for(let i=0;i<(LOWQ?620:1000);i++){
    const p = spot();
    if(p.y<1.6 || p.y>26) continue;
    if(rnd() > p.b.tree) continue;
    if(nearShrine(p.x,p.z,15)) continue;
    const t = treeInstance(p.x, p.y-0.2, p.z, rnd);
    const ci = FOLI.indexOf(p.b.foliage[(rnd()*p.b.foliage.length)|0]);
    trunks.push(t.trunk);
    t.canopy.forEach(c=>{ const cc=c.slice(); cc[8]=ci; canopies[ci].push(cc); });
  }
  /* 덤불 */
  for(let i=0;i<(LOWQ?260:480);i++){
    const p = spot();
    if(p.y<1.6 || p.y>20) continue;
    if(rnd() > p.b.tree*0.9 + p.b.grass*0.12) continue;
    if(nearShrine(p.x,p.z,12)) continue;
    bushes[(rnd()*2)|0].push([p.x, p.y+0.42, p.z, 0.5+rnd()*0.7, rnd()*6.283]);
  }
  /* 바위 — 화산·갯벌·고원에서 많아진다 */
  for(let i=0;i<(LOWQ?260:420);i++){
    const p = spot();
    if(p.y<-0.6 || p.y>40) continue;
    if(rnd()*1.4 > p.b.rock) continue;
    if(nearShrine(p.x,p.z,11)) continue;
    const ri = ROCKC.indexOf(p.b.rockC);
    rocks[ri].push([p.x, p.y+0.15, p.z, 0.6+rnd()*1.8, (rnd()-0.5)*0.3, rnd()*6.283, (rnd()-0.5)*0.3,
                    0.55+rnd()*0.9, 0.7+rnd()*1.6]);
  }
  /* 꽃 */
  for(let i=0;i<(LOWQ?220:400);i++){
    const p = spot();
    if(p.y<1.8 || p.y>18) continue;
    if(rnd()*1.6 > p.b.grass) continue;
    flowers[(rnd()*4)|0].push([p.x, p.y+0.28, p.z, 1, 0]);
  }

  function inst(geo, material, list, mode, shadow){
    if(!list.length) return null;
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((v,i)=>{
      D.position.set(v[0], v[1], v[2]);
      if(mode==='canopy'){ D.rotation.set(v[7], v[6], v[7]*0.6); D.scale.set(v[3], v[4], v[5]); }
      else if(mode==='rock'){ D.rotation.set(v[4], v[5], v[6]); D.scale.set(v[3], v[7], v[8]); }
      else if(mode==='trunk'){ D.rotation.set(v[5], v[4], v[5]*0.7); D.scale.setScalar(v[3]); }
      else { D.rotation.set(0, v[4], 0); D.scale.setScalar(v[3]); }
      D.updateMatrix(); m.setMatrixAt(i, D.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    props.add(m); return m;
  }
  /* 나무·바위 발밑 원반 그림자 — InstancedMesh 하나로 전부 그린다 (드로우콜 +2) */
  (function groundBlobs(){
    const put=(list, sizeOf)=>{
      if(!list.length) return null;
      const m=new THREE.InstancedMesh(BLOB_GEO,
        new THREE.MeshBasicMaterial({map:BLOB_TEX, transparent:true, depthWrite:false, fog:false, opacity:1}),
        list.length);
      list.forEach((v,i)=>{
        D.position.set(v[0], hAt(v[0],v[2])+0.05, v[2]);
        D.rotation.set(-Math.PI/2, 0, 0);
        D.scale.setScalar(sizeOf(v));
        D.updateMatrix(); m.setMatrixAt(i, D.matrix);
      });
      m.instanceMatrix.needsUpdate=true; m.frustumCulled=false; m.renderOrder=-1;
      props.add(m); return m;
    };
    put(trunks, v=>2.6*(v[3]||1));
    const allRocks=[].concat.apply([], rocks);
    put(allRocks, v=>1.5*(v[3]||1));
  })();

  inst(TREE_GEO.trunk, matte(ART.trunk), trunks, 'trunk');
  canopies.forEach((L,i)=>inst(TREE_GEO.canopy, matte(FOLI[i]), L, 'canopy'));
  bushes.forEach((L,i)=>inst(TREE_GEO.bush, matte(ART.bush[i]), L, 'flat'));
  rocks.forEach((L,i)=>inst(ROCK_GEO, matte(ROCKC[i]), L, 'rock'));
  flowers.forEach((L,i)=>inst(new THREE.SphereGeometry(0.13,8,6), matte(ART.flower[i]), L, 'flat', false));

  /* 풀 */
  const bladeG = new THREE.ConeGeometry(0.13, 0.58, 4);
  /* 풀은 지역별로 색과 밀도가 다르다 — 바람 언덕은 길고 빽빽하게 */
  const GRASSN = LOWQ?2000:3400;
  const gi = new THREE.InstancedMesh(bladeG, matte(FOLI[0]), GRASSN);
  const giC = new Float32Array(GRASSN*3), tmpC = new THREE.Color();
  let n=0;
  for(let i=0;i<26000 && n<GRASSN;i++){
    const p = spot();
    if(p.y<1.4 || p.y>22) continue;
    if(rnd()*1.9 > p.b.grass) continue;
    const tall = p.b.id==='wind' ? 1.5 : 1;
    D.position.set(p.x, p.y+0.26, p.z); D.rotation.set(0, rnd()*6.283, (rnd()-0.5)*0.36);
    D.scale.set(0.9+rnd()*0.5, (0.7+rnd()*0.9)*tall, 0.9+rnd()*0.5);
    D.updateMatrix(); gi.setMatrixAt(n, D.matrix);
    tmpC.setHex(p.b.foliage[(rnd()*p.b.foliage.length)|0]).offsetHSL(0,0,(rnd()-0.5)*0.06);
    giC[n*3]=tmpC.r; giC[n*3+1]=tmpC.g; giC[n*3+2]=tmpC.b;
    n++;
  }
  gi.count=n; gi.frustumCulled=false;
  gi.instanceColor = new THREE.InstancedBufferAttribute(giC, 3);
  props.add(gi);

  /* 구름 — 덩어리 전부를 InstancedMesh 하나로 묶는다.
     섬이 넓어져 한 화면에 구름이 많이 들어오는데, 개별 메시로 두면
     그것만으로 드로우콜이 100개를 넘었다. */
  (function makeClouds(){
    const N = LOWQ?16:28, PER = 4, cloudG = new THREE.IcosahedronGeometry(4.2, 0);
    const im = new THREE.InstancedMesh(cloudG,
      new THREE.MeshLambertMaterial({color:0xffffff, flatShading:true, transparent:true, opacity:0.9}),
      N*PER);
    im.frustumCulled = false; scene.add(im);
    for(let i=0;i<N;i++){
      const c = { x:(rnd()-0.5)*440, y:54+rnd()*30, z:(rnd()-0.5)*440,
                  spd:0.6+rnd()*0.8, parts:[] };
      for(let k=0;k<PER;k++)
        c.parts.push({dx:(rnd()-0.5)*13, dy:(rnd()-0.5)*2.4, dz:(rnd()-0.5)*8,
                      s:0.55+rnd()*0.75});
      clouds.push(c);
    }
    CLOUD_MESH = im; CLOUD_PER = PER;
  })();
})();

/* ══════════════ 빛의 도시 ══════════════ */
const cityLights = [];
const cityGroup = new THREE.Group(); scene.add(cityGroup);
const cityHouses = new THREE.Group(); cityGroup.add(cityHouses);   /* 멀리서는 감출 집들 */
(function buildCity(){
  const gy = hAt(0,0), C = ART.city;
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(17,17.6,0.7,32), matte(C.plaza));
  plaza.position.set(0, gy+0.15, 0); cityGroup.add(plaza);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(14.5,0.45,6,48), matte(C.plazaEdge));
  ring.rotation.x = Math.PI/2; ring.position.set(0, gy+0.55, 0); cityGroup.add(ring);

  /* 중앙 전력탑 */
  const tower = new THREE.Group(); tower.position.set(0, gy+0.4, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2,4.4,2.2,8), matte(C.stone));
  base.position.y = 1.1; tower.add(base);
  for(let i=0;i<4;i++){
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.30,13,6), matte(C.wood));
    const a = i/4*Math.PI*2;
    leg.position.set(Math.cos(a)*2.3, 8.2, Math.sin(a)*2.3);
    leg.rotation.z = Math.cos(a)*0.09; leg.rotation.x = -Math.sin(a)*0.09; tower.add(leg);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.6,1.6,2.2,8), matte(C.stone));
  cap.position.y = 15.3; tower.add(cap);
  const beaconMat = glow(0x2c4258);
  const beacon = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1,1), beaconMat);
  beacon.position.y = 17.6; tower.add(beacon);
  const bLight = new THREE.PointLight(0xffdd88, 0, 70); bLight.position.y = 17.6; tower.add(bLight);
  cityGroup.add(tower);
  window.CITY = {tower, beacon, beaconMat, bLight, gy};

  /* 집 — 위로 갈수록 살짝 좁아지는 벽, 처마가 나온 지붕, 굴뚝 */
  for(let i=0;i<16;i++){
    const a = i/16*Math.PI*2 + 0.16, rr = 27 + (i%3)*4.6;
    const x = Math.cos(a)*rr, z = Math.sin(a)*rr, y = hAt(x,z);
    const g = new THREE.Group();
    const w = 3.6+rnd()*1.9, h = 2.6+rnd()*1.6;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(w*0.62, w*0.72, h, 4), matte(C.wall[(rnd()*4)|0]));
    wall.rotation.y = Math.PI/4; wall.position.y = h/2; g.add(wall);
    const rh = 1.5+rnd()*0.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w*1.02, rh, 4), matte(C.roof[(rnd()*4)|0]));
    roof.rotation.y = Math.PI/4; roof.position.y = h+rh/2-0.06; g.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.15), matte(C.wood));
    door.position.set(0, 0.58, w*0.665); g.add(door);
    if(rnd()<0.6){
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.24,1.1,6), matte(C.stone));
      ch.position.set(w*0.28, h+1.3, -w*0.22); g.add(ch);
    }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85,1.0), glow(0x3b4a5c));
    win.position.set(0, h*0.68, w*0.648); g.add(win); cityLights.push(win.material);
    if(i%4===0){ const pl=new THREE.PointLight(0xffd27a,0,12); pl.position.set(0,h*0.6,0); g.add(pl); cityLights.push(pl); }
    g.position.set(x,y,z); g.rotation.y = -a + Math.PI/2; cityHouses.add(g);
  }
})();
