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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOWQ ? THREE.BasicShadowMap : THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('scene').appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.fog    = new THREE.Fog(ART.fog.color, ART.fog.near, ART.fog.far);
const camera = new THREE.PerspectiveCamera(56, innerWidth/innerHeight, 0.5, 520);
scene.add(makeSky());

/* ── 조명: 따뜻한 주광 + 시원한 환경광 + 실루엣을 살리는 역광 ── */
const hemi = new THREE.HemisphereLight(ART.hemi.sky, ART.hemi.ground, ART.hemi.intensity);
scene.add(hemi);
const sun = new THREE.DirectionalLight(ART.sun.color, ART.sun.intensity);
sun.position.set.apply(sun.position, ART.sun.dir);
sun.castShadow = true;
sun.shadow.mapSize.set(LOWQ?768:1024, LOWQ?768:1024);
sun.shadow.camera.near = 40; sun.shadow.camera.far = 260;
sun.shadow.camera.left=-46; sun.shadow.camera.right=46; sun.shadow.camera.top=46; sun.shadow.camera.bottom=-46;
sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.6;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(ART.rim.color, ART.rim.intensity);
rim.position.set.apply(rim.position, ART.rim.dir); scene.add(rim);

/* ══════════════ 지형 ══════════════ */
const GC = ART.ground;
const C_UNDER=new THREE.Color(GC.under), C_SAND=new THREE.Color(GC.sand),
      C_GL=new THREE.Color(GC.grassL), C_GD=new THREE.Color(GC.grassD),
      C_ROCK=new THREE.Color(GC.rock), C_SNOW=new THREE.Color(GC.snow), C_SOIL=new THREE.Color(GC.soil);
function terrainColor(y, slope, x, z){
  const c = new THREE.Color();
  if(y < 0.35)      c.copy(C_UNDER).lerp(C_SAND, smooth(-2.2,0.35,y));
  else if(y < 2.4)  c.copy(C_SAND).lerp(C_GL, smooth(1.0,2.6,y));
  else if(y < 15)   c.copy(C_GL).lerp(C_GD, smooth(3,14,y));
  else if(y < 26)   c.copy(C_GD).lerp(C_ROCK, smooth(15,25,y));
  else              c.copy(C_ROCK).lerp(C_SNOW, smooth(26,36,y));
  if(slope > 0.62 && y > 2) c.lerp(C_ROCK, smooth(0.62,0.95,slope)*0.72);
  if(y>2 && y<14 && Math.hypot(x-70,z-10)<30) c.lerp(C_SOIL, 0.24);
  c.offsetHSL(0, 0, (rnd()-0.5)*0.04);
  return c;
}
let terrain;
(function buildTerrain(){
  const SEG = LOWQ?84:112;
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
  terrain = new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors:true, flatShading:true}));
  terrain.receiveShadow = true; scene.add(terrain);
})();

/* ══════════════ 바다 ══════════════ */
const waterGeo = new THREE.PlaneGeometry(480,480,36,36); waterGeo.rotateX(-Math.PI/2);
const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
  color:ART.water.surface, transparent:true, opacity:0.85, flatShading:true }));
water.position.y = 0.18; scene.add(water);
const waterBase = waterGeo.attributes.position.array.slice();
const deep = new THREE.Mesh(new THREE.PlaneGeometry(520,520), glow(ART.water.deep));
deep.rotation.x = -Math.PI/2; deep.position.y = -3.2; scene.add(deep);
/* 해안 포말 — 섬 둘레를 감싸는 밝은 띠 */
const foam = new THREE.Mesh(new THREE.RingGeometry(84, 91, 72, 1),
  glow(ART.water.foam, {transparent:true, opacity:0.5, side:THREE.DoubleSide}));
foam.rotation.x = -Math.PI/2; foam.position.y = 0.34; scene.add(foam);

/* ══════════════ 초목 · 바위 ══════════════ */
const props = new THREE.Group(); scene.add(props);
const clouds = [];
function nearShrine(x,z,r){ for(const s of SHRINES) if(Math.hypot(x-s.x,z-s.z)<r) return true; return false; }

(function scatter(){
  const D = new THREE.Object3D();
  const trunks=[], canopies=[[],[],[],[]], rocks=[[],[],[]], flowers=[[],[],[],[]], bushes=[[],[]];

  /* 나무 */
  for(let i=0;i<(LOWQ?210:340);i++){
    const a=rnd()*Math.PI*2, rr=8+rnd()*82, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.6||y>21) continue;
    if(Math.hypot(x,z)<26) continue;
    if(nearShrine(x,z,13)) continue;
    const t = treeInstance(x, y-0.2, z, rnd);
    trunks.push(t.trunk);
    t.canopy.forEach(c=>canopies[c[8]].push(c));
  }
  /* 덤불 — 나무와 풀 사이의 중간 실루엣 */
  for(let i=0;i<(LOWQ?70:130);i++){
    const a=rnd()*Math.PI*2, rr=12+rnd()*76, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.6||y>17||Math.hypot(x,z)<22) continue; if(nearShrine(x,z,11)) continue;
    bushes[(rnd()*2)|0].push([x, y+0.42, z, 0.5+rnd()*0.7, rnd()*6.283]);
  }
  /* 바위 */
  for(let i=0;i<(LOWQ?80:130);i++){
    const a=rnd()*Math.PI*2, rr=10+rnd()*92, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<-0.6||y>33) continue; if(nearShrine(x,z,10)) continue;
    rocks[(rnd()*3)|0].push([x, y+0.15, z, 0.6+rnd()*1.7, (rnd()-0.5)*0.3, rnd()*6.283, (rnd()-0.5)*0.3,
                             0.55+rnd()*0.9, 0.7+rnd()*1.6]);
  }
  /* 꽃 */
  for(let i=0;i<(LOWQ?120:220);i++){
    const a=rnd()*Math.PI*2, rr=12+rnd()*70, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.8||y>14||Math.hypot(x,z)<19) continue;
    flowers[(rnd()*4)|0].push([x, y+0.28, z, 1, 0]);
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
    m.castShadow = shadow!==false; m.receiveShadow = true; m.frustumCulled = false;
    props.add(m); return m;
  }
  inst(TREE_GEO.trunk, matte(ART.trunk), trunks, 'trunk');
  canopies.forEach((L,i)=>inst(TREE_GEO.canopy, matte(ART.foliage[i]), L, 'canopy'));
  bushes.forEach((L,i)=>inst(TREE_GEO.bush, matte(ART.bush[i]), L, 'flat'));
  rocks.forEach((L,i)=>{
    const shade = new THREE.Color(ART.ground.rock).offsetHSL(0, 0, (i-1)*0.05);
    inst(ROCK_GEO, matte(shade.getHex()), L, 'rock');
  });
  flowers.forEach((L,i)=>inst(new THREE.SphereGeometry(0.13,8,6), matte(ART.flower[i]), L, 'flat', false));

  /* 풀 */
  const bladeG = new THREE.ConeGeometry(0.13, 0.58, 4);
  const GRASSN = LOWQ?1300:2600;
  const gi = new THREE.InstancedMesh(bladeG, matte(ART.foliage[0]), GRASSN);
  let n=0;
  for(let i=0;i<6000 && n<GRASSN;i++){
    const a=rnd()*Math.PI*2, rr=6+rnd()*84, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.4||y>18||Math.hypot(x,z)<19) continue;
    D.position.set(x,y+0.26,z); D.rotation.set(0, rnd()*6.283, (rnd()-0.5)*0.36);
    D.scale.set(0.9+rnd()*0.5, 0.7+rnd()*0.9, 0.9+rnd()*0.5); D.updateMatrix(); gi.setMatrixAt(n++, D.matrix);
  }
  gi.count=n; gi.frustumCulled=false; props.add(gi);

  /* 구름 */
  for(let i=0;i<(LOWQ?14:26);i++){
    const g=new THREE.Group(), n2=3+((rnd()*3)|0);
    for(let k=0;k<n2;k++){
      const s=new THREE.Mesh(new THREE.IcosahedronGeometry(3.4+rnd()*3, 0),
        new THREE.MeshLambertMaterial({color:0xffffff, flatShading:true, transparent:true, opacity:0.9}));
      s.position.set((rnd()-0.5)*11, (rnd()-0.5)*2, (rnd()-0.5)*7); s.scale.y=0.55; g.add(s);
    }
    g.position.set((rnd()-0.5)*280, 48+rnd()*26, (rnd()-0.5)*280);
    g.userData.spd = 0.6+rnd()*0.8; scene.add(g); clouds.push(g);
  }
})();

/* ══════════════ 빛의 도시 ══════════════ */
const cityLights = [];
const cityGroup = new THREE.Group(); scene.add(cityGroup);
(function buildCity(){
  const gy = hAt(0,0), C = ART.city;
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(17,17.6,0.7,32), matte(C.plaza));
  plaza.position.set(0, gy+0.15, 0); plaza.receiveShadow = true; cityGroup.add(plaza);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(14.5,0.45,6,48), matte(C.plazaEdge));
  ring.rotation.x = Math.PI/2; ring.position.set(0, gy+0.55, 0); cityGroup.add(ring);

  /* 중앙 전력탑 */
  const tower = new THREE.Group(); tower.position.set(0, gy+0.4, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2,4.4,2.2,8), matte(C.stone));
  base.position.y = 1.1; base.castShadow = true; tower.add(base);
  for(let i=0;i<4;i++){
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.30,13,6), matte(C.wood));
    const a = i/4*Math.PI*2;
    leg.position.set(Math.cos(a)*2.3, 8.2, Math.sin(a)*2.3);
    leg.rotation.z = Math.cos(a)*0.09; leg.rotation.x = -Math.sin(a)*0.09;
    leg.castShadow = true; tower.add(leg);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.6,1.6,2.2,8), matte(C.stone));
  cap.position.y = 15.3; cap.castShadow = true; tower.add(cap);
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
    wall.rotation.y = Math.PI/4; wall.position.y = h/2; wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
    const rh = 1.5+rnd()*0.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w*1.02, rh, 4), matte(C.roof[(rnd()*4)|0]));
    roof.rotation.y = Math.PI/4; roof.position.y = h+rh/2-0.06; roof.castShadow = true; g.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.15), matte(C.wood));
    door.position.set(0, 0.58, w*0.665); g.add(door);
    if(rnd()<0.6){
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.24,1.1,6), matte(C.stone));
      ch.position.set(w*0.28, h+1.3, -w*0.22); ch.castShadow = true; g.add(ch);
    }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85,1.0), glow(0x3b4a5c));
    win.position.set(0, h*0.68, w*0.648); g.add(win); cityLights.push(win.material);
    if(i%4===0){ const pl=new THREE.PointLight(0xffd27a,0,12); pl.position.set(0,h*0.6,0); g.add(pl); cityLights.push(pl); }
    g.position.set(x,y,z); g.rotation.y = -a + Math.PI/2; cityGroup.add(g);
  }
})();
