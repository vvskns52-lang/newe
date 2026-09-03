/* ═══════════════════════════════════════════════════
   actors.js — 사당 구조물 · 플레이어 · NPC · 에너지 파편
   ═══════════════════════════════════════════════════ */
/* ══════════════ 라벨 스프라이트 ══════════════ */
function makeLabel(text, sub, hex){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=160;
  const g=cv.getContext('2d');
  g.font='900 58px "Gothic A1", sans-serif'; g.textAlign='center';
  const w=Math.max(g.measureText(text).width+70, 250);
  g.fillStyle='rgba(20,32,47,.82)';
  const x=(512-w)/2, y=16, h=78, r=26;
  g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.fill();
  g.strokeStyle=hex; g.lineWidth=4; g.stroke();
  g.fillStyle='#fff'; g.fillText(text, 256, 74);
  if(sub){ g.font='800 34px "Gothic A1", sans-serif'; g.fillStyle=hex; g.fillText(sub, 256, 128); }
  const tex=new THREE.CanvasTexture(cv); tex.anisotropy=4;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false, sizeAttenuation:false}));
  sp.scale.set(0.225,0.070,1); sp.renderOrder=999;
  return sp;
}

/* ══════════════ 사당 구조물 ══════════════ */
const shrineObjs = {};
function buildShrine(s){
  const G=new THREE.Group(); G.position.set(s.x, s.gy, s.z);
  const col=new THREE.Color(s.col);
  const stone=matte(ART.shrine.stone), stone2=matte(ART.shrine.stone2);
  // 기단
  const gsh=blobShadow(24); gsh.position.y=0.03; G.add(gsh);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(8.2,9,1.1,10), stone); pad.position.y=0.3; G.add(pad);
  const pad2=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.6,0.5,10), stone2); pad2.position.y=1.0; G.add(pad2);
  // 룬 링
  const rune=new THREE.Mesh(new THREE.TorusGeometry(5.2,0.22,6,36), new THREE.MeshBasicMaterial({color:s.col}));
  rune.rotation.x=Math.PI/2; rune.position.y=1.32; G.add(rune);
  // 기둥 4개
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+Math.PI/4;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.7,6.4,6), stone);
    p.position.set(Math.cos(a)*6.4, 3.4, Math.sin(a)*6.4); G.add(p);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.6,1.7), stone2);
    cap.position.set(Math.cos(a)*6.4, 6.85, Math.sin(a)*6.4); cap.rotation.y=a; G.add(cap);
  }
  // 코어 결정
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.35,0), new THREE.MeshBasicMaterial({color:s.col}));
  core.position.y=5.6; G.add(core);
  const halo=new THREE.Mesh(new THREE.OctahedronGeometry(1.9,0), new THREE.MeshBasicMaterial({color:s.col,transparent:true,opacity:0.24,side:THREE.BackSide}));
  halo.position.y=5.6; G.add(halo);
  // 발전 설비
  const dev=new THREE.Group(); dev.position.y=1.25; G.add(dev);
  const spin=[];   // 회전 애니메이션 대상
  const flow=[];   // 상하 애니메이션 대상
  const A=(m,x,y,z)=>{m.position.set(x,y,z);dev.add(m);return m;};
  switch(s.id){
    case 'pv': {
      for(let i=0;i<3;i++){
        const pnl=new THREE.Group();
        const board=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.18,2.7), mat(0x2a4a86)); pnl.add(board);
        for(let c=0;c<4;c++) for(let r2=0;r2<2;r2++){
          const cell=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.06,1.15), mat(0x4f7fd0));
          cell.position.set(-1.65+c*1.1, 0.14, -0.65+r2*1.3); pnl.add(cell);
        }
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,1.6,5), stone2); leg.position.y=-0.9; pnl.add(leg);
        pnl.rotation.x=-0.62; pnl.position.set(-3.6+i*3.6, 1.5, -1.4); dev.add(pnl);
      }
      break; }
    case 'st': {
      const tw=A(new THREE.Mesh(new THREE.CylinderGeometry(0.7,1.1,6.2,7), stone2),0,3.1,0);
      const rc=A(new THREE.Mesh(new THREE.SphereGeometry(1.15,10,8), new THREE.MeshBasicMaterial({color:0xffd166})),0,6.3,0);
      flow.push({m:rc,amp:0,glow:true});
      for(let i=0;i<7;i++){
        const a=Math.PI*0.25+i/7*Math.PI*1.5;
        const mir=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.12,1.4), new THREE.MeshLambertMaterial({color:0xdfeaf5,flatShading:true}));
        mir.position.set(Math.cos(a)*4.6, 1.2, Math.sin(a)*4.6);
        mir.lookAt(new THREE.Vector3(0,5.5,0)); dev.add(mir);
        const st2=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,1.2,5), stone2);
        st2.position.set(Math.cos(a)*4.6,0.6,Math.sin(a)*4.6); dev.add(st2);
      }
      break; }
    case 'wind': {
      const mast=A(new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.75,9.5,8), matte(0xf6f2e6)),0,4.75,0);
      const nac =A(new THREE.Mesh(new THREE.BoxGeometry(1.1,1.0,2.4), matte(ART.shrine.stone)),0,9.7,0.4);
      const rot = new THREE.Group(); rot.position.set(0,9.7,1.7); dev.add(rot);
      const hub=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,6), matte(ART.shrine.stone2)); rot.add(hub);
      for(let i=0;i<3;i++){
        const bl=new THREE.Mesh(new THREE.BoxGeometry(0.32,6.4,0.12), mat(0xffffff));
        bl.position.y=3.2;
        const w=new THREE.Group(); w.rotation.z=i/3*Math.PI*2; w.add(bl); rot.add(w);
      }
      spin.push({m:rot, axis:'z', spd:1.9});
      break; }
    case 'hyd': {
      const dam=A(new THREE.Mesh(new THREE.BoxGeometry(11,5.4,1.8), stone),0,2.7,-2.2);
      const res=new THREE.Mesh(new THREE.BoxGeometry(10.6,4.6,5.4), new THREE.MeshLambertMaterial({color:0x4ea3e0,transparent:true,opacity:0.85,flatShading:true}));
      res.position.set(0,2.3,-5.6); dev.add(res);
      for(let i=0;i<3;i++){
        const fall=new THREE.Mesh(new THREE.BoxGeometry(1.5,4.6,0.5), new THREE.MeshLambertMaterial({color:0x9fd8f5,transparent:true,opacity:0.8,flatShading:true}));
        fall.position.set(-3.2+i*3.2, 2.3, -1.1); dev.add(fall); flow.push({m:fall,amp:0.5,spd:2.6+i});
      }
      const ph=A(new THREE.Mesh(new THREE.BoxGeometry(4.2,2.4,3.2), matte(ART.city.wall[1])),0,1.2,2.6);
      const turb=new THREE.Mesh(new THREE.TorusGeometry(1.0,0.32,6,10), matte(ART.shrine.metal));
      turb.position.set(0,1.4,4.3); dev.add(turb); spin.push({m:turb,axis:'z',spd:3.2});
      break; }
    case 'geo': {
      const cone=A(new THREE.Mesh(new THREE.ConeGeometry(4.6,3.4,7), matte(0x8a705c)),0,1.7,-2.6);
      const lava=new THREE.Mesh(new THREE.CircleGeometry(1.5,8), new THREE.MeshBasicMaterial({color:0xff7043}));
      lava.rotation.x=-Math.PI/2; lava.position.set(0,3.42,-2.6); dev.add(lava);
      for(let i=0;i<3;i++){
        const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,5.2,6), matte(ART.shrine.stone2));
        pipe.position.set(-2.4+i*2.4, 2.6, 1.4); dev.add(pipe);
      }
      const hall=A(new THREE.Mesh(new THREE.BoxGeometry(6.4,2.6,3.4), matte(ART.city.wall[2])),0,1.3,3.4);
      const cool=A(new THREE.Mesh(new THREE.CylinderGeometry(1.5,2.0,3.6,9), matte(ART.shrine.stone2)),3.9,1.8,0.2);
      for(let i=0;i<4;i++){
        const st2=new THREE.Mesh(new THREE.SphereGeometry(0.9,7,5), new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.55,flatShading:true}));
        st2.position.set(3.9,4.2+i*1.5,0.2); dev.add(st2); flow.push({m:st2,amp:1.3,spd:0.6+i*0.3,rise:true});
      }
      break; }
    case 'oce': {
      const bar=A(new THREE.Mesh(new THREE.BoxGeometry(12,2.4,2.2), stone),0,1.2,-1.2);
      for(let i=0;i<4;i++){
        const gate=new THREE.Mesh(new THREE.BoxGeometry(1.7,2.0,0.4), matte(ART.shrine.metal));
        gate.position.set(-4.5+i*3, 1.2, -0.1); dev.add(gate);
      }
      const seaIn=new THREE.Mesh(new THREE.BoxGeometry(12,1.2,5.4), new THREE.MeshLambertMaterial({color:0x53b6e0,transparent:true,opacity:0.85,flatShading:true}));
      seaIn.position.set(0,0.6,-4.6); dev.add(seaIn); flow.push({m:seaIn,amp:0.4,spd:0.7});
      for(let i=0;i<3;i++){
        const buoy=new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.7,1.2,4,8) : new THREE.CylinderGeometry(0.7,0.7,2,8), mat(0xffc94d));
        buoy.position.set(-4+i*4, 1.0, 4.4); dev.add(buoy); flow.push({m:buoy,amp:0.55,spd:1.4+i*0.4});
      }
      const tur=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.26,6,10), matte(ART.shrine.metal));
      tur.position.set(4.6,1.4,1.6); tur.rotation.y=Math.PI/2; dev.add(tur); spin.push({m:tur,axis:'z',spd:2.2});
      break; }
    case 'bio': {
      for(let i=0;i<2;i++){
        const silo=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,4.4,10), matte(ART.city.wall[0]));
        silo.position.set(-3.2+i*6.4, 2.2, -1.6); dev.add(silo);
        const top=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,6,0,6.29,0,1.57), mat(0x9cc46a));
        top.position.set(-3.2+i*6.4, 4.4, -1.6); dev.add(top);
      }
      const dome=A(new THREE.Mesh(new THREE.SphereGeometry(2.6,12,8,0,6.29,0,1.57), mat(0x8dc63f)),0,0.1,2.4);
      const barn=A(new THREE.Mesh(new THREE.BoxGeometry(4.4,2.2,3.0), matte(ART.city.wood)),0,1.1,-4.4);
      for(let i=0;i<10;i++){
        const corn=new THREE.Mesh(new THREE.ConeGeometry(0.28,1.5,5), mat(0xf0d564));
        corn.position.set(-4.5+ (i%5)*2.2, 0.75, 4.6+((i/5)|0)*1.6); dev.add(corn);
      }
      break; }
    case 'wst': {
      const plant=A(new THREE.Mesh(new THREE.BoxGeometry(7.4,3.4,4.4), matte(ART.city.wall[1])),0,1.7,0);
      const stack=A(new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.05,7.4,8), matte(ART.city.wall[2])),2.6,5.1,0);
      const band=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.7,8), mat(0xc58bd6)); band.position.set(2.6,7.6,0); dev.add(band);
      for(let i=0;i<3;i++){
        const sm=new THREE.Mesh(new THREE.SphereGeometry(0.8,7,5), new THREE.MeshLambertMaterial({color:0xf3f3f3,transparent:true,opacity:0.45,flatShading:true}));
        sm.position.set(2.6, 9.2+i*1.6, 0); dev.add(sm); flow.push({m:sm,amp:1.4,spd:0.5+i*0.25,rise:true});
      }
      const cols=[0xf0a3a3,0x9fd6f0,0xffe08a,0xa8e6a3];
      for(let i=0;i<8;i++){
        const bag=new THREE.Mesh(new THREE.IcosahedronGeometry(0.62,0), mat(cols[i%4]));
        bag.position.set(-5+ (i%4)*1.4, 0.6, 3.4+((i/4)|0)*1.5); dev.add(bag);
      }
      break; }
    case 'h2': {
      for(let i=0;i<2;i++){
        const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,4.2,10), mat(0xe3f4f7));
        tank.position.set(-3+i*6, 2.1, 0); dev.add(tank);
        const cap=new THREE.Mesh(new THREE.SphereGeometry(1.25,10,7), mat(0x4fd0e0)); cap.position.set(-3+i*6,4.2,0); dev.add(cap);
        for(let k=0;k<4;k++){
          const b=new THREE.Mesh(new THREE.SphereGeometry(0.24,6,5), new THREE.MeshBasicMaterial({color:0xbdf1f7}));
          b.position.set(-3+i*6, 0.6+k*0.9, 0.6); dev.add(b); flow.push({m:b,amp:1.7,spd:1.1+k*0.3,rise:true});
        }
      }
      const cell=A(new THREE.Mesh(new THREE.BoxGeometry(3.4,1.6,2.2), mat(0xd6e9ee)),0,0.8,3.4);
      const pv2=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.14,2.0), mat(0x2a4a86));
      pv2.position.set(0,2.6,-3.6); pv2.rotation.x=-0.6; dev.add(pv2);
      const wire=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.1,5,20), new THREE.MeshBasicMaterial({color:0xffe08a}));
      wire.position.set(0,3.6,0); wire.rotation.x=Math.PI/2; dev.add(wire); spin.push({m:wire,axis:'y',spd:1.1});
      break; }
    case 'fc': {
      for(let i=0;i<5;i++){
        const plate=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.5,3.0), mat(i%2? 0x7ae0a8 : 0xdfeee6));
        plate.position.set(0, 0.6+i*0.62, 0); dev.add(plate);
      }
      const h2t=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,3.4,9), mat(0x4fd0e0));
      h2t.position.set(-3.9,1.7,0); dev.add(h2t);
      const o2t=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,3.4,9), mat(0xa8d8ff));
      o2t.position.set(3.9,1.7,0); dev.add(o2t);
      for(let i=0;i<4;i++){
        const dp=new THREE.Mesh(new THREE.SphereGeometry(0.3,7,6), new THREE.MeshBasicMaterial({color:0x9fe8ff}));
        dp.position.set(0.4+i*0.4, 4.2, 2.2); dev.add(dp); flow.push({m:dp,amp:-1.5,spd:1.3+i*0.4,rise:true});
      }
      break; }
  }
  const label = makeLabel(s.name, s.ch+'차시 · '+s.short, '#'+col.getHexString());
  label.position.y=9.4; G.add(label);
  scene.add(G);
  shrineObjs[s.id] = {G, core, halo, rune, spin, flow, label, dev};
}
SHRINES.forEach(buildShrine);

/* 플레이어 */
const player = makeHumanoid({cloth:ART.player.tunic, pants:ART.player.pants,
                             hair:ART.player.hair, cape:ART.player.cape});
player.g.position.set(0, hAt(0,7), 7);
scene.add(player.g);
const P = { pos:player.g.position, vy:0, onGround:true, yaw:0, walk:0, speed:0 };
const playerShadow = blobShadow(2.5); scene.add(playerShadow);

/* NPC */
const npcObjs=[];
const npcStyle={
  mayor:{cloth:0x3f5688, hat:0xf0bd4a, hair:0x33302e, cape:0x2f4270},
  sol  :{cloth:0xf0ac3c, hair:0x2f2a26, pants:0x35506b, cape:false},
  sea  :{cloth:0x7f6fe0, hair:0x1f2a3a, hat:0x2f4256, cape:false},
  mt   :{cloth:0xdc5f47, hair:0x5a3a22, pants:0x4b4b4b, cape:false},
  farm :{cloth:0x81b83a, hat:0xdfb46e, hair:0x4a3423, cape:false},
  lab  :{cloth:0xeef4f8, hair:0x2b2b2b, pants:0x5b7f96, cape:false} };
NPCS.forEach(n=>{
  const h=makeHumanoid(npcStyle[n.id]||{});
  const y=hAt(n.x,n.z); h.g.position.set(n.x,y,n.z);
  h.g.rotation.y = Math.atan2(-n.x, -n.z);
  const lb=makeLabel(n.name, n.role, '#'+new THREE.Color(n.col).getHexString());
  lb.position.y=3.7; lb.scale.set(0.175,0.055,1); h.g.add(lb);
  const mark=new THREE.Mesh(new THREE.OctahedronGeometry(0.3,0), new THREE.MeshBasicMaterial({color:0xffd24a}));
  mark.position.y=3.15; h.g.add(mark);
  const bs=blobShadow(2.3); bs.position.y=0.04; h.g.add(bs);
  scene.add(h.g);
  npcObjs.push({data:n, h, mark, y});
});

/* 에너지 파편 */
const sparks=[];
(function makeSparks(){
  const g=new THREE.OctahedronGeometry(0.42,0);
  for(let i=0;i<40;i++){
    const a=rnd()*Math.PI*2, rr=14+rnd()*78, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.4||y>26){ i--; continue; }
    const m=new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:0xffd75e}));
    m.position.set(x, y+1.5, z);
    const halo=new THREE.Mesh(new THREE.OctahedronGeometry(0.78,0), glow(0xffeeb8,{transparent:true,opacity:0.28}));
    m.add(halo);
    scene.add(m); sparks.push({m, base:y+1.5, ph:rnd()*6.28, got:false});
  }
})();

/* ══════════════ 숨은 고대 룬 조각 ══════════════ */
/* 조명을 쓰지 않는다 — 값싼 발광 재질과 링만으로 눈에 띄게 한다. */
const runeObjs = RUNES.map(r=>{
  const g=new THREE.Group();
  const gy=hAt(r.x, r.z);
  g.position.set(r.x, gy, r.z);
  const core=new THREE.Mesh(new THREE.TetrahedronGeometry(0.62,0),
    new THREE.MeshBasicMaterial({color:0xb9f0ff}));
  core.position.y=1.5; g.add(core);
  const halo=new THREE.Mesh(new THREE.TetrahedronGeometry(1.15,0),
    glow(0x7fd8ff,{transparent:true, opacity:0.30}));
  halo.position.y=1.5; g.add(halo);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.09,5,22),
    new THREE.MeshBasicMaterial({color:0x9fe6ff, transparent:true, opacity:0.55}));
  ring.rotation.x=Math.PI/2; ring.position.y=0.16; g.add(ring);
  g.visible=false; scene.add(g);
  return {data:r, g, core, halo, ring, gy};
});

/* ══════════════ 마지막 시련 — 에너지 관제 콘솔 ══════════════ */
/* 코어 10개를 모으면 도시 광장 중앙 전력탑 앞에 나타난다. */
const finalConsole = (function(){
  const g=new THREE.Group(), C=ART.city;
  const gy=hAt(FINAL.x,FINAL.z);
  g.position.set(FINAL.x, gy, FINAL.z);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.7,0.5,8), matte(C.stone));
  base.position.y=0.25; g.add(base);
  for(let i=0;i<2;i++){
    const lg=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.26,1.6,6), matte(C.wood));
    lg.position.set(-1.1+i*2.2,1.3,0); g.add(lg);
  }
  const desk=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.34,1.7), matte(C.stone));
  desk.position.y=2.2; g.add(desk);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(3.3,2.0),
    new THREE.MeshBasicMaterial({color:0x16283f,transparent:true,opacity:0.78,side:THREE.DoubleSide}));
  board.position.set(0,3.4,-0.34); board.rotation.x=-0.24; g.add(board);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.9),
    new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:0.34,side:THREE.DoubleSide}));
  scr.position.set(0,3.4,-0.25); scr.rotation.x=-0.24; g.add(scr);
  const frame=new THREE.Mesh(new THREE.TorusGeometry(1.95,0.07,6,26), new THREE.MeshBasicMaterial({color:0xffe08a}));
  frame.position.set(0,3.4,-0.3); frame.rotation.x=-0.24; g.add(frame);
  const bars=[];
  for(let i=0;i<12;i++){
    const b=new THREE.Mesh(new THREE.BoxGeometry(0.16,1,0.07),
      new THREE.MeshBasicMaterial({color:[0xf6b93b,0x5ad3c4,0x5b9df9,0x8dc63f,0x4fd0e0,0xef7a5a][i%6]}));
    b.position.set(-1.35+i*0.245, 3.1, -0.16); g.add(b); bars.push(b);
  }
  const lb=makeLabel(FINAL.name,'마지막 시련 · 에너지 믹스','#ffd166');
  lb.position.y=5.8; g.add(lb);
  /* 조명은 처음부터 씬에 두고 밝기만 0으로 둔다 — 도중에 조명 개수가 바뀌면
     셰이더가 다시 컴파일되면서 화면이 한 번 끊기기 때문. */
  const pl=new THREE.PointLight(0xffd166,0,24);
  pl.position.set(FINAL.x, gy+3.5, FINAL.z); scene.add(pl);
  g.visible=false; scene.add(g);
  return {g, scr, frame, bars, light:pl, label:lb, gy};
})();
