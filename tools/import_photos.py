"""Replace plant photos using the user-supplied, labelled BYAMBAA PDF.
Run after import_redbook.py: python tools/import_photos.py /path/to/BYAMBAA.pdf
"""
import json, re, shutil, sys
from pathlib import Path
import pymupdf
ROOT = Path(__file__).resolve().parents[1]
def norm(s):
    return re.sub(r'[^а-яөүё]', '', re.sub(r'\[.*?\]', '', s.lower()))
# Manually reviewed spelling differences in the supplied PDF.
ALIASES = {norm(k):v for k,v in {
    'Федченконгийн цагаансуль':10, 'Ихбушилж':11,
    'Час улаан алтан судал':15, 'Хурч дэлбээт цахилдаг':22,
    'Нангиад жамьяанмядаг':39, 'Цуулбар навчит зогдор өвс':44,
    'Муркроптын жигд':79, 'Дэрвэгэр жирвэгрүү':82,
    'Груыбовын бэрмэг':89, 'Мартдагдсан зэллэг цэцэг':92,
    'Нугын туйланцар':96, 'Шөмбөгөр хувилгана':103,
}.items()}
records=json.loads((ROOT/'data/plants.json').read_text())
by_name={norm(p['mn']):p['no'] for p in records}
by_no={p['no']:p for p in records}
matches=[]
seen=set()
for i,page in enumerate(pymupdf.open(sys.argv[1])):
    events=[]
    for block in page.get_text('dict')['blocks']:
        if block['type']==1:
            events.append((block['bbox'][1], 'image', block))
        else:
            for line in block['lines']:
                text=''.join(s['text'] for s in line['spans']).strip()
                if text: events.append((line['bbox'][1], 'name', text))
    current=None
    for _,kind,value in sorted(events,key=lambda e:e[0]):
        if kind=='name':
            assert current is None, ('Name without image',i+1,current)
            no=by_name.get(norm(value),ALIASES.get(norm(value)))
            assert no is not None, ('Unknown name',i+1,value)
            assert no not in seen, ('Duplicate plant',no)
            current=(no,value)
        else:
            assert current is not None, ('Image without name',i+1)
            no,name=current
            matches.append((no,name,i+1,value));seen.add(no);current=None
    assert current is None, ('Unpaired name',i+1)
assert len(matches)==134 and set(by_no)-seen=={114}
(ROOT/'assets/byambaa').mkdir(exist_ok=True)
manifest=[]
for no,name,page,image in matches:
    record=by_no[no]
    path=f'assets/byambaa/{no:03d}.{image["ext"]}'
    (ROOT/path).write_bytes(image['image'])
    if 'referenceImages' not in record:
        record['referenceImages']=record['images'][:]
    record['img']=path;record['images']=[path]
    record['imageSource']={'file':'sources/byambaa.pdf','page':page,'label':name}
    manifest.append({'no':no,'name':record['mn'],'pdfLabel':name,'page':page,'image':path})
(ROOT/'data/plants.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
(ROOT/'data/plants.js').write_text('/* Generated from supplied Red Book and BYAMBAA PDFs. See tools/. */\nconst D = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
(ROOT/'data/photo-import.json').write_text(json.dumps({'source':'sources/byambaa.pdf','matched':manifest,'missing':[{'no':114,'name':by_no[114]['mn']}]},ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(sys.argv[1],ROOT/'sources/byambaa.pdf')
print('Replaced 134 photos; retained original for 114:',by_no[114]['mn'])
