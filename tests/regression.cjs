const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const timers = [];
const elements = new Map();
function element() {
  return { style: {}, dataset: {}, children: [], classList: { add(){}, remove(){}, toggle(){} },
    getContext(){ return {}; }, appendChild(e){ this.children.push(e); },
    querySelector(){ return element(); }, animate(){}, scrollTo(){}, scrollIntoView(){} };
}
const state = {mode:'shrine', cores:{}, upgrades:{maxHp:2}, hintUsed:{}, sparks:10};
const ctx = vm.createContext({
  STATE:state, $:id=>{ if(!elements.has(id)) elements.set(id,element()); return elements.get(id); },
  document:{ createElement:element, querySelector:()=>null },
  setTimeout:fn=>timers.push(fn), requestAnimationFrame:()=>1, cancelAnimationFrame(){},
  performance:{now:()=>0}, THREE:{Color:class {getHexString(){return 'ffffff';}}},
  AUDIO:{sfx(){}}, save(){}, refreshHud(){}, updateCityLight(){},
  maxPlayerHp:()=>3+state.upgrades.maxHp, coreCount:()=>Object.keys(state.cores).length,
  PUZZLES:{sun:()=>({})}, PUZ_HINT:{sun:'test hint'},
});
vm.runInContext(fs.readFileSync(path.join(root,'js/shrine.js'),'utf8'),ctx);
vm.runInContext('globalThis.ran=0; shrineDelay(()=>ran++,10)',ctx);
timers.shift()();
assert.equal(ctx.ran,1,'active session callback runs');
vm.runInContext('shrineDelay(()=>ran++,10); closeShrine(); STATE.mode="shrine"',ctx);
timers.shift()();
assert.equal(ctx.ran,1,'closed session callback cannot affect a new shrine');
const shrine={id:'sun',icon:'sun',col:0, name:'sun',short:'sun',note:'note'};
ctx.shrine=shrine;
vm.runInContext('clearShrine(shrine)',ctx);
assert.equal(state.hp,5,'shrine clear restores upgraded maximum HP');
state.hp=1;
vm.runInContext('clearFinal(shrine)',ctx);
assert.equal(state.hp,5,'final clear restores upgraded maximum HP');
vm.runInContext('openShrine(shrine)',ctx);
let hint=elements.get('#shCtrl').children.at(-1);
hint.onclick();
assert.equal(state.sparks,7);
assert.match(hint.outerHTML,/test hint/);
vm.runInContext('closeShrine(); openShrine(shrine)',ctx);
hint=elements.get('#shCtrl').children.at(-1);
assert.match(hint.outerHTML,/test hint/,'purchased hint is visible after reopening');
assert.equal(state.sparks,7,'reopening does not charge again');

const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
const shop=game.slice(game.indexOf('const SHOP_ITEMS ='),game.indexOf('function renderShop'));
const shopCtx=vm.createContext({STATE:{upgrades:{weaponLevel:1}},AUDIO:{sfx(){}},toast:(icon,msg)=>shopCtx.message=msg});
vm.runInContext(shop,shopCtx);
for(const name of ['트윈 볼트','트리플 볼트','태양의 정화포']){
  vm.runInContext('SHOP_ITEMS.find(i=>i.id==="weapon").onBuy()',shopCtx);
  assert.ok(shopCtx.message.includes(name));
}
const inputCtx=vm.createContext({keys:{w:true},TOUCH:{x:1,z:1,mag:1,run:true,jump:true},ptrs:new Map([[1,{}]]),pinchD:20,$:()=>element()});
vm.runInContext(game.slice(game.indexOf('function resetInput(){'),game.indexOf("addEventListener('blur',resetInput)")),inputCtx);
vm.runInContext('resetInput()',inputCtx);
assert.equal(Object.keys(inputCtx.keys).length,0);
assert.equal(inputCtx.TOUCH.mag,0);
assert.equal(inputCtx.TOUCH.jump,false);
assert.equal(inputCtx.ptrs.size,0);
console.log('PASS: shrine session cancellation, upgraded healing, reusable hints, weapon names, input reset');
