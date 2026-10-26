import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PocketPhoneHost} from '../src/host.js';
import {PhoneCompanion,COMPANION_HISTORY,undoCompanionChange} from '../src/phone-companion.js';
import {PocketPhoneStore,PHONE_STORAGE_KEY} from '../src/engine.js';
import {canonicalJson} from '../src/json-state.js';
function fixture(){
 const data=new Map(),calls=[];let context={roleId:'r1',roleName:'角色一',chatId:'c1',storageScope:'story',spaceId:'a'.repeat(64),roleBound:true,chatToolsEnabled:true,callId:'turn1:1'};
 const sdk={on:()=>()=>{},async call(method,p={}){calls.push(method);if(method==='host.info')return{methods:['storage.compareAndSet']};if(method==='context.get')return structuredClone(context);if(method==='storage.get')return structuredClone(data.get(p.key)??null);if(method==='storage.compareAndSet'){if(canonicalJson(data.get(p.key)??null)!==canonicalJson(p.expected))throw Object.assign(new Error('conflict'),{code:'REVISION_CONFLICT'});data.set(p.key,structuredClone(p.value));return true;}throw Error(method);}};
 const host=new PocketPhoneHost(sdk);return{data,calls,host,get context(){return context;},set context(value){context=value;}};
}
const memo={collection:'memos',record:{title:'一起去书店',content:'明天下午去看看。'},source:'conversation'};
test('normal-chat phone tool writes actual story archive with provenance and opens the same record',async()=>{
 const f=fixture();await f.host.info();const runtime=await new PhoneCompanion(f.host).restore();const result=await runtime.invoke('save_record',memo);
 assert.equal(result.success,true);assert.equal(result.card.action,'open-phone');const archive=f.data.get(PHONE_STORAGE_KEY);assert.equal(archive.roles['story_'+'a'.repeat(64)].memos[0].title,memo.record.title);assert.equal(archive.roles['story_'+'a'.repeat(64)].memos[0].provenance.chatId,'c1');assert.equal(archive.roles.r1,undefined);assert(!f.calls.includes('ai.generate'));assert(!f.calls.includes('chat.append'));assert(f.calls.includes('storage.compareAndSet'));
});
test('independent stories remain isolated and legacy role archive remains available explicitly',async()=>{
 const f=fixture();await f.host.info();let runtime=await new PhoneCompanion(f.host).restore();await runtime.invoke('save_record',memo);
 f.context={...f.context,chatId:'c2',spaceId:'b'.repeat(64)};runtime=await new PhoneCompanion(f.host).restore();assert.equal(runtime.phone.snapshot('r1').memos.length,0);
 const legacy=new PocketPhoneStore({storage:{get:key=>f.host.storageGet(key),set:(k,v)=>f.host.storageSet(k,v)}});await legacy.restore();await legacy.invoke('character_phone_write_memo',{record:{title:'旧记录'}},{roleId:'r1'});
 f.context={...f.context,storageScope:'role'};runtime=await new PhoneCompanion(f.host).restore();assert.equal(runtime.phone.snapshot('r1').memos[0].title,'旧记录');assert.equal(f.data.get(PHONE_STORAGE_KEY).roles['story_'+'a'.repeat(64)].memos.length,1);
});
test('binding revoked or story changed before invocation cannot write',async()=>{const f=fixture();await f.host.info();const runtime=await new PhoneCompanion(f.host).restore();f.context={...f.context,chatToolsEnabled:false};await assert.rejects(()=>runtime.invoke('save_record',memo));assert.equal(f.data.get(PHONE_STORAGE_KEY),undefined);});
test('undo removes exactly the unchanged created record and preserves other records',async()=>{
 const f=fixture();await f.host.info();const runtime=await new PhoneCompanion(f.host).restore();await runtime.invoke('save_record',memo);const entry=f.data.get(COMPANION_HISTORY)[0];await runtime.phone.invoke('character_phone_write_memo',{record:{title:'另外一件事'}},{roleId:'r1'});await undoCompanionChange({phone:runtime.phone,host:f.host,context:f.context,entry});assert.deepEqual(runtime.phone.snapshot('r1').memos.map(v=>v.title),['另外一件事']);
});
test('undo refuses to erase a record edited after a chat update',async()=>{const f=fixture();await f.host.info();const runtime=await new PhoneCompanion(f.host).restore();await runtime.invoke('save_record',memo);const entry=f.data.get(COMPANION_HISTORY)[0];await runtime.phone.invoke('upsert',{path:'memos',record:{id:entry.id,title:'后来的编辑'}},{roleId:'r1'});await assert.rejects(()=>undoCompanionChange({phone:runtime.phone,host:f.host,context:f.context,entry}),/后来已被修改/);assert.equal(runtime.phone.snapshot('r1').memos[0].title,'后来的编辑');});
test('private collections are unavailable and not exposed in read receipts',async()=>{const f=fixture();const runtime=await new PhoneCompanion(f.host).restore();const result=await runtime.invoke('read_phone',{});assert(!Object.keys(result.collections).some(v=>v.startsWith('pornhub')));await assert.rejects(()=>runtime.invoke('save_record',{collection:'pornhub.history',record:{title:'x'}}));});
test('reload observes another instance without resetting or overwriting its records',async()=>{const f=fixture();await f.host.info();const first=await new PhoneCompanion(f.host).restore(),second=await new PhoneCompanion(f.host).restore();await first.invoke('save_record',memo);assert.equal(second.phone.snapshot('r1').memos.length,0);await second.phone.reload();assert.equal(second.phone.snapshot('r1').memos[0].title,memo.record.title);});
test('reload of damaged storage keeps last snapshot visible but blocks all writes',async()=>{const f=fixture();await f.host.info();const runtime=await new PhoneCompanion(f.host).restore();await runtime.invoke('save_record',memo);f.data.set(PHONE_STORAGE_KEY,{broken:true});await assert.rejects(()=>runtime.phone.reload());assert.equal(runtime.phone.snapshot('r1').memos[0].title,memo.record.title);await assert.rejects(()=>runtime.phone.invoke('upsert',{path:'memos',record:{title:'never'}},{roleId:'r1'}));assert.deepEqual(f.data.get(PHONE_STORAGE_KEY),{broken:true});});
