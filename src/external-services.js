// SPDX-License-Identifier: GPL-3.0-only
import {publicUrl,PocketPhoneServiceError} from './services.js';
const fail=(code,message)=>{throw new PocketPhoneServiceError(code,message);};
const trim=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
export const softwareConnections=[
  {id:'memos',mode:'local',detail:'角色自己的便签，真实保存到插件存档。'},
  {id:'calendar',mode:'local',detail:'角色的日程与离线晨昏计算；不读取设备日历。'},
  {id:'browser',mode:'feed',url:'https://www.mozilla.org/firefox/',detail:'打开公开 HTTPS 网页；读取 RSS/Atom，选择后收藏到角色浏览器。'},
  {id:'taobao',mode:'external',url:'https://www.taobao.com/',docs:'https://open.taobao.com/',detail:'打开真实淘宝页面；手机内订单仍是角色记录，未接入买家账号或付款。'},
  {id:'youtube',mode:'external',url:'https://www.youtube.com/',docs:'https://developers.google.com/youtube/registering_an_application',detail:'打开真实 YouTube；账号数据需要平台应用凭证与授权，当前不读取账号历史。'},
  {id:'pornhub',mode:'local',detail:'角色的私密本机记录，独立控制是否进入模型上下文。'},
  {id:'books',mode:'books',url:'https://openlibrary.org/',docs:'https://openlibrary.org/dev/docs/api/search',detail:'真实 Open Library 书目搜索，选定后加入角色书架；不提供受限图书全文。'},
  {id:'photos',mode:'local',detail:'用户选择文件、角色存档图片与用户配置的生图服务；不扫描设备相册。'},
  {id:'music',mode:'music',url:'https://music.163.com/',detail:'通过自己配置的兼容服务真实搜索、选歌与播放；取决于该服务及账号授权。'},
  {id:'map',mode:'map',url:'https://www.openstreetmap.org/',docs:'https://www.openstreetmap.org/copyright',detail:'在真实 OpenStreetMap 搜索地点；角色手机内地图继续保存故事地点，不表示设备定位。'},
  {id:'wechat',mode:'external',url:'https://weixin.qq.com/',docs:'https://open.weixin.qq.com/',detail:'可打开官方页面；个人微信聊天和朋友圈尚未获得可用的授权接口，手机内内容是角色记录。'},
  {id:'flight',mode:'external',url:'https://www.umetrip.com/',detail:'打开航旅纵横官方页面；航班与个人行程同步接口尚未接通，角色安排保留在本机。'},
  {id:'bilibili',mode:'external',url:'https://www.bilibili.com/',docs:'https://open.bilibili.com/',detail:'打开真实哔哩哔哩；账号授权与对应开放能力需单独接入，当前不同步观看历史。'},
  {id:'instagram',mode:'external',url:'https://www.instagram.com/',docs:'https://developers.facebook.com/docs/instagram-platform/',detail:'打开真实 Instagram；账号同步需要 Meta 应用与适用账号授权，当前未连接。'},
  {id:'meituan',mode:'external',url:'https://waimai.meituan.com/',docs:'https://developer.meituan.com/',detail:'打开真实美团外卖页面；不把角色订单当成真实下单，不读取个人订单或付款。'},
  {id:'xiaoyuzhou',mode:'feed',url:'https://www.xiaoyuzhoufm.com/',detail:'打开小宇宙，或读取节目提供的真实 RSS 保存节目资料；不声称已登录小宇宙账号。'},
  {id:'xiachufang',mode:'external',url:'https://www.xiachufang.com/',detail:'打开真实下厨房页面；当前未接通账号菜谱收藏同步。'},
  {id:'douban',mode:'external',url:'https://www.douban.com/',detail:'打开真实豆瓣页面；当前未接通账号书影音记录同步。'},
  {id:'xianyu',mode:'external',url:'https://www.goofish.com/',docs:'https://open.goofish.com/',detail:'打开真实闲鱼页面；当前不发布商品、操作交易或读取个人订单。'},
  {id:'weibo',mode:'external',url:'https://weibo.com/',docs:'https://open.weibo.com/wiki/授权机制说明',detail:'打开真实微博页面；账号读写需要开发者应用与授权，当前未连接。'},
  {id:'ledger',mode:'local',detail:'角色的本机账本，金额统计可用；不连接银行或真实支付。'},
];

export function externalUrl(raw){const value=publicUrl(raw);if(!value)fail('invalid_url','请填写有效的公开 HTTPS 链接。');return value;}
export async function feedStorageKey(scope,roleId,id){const bytes=new TextEncoder().encode(`${scope}:${scope==='shared'?'phone':roleId}:${id}`);const digest=await crypto.subtle.digest('SHA-256',bytes);return 'pocket-phone.feed.'+[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');}

/** Real role tools: fixed providers and role-owned subscriptions, no raw HTTP. */
export class RoleSoftwareTools {
  constructor({host,services}){this.host=host;this.services=services;}
  async invoke(tool,args,{roleId,chatId,scopeKey,mayCommit}){
    const check=async()=>{if(mayCommit()!==true)fail('cancelled','本轮已暂停，未继续访问软件。');const context=await this.host.context();if(context.roleId!==roleId||context.chatId!==chatId||mayCommit()!==true)fail('context_changed','当前角色或聊天已变化。');};
    await check();let result;
    if(tool==='phone_search_books'){
      const books=await this.services.books(args.keywords);result={success:true,provider:'Open Library',books:books.map(({title,author,year,url})=>({title,author,year,workId:url.split('/').at(-1)}))};
    }else if(tool==='phone_read_feed'){
      if(!['browser','xiaoyuzhou'].includes(args.source))fail('invalid_source','只可读取当前角色配置的浏览器或播客订阅。');
      const url=await this.host.storageGet(await feedStorageKey(scopeKey,roleId,args.source));await check();if(typeof url!=='string'||!url)fail('not_configured','这个角色尚未配置该公开订阅，请先在对应应用的连接中设置。');
      const feed=await this.services.feed(url);result={success:true,provider:'RSS/Atom',site:new URL(feed.source).hostname,entries:feed.items.slice(0,8).map(({title,summary,time})=>({title,summary,time}))};
    }else if(tool==='phone_open_software'){
      const item=softwareConnections.find(c=>c.id===args.app);if(!item?.url)fail('unsupported_software','这个入口是角色的本机应用，没有外部软件链接。');
      const q=typeof args.query==='string'?args.query.trim():'';if(q.length>200)fail('invalid_query','软件搜索内容过长。');
      const searches={map:['https://www.openstreetmap.org/search','query'],books:['https://openlibrary.org/search','q'],youtube:['https://www.youtube.com/results','search_query'],bilibili:['https://search.bilibili.com/all','keyword'],taobao:['https://s.taobao.com/search','q'],xiachufang:['https://www.xiachufang.com/search/','keyword'],douban:['https://www.douban.com/search','q'],weibo:['https://s.weibo.com/weibo','q']};
      let url=item.url;if(q){const search=searches[args.app];if(!search)fail('unsupported_query','该软件当前只支持打开官方网站。');url=search[0]+'?'+new URLSearchParams({[search[1]]:q});}
      await check();const receipt=await this.host.openExternal(externalUrl(url));
      return {success:receipt.status==='accepted',software:args.app,status:receipt.status,meaning:'system_handoff_only'};
    }else fail('unsupported_tool','未接入的外部工具。');
    await check();return result;
  }
}
export function parseFeed(xml,base,DOM=globalThis.DOMParser){
  if(typeof xml!=='string'||xml.length>1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))fail('invalid_feed','订阅内容无效或超过 1 MiB。');
  const doc=new DOM().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')||!['rss','feed','RDF'].includes(doc.documentElement.localName))fail('invalid_feed','这里不是有效的 RSS 或 Atom 订阅。');
  const children=node=>[...node.children];
  const field=(node,name)=>children(node).find(child=>child.localName===name)?.textContent?.trim()||'';
  const plain=raw=>{const page=new DOM().parseFromString(raw,'text/html');return (page.body?.textContent||'').replace(/\s+/g,' ').trim().slice(0,1500);};
  const nodes=[...doc.getElementsByTagName('*')].filter(node=>['item','entry'].includes(node.localName)).slice(0,30);
  return nodes.map(node=>{const links=children(node).filter(n=>n.localName==='link'),link=links.find(n=>!n.getAttribute('rel')||n.getAttribute('rel')==='alternate');const raw=link?.getAttribute('href')||link?.textContent?.trim()||children(node).find(n=>n.localName==='enclosure')?.getAttribute('url')||'';let url='';try{if(raw)url=externalUrl(new URL(raw,base).href);}catch{}
    return {title:trim(field(node,'title'),300),summary:plain(field(node,'description')||field(node,'summary')||field(node,'content')),url,time:trim(field(node,'pubDate')||field(node,'published')||field(node,'updated'),100)};
  }).filter(item=>item.title&&item.url);
}

export class ExternalServices {
  constructor(host){this.host=host;this.cache=new Map();this.busy=false;this.lastRequest=0;}
  async request(url){
    const cached=this.cache.get(url);if(cached&&Date.now()-cached.at<300000)return structuredClone(cached.value);
    if(this.busy||Date.now()-this.lastRequest<1100)fail('rate_limit','请稍后再查询。');
    this.busy=true;this.lastRequest=Date.now();
    try{const r=await this.host.request({url,headers:{'User-Agent':'SkivuPocketPhone/1.4.0 (+https://github.com/skyjjgw/skivu-pocket-phone)'},responseType:'text',maxBytes:1024*1024});if(r.status!==200)fail('external_http','外部服务暂不可用，请稍后重试。');if(typeof r.body!=='string'||new TextEncoder().encode(r.body).length>1024*1024)fail('invalid_response','外部服务返回内容无效或过大。');this.cache.set(url,{at:Date.now(),value:r.body});if(this.cache.size>30)this.cache.delete(this.cache.keys().next().value);return r.body;}finally{this.busy=false;}
  }
  async feed(raw){const url=externalUrl(raw);return{source:url,items:parseFeed(await this.request(url),url)};}
  async books(query){
    if(typeof query!=='string'||!query.trim()||query.length>200)fail('invalid_query','请输入书名或作者（最多 200 字）。');
    const url='https://openlibrary.org/search.json?'+new URLSearchParams({q:query.trim(),limit:'10',fields:'key,title,author_name,first_publish_year'});let value;try{value=JSON.parse(await this.request(url));}catch(e){if(e instanceof PocketPhoneServiceError)throw e;fail('invalid_response','书目服务未返回有效结果。');}
    if(!Array.isArray(value.docs))fail('invalid_response','书目结果格式无效。');
    return value.docs.filter(book=>typeof book.key==='string'&&/^\/works\/OL\d+W$/.test(book.key)&&typeof book.title==='string').slice(0,10).map(book=>({title:trim(book.title),author:Array.isArray(book.author_name)?book.author_name.filter(v=>typeof v==='string').slice(0,5).map(v=>trim(v,120)).join(' / '):'',year:Number.isSafeInteger(book.first_publish_year)?book.first_publish_year:null,url:'https://openlibrary.org'+book.key}));
  }
}
