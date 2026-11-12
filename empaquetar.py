# EMPAQUETAR.PY — junta toda la carpeta en un solo HTML jugable (Reliquias-jugable.html)
# Uso: python3 empaquetar.py      (no hace falta tocar nada más)
import re, base64, os, mimetypes
D = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(D, 'index.html'), encoding='utf8').read()
def incrustar(m):
    nombre = m.group(1)
    js = open(os.path.join(D, nombre), encoding='utf8').read()
    if nombre == 'arte.js':   # cambia cada ruta assets/... por la imagen dentro del archivo
        def dato(r):
            ruta = r.group(1); tipo = mimetypes.guess_type(ruta)[0] or ('image/webp' if ruta.endswith('.webp') else 'image/jpeg')
            return '"%s": "data:%s;base64,%s"' % (ruta, tipo, base64.b64encode(open(os.path.join(D, ruta), 'rb').read()).decode())
        js = re.sub(r'"(assets/[^"]+)": "assets/[^"]+"', dato, js)
    return '<script>\n' + js.replace('</script>', '<\\/script>') + '\n</script>'
salida = re.sub(r'<script src="([^"]+)"></script>', incrustar, html)
open(os.path.join(D, 'Reliquias-jugable.html'), 'w', encoding='utf8').write(salida)
print('Reliquias-jugable.html', round(len(salida) / 1e6, 1), 'MB')
