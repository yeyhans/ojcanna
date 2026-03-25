import asyncio, logging, json
logging.basicConfig(level=logging.INFO)
from etl.cead.mapper import run_mapper, validar_subgrupos

codigos = asyncio.run(run_mapper())

print(json.dumps({
    'regiones': len(codigos.get('regiones', [])),
    'comunas': len(codigos.get('comunas', [])),
    'familias_drogas': len(codigos.get('familias_drogas', [])),
    'grupos_drogas': len(codigos.get('grupos_drogas', [])),
    'subgrupos_drogas': len(codigos.get('subgrupos_drogas', [])),
}, indent=2))

try:
    validar_subgrupos(codigos)
    print('VALIDACION OK')
except ValueError as e:
    print('ERROR:', e)
