/* ═══════════════════════════════════════════════════
   actors.js — 사당 구조물 · 플레이어 · NPC · 에너지 파편
   ═══════════════════════════════════════════════════ */
/* ══════════════ 라벨 스프라이트 ══════════════ */
function makeLabel(text, sub, hex, icon){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=170;
  const g=cv.getContext('2d');
  const w = 440, h = 136, x = (512 - w)/2, y = 14, r = 24;
  g.fillStyle='rgba(16, 26, 38, 0.88)';
  g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.fill();
  g.strokeStyle=hex; g.lineWidth=4; g.stroke();

  if(icon){
    const ex = x + 62, ey = y + h/2;
    g.fillStyle = hex + '26';
    g.beginPath(); g.arc(ex, ey, 40, 0, 6.283); g.fill();
    g.strokeStyle = hex; g.lineWidth = 3; g.stroke();
    g.font = '46px "Gothic A1", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(icon, ex, ey + 2);

    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.font = '900 42px "Gothic A1", sans-serif';
    g.fillText(text, x + 120, y + 54);
    if(sub){
      g.font = '800 24px "Gothic A1", sans-serif';
      g.fillStyle = hex;
      g.fillText(sub, x + 122, y + 96);
    }
  } else {
    g.textAlign='center';
    g.fillStyle='#fff';
    g.font='900 46px "Gothic A1", sans-serif';
    g.fillText(text, 256, y + 56);
    if(sub){
      g.font='800 26px "Gothic A1", sans-serif';
      g.fillStyle=hex;
      g.fillText(sub, 256, y + 98);
    }
  }
  const tex=new THREE.CanvasTexture(cv); tex.anisotropy=4;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false, sizeAttenuation:false}));
  sp.scale.set(0.24, 0.08, 1); sp.renderOrder=999;
  return sp;
}

/* ══════════════ 사당 구조물 ══════════════ */
const shrineObjs = {};
function buildShrine(s){
  const G=new THREE.Group(); G.position.set(s.x, s.gy, s.z);
  const col=new THREE.Color(s.col);
  const stone=matte(ART.shrine.stone), stone2=matte(ART.shrine.stone2);
  /* 멀리서 감출 구조물 — 이름표와 코어는 밖에 두어 길잡이로 남긴다 */
  const struct=new THREE.Group(); G.add(struct);
  // 기단
  const gsh=blobShadow(24); gsh.position.y=0.03; struct.add(gsh);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(8.2,9,1.1,10), stone); pad.position.y=0.3; struct.add(pad);
  const pad2=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.6,0.5,10), stone2); pad2.position.y=1.0; struct.add(pad2);
  // 룬 링
  const rune=new THREE.Mesh(new THREE.TorusGeometry(5.2,0.22,6,36), new THREE.MeshBasicMaterial({color:s.col}));
  rune.rotation.x=Math.PI/2; rune.position.y=1.32; G.add(rune);
  // 기둥 4개
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+Math.PI/4;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.7,6.4,6), stone);
    p.position.set(Math.cos(a)*6.4, 3.4, Math.sin(a)*6.4); struct.add(p);
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
        const frame=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.16,2.6), matte(ART.shrine.stone2)); pnl.add(frame);
        for(let c=0;c<3;c++) for(let r2=0;r2<2;r2++){
          const cell=new THREE.Mesh(new THREE.BoxGeometry(1.26,0.06,1.15), matte(0x234888));
          cell.position.set(-1.32+c*1.32, 0.10, -0.62+r2*1.24); pnl.add(cell);
        }
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.8,6), stone); leg.position.y=-0.9; pnl.add(leg);
        pnl.rotation.x=-0.55; pnl.position.set(-3.5+i*3.5, 1.6, -1.2); dev.add(pnl);
      }
      const inv=A(new THREE.Mesh(new THREE.BoxGeometry(1.8,1.4,1.4), matte(ART.shrine.metal)), 0, 0.7, 2.4);
      const ind=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.2,0.05), new THREE.MeshBasicMaterial({color:0x4fd0e0}));
      ind.position.set(0, 0.2, 0.72); inv.add(ind);
      break; }
    case 'st': {
      const tw=A(new THREE.Mesh(new THREE.CylinderGeometry(0.65,1.1,7.2,8), stone2),0,3.6,0);
      const rc=A(new THREE.Mesh(new THREE.SphereGeometry(1.2,12,10), new THREE.MeshBasicMaterial({color:0xffcc00})),0,7.2,0);
      flow.push({m:rc,amp:0,glow:true});
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2;
        const mir=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.12,1.3), new THREE.MeshLambertMaterial({color:0xdfeaf5,flatShading:true}));
        mir.position.set(Math.cos(a)*4.6, 1.3, Math.sin(a)*4.6);
        mir.lookAt(new THREE.Vector3(0,6.5,0)); dev.add(mir);
        const st2=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.3,6), stone2);
        st2.position.set(Math.cos(a)*4.6,0.65,Math.sin(a)*4.6); dev.add(st2);
      }
      break; }
    case 'wind': {
      const mast=A(new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.72,9.8,10), matte(0xf4f0e6)),0,4.9,0);
      const nac =A(new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,2.5), matte(ART.shrine.stone)),0,9.9,0.3);
      const rot = new THREE.Group(); rot.position.set(0,9.9,1.7); dev.add(rot);
      const hub=new THREE.Mesh(new THREE.SphereGeometry(0.44,10,8), matte(ART.shrine.stone2)); rot.add(hub);
      for(let i=0;i<3;i++){
        const bl=new THREE.Mesh(new THREE.BoxGeometry(0.30,6.8,0.10), mat(0xffffff));
        bl.position.y=3.4;
        const w=new THREE.Group(); w.rotation.z=i/3*Math.PI*2; w.add(bl); rot.add(w);
      }
      spin.push({m:rot, axis:'z', spd:2.0});
      break; }
    case 'hyd': {
      const dam=A(new THREE.Mesh(new THREE.BoxGeometry(11,5.2,2.4), stone),0,2.6,-2.0);
      const res=new THREE.Mesh(new THREE.BoxGeometry(10.6,4.4,5.0), new THREE.MeshLambertMaterial({color:0x3b82c4,transparent:true,opacity:0.85,flatShading:true}));
      res.position.set(0,2.2,-5.0); dev.add(res);
      for(let i=0;i<3;i++){
        const gate=new THREE.Mesh(new THREE.BoxGeometry(1.6,4.4,0.4), matte(ART.shrine.metal));
        gate.position.set(-3.2+i*3.2, 2.2, -0.8); dev.add(gate);
        const fall=new THREE.Mesh(new THREE.BoxGeometry(1.3,4.2,0.4), new THREE.MeshLambertMaterial({color:0x88d4f7,transparent:true,opacity:0.82,flatShading:true}));
        fall.position.set(-3.2+i*3.2, 2.1, -0.6); dev.add(fall); flow.push({m:fall,amp:0.4,spd:2.8+i*0.4});
      }
      const ph=A(new THREE.Mesh(new THREE.BoxGeometry(6.4,2.2,3.0), matte(ART.city.wall[1])),0,1.1,2.0);
      const turb=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.28,8,12), matte(ART.shrine.metal));
      turb.position.set(0,1.1,3.6); dev.add(turb); spin.push({m:turb,axis:'z',spd:3.4});
      break; }
    case 'geo': {
      const plant=A(new THREE.Mesh(new THREE.BoxGeometry(6.0,2.6,3.6), matte(ART.city.wall[2])),-0.8,1.3,1.8);
      for(let i=0;i<3;i++){
        const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,4.6,8), matte(ART.shrine.metal));
        pipe.position.set(-3.0+i*2.2, 2.3, -2.2); dev.add(pipe);
        const valve=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.12,6,10), new THREE.MeshBasicMaterial({color:0xe8674f}));
        valve.position.set(-3.0+i*2.2, 3.8, -2.2); valve.rotation.x=Math.PI/2; dev.add(valve);
      }
      for(let k=0;k<2;k++){
        const cool=A(new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.8,3.8,12), matte(ART.shrine.stone2)), 3.2, 1.9, -1.8+k*3.4);
        for(let i=0;i<3;i++){
          const st2=new THREE.Mesh(new THREE.SphereGeometry(0.75,8,6), new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.5,flatShading:true}));
          st2.position.set(3.2, 4.2+i*1.4, -1.8+k*3.4); dev.add(st2); flow.push({m:st2,amp:1.1,spd:0.7+i*0.3,rise:true});
        }
      }
      break; }
    case 'oce': {
      const bar=A(new THREE.Mesh(new THREE.BoxGeometry(11.5,2.6,2.4), stone),0,1.3,-1.0);
      for(let i=0;i<3;i++){
        const gate=new THREE.Mesh(new THREE.BoxGeometry(2.0,2.2,0.5), matte(ART.shrine.metal));
        gate.position.set(-3.2+i*3.2, 1.3, 0.2); dev.add(gate);
      }
      const seaIn=new THREE.Mesh(new THREE.BoxGeometry(11,1.0,4.6), new THREE.MeshLambertMaterial({color:0x2d9cdb,transparent:true,opacity:0.82,flatShading:true}));
      seaIn.position.set(0,0.5,-4.0); dev.add(seaIn); flow.push({m:seaIn,amp:0.35,spd:0.8});
      [-3.4, 3.4].forEach(tx=>{
        const colm=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,2.4,8), matte(ART.shrine.stone2));
        colm.position.set(tx, 1.2, 3.2); dev.add(colm);
        const tur=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.24,8,12), matte(ART.shrine.metal));
        tur.position.set(tx, 2.2, 3.2); tur.rotation.y=Math.PI/2; dev.add(tur); spin.push({m:tur,axis:'z',spd:2.6});
      });
      break; }
    case 'bio': {
      const dome=A(new THREE.Mesh(new THREE.SphereGeometry(3.0,14,10,0,6.29,0,1.57), matte(0x68a357)),-2.4,0.1,0.5);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(3.0,0.18,6,24), matte(ART.shrine.metal));
      ring.rotation.x=Math.PI/2; ring.position.set(-2.4,0.1,0.5); dev.add(ring);
      const gasTank=A(new THREE.Mesh(new THREE.SphereGeometry(1.7,12,10), matte(0xddeed2)),2.8,2.0,-1.6);
      const stand=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,1.0,10), matte(ART.shrine.stone2));
      stand.position.set(2.8,0.5,-1.6); dev.add(stand);
      const silo=A(new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,4.6,12), matte(ART.city.wall[0])),2.8,2.3,2.4);
      const siloCap=new THREE.Mesh(new THREE.ConeGeometry(1.4,1.0,12), matte(ART.shrine.metal));
      siloCap.position.set(2.8,4.9,2.4); dev.add(siloCap);
      const p1=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,4.2,6), matte(ART.shrine.metal));
      p1.rotation.z=Math.PI/2; p1.position.set(0.2, 1.8, -0.6); dev.add(p1);
      break; }
    case 'wst': {
      const plant=A(new THREE.Mesh(new THREE.BoxGeometry(6.6,3.6,4.0), matte(ART.city.wall[1])),-0.8,1.8,0.2);
      const stack=A(new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.95,7.6,10), matte(ART.shrine.stone2)),2.8,5.0,-0.6);
      const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.82,0.82,0.5,10), matte(0x9d72b5));
      ring.position.set(2.8,7.8,-0.6); dev.add(ring);
      for(let i=0;i<3;i++){
        const sm=new THREE.Mesh(new THREE.SphereGeometry(0.65,8,6), new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.42,flatShading:true}));
        sm.position.set(2.8, 9.2+i*1.5, -0.6); dev.add(sm); flow.push({m:sm,amp:1.2,spd:0.6+i*0.25,rise:true});
      }
      [-2.6, -0.8].forEach((cx,ci)=>{
        const cont=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.4,2.2), matte(ci===0?0x5b9bd5:0x70ad47));
        cont.position.set(cx, 0.7, 3.0); dev.add(cont);
      });
      break; }
    case 'h2': {
      const electrolyzer=A(new THREE.Mesh(new THREE.BoxGeometry(4.2,2.2,2.8), matte(0xdfeef2)),-1.8,1.1,0.6);
      const h2Ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.12,6,20), new THREE.MeshBasicMaterial({color:0x39c5bb}));
      h2Ring.position.set(-1.8, 2.8, 0.6); dev.add(h2Ring); spin.push({m:h2Ring,axis:'y',spd:1.4});
      for(let i=0;i<3;i++){
        const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,4.8,10), matte(0xf0f7f9));
        tank.position.set(2.4, 1.2+i*1.2, -0.4); tank.rotation.x=Math.PI/2; dev.add(tank);
        const capF=new THREE.Mesh(new THREE.SphereGeometry(0.7,10,6), matte(0x39c5bb));
        capF.position.set(2.4, 1.2+i*1.2, 2.0); dev.add(capF);
        const capB=new THREE.Mesh(new THREE.SphereGeometry(0.7,10,6), matte(0x39c5bb));
        capB.position.set(2.4, 1.2+i*1.2, -2.8); dev.add(capB);
      }
      break; }
    case 'fc': {
      const fcUnit=A(new THREE.Mesh(new THREE.BoxGeometry(5.2,2.8,3.2), matte(0x2d4059)),0,1.4,-0.4);
      for(let i=0;i<4;i++){
        const cell=new THREE.Mesh(new THREE.BoxGeometry(1.0,2.0,0.1), matte(i%2?0x54d2a0:0x8ee8c5));
        cell.position.set(-1.65+i*1.1, 1.4, 1.22); dev.add(cell);
      }
      [-1.4, 1.4].forEach(fx=>{
        const fanRim=new THREE.Mesh(new THREE.TorusGeometry(0.85,0.12,6,16), matte(ART.shrine.metal));
        fanRim.rotation.x=Math.PI/2; fanRim.position.set(fx, 2.85, -0.4); dev.add(fanRim);
        const blade=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.06,0.22), matte(0x1a2634));
        blade.position.set(fx, 2.85, -0.4); dev.add(blade); spin.push({m:blade,axis:'y',spd:5.0});
      });
      for(let i=0;i<3;i++){
        const dp=new THREE.Mesh(new THREE.SphereGeometry(0.24,6,6), new THREE.MeshBasicMaterial({color:0x70d6ff}));
        dp.position.set(-1.2+i*1.2, 0.4, 2.0); dev.add(dp); flow.push({m:dp,amp:0.4,spd:1.8+i*0.4});
      }
      break; }
  }
  const label = makeLabel(s.name, s.ch+'차시 · '+s.short, '#'+col.getHexString(), s.icon);
  label.position.y=9.4; G.add(label);
  scene.add(G);
  shrineObjs[s.id] = {G, struct, core, halo, rune, spin, flow, label, dev};
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
/* 섬 전체에 흩어진 파편 — 전부 InstancedMesh 하나로 그린다.
   개별 메시로 두면 그것만으로 드로우콜을 수십 개 잡아먹는다. */
let SPARK_MESH=null;
(function makeSparks(){
  const g=new THREE.OctahedronGeometry(0.42,0);
  const N=36;
  for(let i=0;i<N;i++){
    const a=rnd()*Math.PI*2, rr=40+rnd()*104, x=Math.cos(a)*rr, z=Math.sin(a)*rr, y=hAt(x,z);
    if(y<1.4||y>30){ i--; continue; }
    sparks.push({x, y:y+1.5, z, base:y+1.5, ph:rnd()*6.28, got:false, rot:rnd()*6.28});
  }
  SPARK_MESH = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({color:0xffd75e}), sparks.length);
  SPARK_MESH.frustumCulled = false; scene.add(SPARK_MESH);
})();

/* ══════════════ 사당의 정령 ══════════════ */
/* 사당 입구 옆(도시 쪽에서 비스듬히)에 떠 있다. 사당 상호작용 반경 밖이라
   "사당 들어가기"와 "정령에게 말 걸기"가 서로 방해하지 않는다. */
const spiritObjs = SHRINES.map(s=>{
  const D = SPIRITS[s.id] || {role:'사당의 수호령', hello:['…'], done:['…']};
  const who = (QUIZ_ASK[s.id] && QUIZ_ASK[s.id].who) || '사당의 정령';
  /* 사당에서 도시를 바라보는 방향을 기준으로 옆쪽에 세운다 */
  const toCity = Math.atan2(-s.z, -s.x);
  let x = s.x, z = s.z;
  for(const a of [SPIRIT_A, -SPIRIT_A, SPIRIT_A*2, -SPIRIT_A*2, 0]){
    const nx = Math.round(s.x + Math.cos(toCity + a) * SPIRIT_R);
    const nz = Math.round(s.z + Math.sin(toCity + a) * SPIRIT_R);
    if(hBase(nx, nz) > 1.5){ x = nx; z = nz; break; }
  }
  const sp = makeSpirit(s.col, s.id);
  const gy = hAt(x, z);
  sp.g.position.set(x, gy + 1.9, z);
  const lb = makeLabel(who, D.role, '#'+new THREE.Color(s.col).getHexString());
  lb.position.y = 2.75; lb.scale.set(0.185, 0.058, 1); sp.g.add(lb);
  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.26,0),
    new THREE.MeshBasicMaterial({color:0xffd24a}));
  mark.position.y = 2.24; sp.g.add(mark);
  sp.g.visible = false; scene.add(sp.g);
  return {shrine:s, id:'sp_'+s.id, name:who, role:D.role, hello:D.hello, done:D.done,
          sp, mark, x, z, gy, label:lb};
});
const spiritOf = {}; spiritObjs.forEach(o=>spiritOf[o.shrine.id]=o);

/* ══════════════ 숨은 고대 룬 조각 ══════════════ */
/* 조명을 쓰지 않는다 — 값싼 발광 재질만으로 눈에 띄게 한다.
   안쪽 셸과 후광은 BackSide 로 그려 코어를 가리지 않고 테두리만 빛나게 한다. */
const RUNE_GEO  = new THREE.OctahedronGeometry(0.52, 0);
const RUNE_GEO2 = new THREE.OctahedronGeometry(0.72, 0);
const RUNE_GEO3 = new THREE.OctahedronGeometry(1.02, 0);
const runeObjs = RUNES.map(r=>{
  const g=new THREE.Group();
  const gy=hAt(r.x, r.z);
  g.position.set(r.x, gy, r.z);

  const spin=new THREE.Group(); spin.position.y=1.55; g.add(spin);

  /* 코어 — 또렷한 하늘색 결정 */
  const core=new THREE.Mesh(RUNE_GEO, new THREE.MeshBasicMaterial({color:0xeafaff}));
  spin.add(core);
  /* 안쪽 셸 — 테두리에만 색이 얹힌다 */
  const shell=new THREE.Mesh(RUNE_GEO2, new THREE.MeshBasicMaterial({
    color:0x4fc3ea, transparent:true, opacity:0.42, side:THREE.BackSide, depthWrite:false}));
  spin.add(shell);
  /* 바깥 후광 */
  const halo=new THREE.Mesh(RUNE_GEO3, new THREE.MeshBasicMaterial({
    color:0x9fe6ff, transparent:true, opacity:0.16, side:THREE.BackSide, depthWrite:false}));
  spin.add(halo);

  /* 결정 둘레를 도는 얇은 고리 (기울여서 회전) */
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(0.80,0.038,4,24),
    new THREE.MeshBasicMaterial({color:0xd6f5ff, transparent:true, opacity:0.85}));
  orbit.rotation.x=1.15; orbit.position.y=1.55; g.add(orbit);

  /* 주위를 도는 작은 반짝임 3개 */
  const motes=[];
  for(let i=0;i<3;i++){
    const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.12,0),
      new THREE.MeshBasicMaterial({color:0xffffff}));
    g.add(m); motes.push(m);
  }

  /* 바닥 룬 원 — 얇은 고리 두 겹 */
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.20,0.062,5,24),
    new THREE.MeshBasicMaterial({color:0x9fe6ff, transparent:true, opacity:0.55}));
  ring.rotation.x=Math.PI/2; ring.position.y=0.16; g.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(0.76,0.034,4,18),
    new THREE.MeshBasicMaterial({color:0xd6f5ff, transparent:true, opacity:0.45}));
  ring2.rotation.x=Math.PI/2; ring2.position.y=0.14; g.add(ring2);

  g.visible=false; scene.add(g);
  return {data:r, g, spin, core, shell, halo, orbit, motes, ring, ring2, gy};
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
