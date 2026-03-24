# Diseño: ETL Scraper CEAD — Estadísticas de Persecución Cannábica
**Fecha:** 2026-03-24
**Proyecto:** Observatorio Judicial Cannábico
**Componente:** `backend/etl/cead/`

---

## 1. Objetivo

Descargar la totalidad de las estadísticas delictuales de Ley de Drogas desde el portal del CEAD (https://cead.minsegpublica.gob.cl/estadisticas-delictuales/) para las 346 comunas de Chile, años 2005–2025, y consolidarlas en una tabla de hechos PostgreSQL con trazabilidad de versión taxonómica.

El indicador principal es la **tasa por cada 100.000 habitantes** (normalizada por proyecciones INE), complementada con frecuencia absoluta.

---

## 2. Taxonomía de Datos

### Datos objetivo

| Nivel | Valor |
|---|---|
| Familia | Delitos asociados a drogas |
| Grupo | Crímenes y simples delitos ley de drogas |
| Subgrupos complejos | Tráfico de sustancias; Microtráfico de sustancias; Elaboración o producción de sustancias (Cultivo); Otras infracciones a la ley de drogas |
| Subgrupos incivilidades | Consumo de alcohol y drogas en vía pública; Consumo de drogas en vía pública; Porte de drogas |
| Dimensiones | Frecuencia absoluta; Tasa/100.000 hab.; Tipo caso (Denuncias/Detenciones); Unidad territorial |

### Quiebre metodológico 2024

| Período | Taxonomía | Valor `taxonomy_version` |
|---|---|---|
| 2005–2023 | DMCS legacy (categoría genérica "infracciones ley drogas") | `DMCS_legacy` |
| 2024–2025 | Nueva: 7 familias / 22 grupos / 45 subgrupos | `Taxonomia_2024` |

**Estrategia de armonización:** "hacia arriba" (many-to-one). Una vista dimensional mapea todos los subgrupos 2024+ a la categoría genérica legacy, permitiendo series históricas continuas 2005–2025.

---

## 3. Arquitectura — Enfoque Híbrido (Opción C)

**Fase 1 — Mapper (Playwright, ejecutar 1 vez):**
Intercepta el tráfico de red del portal para extraer los códigos internos dinámicos (`familiaId`, `grupoId`, `subgrupoId`, `rId`, `provId`, `comunaId`). Persiste el resultado en `codigos_cead.json`.

**Fase 2 — Extractor (httpx async, extracción masiva):**
Itera sobre todas las combinaciones: 346 comunas × 21 años × subgrupos de drogas. Usa `codigos_cead.json` como referencia. Persiste progreso en checkpoint `.jsonl` para reanudar tras interrupciones.

**Fase 3 — Consolidador (pandas + SQLAlchemy):**
Normaliza columnas, añade `taxonomy_version`, carga en tabla `cead_hechos` de PostgreSQL.

---

## 4. Estructura de Módulos

```
backend/etl/cead/
├── mapper.py          # Fase 1: Playwright → codigos_cead.json
├── codigos_cead.json  # Mapa persistido de IDs del portal
├── extractor.py       # Fase 2: httpx async → /data/raw/
├── consolidator.py    # Fase 3: pandas → PostgreSQL
├── models.py          # Esquemas Pydantic de validación
├── config.py          # URLs, timeouts, rutas
└── runner.py          # Orquestador Fase 1→2→3
```

**Entorno Python:** `venv` en `/backend/venv/`

---

## 5. Esquema PostgreSQL — Tabla `cead_hechos`

```sql
CREATE TABLE cead_hechos (
    id               SERIAL PRIMARY KEY,
    anio             SMALLINT NOT NULL,
    mes              SMALLINT,                    -- NULL si dato es anual
    region_cod       VARCHAR(3),
    provincia_cod    VARCHAR(5),
    comuna_cod       VARCHAR(6) NOT NULL,         -- código INE
    comuna_nombre    VARCHAR(100) NOT NULL,
    subgrupo         VARCHAR(100),
    grupo            VARCHAR(100),
    familia          VARCHAR(100),
    tipo_caso        VARCHAR(20),                 -- 'Denuncias' | 'Detenciones'
    frecuencia       INTEGER,
    tasa_100k        NUMERIC(10,4),
    taxonomy_version VARCHAR(20) NOT NULL,        -- 'DMCS_legacy' | 'Taxonomia_2024'
    descargado_en    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Resiliencia y Error Handling

| Aspecto | Solución |
|---|---|
| Interrupciones | Checkpoint `.jsonl`: el extractor anota cada combinación completada y reanuda desde ahí |
| Errores de red | `tenacity`: 3 reintentos con backoff exponencial (1s, 2s, 4s) |
| Rate limiting | Semáforo asyncio: máximo 5 requests concurrentes |
| Logging | `logging` estándar → `logs/cead_etl.log` + stdout |
| Validación | Pydantic valida cada fila antes de insertar en PostgreSQL |

---

## 7. Endpoint del Portal

- **URL:** `https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/ajax_2.php`
- **Método:** POST
- **Parámetros clave:** `region`, `provincia`, `comuna`, `familia`, `grupo`, `subgrupo`, `anio`, `trimestre`, `mes`, `seleccion`
- **Códigos `seleccion`:** 1=región, 2=provincia, 3=comuna, 6=año, 9=familia, 10=grupo, 11=subgrupo

---

## 8. Notas para el Frontend (Tremor.so)

- **Capa 1 — Serie histórica (2005–actualidad):** Usa vista armonizada. Muestra volumen general de persecución Ley de Drogas.
- **Capa 2 — Zoom cannábico (2024+):** Solo datos `Taxonomia_2024`. Etiqueta visible: *"Este nivel de detalle está disponible desde 2024 por el cambio metodológico del Estado."*
