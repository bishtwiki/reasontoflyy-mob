import {parseDocument,DomUtils} from 'htmlparser2';
import type {AnyNode,Element} from 'domhandler';
import type {HomepageContent,HomeCard} from '../shared/home';
const SOURCE='https://reasontoflyy.com/';
const allowed=new Set(['Everything the whole trip needs, in one place','Save more on every booking','Pack a week, somewhere new','One search, every option, and a price that does not move.']);
const all=(node:AnyNode,tag:string)=>DomUtils.findAll((n)=>n.type==='tag'&&n.name===tag,'children'in node?node.children:[]) as Element[];
const text=(node?:AnyNode):string=>!node?'':node.type==='text'?node.data.replace(/\s+/g,' '):('children'in node?node.children.map(text).join(' '):'').replace(/\s+/g,' ').trim();
const image=(node:AnyNode)=>all(node,'img')[0]?.attribs.src||'';
export function parseHomepage(html:string):HomepageContent{
 const root=parseDocument(html);const sections:HomepageContent['sections']=[];
 for(const section of all(root,'section')){
  const title=text(all(section,'h2')[0]);if(!allowed.has(title))continue;
  const items=all(section,'article').length?all(section,'article'):all(section,'li').length?all(section,'li'):all(section,'a').filter(a=>all(a,'strong').length||all(a,'img').length);
  const seen=new Set<string>();const cards:HomeCard[]=[];
  for(const item of items){const links=item.name==='a'?[item]:all(item,'a');const href=links[0]?.attribs.href||'';const body=text(item);const id=href||body;if(seen.has(id))continue;seen.add(id);
   const heading=text(all(item,'strong')[0]||all(item,'h3')[0])||links.map(l=>l.attribs['aria-label']||'').find(l=>l.startsWith('View offer details for '))?.replace('View offer details for ','')||'';
   const code=body.match(/\bFLYY[A-Z]+\b/)?.[0];const description=code?body.replace(/^T&C apply\s*/,'').replace(heading,'').split(code)[0].trim():body;
   cards.push({title:heading,text:body,description,image:image(item),href,code,category:code==='FLYYSTAY'?'Hotel':code==='FLYYESCAPE'||code==='FLYYHOLIDAY'?'Holiday Offers':code?'Flight':undefined,termsLabel:code?'T&C apply':undefined,duration:body.match(/\d+D\s*\/\s*\d+N/)?.[0],destination:body.match(/→\s*(.*?)Price on request/)?.[1]?.trim(),priceLabel:body.includes('Price on request')?'Price on request':undefined});
  }
  const paragraph=all(section,'p')[1];
  sections.push({title,label:title.startsWith('Everything')?'Travel services':title.startsWith('Save')?'Offers & deals':title.startsWith('Pack')?'Featured holidays':'Why Reason to Flyy',description:text(paragraph),cards});
 }
 if(!sections.find(s=>s.title.startsWith('Save'))?.cards.length||!sections.find(s=>s.title.startsWith('Pack'))?.cards.length)throw Error('Homepage content unavailable');
 const serviceNames=[...all(root,'button').filter(b=>b.attribs.role==='tab').map(text),...(sections.find(s=>s.label==='Travel services')?.cards.map(c=>c.title)||[])].filter(n=>['Flights','Hotels','Insurance','Holidays','Cruise','Forex','Groups','Visa'].includes(n));
 const services=[...new Set(serviceNames)].map(name=>({id:name.toLowerCase(),name}));
 const imgs=all(root,'img');const footer=all(root,'footer')[0];const links=footer?all(footer,'a'):[];const footerText=text(footer);
 return {services,source:SOURCE,fetchedAt:new Date().toISOString(),stale:false,name:text(all(root,'title')[0]).split('—')[0].trim(),logo:imgs.find(i=>i.attribs.src?.includes('/website/b2c/logo_'))?.attribs.src||'',hero:{title:text(all(root,'h1')[0]),description:text(all(root,'p').find(p=>text(p).startsWith('Compare live'))),image:imgs.find(i=>i.attribs.src?.includes('/slider/'))?.attribs.src||''},sections,contact:{phone:links.find(a=>a.attribs.href?.startsWith('tel:'))?.attribs.href.slice(4)||'',email:links.find(a=>a.attribs.href?.startsWith('mailto:'))?.attribs.href.slice(7)||'',address:footerText.match(/Registered office\s*(.*?)Reason To Flyy/)?.[1]||'',description:footerText.match(/Reason to Flyy —.*?One Place!/)?.[0]||''}};
}
let cached:HomepageContent|undefined;let expires=0;let pending:Promise<HomepageContent>|undefined;
export async function homepage():Promise<HomepageContent>{
 if(cached&&Date.now()<expires)return cached;
 if(pending)return pending;
 pending=(async()=>{try{const r=await fetch(SOURCE,{signal:AbortSignal.timeout(15000),headers:{Accept:'text/html'}});if(!r.ok)throw Error('Homepage source unavailable');const html=await r.text();if(html.length>5_000_000)throw Error('Homepage too large');cached=parseHomepage(html);expires=Date.now()+60000;return cached;}catch(e){if(cached)return {...cached,stale:true};throw e;}finally{pending=undefined;}})();return pending;
}
