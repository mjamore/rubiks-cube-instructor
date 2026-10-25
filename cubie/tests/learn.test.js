import test from 'node:test';
import assert from 'node:assert/strict';
import {LEARN_TOPICS,pieceKind,checkLearnPick} from '../src/learn.js';
import {FACES,NAMES,coordinates} from '../src/cube-state.js';
import {checkPracticeTurn} from '../src/practice.js';

test('the cube has 6 centers, 12 edges and 8 corners, regardless of the sticker tapped',()=>{
 const pieces=new Map();
 for(const face of FACES)for(let i=0;i<9;i++){
  const position=coordinates(face,i),kind=pieceKind(position);
  assert.equal(kind,i===4?'center':[0,2,6,8].includes(i)?'corner':'edge');
  pieces.set(position.join(','),kind);
  for(const answer of ['center','edge','corner'])assert.equal(checkLearnPick({kind:'piece',answer},{face,position}),kind===answer);
 }
 assert.deepEqual(['center','edge','corner'].map(kind=>[...pieces.values()].filter(k=>k===kind).length),[6,12,8]);
});
test('six-side lessons accept every square on the correct face and reject every other face',()=>{
 const steps=LEARN_TOPICS.find(topic=>topic.id==='sides').steps;
 assert.deepEqual(new Set(steps.map(s=>s.answer)),new Set(FACES));
 for(const step of steps)for(const face of FACES)for(let i=0;i<9;i++)assert.equal(checkLearnPick(step,{face,position:coordinates(face,i)}),face===step.answer);
 assert.equal(NAMES.U,'Up');assert.equal(NAMES.D,'Down');
});
test('the three piece steps require the correct piece on the named face',()=>{
 const steps=LEARN_TOPICS.find(topic=>topic.id==='pieces').steps;
 assert.deepEqual(steps.map(({answer,face})=>[answer,face]),[['center','B'],['edge','F'],['corner','R']]);
 for(const step of steps)for(const face of FACES)for(let i=0;i<9;i++){
  const position=coordinates(face,i);
  assert.equal(checkLearnPick(step,{face,position}),face===step.face&&pieceKind(position)===step.answer,`${step.answer} on ${step.face}: ${face}${i}`);
 }
});
test('each independently selectable topic has actionable checks, hints and a takeaway',()=>{
 assert.equal(LEARN_TOPICS.length,4);
 for(const topic of LEARN_TOPICS){
  assert.ok(topic.steps.length&&topic.takeaway);
  for(const step of topic.steps){
   for(const key of ['kind','answer','title','copy','task','hint','success'])assert.ok(step[key],`${topic.id}: ${key}`);
   if(step.kind==='turn'){
    assert.equal(checkPracticeTurn(step.answer,step.answer).result,'correct');
    assert.equal(checkPracticeTurn(step.answer,'B2').result,'wrong');
   }
  }
 }
 const half=LEARN_TOPICS.find(topic=>topic.id==='notation').steps.find(step=>step.answer==='F2');
 const first=checkPracticeTurn(half.answer,"F'");assert.equal(first.result,'partial');
 assert.equal(checkPracticeTurn(half.answer,"F'",first.partial).result,'correct');
});

test('every learning step has a finite visual demonstration and a concise hands-on task',async()=>{
 const {learnDemo,learnTask}=await import('../src/learn.js');
 for(const topic of LEARN_TOPICS)for(const step of topic.steps){
  const beats=learnDemo(step);
  assert.ok(beats.length>=2&&beats.length<=7);
  assert.ok(learnTask(step).length<85);
  for(const beat of beats){
   assert.ok(FACES.includes(beat.face));assert.ok(beat.caption&&beat.label);
   assert.ok(['face','center','edge','corner','layer'].includes(beat.focus));
   if(beat.position)assert.equal(pieceKind(beat.position),beat.focus);
  }
  if(step.kind==='turn'){
   const {Cube}=await import('../src/cube-state.js');
   assert.equal(new Cube().move(beats.filter(b=>b.turn).map(b=>b.turn).join(' ')).asString(),new Cube().move(step.answer).asString());
   assert.equal(beats.find(b=>b.arrow).arrow,step.answer.endsWith("'")?-1:1);
  }else assert.ok(beats.every(b=>!b.turn),'looking never mutates the cube');
 }
 const centers=learnDemo(LEARN_TOPICS[0].steps[0]).filter(b=>b.focus==='center');
 assert.deepEqual(new Set(centers.map(b=>b.face)),new Set(FACES),'tour includes all six centers');
});

test('the blue-center exercise names the unique center precisely',async()=>{
 const {learnTask}=await import('../src/learn.js');
 assert.equal(learnTask(LEARN_TOPICS[0].steps[0]),'Rotate to the blue face. Tap the center.');
});

test('six-side walkthroughs stop at the whole face, without a center scene',async()=>{
 const {learnDemo}=await import('../src/learn.js');
 for(const step of LEARN_TOPICS.find(t=>t.id==='sides').steps){
  const beats=learnDemo(step);assert.equal(beats.length,2);assert.ok(beats.every(beat=>beat.focus==='face'));
  assert.equal(beats.at(-1).face,step.answer);
 }
});
test('saved progress restores only valid counts for known topics and tolerates damaged storage',async()=>{
 const {readLearnProgress}=await import('../src/learn.js');
 for(const raw of [undefined,null,'no JSON','null','[]','42'])assert.deepEqual(readLearnProgress(raw),[0,0,0,0]);
 assert.deepEqual(readLearnProgress(JSON.stringify({pieces:1,sides:8,movement:2,notation:4,unknown:100})),[1,8,2,4]);
 assert.deepEqual(readLearnProgress(JSON.stringify({pieces:-1,sides:9,movement:'1',notation:1.5})),[0,0,0,0]);
});
test('the playback clock freezes at pause and resumes without counting paused time',async()=>{
 const {createLearnClock}=await import('../src/learn.js');let time=0;const clock=createLearnClock(()=>time);
 time=500;clock.pause();assert.equal(clock.paused,true);assert.equal(clock.now(),500);
 time=2500;clock.pause();assert.equal(clock.now(),500);
 clock.play();assert.equal(clock.paused,false);assert.equal(clock.now(),500);
 time=3000;assert.equal(clock.now(),1000);clock.play();assert.equal(clock.now(),1000);
 time=3200;clock.pause();time=8000;clock.play();assert.equal(clock.now(),1200);
});
