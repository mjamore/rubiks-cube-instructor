import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {FACES,COLORS,coordinates,TURN} from './cube-state.js';
export class CubeView{
 constructor(container,state){
  this.container=container;this.busy=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(32,1,.1,100);this.camera.position.set(6.6,5.4,8.4);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=.92;container.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=7;this.controls.maxDistance=17;this.controls.maxPolarAngle=Math.PI*.85;this.controls.target.set(0,-.12,0);
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xffffff,0xc0b6d8,.75));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;key.shadow.radius=5;this.scene.add(key);const rim=new THREE.DirectionalLight(0xe4dcff,1.3);rim.position.set(5,3,-5);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x777582,opacity:.035}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.82;floor.receiveShadow=true;this.scene.add(floor);const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(60,55,75,.32)');gradient.addColorStop(.5,'rgba(60,55,75,.13)');gradient.addColorStop(1,'rgba(60,55,75,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);this.shadowTexture=new THREE.CanvasTexture(shadowCanvas);const contact=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({map:this.shadowTexture,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-1.81;this.scene.add(contact);
  this.bodyGeometry=new RoundedBoxGeometry(.966,.966,.966,4,.095);this.stickerGeometry=new RoundedBoxGeometry(.838,.838,.035,4,.075);
  this.bodyMaterial=new THREE.MeshPhysicalMaterial({color:0x101116,roughness:.28,metalness:.03,clearcoat:.3,clearcoatRoughness:.3});this.materials=Object.fromEntries(FACES.map(f=>[f,new THREE.MeshPhysicalMaterial({color:COLORS[f],roughness:.3,metalness:0,clearcoat:.4,clearcoatRoughness:.2})]));
  this.root=new THREE.Group();this.scene.add(this.root);this.setState(state);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);const labels=document.getElementById('face-labels');if(labels&&!labels.classList.contains('hidden')){for(const [selector,position] of [['.label-up',[0,1.85,0]],['.label-front',[0,0,1.85]],['.label-right',[1.85,0,0]]]){const node=labels.querySelector(selector),anchor=new THREE.Vector3(...position),visible=anchor.dot(this.camera.position)>0;anchor.project(this.camera);node.style.display=visible?'block':'none';node.style.left=`${(anchor.x*.5+.5)*this.container.clientWidth}px`;node.style.top=`${(-anchor.y*.5+.5)*this.container.clientHeight+this.container.offsetTop}px`;node.style.right='auto';node.style.transform='translate(-50%,-50%)';}}});
 }
 resize(){const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 enableFaceTurns(onTurn){
  const canvas=this.renderer.domElement,raycaster=new THREE.Raycaster();let drag=null;
  const point=event=>{const r=canvas.getBoundingClientRect();return new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);};
  canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary){drag=null;this.controls.enableRotate=true;return;}if(event.button!==0||this.busy)return;raycaster.setFromCamera(point(event),this.camera);const hit=raycaster.intersectObjects(this.root.children,true)[0];if(!hit)return;const group=hit.object.parent;drag={x:event.clientX,y:event.clientY,hit:hit.point.clone(),position:group.position.clone(),id:event.pointerId};this.controls.enableRotate=false;canvas.setPointerCapture(event.pointerId);},true);
  canvas.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const current=drag;drag=null;this.controls.enableRotate=true;const delta=new THREE.Vector2(event.clientX-current.x,event.clientY-current.y);if(delta.length()<18||this.busy)return;const base=current.hit.clone().project(this.camera),rect=canvas.getBoundingClientRect();let best=null;
   for(const axis of ['x','y','z']){const layer=Math.round(current.position[axis]);if(Math.abs(layer)!==1)continue;const vector=new THREE.Vector3();vector[axis]=1;const tangent=vector.cross(current.hit).multiplyScalar(.12);const projected=current.hit.clone().add(tangent).project(this.camera);const screen=new THREE.Vector2((projected.x-base.x)*rect.width,-(projected.y-base.y)*rect.height);if(screen.length()<1)continue;const score=screen.normalize().dot(delta.clone().normalize());if(!best||Math.abs(score)>Math.abs(best.score))best={axis,layer,score};}
   if(best){const face=Object.keys(TURN).find(f=>TURN[f][0]===best.axis&&TURN[f][1]===best.layer);onTurn(face+(Math.sign(best.score)===TURN[face][2]?'':"'"));}
  },true);
  canvas.addEventListener('pointercancel',()=>{drag=null;this.controls.enableRotate=true;});
  canvas.addEventListener('lostpointercapture',()=>{drag=null;this.controls.enableRotate=true;});
 }
 resetCamera(){this.camera.position.set(6.6,5.4,8.4);this.controls.target.set(0,-.12,0);this.controls.update();}
 setState(state){this.root.clear();this.cubies=[];const cubies=new Map();for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){if(x===0&&y===0&&z===0)continue;const group=new THREE.Group();group.position.set(x,y,z);const body=new THREE.Mesh(this.bodyGeometry,this.bodyMaterial);body.castShadow=true;body.receiveShadow=true;group.add(body);this.root.add(group);cubies.set([x,y,z].join(','),group);this.cubies.push(group);}
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
 async turn(move,nextState,duration=550){
  if(this.busy)return false;
  this.busy=true;
  const turn=this.prepareTurn(move),time=this.reduced?160:duration;
  try{
   await new Promise(resolve=>{
    let start;
    const frame=now=>{
     start??=now;
     const progress=Math.min((now-start)/time,1);
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
 dispose(){this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.controls.dispose();this.environment.dispose();this.shadowTexture.dispose();this.bodyGeometry.dispose();this.stickerGeometry.dispose();this.bodyMaterial.dispose();Object.values(this.materials).forEach(m=>m.dispose());this.renderer.dispose();}
}
