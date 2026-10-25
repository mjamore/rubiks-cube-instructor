import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseVoice,createNarrator} from '../src/voice.js';
test('narration prefers a known female English voice over the device’s male default',()=>{
 const voices=[{name:'Daniel',lang:'en-US',default:true},{name:'Karen',lang:'en-AU'},{name:'Samantha',lang:'en-US'}];
 assert.equal(chooseVoice(voices),voices[2]);
 assert.equal(chooseVoice(voices.slice(0,2)),voices[1]);
 assert.equal(chooseVoice(voices.slice(0,1)),voices[0]);
 assert.equal(chooseVoice([]),null);
});
test('narrator uses the selected voice, resolves cancellation, and respects mute',async()=>{
 let utterance,cancels=0;
 const voice={name:'Samantha',lang:'en-US'};
 const synthesis={getVoices:()=>[voice],cancel:()=>cancels++,speak:speech=>{utterance=speech;}};
 class Utterance{constructor(text){this.text=text;}}
 const narrator=createNarrator(synthesis,Utterance);
 const spoken=narrator.say('Turn the right side backward.');
 assert.equal(utterance.voice,voice);assert.equal(utterance.rate,.9);assert.equal(utterance.lang,'en-US');
 narrator.cancel();await spoken;
 const second=narrator.say('Turn the top side.');utterance.onend();await second;
 narrator.setEnabled(false);utterance=null;await narrator.say('Muted');assert.equal(utterance,null);
 assert.ok(cancels>=3);
 await createNarrator(undefined,undefined).say('Unsupported');
});
test('core instructions play the bundled female recording, without requesting a device voice',async()=>{
 let audio,spoken=false;
 class Audio{constructor(source){this.src=source;audio=this;}play(){return Promise.resolve();}pause(){this.paused=true;}}
 const narrator=createNarrator({cancel(){},speak(){spoken=true;}},class{},Audio);
 const first=narrator.say('Turn the right side backward');
 assert.match(audio.src,/^\/voice\/instruction-\d+\.m4a$/);
 audio.onended();await first;assert.equal(spoken,false);
 const second=narrator.say('Turn the top side clockwise');narrator.cancel();await second;assert.equal(audio.paused,true);
});
test('every core move and lesson has a nonempty bundled female voice recording',async()=>{
 const {VOICE_CLIPS}=await import('../src/voice-clips.js');
 const {FACES,LESSONS,explain}=await import('../src/cube-state.js');
 const {statSync}=await import('node:fs');
 for(const text of [...FACES.flatMap(face=>['',"'",'2'].map(suffix=>explain(face+suffix).title)),...LESSONS.map(lesson=>lesson.description)]){
  assert.ok(VOICE_CLIPS[text],text);
  assert.ok(statSync(new URL(`../public${VOICE_CLIPS[text]}`,import.meta.url)).size>1000,text);
 }
});
test('a late audio rejection cannot speak an old instruction after mute',async()=>{
 let reject,spoken=false;
 class Audio{play(){return new Promise((resolve,fail)=>{reject=fail;});}pause(){}}
 const narrator=createNarrator({cancel(){},getVoices:()=>[],speak(){spoken=true;}},class{},Audio);
 const pending=narrator.say('Turn the right side backward');
 narrator.setEnabled(false);reject(new Error('Playback interrupted'));await pending;
 await Promise.resolve();assert.equal(spoken,false);
});
