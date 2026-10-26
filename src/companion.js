// SPDX-License-Identifier: GPL-3.0-only
import {PocketPhoneHost} from './host.js';
import {PhoneCompanion} from './phone-companion.js';
const host=new PocketPhoneHost();
let running=false;
Skivu.on('companion.invoke',async event=>{
  if(running)return;running=true;let result;
  try{await host.info();const phone=new PhoneCompanion(host);await phone.restore();result=await phone.invoke(event.tool,event.arguments);}
  catch(e){result={success:false,error:e?.message||'手机操作未完成。'};}
  await Skivu.call('runtime.complete',{result});
});
await Skivu.call('runtime.ready',{});
