# -*- coding: utf-8 -*-
"""Descarga TODOS los archivos de foto (Supabase Storage) a disco como respaldo."""
import json, os, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.join(HERE, 'export_supabase')
OUT = os.path.join(EXP, 'photos')
os.makedirs(OUT, exist_ok=True)

def load(t):
    with open(os.path.join(EXP, t + '.json'), encoding='utf-8') as f:
        return json.load(f)

urls = {}  # url -> categoria
for r in load('advisors'):
    if r.get('photo_url'): urls.setdefault(r['photo_url'], 'asesor')
for r in load('macs'):
    if r.get('image_url'): urls.setdefault(r['image_url'], 'mac_portada')
for r in load('mac_images'):
    if r.get('photo_url'): urls.setdefault(r['photo_url'], 'mac_galeria')

print("URLs unicas a respaldar:", len(urls))
ok = fail = 0
total_bytes = 0
manifest = []
for url, cat in urls.items():
    fname = url.split('/')[-1].split('?')[0]
    if not fname:
        fname = 'foto_%d' % (ok + fail)
    dest = os.path.join(OUT, fname)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'rescate/1.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        with open(dest, 'wb') as f:
            f.write(data)
        ok += 1
        total_bytes += len(data)
        manifest.append({'categoria': cat, 'archivo': fname, 'bytes': len(data), 'url': url})
    except urllib.error.HTTPError as e:
        fail += 1
        print("  [HTTP %s] %s" % (e.code, url))
        manifest.append({'categoria': cat, 'archivo': fname, 'error': 'HTTP %s' % e.code, 'url': url})
    except Exception as e:
        fail += 1
        print("  [ERROR] %s -> %s" % (url, e))
        manifest.append({'categoria': cat, 'archivo': fname, 'error': str(e), 'url': url})

with open(os.path.join(OUT, '_manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print("Descargadas OK: %d | Fallidas: %d | Total: %.1f KB" % (ok, fail, total_bytes / 1024))
print("Carpeta:", OUT)
