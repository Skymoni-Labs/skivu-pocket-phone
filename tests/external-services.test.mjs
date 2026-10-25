import test from 'node:test';
import assert from 'node:assert/strict';
import {ExternalServices,softwareConnections,externalUrl} from '../src/external-services.js';
import {phoneModules} from '../src/collections.js';

test('all 21 existing entries have an honest implemented capability classification',()=>{
  assert.deepEqual(softwareConnections.map(c=>c.id).sort(),phoneModules.map(c=>c.id).sort());
  assert.equal(new Set(softwareConnections.map(c=>c.id)).size,21);
  for(const c of softwareConnections){assert(c.detail);assert(['local','external','feed','books','music','map'].includes(c.mode));if(c.url)assert.equal(externalUrl(c.url),c.url);}
});
test('public link input cannot smuggle credentials, local destinations or script schemes',()=>{
  for(const url of ['http://example.org','javascript:alert(1)','https://127.0.0.1','https://192.168.0.1','https://name:password@example.org','file:///etc/passwd'])assert.throws(()=>externalUrl(url));
});
test('real catalog mapping retains provenance without inventing authors or returning arbitrary resource URLs',async()=>{
  const calls=[];const api=new ExternalServices({request:async p=>{calls.push(p);return{status:200,body:JSON.stringify({docs:[{key:'/works/OL123W',title:'真实书目',author_name:['作者'],first_publish_year:1999},{key:'https://evil.example',title:'bad'}]})};}});
  const books=await api.books('书名');assert.equal(books.length,1);assert.equal(books[0].url,'https://openlibrary.org/works/OL123W');assert.match(calls[0].url,/q=/);assert.match(calls[0].headers['User-Agent'],/SkivuPocketPhone/);assert.equal(calls[0].maxBytes,1024*1024);
});
test('external failure or oversized/malformed response never becomes fabricated search results',async()=>{
  for(const reply of [{status:429,body:'{}'},{status:200,body:'bad'},{status:200,body:'a'.repeat(1024*1024+1)},{status:200,body:'{}'}]){const api=new ExternalServices({request:async()=>reply});await assert.rejects(api.books('test'));}
});
test('duplicate queries use bounded cache while concurrent/rapid remote requests are blocked',async()=>{
  let calls=0;const api=new ExternalServices({request:async()=>{calls++;return{status:200,body:'{"docs":[]}'};}});await api.books('first');await assert.rejects(api.books('second'),{code:'rate_limit'});await api.books('first');assert.equal(calls,1);
});
