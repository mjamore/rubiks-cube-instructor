import {VOICE_CLIPS} from './voice-clips.js';

// Phonetic spellings keep speech engines from announcing “capital” before a move.
export function spokenText(text){
 const letters={U:'you',R:'are',F:'eff',D:'dee',L:'ell',B:'bee'};
 return /^[URFDLB](?: (?:prime|two))?$/.test(text)?letters[text[0]]+text.slice(1):text;
}

// Unrecorded text uses a named female English voice when the device provides one.
export function chooseVoice(voices){
 const english=voices.filter(voice=>/^en(?:-|$)/i.test(voice.lang));
 const female=/samantha|karen|serena|moira|tessa|victoria|zira|aria|jenny|ava\b|emma|susan|allison|joanna|salli|female|google us english/i;
 return english.find(voice=>female.test(voice.name)&&/^en-US$/i.test(voice.lang))
  ??english.find(voice=>female.test(voice.name))
  ??english.find(voice=>voice.default)??english[0]??voices.find(voice=>voice.default)??voices[0]??null;
}
export function createNarrator(synthesis,Utterance,Audio){
 let enabled=true,finish=null,activeAudio=null;
 function cancel(){
  synthesis?.cancel();
  if(activeAudio){activeAudio.onended=activeAudio.onerror=null;activeAudio.pause();activeAudio=null;}
  finish?.();
 }
 return {
  setEnabled(value){enabled=value;if(!enabled)cancel();},
  cancel,
  say(text){
   if(!enabled)return Promise.resolve();
   cancel();
   return new Promise(resolve=>{
    let speech,usedFallback=false;
    const done=()=>{clearTimeout(timeout);if(speech)speech.onend=speech.onerror=null;if(finish===done)finish=null;resolve();};
    // A failed audio engine must never block a cube move.
    const timeout=setTimeout(done,16000);finish=done;
    function fallback(){
     if(usedFallback||finish!==done||!enabled)return;usedFallback=true;
     if(!synthesis||!Utterance){done();return;}
     speech=new Utterance(spokenText(text));const voice=chooseVoice(synthesis.getVoices());
     if(voice){speech.voice=voice;speech.lang=voice.lang;}else speech.lang='en-US';
     speech.rate=.9;speech.pitch=1.06;speech.volume=1;
     speech.onend=speech.onerror=done;
     try{synthesis.speak(speech);}catch{done();}
    }
    const clip=VOICE_CLIPS[text.trim()];
    if(clip&&Audio){
     const audio=new Audio(clip);activeAudio=audio;
     audio.onended=done;audio.onerror=fallback;
     audio.play().catch(fallback);
    }else fallback();
   });
  }
 };
}
