import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CubeView} from '../src/cube-view.js';
import {Cube,FACES,TURN,coordinates,scramble} from '../src/cube-state.js';

function scene(state){
 const view=Object.create(CubeView.prototype);
 view.root=new THREE.Group();view.busy=false;view.reduced=false;
 view.bodyGeometry=new THREE.BoxGeometry(.966,.966,.966);
 view.stickerGeometry=new THREE.BoxGeometry(.838,.838,.035);
 view.bodyMaterial=new THREE.MeshBasicMaterial();
 view.materials=Object.fromEntries(FACES.map(face=>[face,new THREE.MeshBasicMaterial()]));
 view.setState(state);
 return view;
}
function stickerState(view){
 view.root.updateMatrixWorld(true);
 const slots=new Map(FACES.flatMap(face=>Array.from({length:9},(_,i)=>[`${face}:${coordinates(face,i).join(',')}`,FACES.indexOf(face)*9+i])));
 const state=Array(54).fill('?');
 for(const cubie of view.cubies){
  const position=cubie.getWorldPosition(new THREE.Vector3()).round();
  for(const sticker of cubie.children.filter(child=>child.userData.color)){
   const normal=new THREE.Vector3(0,0,1).applyQuaternion(sticker.getWorldQuaternion(new THREE.Quaternion())).round();
   const face=FACES.find(face=>{const [axis,sign]=TURN[face];return normal[axis]===sign;});
   const index=slots.get(`${face}:${position.toArray().join(',')}`);
   assert.notEqual(index,undefined,'sticker lies on a valid facelet');
   assert.equal(state[index],'?','each facelet has exactly one sticker');
   state[index]=sticker.userData.color;
  }
 }
 assert.ok(!state.includes('?'));
 return state.join('');
}
test('actual Three.js stickers start in the model’s facelet positions',()=>{
 const cube=new Cube().move("R U F2 L' B D2");
 assert.equal(stickerState(scene(cube.asString())),cube.asString());
});
test('all 18 animated Three.js layers end with exactly the model’s sticker positions',()=>{
 const start=new Cube().move("B2 R U' F L2 D R2");
 for(const face of FACES)for(const suffix of ['',"'",'2']){
  const move=face+suffix,view=scene(start.asString()),objects=[...view.cubies];
  const turn=view.prepareTurn(move);
  assert.equal(turn.selected.length,9);
  turn.pivot.rotation[turn.axis]=turn.angle/3;
  view.root.updateMatrixWorld(true);
  assert.ok(turn.selected.some(c=>c.getWorldPosition(new THREE.Vector3()).toArray().some(n=>Math.abs(n-Math.round(n))>.01)),'layer visibly travels between states');
  turn.pivot.rotation[turn.axis]=turn.angle;
  view.finishTurn(turn);
  assert.deepEqual(view.cubies,objects,'existing pieces are retained, without rebuilding or repainting stickers');
  assert.equal(stickerState(view),start.clone().move(move).asString(),move);
 }
});
test('hundreds of rendered turns stay aligned without orientation drift',()=>{
 const cube=new Cube(),view=scene(cube.asString());
 for(const move of [...scramble(100),...scramble(100)]){
  const turn=view.prepareTurn(move);turn.pivot.rotation[turn.axis]=turn.angle;view.finishTurn(turn);
  cube.move(move);assert.equal(stickerState(view),cube.asString(),move);
 }
});
test('turn animation visits intermediate frames, locks overlap, and commits exact positions',async()=>{
 const cube=new Cube(),view=scene(cube.asString());
 const previous=globalThis.requestAnimationFrame,frames=[];
 globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
 try{
  const expected=cube.clone().move('R').asString(),animation=view.turn('R',expected,550);
  assert.equal(view.busy,true);
  assert.equal(await view.turn('U',cube.clone().move('U').asString()),false);
  for(const time of [0,137,275,413,550]){
   const callback=frames.shift();assert.ok(callback);callback(time);
   if(time===275){const pivot=view.root.children.find(child=>child.children.includes(view.cubies.find(c=>c.parent!==view.root)));assert.ok(pivot);assert.ok(Math.abs(pivot.rotation.x+Math.PI/4)<.001);}
  }
  assert.equal(await animation,true);assert.equal(view.busy,false);
  assert.equal(stickerState(view),expected);
 }finally{globalThis.requestAnimationFrame=previous;}
});
