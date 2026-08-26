-- 006_create_fiscalia_detalle.sql
-- Segunda tabla del pipeline Fiscalía: las hojas del boletín anual que
-- `fiscalia_boletin` no cubre.
--
-- `fiscalia_boletin` guarda el agregado simple (ingresos / términos por región).
-- Esta tabla guarda las métricas con DIMENSIONES, que no caben en aquel esquema:
--
--   metrica                | origen  | region | dimension          | subdimension   | unidad
--   -----------------------|---------|--------|--------------------|----------------|----------
--   tipo_termino           | TB6.2   | sí     | tipo de término    | vía de salida  | causas
--   juicios_orales         | TB9     | sí     | —                  | —              | juicios
--   dias_tramitacion       | TB7     | sí     | vía de salida      | —              | dias
--   imputados_demografia   | TB5.2.1 | NO     | sexo               | tramo etario   | imputados
--
-- `region_id` es NULL cuando la fuente publica el dato sólo a nivel nacional
-- (TB5.2.1). No se distribuye a regiones: política anti-imputación (FUENTES.md §7).
--
-- `valor` es NUMERIC y no INTEGER porque dias_tramitacion son promedios.

CREATE TABLE IF NOT EXISTS fiscalia_detalle (
  id                 SERIAL PRIMARY KEY,
  anio               SMALLINT NOT NULL,
  metrica            VARCHAR(40) NOT NULL,
  region_id          VARCHAR(3),               -- NULL = dato nacional
  region_nombre      VARCHAR(80),
  categoria_delito   VARCHAR(100) NOT NULL,
  dimension          VARCHAR(80),
  subdimension       VARCHAR(80),
  valor              NUMERIC,
  unidad             VARCHAR(20) NOT NULL,
  fuente             VARCHAR(50) NOT NULL DEFAULT 'fiscalia-boletin-anual',
  descargado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- COALESCE en el índice: region_id, dimension y subdimension son opcionales
-- según la métrica, y NULL != NULL rompería la idempotencia del upsert.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscalia_detalle
  ON fiscalia_detalle (
    anio,
    metrica,
    COALESCE(region_id, ''),
    categoria_delito,
    COALESCE(dimension, ''),
    COALESCE(subdimension, '')
  );

CREATE INDEX IF NOT EXISTS idx_fiscalia_detalle_metrica_anio
  ON fiscalia_detalle (metrica, anio);
