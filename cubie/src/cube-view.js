import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {FACES,COLORS,coordinates,TURN} from './cube-state.js';
export class CubeView{
 constructor(container,state){
  this.container=container;this.busy=false;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(32,1,.1,100);this.camera.position.set(0,5.4,10.7);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=.92;container.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableRotate=false;this.controls.enablePan=false;this.controls.minDistance=7;this.controls.maxDistance=17;this.controls.target.set(0,-.12,0);this.camera.lookAt(this.controls.target);
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xffffff,0xc0b6d8,.75));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;key.shadow.radius=5;this.scene.add(key);const rim=new THREE.DirectionalLight(0xe4dcff,1.3);rim.position.set(5,3,-5);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x777582,opacity:.035}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.82;floor.receiveShadow=true;this.scene.add(floor);const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(60,55,75,.32)');gradient.addColorStop(.5,'rgba(60,55,75,.13)');gradient.addColorStop(1,'rgba(60,55,75,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);this.shadowTexture=new THREE.CanvasTexture(shadowCanvas);const contact=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({map:this.shadowTexture,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-1.81;this.scene.add(contact);
  this.bodyGeometry=new RoundedBoxGeometry(.966,.966,.966,4,.095);this.stickerGeometry=new RoundedBoxGeometry(.838,.838,.035,4,.075);
  this.bodyMaterial=new THREE.MeshPhysicalMaterial({color:0x101116,roughness:.28,metalness:.03,clearcoat:.3,clearcoatRoughness:.3});this.materials=Object.fromEntries(FACES.map(f=>[f,new THREE.MeshPhysicalMaterial({color:COLORS[f],roughness:.3,metalness:0,clearcoat:.4,clearcoatRoughness:.2})]));
  this.callout=document.createElement('div');this.callout.className='cube-callout hidden';this.callout.setAttribute('aria-hidden','true');container.appendChild(this.callout);
  this.root=new THREE.Group();this.scene.add(this.root);this.setState(state);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  this.renderer.setAnimationLoop(()=>{this.updateTeaching();this.renderer.render(this.scene,this.camera);const labels=document.getElementById('face-labels');if(labels&&!labels.classList.contains('hidden')){for(const [selector,position] of [['.label-up',[0,1.85,0]],['.label-front',[0,0,1.85]],['.label-right',[1.85,0,0]]]){const node=labels.querySelector(selector),anchor=new THREE.Vector3(...position),visible=anchor.dot(this.camera.position)>0;anchor.project(this.camera);node.style.display=visible?'block':'none';node.style.left=`${(anchor.x*.5+.5)*this.container.clientWidth}px`;node.style.top=`${(-anchor.y*.5+.5)*this.container.clientHeight+this.container.offsetTop}px`;node.style.right='auto';node.style.transform='translate(-50%,-50%)';}}});
 }
 resize(){const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 stopFocus(){
  this.focusVersion=(this.focusVersion||0)+1;this.focusing=false;this.controls.enabled=true;
 }
 rotateView(dx,dy){
  if(!dx&&!dy)return;
  const rect=this.renderer.domElement.getBoundingClientRect(),speed=2/Math.min(rect.width,rect.height);
  const orbit=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
  // Horizontal drags turn around the cube's vertical axis; vertical drags change tilt without flipping.
  orbit.theta-=dx*speed;orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*speed,.02,Math.PI-.02);
  this.camera.position.setFromSpherical(orbit).add(this.controls.target);this.camera.up.set(0,1,0);
  this.camera.lookAt(this.controls.target);this.camera.updateMatrixWorld();
 }
 clearMarker(){
  this.selection=null;
  for(const cubie of this.cubies||[])for(const sticker of cubie.children.filter(s=>s.userData.color))sticker.material=this.materials[sticker.userData.color];
 }
 highlightStickers(isSelected){
  this.dimMaterials??=Object.fromEntries(FACES.map(face=>{const material=this.materials[face].clone();material.color.multiplyScalar(.18);return [face,material];}));
  for(const cubie of this.cubies)for(const sticker of cubie.children.filter(s=>s.userData.color))sticker.material=isSelected(cubie,sticker)?this.materials[sticker.userData.color]:this.dimMaterials[sticker.userData.color];
 }
 markPiece(position){
  this.clearTeaching();this.selection=this.cubies.find(c=>c.position.toArray().every((n,i)=>Math.round(n)===position[i]));
  if(this.selection)this.highlightStickers(cubie=>cubie===this.selection);
 }
 clearTeaching(){
  this.teaching=null;this.callout?.classList.add('hidden');
  if(this.teachingFrame){this.teachingFrame.removeFromParent();this.teachingFrame.geometry.dispose();this.teachingFrame.material.dispose();this.teachingFrame=null;}
  this.teachingArrow?.removeFromParent();
  if(this.teachingArrow){this.teachingArrow.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});this.teachingArrow=null;}
  this.clearMarker();
 }
 teach(beat){
  this.clearTeaching();this.teaching=beat;
  const [axis,sign]=TURN[beat.face];
  this.highlightStickers((cubie,sticker)=>{
   const position=cubie.position.toArray().map(Math.round),kind=['inside','center','edge','corner'][position.filter(n=>Math.abs(n)===1).length];
   const normal=new THREE.Vector3(0,0,1).applyQuaternion(sticker.getWorldQuaternion(new THREE.Quaternion())).round();
   return beat.focus==='cube'||(beat.position?position.every((n,i)=>n===beat.position[i]):beat.focus==='layer'?cubie.position[axis]===sign:beat.focus==='face'?normal[axis]===sign:kind===beat.focus&&(beat.focus!=='center'||cubie.position[axis]===sign));
  });
  if(this.callout){this.callout.textContent=beat.label;this.callout.classList.toggle('face-callout',beat.focus==='face');this.callout.classList.remove('hidden');}
  if(beat.focus==='face'){
   const points=[[-1.55,-1.55,1.55],[1.55,-1.55,1.55],[1.55,1.55,1.55],[-1.55,1.55,1.55]].map(p=>new THREE.Vector3(...p));
   this.teachingFrame=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xc9b3f0}));
   const normal=new THREE.Vector3();normal[axis]=sign;this.teachingFrame.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);this.scene.add(this.teachingFrame);
  }
  if(beat.arrow){
   const arrow=new THREE.Group(),points=[],span=beat.half?Math.PI*1.55:Math.PI*1.25;
   for(let i=0;i<=64;i++){const angle=Math.PI*.2-beat.arrow*span*i/64;points.push(new THREE.Vector3(Math.cos(angle)*1.85,Math.sin(angle)*1.85,1.6));}
   const curve=new THREE.CatmullRomCurve3(points),line=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.028,6,false),new THREE.MeshBasicMaterial({color:0xddcfff,depthTest:false}));arrow.add(line);
   const tip=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,12),new THREE.MeshBasicMaterial({color:0xddcfff,depthTest:false}));tip.position.copy(points.at(-1));tip.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),points.at(-1).clone().sub(points.at(-2)).normalize());arrow.add(tip);
   const normal=new THREE.Vector3();normal[axis]=sign;arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);arrow.renderOrder=3;this.scene.add(arrow);this.teachingArrow=arrow;
  }
 }
 updateTeaching(){
  if(!this.teaching||!this.callout)return;
  const beat=this.teaching,[axis,sign]=TURN[beat.face],anchor=new THREE.Vector3(...(beat.position||[0,0,0]));
  if(!beat.position){if(beat.focus==='edge')anchor.set(0,1,1);else if(beat.focus==='corner')anchor.set(1,1,1);else anchor[axis]=sign;}anchor.multiplyScalar(1.55);
  if(beat.focus==='face')anchor.set(0,1.75,1.55).applyQuaternion(this.teachingFrame.quaternion);
  const visible=anchor.clone().normalize().dot(this.camera.position.clone().sub(anchor))>0;anchor.project(this.camera);
  this.callout.style.visibility=visible?'visible':'hidden';
  this.callout.style.left=`${THREE.MathUtils.clamp((anchor.x*.5+.5)*this.container.clientWidth,85,this.container.clientWidth-85)}px`;
  this.callout.style.top=`${THREE.MathUtils.clamp((-anchor.y*.5+.5)*this.container.clientHeight,beat.focus==='face'?35:65,this.container.clientHeight-30)}px`;
 }
 async focusTeaching(beat,{signal,clock,duration=1000}={}){
  const [axis,sign]=TURN[beat.face],end=new THREE.Vector3(...(beat.look||[0,0,0]));if(!beat.look)end[axis]=sign*11;end.multiplyScalar(.8);
  const up=new THREE.Vector3(0,1,0);if(!beat.look&&axis==='y')up.set(0,0,-sign);
  const target=this.controls.target.clone(),distance=this.camera.position.distanceTo(target),startRotation=this.camera.quaternion.clone();
  const endRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(end,new THREE.Vector3(),up));
  const version=this.focusVersion=(this.focusVersion||0)+1;this.controls.enabled=false;this.focusing=true;
  try{await new Promise(resolve=>{
   let began;
   const frame=now=>{
    if(signal?.aborted||version!==this.focusVersion){resolve();return;}const time=clock?clock.now():now;began??=time;const t=duration?Math.min((time-began)/duration,1):1,eased=THREE.MathUtils.smoothstep(t,0,1);
    this.camera.quaternion.slerpQuaternions(startRotation,endRotation,eased);
    this.controls.target.copy(target).multiplyScalar(1-eased);
    this.camera.position.set(0,0,1).applyQuaternion(this.camera.quaternion).multiplyScalar(THREE.MathUtils.lerp(distance,end.length(),eased)).add(this.controls.target);
    this.camera.up.set(0,1,0).applyQuaternion(this.camera.quaternion);
    if(t<1)requestAnimationFrame(frame);else resolve();
   };requestAnimationFrame(frame);
  });}finally{if(version===this.focusVersion){this.focusing=false;this.controls.enabled=true;}}
 }
 selectionForHit(hit){
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion())).round();
  const face=FACES.find(f=>{const [axis,sign]=TURN[f];return normal[axis]===sign;});
  return {face,position:hit.object.parent.getWorldPosition(new THREE.Vector3()).round().toArray()};
 }
 isFacing(face){
  const [axis,sign]=TURN[face],direction=this.camera.position.clone().sub(this.controls.target).normalize();
  return direction[axis]*sign>Math.max(...['x','y','z'].filter(a=>a!==axis).map(a=>Math.abs(direction[a])));
 }
 lookAtFace(face,distance=11){
  const [axis,sign]=TURN[face];
  this.controls.target.set(0,0,0);this.camera.up.set(0,1,0);if(axis==='y')this.camera.up.set(0,0,-sign);this.camera.position.set(0,0,0);this.camera.position[axis]=sign*distance;this.camera.lookAt(this.controls.target);this.camera.updateMatrixWorld();
 }
 enableFaceTurns(onTurn,{canTurn=()=>true,onPick=()=>{}}={}){
  const canvas=this.renderer.domElement,raycaster=new THREE.Raycaster();let drag=null;
  const point=event=>{const r=canvas.getBoundingClientRect();return new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);};
  canvas.addEventListener('pointerdown',event=>{
   if(!event.isPrimary){drag=null;return;}if(event.button!==0||this.busy)return;
   this.camera.updateMatrixWorld();this.root.updateMatrixWorld(true);raycaster.setFromCamera(point(event),this.camera);
   const hit=raycaster.intersectObjects(this.cubies.flatMap(c=>c.children.filter(s=>s.userData.color)),false)[0];
   drag={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,id:event.pointerId,moved:false,turn:!!hit&&canTurn(),hit:hit?.point.clone(),position:hit?.object.parent.position.clone(),pick:hit?this.selectionForHit(hit):null};
   canvas.setPointerCapture(event.pointerId);
  },true);
  canvas.addEventListener('pointermove',event=>{
   if(!drag||drag.id!==event.pointerId||this.busy)return;
   drag.moved||=Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>=6;
   if(!drag.moved||drag.turn)return;
   this.rotateView(event.clientX-drag.lastX,event.clientY-drag.lastY);drag.lastX=event.clientX;drag.lastY=event.clientY;
  });
  canvas.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const current=drag;drag=null;const delta=new THREE.Vector2(event.clientX-current.x,event.clientY-current.y);if(this.busy)return;if(!current.moved){if(current.pick)onPick(current.pick);return;}if(!current.turn||delta.length()<18)return;const base=current.hit.clone().project(this.camera),rect=canvas.getBoundingClientRect();let best=null;
   for(const axis of ['x','y','z']){const layer=Math.round(current.position[axis]);if(Math.abs(layer)!==1)continue;const vector=new THREE.Vector3();vector[axis]=1;const tangent=vector.cross(current.hit).multiplyScalar(.12);const projected=current.hit.clone().add(tangent).project(this.camera);const screen=new THREE.Vector2((projected.x-base.x)*rect.width,-(projected.y-base.y)*rect.height);if(screen.length()<1)continue;const score=screen.normalize().dot(delta.clone().normalize());if(!best||Math.abs(score)>Math.abs(best.score))best={axis,layer,score};}
   if(best){const face=Object.keys(TURN).find(f=>TURN[f][0]===best.axis&&TURN[f][1]===best.layer);onTurn(face+(Math.sign(best.score)===TURN[face][2]?'':"'"));}
  },true);
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
 }
 resetCamera(scale=1){this.camera.up.set(0,1,0);this.camera.position.set(0,5.4,10.7).multiplyScalar(scale);this.controls.target.set(0,-.12,0);this.camera.lookAt(this.controls.target);this.camera.updateMatrixWorld();}
 setState(state){this.clearTeaching();this.root.clear();this.cubies=[];const cubies=new Map();for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){if(x===0&&y===0&&z===0)continue;const group=new THREE.Group();group.position.set(x,y,z);const body=new THREE.Mesh(this.bodyGeometry,this.bodyMaterial);body.castShadow=true;body.receiveShadow=true;group.add(body);this.root.add(group);cubies.set([x,y,z].join(','),group);this.cubies.push(group);}
  FACES.forEach((face,fi)=>{for(let i=0;i<9;i++){const xyz=coordinates(face,i),cubie=cubies.get(xyz.join(',')),sticker=new THREE.Mesh(this.stickerGeometry,this.materials[state[fi*9+i]]);const[axis,sign]=TURN[face];sticker.position[axis]=sign*.493;if(axis==='x')sticker.rotation.y=sign*Math.PI/2;if(axis==='y')sticker.rotation.x=-sign*Math.PI/2;if(axis==='z'&&sign===-1)sticker.rotation.y=Math.PI;sticker.castShadow=true;sticker.receiveShadow=true;sticker.userData.color=state[fi*9+i];cubie.add(sticker);}});
 }
 prepareTurn(move){
  const [axis,layer,direction]=TURN[move[0]],pivot=new THREE.Group();
  this.root.add(pivot);
  const selected=this.cubies.filter(cubie=>Math.abs(cubie.position[axis]-layer)<.01);
  selected.forEach(cubie=>pivot.attach(cubie));
  return {axis,pivot,selected,angle:direction*Math.PI/2*(move.endsWith('2')?2:move.endsWith("'")?-1:1)};
 }
 finishTurn({pivot,selected}){
  selected.forEach(cubie=>{
   this.root.attach(cubie);
   cubie.position.round();
   // Snap exact quarter-turn orientations to prevent accumulated floating-point drift.
   const rotation=new THREE.Matrix4().makeRotationFromQuaternion(cubie.quaternion);
   rotation.elements=rotation.elements.map(Math.round);
   cubie.quaternion.setFromRotationMatrix(rotation);cubie.updateMatrix();
  });
  this.root.remove(pivot);
 }
 async turn(move,nextState,duration=550,{clock}={}){
  if(this.busy)return false;
  this.busy=true;
  const turn=this.prepareTurn(move),time=duration;
  try{
   await new Promise(resolve=>{
    let start;
    const frame=now=>{
     const current=clock?clock.now():now;start??=current;
     const progress=time===0?1:Math.min((current-start)/time,1);
     const eased=THREE.MathUtils.smoothstep(progress,0,1);
     turn.pivot.rotation[turn.axis]=turn.angle*eased;
     if(progress<1)requestAnimationFrame(frame);else resolve();
    };
    requestAnimationFrame(frame);
   });
   this.finishTurn(turn);
   return true;
  }catch(error){this.setState(nextState);throw error;}
  finally{this.busy=false;}
 }
 dispose(){this.clearTeaching();this.callout?.remove();Object.values(this.dimMaterials||{}).forEach(m=>m.dispose());this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.controls.dispose();this.environment.dispose();this.shadowTexture.dispose();this.bodyGeometry.dispose();this.stickerGeometry.dispose();this.bodyMaterial.dispose();Object.values(this.materials).forEach(m=>m.dispose());this.renderer.dispose();}
}
