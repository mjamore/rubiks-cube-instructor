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

test('learning identifies the world face and whole piece after any rendered turn',()=>{
 for(const move of ['U',"R'",'F2','D','L2',"B'"]){
  const view=scene(new Cube().asString()),turn=view.prepareTurn(move);
  turn.pivot.rotation[turn.axis]=turn.angle;view.finishTurn(turn);view.root.updateMatrixWorld(true);
  const picks=[];
  for(const cubie of view.cubies)for(const sticker of cubie.children.filter(c=>c.userData.color)){
   const pick=view.selectionForHit({object:sticker});
   assert.ok(FACES.includes(pick.face));
   const position=cubie.getWorldPosition(new THREE.Vector3()).round().toArray();
   assert.deepEqual(pick.position,position);
   assert.ok(Array.from({length:9},(_,i)=>coordinates(pick.face,i)).some(p=>p.every((n,i)=>n===position[i])));
   picks.push(`${pick.face}:${pick.position.join(',')}`);
  }
  assert.equal(new Set(picks).size,54);
 }
});
test('looking at a face checks the dominant visible side and never changes any pieces',()=>{
 const view=scene(new Cube().asString());view.camera=new THREE.PerspectiveCamera();
 view.controls={target:new THREE.Vector3(),reset(){},update(){view.camera.lookAt(this.target);}};
 const before=stickerState(view);
 for(const face of FACES){
  view.lookAtFace(face);assert.equal(view.isFacing(face),true);
  for(const other of FACES.filter(f=>f!==face))assert.equal(view.isFacing(other),false);
  assert.equal(stickerState(view),before);
 }
 view.camera.position.set(6.6,5.4,-8.4);
 assert.equal(view.isFacing('B'),true);assert.equal(view.isFacing('F'),false);
});
test('answer selection highlights exactly the tapped piece’s 1, 2 or 3 stickers without a wireframe',()=>{
 for(const moves of ['',"R U F2 L'"]){
  const cube=new Cube().move(moves),view=scene(cube.asString());view.scene=new THREE.Scene();view.scene.add(view.root);
  for(const [position,count] of [[[1,1,1],3],[[0,1,1],2],[[0,0,1],1]]){
   view.markPiece(position);
   const bright=view.cubies.flatMap(c=>c.children.filter(s=>s.userData.color&&s.material===view.materials[s.userData.color]));
   assert.equal(bright.length,count);assert.ok(bright.every(s=>s.parent===view.selection));
   assert.equal(view.scene.children.length,1,'selection adds no box or through-cube geometry');
   assert.equal(stickerState(view),cube.asString());
  }
  view.clearMarker();assert.equal(view.selection,null);
  assert.ok(view.cubies.every(c=>c.children.filter(s=>s.userData.color).every(s=>s.material===view.materials[s.userData.color])));
  view.markPiece([1,0,0]);view.setState(cube.asString());assert.equal(view.selection,null);
 }
});
test('face annotations frame all nine stickers on a single plane for every face',()=>{
 const view=scene(new Cube().asString());view.scene=new THREE.Scene();view.scene.add(view.root);
 for(const face of FACES){
  view.teach({face,focus:'face',label:'Whole face'});
  const frame=view.teachingFrame,[axis,sign]=TURN[face];assert.ok(frame.isLineLoop);
  const positions=frame.geometry.attributes.position,corners=Array.from({length:positions.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(positions,i).applyQuaternion(frame.quaternion));
  assert.equal(corners.length,4);
  for(const corner of corners){
   assert.ok(Math.abs(corner[axis]-sign*1.55)<.00001);
   for(const other of ['x','y','z'].filter(a=>a!==axis))assert.ok(Math.abs(Math.abs(corner[other])-1.55)<.00001);
  }
  view.teach({face,focus:'center',label:'Center'});assert.equal(view.teachingFrame,null);assert.equal(frame.parent,null);
 }
});

test('practice framing brings the cube closer without changing its orientation or pieces',()=>{
 const view=scene(new Cube().asString());view.camera=new THREE.PerspectiveCamera();
 view.controls={target:new THREE.Vector3(),update(){view.camera.lookAt(this.target);}};
 const before=stickerState(view);
 view.resetCamera();const position=view.camera.position.clone();
 view.resetCamera(.8);
 assert.ok(view.camera.position.distanceTo(position.multiplyScalar(.8))<.001);
 assert.equal(stickerState(view),before);
 view.resetCamera();assert.deepEqual(view.camera.position.toArray(),[0,5.4,10.7]);
 assert.equal(view.isFacing('F'),true);
});

test('teaching highlights entire multi-sticker pieces and nine-piece layers without repainting the cube',async()=>{
 const {learnDemo,LEARN_TOPICS}=await import('../src/learn.js');
 const view=scene(new Cube().asString());view.scene=new THREE.Scene();view.scene.add(view.root);
 for(const topic of LEARN_TOPICS)for(const step of topic.steps)for(const beat of learnDemo(step)){
  view.teach(beat);
  const bright=view.cubies.flatMap(c=>c.children.filter(s=>s.userData.color&&s.material===view.materials[s.userData.color]));
  if(beat.position)assert.equal(bright.length,beat.focus==='edge'?2:3);
  else assert.equal(bright.length,{face:9,center:1,edge:24,corner:24,layer:21}[beat.focus]);
  assert.equal(stickerState(view),new Cube().asString());
  if(beat.arrow){
   assert.ok(view.teachingArrow);const normal=new THREE.Vector3(0,0,1).applyQuaternion(view.teachingArrow.quaternion),[axis,sign]=TURN[beat.face];
   assert.ok(Math.abs(normal[axis]-sign)<.001,'arrow lies on the demonstrated face');
  }
 }
 view.clearTeaching();assert.equal(view.teaching,null);assert.equal(view.teachingArrow,null);
 assert.ok(view.cubies.every(c=>c.children.filter(s=>s.userData.color).every(s=>s.material===view.materials[s.userData.color])));
});
test('camera tours keep a safe orbit, show every face including down, and honor cancellation',async()=>{
 const view=scene(new Cube().asString());view.camera=new THREE.PerspectiveCamera();view.camera.position.set(0,5.4,10.7);
 view.controls={enabled:true,target:new THREE.Vector3(),update(){view.camera.lookAt(this.target);}};view.controls.update();
 const previous=globalThis.requestAnimationFrame,frames=[];
 globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
 try{
  for(const face of FACES){
   const cameraTour=view.focusTeaching({face},{duration:1000});assert.equal(view.controls.enabled,false);
   for(const time of [0,250,500,750,1000]){frames.shift()(time);assert.ok(view.camera.position.length()>=8.7,'camera never passes through the cube');}
   await cameraTour;assert.equal(view.isFacing(face),true);assert.equal(view.controls.enabled,true);
  }
  const controller=new AbortController(),tour=view.focusTeaching({face:'F'},{signal:controller.signal});
  frames.shift()(0);const before=view.camera.position.clone();controller.abort();frames.shift()(500);await tour;
  assert.ok(view.camera.position.equals(before));assert.equal(view.controls.enabled,true);
  const instant=view.focusTeaching({face:'U'},{duration:0});frames.shift()(0);await instant;assert.equal(view.isFacing('U'),true);
 }finally{globalThis.requestAnimationFrame=previous;}
});
test('a teaching turn finishes smoothly before reset without stranding a layer pivot',async()=>{
 const cube=new Cube(),view=scene(cube.asString());
 const previous=globalThis.requestAnimationFrame,frames=[];globalThis.requestAnimationFrame=callback=>frames.push(callback);
 try{
  const next=cube.clone().move("D'").asString(),animation=view.turn("D'",next,1500);
  frames.shift()(0);frames.shift()(500);frames.shift()(510);assert.equal(view.busy,true,'turn continues through intermediate frames');frames.shift()(1500);await animation;
  assert.equal(view.busy,false);assert.equal(stickerState(view),next);assert.ok(view.cubies.every(c=>c.parent===view.root));
  view.setState(cube.asString());assert.equal(stickerState(view),cube.asString());
 }finally{globalThis.requestAnimationFrame=previous;}
});

test('every teaching face ends square to the screen and camera rotations remain continuous through poles',async()=>{
 const view=scene(new Cube().asString());view.camera=new THREE.PerspectiveCamera();view.camera.position.set(0,5.4,10.7);
 view.controls={enabled:true,target:new THREE.Vector3(),update(){view.camera.lookAt(this.target);}};view.controls.update();
 const previous=globalThis.requestAnimationFrame,frames=[];globalThis.requestAnimationFrame=callback=>frames.push(callback);
 try{
  for(const face of ['F','R','B','L','U','D','F']){
   const before=view.camera.position.clone(),tour=view.focusTeaching({face},{duration:1000});let last=view.camera.quaternion.clone();
   for(let time=0;time<=1000;time+=20){
    frames.shift()(time);
    if(time===0)assert.ok(view.camera.position.distanceTo(before)<.00001,'tour starts at the current view');
    assert.ok(last.angleTo(view.camera.quaternion)<.15,'no sudden camera roll or direction jump');last.copy(view.camera.quaternion);
   }
   await tour;view.controls.update();view.camera.updateMatrixWorld();
   const corners=[0,2,6,8].map(index=>new THREE.Vector3(...coordinates(face,index)).project(view.camera));
   assert.ok(Math.abs(corners[0].y-corners[1].y)<.00001,`${face}: top edge stays horizontal`);
   assert.ok(Math.abs(corners[0].x-corners[2].x)<.00001,`${face}: left edge stays vertical`);
  }
  view.resetCamera();assert.deepEqual(view.camera.up.toArray(),[0,1,0],'normal orbit restores the usual up direction');
 }finally{globalThis.requestAnimationFrame=previous;}
});

test('Play resumes both camera and layer motion from the exact paused position',async()=>{
 const {createLearnClock}=await import('../src/learn.js');
 const view=scene(new Cube().asString());view.camera=new THREE.PerspectiveCamera();view.camera.position.set(0,5.4,10.7);
 view.controls={enabled:true,target:new THREE.Vector3(),update(){view.camera.lookAt(this.target);}};view.controls.update();
 let time=0;const clock=createLearnClock(()=>time),frames=[],previous=globalThis.requestAnimationFrame;
 globalThis.requestAnimationFrame=callback=>frames.push(callback);
 try{
  const cameraMove=view.focusTeaching({face:'B'},{duration:1000,clock});
  frames.shift()(0);time=400;frames.shift()(400);clock.pause();const position=view.camera.position.clone(),rotation=view.camera.quaternion.clone();
  time=2400;frames.shift()(2400);assert.ok(view.camera.position.equals(position));assert.ok(view.camera.quaternion.equals(rotation));
  clock.play();frames.shift()(2400);assert.ok(view.camera.position.equals(position));time=3000;frames.shift()(3000);await cameraMove;
  assert.equal(view.isFacing('B'),true);
  const cube=new Cube(),turn=view.turn('R',cube.clone().move('R').asString(),1000,{clock});
  frames.shift()(3000);time=3400;frames.shift()(3400);clock.pause();
  const pivot=view.root.children.find(child=>child.children.includes(view.cubies.find(c=>c.parent!==view.root))),angle=pivot.rotation.x;
  time=7000;frames.shift()(7000);assert.equal(pivot.rotation.x,angle);assert.equal(view.busy,true);
  clock.play();frames.shift()(7000);assert.equal(pivot.rotation.x,angle);time=7600;frames.shift()(7600);await turn;
  assert.equal(stickerState(view),cube.clone().move('R').asString());
 }finally{globalThis.requestAnimationFrame=previous;}
});
