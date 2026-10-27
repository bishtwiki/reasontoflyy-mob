"""Sync approved public homepage content without changing app layout or calling booking APIs."""
import argparse,json,re,hashlib,urllib.request
from html.parser import HTMLParser
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
BASE='https://reasontoflyy.com/'
ALLOWED={'Everything the whole trip needs, in one place','Save more on every booking','Pack a week, somewhere new','One search, every option, and a price that does not move.'}
class Node:
 def __init__(self,tag='',attrs=()):self.tag=tag;self.attrs=dict(attrs);self.children=[]
 def text(self):return ' '.join(' '.join(child.text() if isinstance(child,Node) else child for child in self.children).split())
 def all(self,tag):return [item for child in self.children if isinstance(child,Node) for item in ([child] if child.tag==tag else [])+child.all(tag)]
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.root=Node();self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  node=Node(tag,attrs);self.stack[-1].children.append(node)
  if tag not in {'img','input','meta','link','br','hr','source','wbr','area','embed','param','track','col','base'}:self.stack.append(node)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):self.stack[-1].children.append(data)
def card(node):
 images=node.all('img');links=node.all('a');headings=node.all('strong') or node.all('h3')
 return {'title':headings[0].text() if headings else '', 'text':node.text(),'image':images[0].attrs.get('src','') if images else '', 'imageAlt':images[0].attrs.get('alt','') if images else '', 'href':(node.attrs.get('href') if node.tag=='a' else links[0].attrs.get('href') if links else '') or ''}
def capture(html):
 parser=Parser();parser.feed(html);sections=[]
 for section in parser.root.all('section'):
  headings=section.all('h2')
  if not headings or headings[0].text() not in ALLOWED:continue
  heading=headings[0].text();items=section.all('article') or section.all('li')
  if not items:items=[link for link in section.all('a') if link.all('strong') or link.all('img')]
  cards=[];seen=set()
  for item in items:
   value=card(item);identity=value['href'] or value['text'] or value['image']
   if not identity or identity in seen:continue
   seen.add(identity)
   if value['href'].startswith('/offers/'):
    title=value['title']
    if not title:
     labels=[a.attrs.get('aria-label','') for a in item.all('a')]
     title=next((label.removeprefix('View offer details for ') for label in labels if label.startswith('View offer details for ')),'')
    match=re.search(r'\bFLYY[A-Z]+\b',value['text']);code=match.group() if match else ''
    description=value['text'].removeprefix('T&C apply ').removeprefix(title).strip()
    if code:description=description.split(code)[0].strip()
    value.update(title=title,description=description,code=code,termsLabel='T&C apply',category='Hotel' if code=='FLYYSTAY' else 'Holiday Offers' if code in {'FLYYESCAPE','FLYYHOLIDAY'} else 'Flight')
   elif value['href'].startswith('/holidays/'):
    duration=re.search(r'\b\d+D\s*/\s*\d+N\b',value['text']);route=re.search(r'·\s*(.*?)\s*→\s*(.*?)\s*Price on request',value['text'])
    value.update(duration=duration.group() if duration else '',origin=route.group(1).strip() if route else '',destination=route.group(2).strip() if route else value['title'],priceLabel='Price on request')
   cards.append(value)
  sections.append({'title':heading,'text':section.text(),'cards':cards,'viewAllLabel':next((a.text() for a in section.all('a') if a.attrs.get('href') in {'/offers','/holidays'}),'')})
 titles=['Everything the whole trip needs, in one place','Save more on every booking','Pack a week, somewhere new']
 for title in titles:
  if not any(s['title']==title and s['cards'] for s in sections):raise RuntimeError('Required homepage content was unavailable: '+title)
 sections.sort(key=lambda section:titles.index(section['title']) if section['title'] in titles else len(titles))
 logo=next((image.attrs['src'] for image in parser.root.all('img') if '/website/b2c/logo_' in image.attrs.get('src','')),'')
 if not logo:raise RuntimeError('Public brand logo was not found.')
 title=parser.root.all('title')[0].text();name=title.split('—')[0].strip();hero=parser.root.all('h1');footer=parser.root.all('footer')
 return {'source':BASE,'captured':datetime.now(ZoneInfo('Asia/Kolkata')).strftime('%Y-%m-%d'),'name':name,'logo':logo,'hero':hero[0].text() if hero else '', 'sections':sections,'footer':footer[0].text() if footer else ''}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',type=Path);args=ap.parse_args()
 html=args.html.read_text() if args.html else urllib.request.urlopen(BASE,timeout=30).read().decode()
 data=capture(html)
 output=Path('assets/reference/homepage.json')
 registry=Path('src/reference/images.ts');old=registry.read_text()
 existing={url:path for url,path in re.findall(r'"([^"]+)": require\("([^"]+)"\)',old)}
 urls=list(dict.fromkeys([data['logo']]+[c['image'] for s in data['sections'] for c in s['cards'] if c['image']]))
 rows=['// Only approved homepage brand, offer and holiday images.','export const referenceImages: Record<string, number> = {']
 for url in urls:
  path=existing.get(url)
  if not path:
   suffix=Path(url.split('?')[0]).suffix or '.png';filename='home-'+hashlib.sha256(url.encode()).hexdigest()[:16]+suffix
   destination=Path('assets/reference')/filename
   if not destination.exists():urllib.request.urlretrieve(url,destination)
   path='../../assets/reference/'+filename
  rows.append('  '+json.dumps(url)+': require('+json.dumps(path)+'),')
 rows.append('};');registry.write_text('\n'.join(rows)+'\n');output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 # Remove old editorial entries that the user explicitly excluded.
 pages=Path('assets/reference/pages.json')
 if pages.exists():
  values=json.loads(pages.read_text());values={k:v for k,v in values.items() if not k.startswith('/blog/')};pages.write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'sections':[s['title'] for s in data['sections']],'offers':len(data['sections'][1]['cards']),'holidays':len(data['sections'][2]['cards']),'approvedImages':len(urls)}))
if __name__=='__main__':main()
