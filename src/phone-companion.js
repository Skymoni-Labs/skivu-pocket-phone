// SPDX-License-Identifier: GPL-3.0-only
import {PocketPhoneStore} from './engine.js';
import {ScopedPocketPhoneStore} from './scoped-store.js';
import {phoneCollections,phoneModules} from './collections.js';
import {sanitizeConversationData} from './conversation.js';
import {ExternalServices,RoleSoftwareTools} from './external-services.js';
import {canonicalJson} from './json-state.js';
export const COMPANION_HISTORY='pocket-phone.companion-history.v1';
export function phoneContextScope(context){return context.storageScope==='story'&&/^[a-f0-9]{64}$/.test(context.spaceId)?'story:'+context.spaceId:'role';}
const get=(data,path)=>path.split('.').reduce((v,k)=>v?.[k],data);
const copy=value=>structuredClone(value);
export class PhoneCompanion {
  constructor(host){this.host=host;this.context=null;this.phone=new ScopedPocketPhoneStore(new PocketPhoneStore({storage:{get:key=>host.storageGet(key),set:(key,value)=>host.storageSet(key,value)}}),{getMode:()=>phoneContextScope(this.context||{})});this.services=new RoleSoftwareTools({host,services:new ExternalServices(host)});}
  async restore(){this.context=await this.host.context();if(!this.context.roleId||!this.context.roleBound||!this.context.chatToolsEnabled)throw new Error('请先为这个角色开启随聊手机能力。');await this.phone.restore();return this;}
  async check(){const next=await this.host.context();if(next.roleId!==this.context.roleId||next.chatId!==this.context.chatId||next.spaceId!==this.context.spaceId||next.storageScope!==this.context.storageScope||!next.roleBound||!next.chatToolsEnabled)throw new Error('角色或故事绑定已经变化。');}
  async invoke(tool,args){await this.check();const c=this.context,options={roleId:c.roleId,caller:c.roleName,mayCommit:()=>true};
    if(tool==='read_phone'){
      if(args.collection&&(!phoneCollections[args.collection]||phoneCollections[args.collection].module==='pornhub')||args.module&&(!phoneModules.some(m=>m.id===args.module)||args.module==='pornhub'))throw new Error('请使用当前手机已有的非私密集合或应用。');
      const state=this.phone.snapshot(c.roleId),fields={};
      for(const [path,spec]of Object.entries(phoneCollections))if(spec.module!=='pornhub'&&(!args.collection||args.collection===path)&&(!args.module||args.module===spec.module))fields[path]=!args.collection&&!args.module?{count:Array.isArray(get(state,path))?get(state,path).length:null}:Array.isArray(get(state,path))?get(state,path).slice(-8):get(state,path);
      return{success:true,revision:state.revision,collections:sanitizeConversationData(fields),schema:Object.fromEntries(Object.entries(phoneCollections).filter(([path,s])=>Object.hasOwn(fields,path)).map(([path,s])=>[path,{fields:s.fields,required:s.requiredFields}]))};
    }
    if(tool==='save_record'){
      const spec=phoneCollections[args.collection];if(!spec||spec.singleton||spec.module==='pornhub')throw new Error('这个集合不允许随聊写入。');
      const beforeState=this.phone.snapshot(c.roleId),record=copy(args.record),before=record.id?get(beforeState,args.collection).find(v=>v.id===record.id):null;
      if(record.id&&!before)throw new Error('要修改的记录不存在，请先读取手机。');
      if(!c.callId)throw new Error('缺少本次工具执行标识。');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(c.callId));
      record.id=record.id||'chat_'+[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);
      record.provenance={kind:args.source==='role_story'?'role_story':'conversation',chatId:c.chatId,callId:c.callId,time:new Date().toISOString()};
      const history=await this.host.storageGet(COMPANION_HISTORY)||[];
      if(!Array.isArray(history))throw new Error('手机更新日志暂不可用。');
      const entry={callId:c.callId,roleId:c.roleId,scope:phoneContextScope(c),collection:args.collection,id:record.id,before,after:null};
      await this.host.storageSet(COMPANION_HISTORY,[...history.slice(-49),entry]);await this.check();
      const receipt=await this.phone.invoke('upsert',{path:args.collection,record,expected_revision:beforeState.revision},options);await this.check();
      const after=get(this.phone.snapshot(c.roleId),args.collection).find(v=>v.id===record.id);
      entry.after=copy(after);await this.host.storageSet(COMPANION_HISTORY,[...history.slice(-49),entry]);
      return{success:true,revision:receipt.revision,record:sanitizeConversationData(after),card:{title:spec.title||'手机记录已保存',summary:String(after.title||after.content||after.text||after.name||'已收进 TA 的手机').slice(0,180),action:'open-phone',payload:{collection:args.collection,id:record.id}}};
    }
    if(['phone_search_books','phone_read_feed','phone_open_software'].includes(tool))return this.services.invoke(tool,args,{roleId:c.roleId,chatId:c.chatId,scopeKey:phoneContextScope(c),mayCommit:()=>true});
    throw new Error('未提供这个角色手机工具。');
  }
}

export async function undoCompanionChange({phone,host,context,entry,mayCommit=()=>true}){
  if(!mayCommit())throw new Error('当前手机已变化。');
  if(entry.roleId!==context.roleId||entry.scope!==phoneContextScope(context)||!entry.after)throw new Error('这条更新不属于当前手机，或尚未完成。');
  const current=get(phone.snapshot(context.roleId),entry.collection)?.find(row=>row.id===entry.id);
  if(canonicalJson(current)!==canonicalJson(entry.after))throw new Error('这条记录后来已被修改，请手动核对，不能直接撤销。');
  const revision=phone.snapshot(context.roleId).revision;
  const result=entry.before?await phone.invoke('upsert',{path:entry.collection,record:{...entry.before,provenance:entry.before.provenance??null},expected_revision:revision},{roleId:context.roleId,mayCommit}):await phone.invoke('character_phone_delete_record',{path:entry.collection,id:entry.id,expected_revision:revision},{roleId:context.roleId,mayCommit});
  const history=await host.storageGet(COMPANION_HISTORY)||[];await host.storageSet(COMPANION_HISTORY,history.filter(row=>row.callId!==entry.callId));return result;
}
