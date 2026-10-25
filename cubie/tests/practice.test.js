import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPracticeMove,checkPracticeTurn} from '../src/practice.js';
test('endless prompts are valid and don’t repeat the same move',()=>{for(const doubles of [false,true]){let previous="R'";for(let i=0;i<400;i++){const move=nextPracticeMove(previous,doubles);assert.match(move,doubles?/^[URFDLB](2|')?$/:/^[URFDLB]'?$/);assert.notEqual(move,previous);previous=move;}}});
test('practice checks face and direction, and accepts two matching quarter turns for a half turn',()=>{assert.equal(checkPracticeTurn("R'",'R').result,'wrong');assert.equal(checkPracticeTurn("R'","R'").result,'correct');assert.equal(checkPracticeTurn('R','U').result,'wrong');assert.equal(checkPracticeTurn('R2','R2').result,'correct');let first=checkPracticeTurn('R2','R');assert.equal(first.result,'partial');assert.equal(checkPracticeTurn('R2','R',first.partial).result,'correct');assert.equal(checkPracticeTurn('R2',"R'",first.partial).result,'wrong');assert.equal(checkPracticeTurn('R2','U',first.partial).partial,null);});

test('half-turn checks reject undoing the first quarter turn or adding a half turn after it',()=>{
 for(const first of ['F',"F'"]){
  const {partial}=checkPracticeTurn('F2',first);
  assert.equal(checkPracticeTurn('F2',first==='F'?"F'":'F',partial).result,'wrong');
  assert.equal(checkPracticeTurn('F2','F2',partial).result,'wrong');
  assert.equal(checkPracticeTurn('F2',first,partial).result,'correct');
 }
});
