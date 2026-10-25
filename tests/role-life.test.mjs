import test from 'node:test';
import assert from 'node:assert/strict';
import {RoleLife,lifeFeed,parseLifeDraft,lifeDraftPrompt} from '../src/role-life.js';
import {PocketPhoneStore} from '../src/engine.js';
import {ScopedPocketPhoneStore} from '../src/scoped-store.js';

const entry={kind:'memo',title:'练琴之后',body:'把今天没弹顺的四小节留到明早。',date:'2026-10-26',time:'21:00'};
function setup(){
  const data=new Map(),listeners=[];let mode='role';
  const phone=new ScopedPocketPhoneStore(new PocketPhoneStore({storage:{get:async k=>structuredClone(data.get(k)??null),set:async(k,v)=>{data.set(k,structuredClone(v));return true;}}}),{getMode:()=>mode});
  const host={current:{roleId:'a',roleName:'琴师',chatId:'chat-a'},subscribeContext:f=>{listeners.push(f);return()=>{};},onSuspend:()=>()=>{},context:async()=>({...host.current}),aiGenerate:async args=>{host.args=args;return {text:JSON.stringify({summary:'练琴的夜晚',entries:[entry,{...entry,kind:'event',title:'明早继续练习',date:'2026-10-27'}]})};}};
  const life=new RoleLife({phone,host});
  return {phone,host,life,changeMode:()=>{mode='shared';},change:()=>{host.current={roleId:'b',chatId:'chat-b'};listeners.forEach(f=>f());},draft:()=>life.draft({roleId:'a',caller:'琴师',date:'2026-10-26',instruction:'记录你的练琴日常'})};
}

test('role day is a preview, then one atomic batch persists cross-app records and retains old data',async()=>{
  const x=setup();await x.phone.invoke('upsert',{path:'memos',record:{title:'旧便签'}},{roleId:'a'});
  const before=x.phone.snapshot('a'),draft=await x.draft();assert.deepEqual(x.phone.snapshot('a'),before);
  assert.match(x.host.args.instruction,/手机机主是当前角色/);assert.deepEqual(x.host.args.context,[]);
  const receipt=await x.life.save(draft.id,draft.entries);assert.equal(receipt.saved,2);
  const state=x.phone.snapshot('a');assert.equal(state.revision,before.revision+1);assert.equal(state.memos.length,2);assert.equal(state.events.length,1);
  await assert.rejects(x.life.save(draft.id,draft.entries),{code:'DRAFT_UNAVAILABLE'});
});
test('discarding a draft never writes; explicit selected and edited records alone are saved',async()=>{
  const x=setup(),draft=await x.draft();await x.life.save(draft.id,[{...draft.entries[0],title:'修改后'}]);
  assert.equal(x.phone.snapshot('a').memos[0].title,'修改后');assert.equal(x.phone.snapshot('a').events.length,0);
});
test('a manual edit after generation blocks the whole stale batch without overwriting it',async()=>{
  const x=setup(),draft=await x.draft();await x.phone.invoke('upsert',{path:'memos',record:{title:'用户刚写的'}},{roleId:'a'});
  await assert.rejects(x.life.save(draft.id,draft.entries),{code:'revision_conflict'});const state=x.phone.snapshot('a');assert.equal(state.memos.length,1);assert.equal(state.events.length,0);
});
test('role and shared scope changes fence a draft before any storage write',async()=>{
  for(const change of ['change','changeMode']){const x=setup(),draft=await x.draft();x[change]();await assert.rejects(x.life.save(draft.id,draft.entries));assert.equal(x.phone.snapshot('a').memos.length,0);}
});
test('late model output and a lost context event cannot produce an adoptable draft',async()=>{
  const x=setup();let release;x.host.aiGenerate=()=>new Promise(r=>release=r);const pending=x.draft();while(!release)await new Promise(r=>setTimeout(r,0));x.life.cancel();release({text:JSON.stringify({summary:'x',entries:[entry]})});await assert.rejects(pending,{code:'CANCELLED'});
  const y=setup();y.host.aiGenerate=async()=>{y.host.current={roleId:'b',chatId:'b'};return{text:JSON.stringify({summary:'x',entries:[entry]})};};await assert.rejects(y.draft(),{code:'CONTEXT_CHANGED'});
});
test('draft parser rejects tools, invented URLs, invalid dates, unknown fields and oversized output',()=>{
  for(const mutation of [v=>v.entries[0].kind='delete',v=>v.entries[0].url='https://example.org',v=>v.entries[0].date='2026-02-30',v=>v.entries[0].time='25:10',v=>v.entries[0].body='',v=>v.actions=[]]){const value={summary:'x',entries:[{...entry}]};mutation(value);assert.throws(()=>parseLifeDraft(JSON.stringify(value)));}
  assert.throws(()=>parseLifeDraft('x'.repeat(24001)));
});
test('life feed is derived from actual current records, excludes private space and keeps record routes',()=>{
  const state={memos:[{id:'1',title:'旧',updated_at:'2026-10-25'}],events:[{id:'2',title:'练琴',date:'2026-10-27'}],pornhub:{history:[{id:'3',title:'private'}]},music:{playlist:[{id:'4',title:'曲目'}]}};
  assert.equal(lifeFeed(state).length,3);assert.equal(lifeFeed(state,{filter:'plans'})[0].path,'events');assert.equal(lifeFeed(state,{filter:'likes'}).length,1);state.memos=[];assert.equal(lifeFeed(state).length,2);
});
test('automatic story context never includes media addresses or private records',()=>{
  const prompt=lifeDraftPrompt({date:'2026-10-26',instruction:'今天的你',caller:'琴师',snapshot:{owner:{name:'琴师',avatar:'https://secret.example/a'},memos:[{id:'m',title:'https://secret.example/b',content:'Cookie=secret'}],pornhub:{history:[{title:'private-marker'}]}}});
  assert(!prompt.includes('secret.example'));assert(!prompt.includes('private-marker'));assert(!prompt.includes('Cookie=secret'));assert.match(prompt,/不代表真实/);
});
