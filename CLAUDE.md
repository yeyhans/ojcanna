# Observatorio Judicial Cannábico - Contexto del Proyecto

## Stack Tecnológico
- Frontend: React, TypeScript, Tremor.so (Analítica), MapLibre GL JS (Mapas WebGL).
- Backend: Python 3.10+, FastAPI (ASGI), Pydantic.
- Base de Datos: PostgreSQL con extensión espacial PostGIS.
- Minería de Datos (Scraping/NLP): Python, Playwright/Selenium, spaCy.

## Estructura del Proyecto
- `/frontend`: Componentes de UI, dashboards de Tremor y visualizador cartográfico.
- `/backend/api`: Controladores de FastAPI, inyección de dependencias y modelos ORM.
- `/backend/etl`: Scripts de extracción masiva de datos (PJud y CEAD).
- `/backend/nlp`: Modelos de procesamiento de lenguaje natural para clasificación de sentencias y extracción de nombres de jueces.

## Comandos Principales
- Iniciar API Backend: `uvicorn main:app --reload`
- Iniciar Frontend: `npm run dev`
- Ejecutar pipeline de extracción: `python backend/etl/runner.py`

## Reglas y Convenciones
- Utilizar funciones asíncronas (`async def`) en los endpoints de FastAPI para maximizar la concurrencia.
- Validar estrictamente todas las respuestas de la API utilizando esquemas de Pydantic.
- Los datos geoespaciales (comunas) deben ser serializados y expuestos exclusivamente en formato GeoJSON para su consumo en MapLibre.
- Resguardar la normativa de privacidad: los algoritmos de extracción de sentencias deben ignorar la identidad de los imputados y centrarse únicamente en la metadata del tribunal, el juez y el veredicto.

### Sobre la descarga masiva desde el CEAD

El portal de Estadísticas Delictuales de la Subsecretaría de Prevención del Delito (CEAD) no ofrece un único botón o una API abierta tradicional para descargar la totalidad de la base de datos nacional en un solo archivo CSV. La interfaz obliga a los usuarios a interactuar con un formulario dinámico filtrando por año, región, comuna y familia delictual para luego descargar el reporte.[1]

Para lograr la extracción masiva y automatizada que necesitas para el proyecto, deberás utilizar técnicas de *web scraping*. Aquí tienes las recomendaciones técnicas para programar este proceso en Python:

1. **Ingeniería Inversa de Peticiones:** En lugar de simular clics con un navegador virtual, abre las Herramientas para Desarrolladores de tu navegador web (pestaña "Red" o "Network") y realiza una consulta manual en el portal del CEAD filtrando por "Crímenes y simples delitos ley de drogas" a nivel comunal. Identifica la petición HTTP interna (generalmente un `POST` o `GET` a un endpoint oculto) que el sitio realiza para obtener los datos.
2. **Automatización con Requests:** Utiliza la librería `requests` de Python para replicar esa llamada de red. Deberás iterar programáticamente alterando el código de la comuna y el año en el *payload* de la petición.
3. **Procesamiento y Consolidación:** Captura las respuestas del servidor del CEAD, utiliza la librería `pandas` de Python para limpiar las tablas, normalizar los nombres de las comunas y concatenar todas las descargas en un único archivo CSV maestro que luego podrás inyectar en tu base de datos PostgreSQL.