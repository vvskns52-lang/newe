/* ═══════════════════════════════════════════════════════════════
   regions.js — 지역별 랜드마크
   멀리서 봐도 "저기가 바람 언덕이구나" 하고 알 수 있도록,
   각 지역에 그 에너지원을 상징하는 큰 구조물을 세운다.
   전부 조명을 쓰지 않는 값싼 재질이고, 반복되는 것은 InstancedMesh 로 묶는다.
   ═══════════════════════════════════════════════════════════════ */
const REGION_SPIN = [];        // 매 프레임 돌려야 하는 것들 (풍차 날개 등)
const REGION_FLOW = [];        // 위아래로 흐르는 것들 (증기·물)
const REGION_DETAIL = [];      // 멀리서는 감출 잔 구조물 {o, x, z}

(function buildRegions(){
  const G = new THREE.Group(); scene.add(G);
  const put = (m,x,y,z)=>{ m.position.set(x,y,z); G.add(m); return m; };
  const box  = (w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matte(c));
  const cyl  = (rt,rb,h,c,seg)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8), matte(c));
  const lit  = (g,c,o)=>new THREE.Mesh(g, new THREE.MeshBasicMaterial(Object.assign({color:c},o||{})));

  /* ───────── 바람 언덕 — 큰 풍력 발전기 4기 ───────── */
  [[-150,-40,1.25],[-136, 26,1.0],[-108,-34,1.15],[-96, 22,0.9]].forEach(([x,z,sc])=>{
    const y = hAt(x,z); if(y < 2) return;
    const tw = cyl(0.55*sc, 0.95*sc, 22*sc, 0xf2f4f6, 10);
    put(tw, x, y+11*sc, z);
    const hub = new THREE.Group(); hub.position.set(x, y+22*sc, z); G.add(hub);
    hub.add(cyl(0.7*sc,0.7*sc,1.1*sc,0xe8ebee,8).rotateX(Math.PI/2));
    for(let i=0;i<3;i++){
      const bl = box(1.0*sc, 12*sc, 0.22*sc, 0xffffff);
      bl.position.y = 6*sc; bl.geometry.translate(0,0,0);
      const arm = new THREE.Group(); arm.rotation.z = i/3*Math.PI*2; arm.add(bl); hub.add(arm);
    }
    hub.rotation.y = Math.PI/2;
    REGION_SPIN.push({o:hub, axis:'z', spd:0.55+Math.random()*0.25});
  });

  /* ───────── 물의 계곡 — 댐과 폭포 ───────── */
  (function dam(){
    /* 사당으로 가는 길목(x≈0)을 피해 서쪽 능선에 붙여 세운다.
       구조물에는 충돌이 없어서, 길 위에 두면 플레이어가 벽 속을 지나가 버린다. */
    const cx=-40, cz=-98, y=hAt(cx,cz);
    const wall = box(46, 15, 5, 0xd9d3c4); put(wall, cx, y+6, cz);
    const pilG = new THREE.BoxGeometry(2.4, 17, 6.4);
    const pil = new THREE.InstancedMesh(pilG, matte(0xc6bfae), 5);
    const D3 = new THREE.Object3D();
    for(let i=-2;i<=2;i++){ D3.position.set(cx+i*9, y+6.5, cz); D3.updateMatrix(); pil.setMatrixAt(i+2, D3.matrix); }
    pil.frustumCulled=false; G.add(pil);
    /* 물줄기 */
    for(let i=-1;i<=1;i++){
      const w = lit(new THREE.PlaneGeometry(5.2, 13), 0x9fd8f2, {transparent:true, opacity:0.72, side:THREE.DoubleSide});
      w.position.set(cx+i*12, y+5, cz+2.8); G.add(w);
      REGION_FLOW.push({m:w, base:y+5, amp:0.5, spd:2.2});
    }
    /* 위쪽 저수지 수면 */
    const lake = lit(new THREE.CircleGeometry(26, 24), 0x7fc3e8, {transparent:true, opacity:0.8});
    lake.rotation.x = -Math.PI/2; lake.position.set(cx-6, hAt(cx-6,cz-30)+1.4, cz-30); G.add(lake);
  })();

  /* ───────── 불의 분지 — 분화구 용암과 증기 기둥 ───────── */
  (function volcano(){
    const cx=88, cz=-88, y=hAt(cx,cz);
    const lava = lit(new THREE.CircleGeometry(9.5, 22), 0xff7a3c, {transparent:true, opacity:0.9});
    lava.rotation.x = -Math.PI/2; lava.position.set(cx, y+0.6, cz); G.add(lava);
    const ring = lit(new THREE.TorusGeometry(10.4, 0.7, 5, 26), 0x6a4438);
    ring.rotation.x = Math.PI/2; ring.position.set(cx, y+0.5, cz); G.add(ring);
    /* 증기 기둥 */
    [[cx-16,cz+12],[cx+18,cz-6],[cx+4,cz+22],[cx-22,cz-14]].forEach(([sx,sz])=>{
      const sy=hAt(sx,sz);
      for(let k=0;k<3;k++){
        const p = lit(new THREE.IcosahedronGeometry(1.5+k*0.5,0), 0xe8e2dc, {transparent:true, opacity:0.42-k*0.09});
        p.position.set(sx, sy+2+k*3.4, sz); G.add(p); REGION_DETAIL.push({o:p, x:sx, z:sz});
        REGION_FLOW.push({m:p, base:sy+2+k*3.4, amp:1.6, spd:0.8+k*0.25, rise:true});
      }
    });
  })();

  /* ───────── 황금 들판 — 곡물 창고와 밭이랑 ───────── */
  (function farm(){
    const cx=118, cz=8;
    [[-14,-10],[0,-16],[14,-8]].forEach(([dx,dz],i)=>{
      const x=cx+dx, z=cz+dz, y=hAt(x,z);
      put(cyl(3.2,3.4,11,0xe6dcc2,12), x, y+5.5, z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.7, 3.2, 12), matte(0xc4746a));
      put(cap, x, y+12.6, z);
    });
    /* 밭이랑 — 인스턴싱 한 번으로 전부 */
    const rowG = new THREE.BoxGeometry(0.7, 0.85, 13);
    const rows = new THREE.InstancedMesh(rowG, matte(0xbcc85a), 130);
    const D = new THREE.Object3D(); let n=0;
    for(let i=0;i<130;i++){
      const x = cx-26 + (i%26)*2.1, z = cz + 8 + ((i/26)|0)*15;
      const y = hAt(x,z); if(y<2||y>20) continue;
      D.position.set(x, y+0.4, z); D.rotation.set(0,0,0);
      D.scale.set(1, 0.8+Math.random()*0.5, 1); D.updateMatrix();
      rows.setMatrixAt(n++, D.matrix);
    }
    rows.count=n; rows.frustumCulled=false; G.add(rows); REGION_DETAIL.push({o:rows, x:cx, z:cz});
  })();

  /* ───────── 되살림 단지 — 쌓아 올린 재활용 더미 ───────── */
  (function waste(){
    const cx=86, cz=92;
    const cubeG = new THREE.BoxGeometry(2.2,2.2,2.2);
    const COL=[0x7fb2d8,0xd8a06a,0x9fd08a,0xd0d0d0];
    COL.forEach((c,ci)=>{
      const im = new THREE.InstancedMesh(cubeG, matte(c), 40);
      const D = new THREE.Object3D(); let n=0;
      for(let i=0;i<40;i++){
        const a=Math.random()*6.283, r=12+Math.random()*26;
        const x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r, y=hAt(x,z);
        if(y<2||y>18) continue;
        const stack=(Math.random()*3)|0;
        D.position.set(x, y+1.1+stack*2.2, z);
        D.rotation.set(0, Math.random()*0.5, 0); D.scale.setScalar(0.8+Math.random()*0.5);
        D.updateMatrix(); im.setMatrixAt(n++, D.matrix);
      }
      im.count=n; im.frustumCulled=false; G.add(im); REGION_DETAIL.push({o:im, x:cx, z:cz});
    });
  })();

  /* ───────── 수소 해안 — 흰 저장 탱크와 배관 ───────── */
  (function h2yard(){
    const cx=4, cz=124;
    [[-18,-6],[0,4],[18,-4]].forEach(([dx,dz])=>{
      const x=cx+dx, z=cz+dz, y=hAt(x,z); if(y<1.4) return;
      put(cyl(3.6,3.6,9,0xf4f8fa,14), x, y+4.6, z);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 14, 8, 0, 6.283, 0, Math.PI/2), matte(0xdfeef2));
      put(dome, x, y+9.1, z);
      put(lit(new THREE.TorusGeometry(3.8,0.16,4,18), 0x7fd8e8).rotateX(Math.PI/2), x, y+6.6, z);
    });
    const pipe = cyl(0.5,0.5,38,0xd6e4e8,8); pipe.rotation.z=Math.PI/2;
    put(pipe, cx, hAt(cx,cz)+2.2, cz-9);
  })();

  /* ───────── 햇빛 고원 — 반사경 밭과 집열탑 ───────── */
  (function solar(){
    const cx=-92, cz=92, y=hAt(cx,cz);
    put(cyl(1.5,2.2,26,0xe4dccb,10), cx, y+13, cz);
    put(lit(new THREE.IcosahedronGeometry(3.0,0), 0xffd764), cx, y+27, cz);
    /* 반사경 — 인스턴싱 */
    const mg = new THREE.PlaneGeometry(3.4, 2.4);
    const mirrors = new THREE.InstancedMesh(mg,
      new THREE.MeshBasicMaterial({color:0xbcd8ea, side:THREE.DoubleSide}), 90);
    const D = new THREE.Object3D(); let n=0;
    for(let ring=1; ring<=4; ring++){
      const cnt = 8+ring*5, rr = 11+ring*7.5;
      for(let i=0;i<cnt && n<90;i++){
        const a = i/cnt*6.283 + ring*0.3;
        const x = cx+Math.cos(a)*rr, z = cz+Math.sin(a)*rr, yy = hAt(x,z);
        if(yy<3) continue;
        D.position.set(x, yy+1.7, z);
        D.rotation.set(-0.9, a+Math.PI/2, 0); D.scale.setScalar(1);
        D.updateMatrix(); mirrors.setMatrixAt(n++, D.matrix);
      }
    }
    mirrors.count=n; mirrors.frustumCulled=false; G.add(mirrors); REGION_DETAIL.push({o:mirrors, x:cx, z:cz});
  })();

  /* ───────── 조수 갯벌 — 바다로 뻗은 방조제 ───────── */
  (function tide(){
    const cx=-86, cz=-90;
    const wallG = new THREE.BoxGeometry(7, 3.4, 7);
    const wall = new THREE.InstancedMesh(wallG, matte(0xbfb9a8), 16);
    const D2 = new THREE.Object3D();
    for(let i=0;i<16;i++){
      const t=i/15, x = cx - 6 - t*54, z = cz - 8 - t*40;
      const y = Math.max(hAt(x,z), 0.2);
      D2.position.set(x, y+1.2, z); D2.rotation.set(0, t*0.5, 0); D2.scale.setScalar(1);
      D2.updateMatrix(); wall.setMatrixAt(i, D2.matrix);
    }
    wall.frustumCulled=false; G.add(wall); REGION_DETAIL.push({o:wall, x:cx, z:cz});
    /* 수문 3개 */
    for(let i=-1;i<=1;i++){
      const x = cx-30+i*7, z = cz-24+i*5, y = Math.max(hAt(x,z),0.2);
      put(box(1.1, 6.5, 1.1, 0x8f9aa4), x, y+3.2, z);
      put(lit(new THREE.BoxGeometry(5.2,0.5,0.7), 0x7f8f9c), x, y+6.4, z);
    }
  })();
})();
