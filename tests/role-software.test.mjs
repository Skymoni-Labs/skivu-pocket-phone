import test from 'node:test';
import assert from 'node:assert/strict';
import {RoleSoftwareTools,feedStorageKey} from '../src/external-services.js';
import {PocketPhoneConversation,parseConversationPlan} from '../src/conversation.js';
import {PocketPhoneStore} from '../src/engine.js';
import {ScopedPocketPhoneStore} from '../src/scoped-store.js';

function setup(){
  const store=new Map(),messages=[],requests=[],listeners=[];
  const host={current:{roleId:'a',chatId:'chat-a',roleName:'角色'},context:async()=>({...host.current}),storageGet:async key=>structuredClone(store.get(key)??null),storageSet:async(key,value)=>{store.set(key,structuredClone(value));return true;},subscribeContext:fn=>{listeners.push(fn);return()=>{};},onSuspend:()=>()=>{},chatRead:async()=>messages,chatAppend:async message=>{messages.push({id:'m'+messages.length,...message});return{id:messages.at(-1).id};},openExternal:async url=>{requests.push(url);return{status:'accepted'};}};
  const services={books:async()=>[{title:'来自真实服务的书目',author:'作者',year:2020,url:'https://openlibrary.org/works/OL123W'}],feed:async url=>({source:url,items:[{title:'订阅消息',summary:'资料',url:'https://feed.example/post',time:'2026'}]})};
  const tools=new RoleSoftwareTools({host,services});const options={roleId:'a',chatId:'chat-a',scopeKey:'role',mayCommit:()=>true};
  return {host,services,tools,options,store,requests,messages};
}
test('role can query a real provider adapter; only bounded public metadata returns to the model',async()=>{
  const x=setup(),result=await x.tools.invoke('phone_search_books',{keywords:'书名'},x.options);
  assert.equal(result.books[0].title,'来自真实服务的书目');assert.equal(result.books[0].workId,'OL123W');assert(!JSON.stringify(result).includes('https://'));
});
test('role reads only its configured feed; long IDs are hashed and never collide across roles',async()=>{
  const x=setup(),a=await feedStorageKey('role','a','browser'),b=await feedStorageKey('role','b','browser');assert.notEqual(a,b);assert((await feedStorageKey('role','x'.repeat(160),'browser')).length<160);
  await assert.rejects(x.tools.invoke('phone_read_feed',{source:'browser'},x.options),{code:'not_configured'});
  x.store.set(b,'https://other.example/feed');await assert.rejects(x.tools.invoke('phone_read_feed',{source:'browser'},x.options),{code:'not_configured'});
  x.store.set(a,'https://own.example/feed');const result=await x.tools.invoke('phone_read_feed',{source:'browser'},x.options);assert.equal(result.site,'own.example');assert(!JSON.stringify(result).includes('https://'));
});
test('software opening has a fixed public destination and reports system handoff rather than business success',async()=>{
  const x=setup(),result=await x.tools.invoke('phone_open_software',{app:'map',query:'杭州'},x.options);
  assert.equal(new URL(x.requests[0]).hostname,'www.openstreetmap.org');assert.equal(new URL(x.requests[0]).searchParams.get('query'),'杭州');assert.equal(result.meaning,'system_handoff_only');
  x.host.openExternal=async()=>({status:'cancelled'});assert.equal((await x.tools.invoke('phone_open_software',{app:'youtube'},x.options)).success,false);
  await assert.rejects(x.tools.invoke('phone_open_software',{app:'memos'},x.options));
});
test('a context switch while a public query is pending discards its result',async()=>{
  const x=setup();x.services.books=async()=>{x.host.current={roleId:'b',chatId:'chat-b'};return[];};await assert.rejects(x.tools.invoke('phone_search_books',{keywords:'x'},x.options),{code:'context_changed'});
});
test('external tool parser never permits arbitrary HTTP, credential or account parameters',()=>{
  const value={reply:'查询',done:false,actions:[{tool:'phone_open_software',arguments:{app:'map',query:'杭州'}}]};assert.equal(parseConversationPlan(JSON.stringify(value)).actions[0].tool,'phone_open_software');
  for(const key of ['url','headers','apiKey','cookie']){const invalid=structuredClone(value);invalid.actions[0].arguments[key]='x';assert.throws(()=>parseConversationPlan(JSON.stringify(invalid)));}
});
test('actual conversation orchestration returns lookup data to the next role model round before final chat append',async()=>{
  const x=setup(),phone=new ScopedPocketPhoneStore(new PocketPhoneStore({storage:{get:x.host.storageGet,set:x.host.storageSet}}));let rounds=0;
  x.host.aiGenerate=async args=>{rounds++;if(rounds===1)return{text:JSON.stringify({reply:'先查一下书目',actions:[{tool:'phone_search_books',arguments:{keywords:'书名'}}],done:false})};assert(JSON.stringify(args.context).includes('来自真实服务的书目'));return{text:JSON.stringify({reply:'查到了这本书的公开书目信息。',actions:[],done:true})};};
  const conversation=new PocketPhoneConversation({host:x.host,phone,externalTools:x.tools});const result=await conversation.send({text:'帮我查这本书'});assert.equal(result.status,'complete');assert.equal(result.results[0].success,true);assert.equal(result.results[0].tool,'phone_search_books');assert.equal(x.messages.length,2);assert.equal(phone.snapshot('a').books.length,0);conversation.dispose();
});
