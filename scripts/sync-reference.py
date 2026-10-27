"""Capture allowed offer and holiday pages; excludes blogs and other disallowed sections."""
import concurrent.futures,json,re,urllib.request
from html.parser import HTMLParser
from pathlib import Path
BASE='https://reasontoflyy.com/'
class Reader(HTMLParser):
 def __init__(self):
  super().__init__();self.skip=0;self.lines=[];self.active=False;self.has_main=False
 def handle_starttag(self,tag,attrs):
  if tag=='main':self.active=True;self.has_main=True
  if tag in ('script','style','noscript','svg'):self.skip+=1
  if self.active and tag in ('p','h1','h2','h3','li','section','article','div','br'):self.lines.append('\n')
 def handle_endtag(self,tag):
  if tag in ('script','style','noscript','svg'):self.skip=max(0,self.skip-1)
  if tag=='main':self.active=False
  if self.active and tag in ('p','h1','h2','h3','li'):self.lines.append('\n')
 def handle_data(self,text):
  if self.active and not self.skip:self.lines.append(text)
 def text(self):return '\n'.join(filter(None,(re.sub(r'\s+',' ',x).strip() for x in ''.join(self.lines).split('\n'))))
home=json.loads(Path('assets/reference/homepage.json').read_text())
paths={c['href'] for sec in home['sections'] for c in sec['cards'] if c['href'].startswith(('/offers/','/holidays/'))}
paths.update(['/visa','/forex','/groups'])
def capture(path):
 try:
  request=urllib.request.Request(BASE.rstrip('/')+path,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(request,timeout=25) as r:html=r.read().decode()
  parser=Reader();parser.feed(html);text=parser.text()
  return path,{'text':text,'source':BASE.rstrip('/')+path} if text else None
 except Exception as e:return path,None
results=dict(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(capture,sorted(paths)))
Path('assets/reference/pages.json').write_text(json.dumps({k:v for k,v in results.items() if v},ensure_ascii=False,indent=2)+'\n')
print('Captured',sum(bool(v) for v in results.values()),'of',len(paths),'public detail pages.')
for k,v in results.items():
 if not v:print('Unavailable:',k)
