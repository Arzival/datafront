#!/usr/bin/env python3
"""Genera los datos de demostración a partir de una bóveda real.

Toma las referencias ya clasificadas («ready») que tienen URL de origen
(para poder dar crédito al autor), como mucho la mitad del total de
clasificadas, y escribe:

  public/demo/<n>.webp         imagen a 1600 px de ancho (para el visor)
  public/demo/thumbs/<n>.webp  miniatura a 640 px (para el catálogo)
  src/api/demoData.json        las fichas, con la forma de `Reference`

Uso (con el backend corriendo):

  python3 scripts/generar-demo.py http://127.0.0.1:8000/api

Necesita Pillow. Las imágenes son de sus autores: solo entran las que
tienen origen, y cada ficha enlaza a él.
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
DEMO = RAIZ / 'public' / 'demo'
DATOS = RAIZ / 'src' / 'api' / 'demoData.json'


def descargar(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as respuesta:
        return respuesta.read()


def guardar_webp(original: bytes, destino: Path, ancho: int, calidad: int) -> None:
    with Image.open(io.BytesIO(original)) as imagen:
        imagen.load()
        if imagen.width > ancho:
            alto = round(imagen.height * ancho / imagen.width)
            imagen = imagen.resize((ancho, alto), Image.LANCZOS)
        if imagen.mode not in ('RGB', 'RGBA'):
            imagen = imagen.convert('RGBA')
        imagen.save(destino, 'WEBP', quality=calidad, method=6)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    api = sys.argv[1].rstrip('/')
    todas = json.loads(descargar(f'{api}/references'))
    clasificadas = [r for r in todas if r['status'] == 'ready']
    con_credito = sorted(
        (r for r in clasificadas if r.get('sourceUrl')),
        key=lambda r: int(r['id']),
    )
    elegidas = con_credito[: len(clasificadas) // 2]

    (DEMO / 'thumbs').mkdir(parents=True, exist_ok=True)
    for viejo in list(DEMO.glob('*.webp')) + list((DEMO / 'thumbs').glob('*.webp')):
        viejo.unlink()

    fichas = []
    for n, ref in enumerate(elegidas, start=1):
        original = descargar(ref['imageUrl'])
        guardar_webp(original, DEMO / f'{n}.webp', 1600, 82)
        guardar_webp(original, DEMO / 'thumbs' / f'{n}.webp', 640, 80)

        fichas.append({
            'id': f'demo-{n}',
            'title': ref['title'],
            'filename': f'demo-{n}.webp',
            'imageUrl': f'/demo/{n}.webp',
            'thumbUrl': f'/demo/thumbs/{n}.webp',
            # En la demo el «archivo en disco» es el de public/: así el prompt
            # copiado apunta a algo que existe en el repo clonado.
            'filePath': f'public/demo/{n}.webp',
            'width': ref['width'],
            'height': ref['height'],
            'bytes': ref['bytes'],
            'sourceUrl': ref['sourceUrl'],
            'status': 'ready',
            'error': None,
            'providerId': ref['providerId'],
            'model': ref['model'],
            'summary': ref['summary'],
            'notes': ref['notes'],
            'tags': ref['tags'],
            'createdAt': ref['createdAt'],
            'deletedAt': None,
        })
        print(f'{n:>2}. {ref["title"]}')

    DATOS.write_text(json.dumps(fichas, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    peso = sum(p.stat().st_size for p in DEMO.rglob('*.webp'))
    print(f'\n{len(fichas)} de {len(clasificadas)} clasificadas ({len(con_credito)} con origen). '
          f'Imágenes: {peso / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
