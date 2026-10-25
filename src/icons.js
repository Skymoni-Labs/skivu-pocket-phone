// SPDX-License-Identifier: GPL-3.0-only
// Original inline SVGs. No icon font, remote asset or third-party runtime.
const shapes = {
  memos: [['rect',{x:5,y:3,width:14,height:18,rx:3}],['path',{d:'M9 8h6M9 12h6M9 16h3'}]],
  calendar: [['rect',{x:3,y:5,width:18,height:16,rx:4}],['path',{d:'M7 3v4m10-4v4M3 10h18M8 14h2m4 0h2m-8 3h2'}]],
  browser: [['circle',{cx:12,cy:12,r:9}],['ellipse',{cx:12,cy:12,rx:4,ry:9}],['path',{d:'M3 12h18'}]],
  taobao: [['path',{d:'M5 8h14l1 12H4L5 8Z'}],['path',{d:'M8 9V7a4 4 0 0 1 8 0v2'}]],
  youtube: [['rect',{x:3,y:5,width:18,height:14,rx:5}],['path',{d:'m10 9 5 3-5 3V9Z',fill:'currentColor',stroke:'none'}]],
  pornhub: [['rect',{x:5,y:10,width:14,height:11,rx:3}],['path',{d:'M8 10V7a4 4 0 0 1 8 0v3m-4 5v2'}]],
  books: [['path',{d:'M12 5v15M3 5c4-1 6-1 9 1 3-2 5-2 9-1v14c-4-1-6-1-9 1-3-2-5-2-9-1V5Z'}]],
  photos: [['rect',{x:3,y:3,width:18,height:18,rx:5}],['circle',{cx:8,cy:8,r:1.3}],['path',{d:'m4 17 5-5 4 4 3-3 5 5'}]],
  music: [['path',{d:'M9 17V5l11-2v12M9 8l11-2'}],['ellipse',{cx:6,cy:18,rx:3,ry:2.5}],['ellipse',{cx:17,cy:16,rx:3,ry:2.5}]],
  map: [['path',{d:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z'}],['circle',{cx:12,cy:10,r:2.5}]],
  wechat: [['path',{d:'M21 11c0 5-5 8-10 7l-6 3 1-5c-2-2-3-4-3-6 0-5 4-8 9-8s9 4 9 9Z'}],['path',{d:'M8 10h.01M12 10h.01m4 0h.01','stroke-width':3}]],
  flight: [['path',{d:'m21 3-6 18-4-8-8-4 18-6Zm0 0L11 13'}]],
  bilibili: [['rect',{x:3,y:7,width:18,height:14,rx:4}],['path',{d:'m7 3 3 4m7-4-3 4M8 12v3m8-3v3m-6 3h4'}]],
  instagram: [['rect',{x:3,y:3,width:18,height:18,rx:6}],['circle',{cx:12,cy:12,r:4}],['circle',{cx:17.5,cy:6.5,r:.8,fill:'currentColor',stroke:'none'}]],
  meituan: [['path',{d:'M3 13h18M5 13a7 7 0 0 1 14 0M4 17h16l-1 4H5l-1-4Zm8-14V2'}]],
  xiaoyuzhou: [['circle',{cx:12,cy:12,r:8}],['ellipse',{cx:12,cy:12,rx:12,ry:4,transform:'rotate(-35 12 12)'}],['circle',{cx:12,cy:12,r:2,fill:'currentColor',stroke:'none'}]],
  xiachufang: [['path',{d:'M7 13c-6 0-5-8 0-8 2-4 8-4 10 0 5 0 6 8 0 8v8H7v-8Zm0 4h10'}]],
  douban: [['rect',{x:4,y:3,width:16,height:18,rx:3}],['path',{d:'M8 7h8m-8 4h8m-8 4h5'}]],
  xianyu: [['path',{d:'M4 12c5-9 11-9 16 0-5 9-11 9-16 0Zm0 0-3-4v8l3-4Z'}],['circle',{cx:15,cy:11,r:1,fill:'currentColor',stroke:'none'}]],
  weibo: [['path',{d:'M18 10c3 1 4 5 1 8-3 4-12 4-15 0S5 9 10 8c2-1 3-1 3 1l-1 2m4-6c3-1 5 1 5 4'}],['ellipse',{cx:11,cy:16,rx:4,ry:2.5}]],
  ledger: [['rect',{x:4,y:3,width:16,height:18,rx:4}],['path',{d:'M8 7h8m-8 4h2m4 0h2m-8 4h2m4 0h2m-8 3h2m4 0h2'}]],
  arrowLeft: [['path',{d:'m14 5-7 7 7 7'}]], arrowRight: [['path',{d:'m10 5 7 7-7 7'}]],
  plus: [['path',{d:'M12 5v14M5 12h14'}]], close: [['path',{d:'m6 6 12 12M6 18 18 6'}]],
  search: [['circle',{cx:10.5,cy:10.5,r:6.5}],['path',{d:'m16 16 5 5'}]],
  settings: [['path',{d:'m10 3-1 3-3 1-3 3v4l3 1 1 3 3 3h4l1-3 3-1 3-3v-4l-3-1-1-3-3-3h-4Z'}],['circle',{cx:12,cy:12,r:3}]],
  sparkle: [['path',{d:'m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z'}]],
  play: [['path',{d:'m8 4 12 8-12 8V4Z',fill:'currentColor',stroke:'none'}]],
  previous: [['path',{d:'M5 5v14m14-14-11 7 11 7V5Z'}]], next: [['path',{d:'M19 5v14M5 5l11 7-11 7V5Z'}]],
  stop: [['rect',{x:5,y:5,width:14,height:14,rx:3,fill:'currentColor',stroke:'none'}]],
  sun: [['circle',{cx:12,cy:12,r:4}],['path',{d:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'}]],
};
export function uiIcon(name, className = '') {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.65','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false',class:`ui-icon ${className}`}))svg.setAttribute(key,value);
  for(const [tag,attrs] of shapes[name]||shapes.memos){const node=document.createElementNS(svg.namespaceURI,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));svg.append(node);}
  return svg;
}
export const appColors={memos:['#fff0c8','#91702c'],calendar:['#e1eaff','#5473b8'],browser:['#dfe9f4','#527994'],taobao:['#ffe1cc','#bc7040'],youtube:['#ffe1e3','#be6570'],pornhub:['#dfe1ee','#5e638a'],books:['#dcece2','#597f67'],photos:['#eadffb','#886ab3'],music:['#e1e5fe','#6b70b0'],map:['#dbece7','#548674'],wechat:['#dbefdb','#5f9166'],flight:['#dceafa','#5d82ae'],bilibili:['#f8deec','#b77094'],instagram:['#eee0f0','#a77ba6'],meituan:['#fcf0ca','#b39b4c'],xiaoyuzhou:['#dfe7f4','#6d85b1'],xiachufang:['#e7eccf','#849752'],douban:['#daeadc','#598563'],xianyu:['#f7edbe','#a59850'],weibo:['#f7dfe0','#b87878'],ledger:['#e3e1f2','#8175a6']};
