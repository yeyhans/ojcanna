-- 002_create_source_tables.sql
-- Tablas para nuevas fuentes de datos: DPP y PDI/datos.gob.cl
-- Ejecutar: python etl/cead/run_sql.py etl/cead/sql/002_create_source_tables.sql
--
-- Nota: UNIQUE con COALESCE no es soportado en CREATE TABLE.
-- Se usa CREATE UNIQUE INDEX separado para columnas nullables.

-- ---------------------------------------------------------------------------
-- DPP: causas gestionadas por la Defensoría Penal Pública (Ley 20.000)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dpp_causas (
    id               SERIAL PRIMARY KEY,
    anio             SMALLINT     NOT NULL,
    region_id        VARCHAR(3),
    region_nombre    VARCHAR(80),
    comuna_id        VARCHAR(6),
    tipo_delito      VARCHAR(150) NOT NULL,
    tipo_termino     VARCHAR(100),
    n_causas         INTEGER,
    n_imputados      INTEGER,
    fuente           VARCHAR(50)  NOT NULL DEFAULT 'DPP-SIGDP',
    descargado_en    TIMESTAMPTZ          DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dpp_causas
    ON dpp_causas (anio, COALESCE(region_id, ''), tipo_delito, COALESCE(tipo_termino, ''));

CREATE INDEX IF NOT EXISTS idx_dpp_filtros
    ON dpp_causas (anio, region_id, tipo_delito);

-- ---------------------------------------------------------------------------
-- datosgob_seguridad: estadísticas PDI / seguridad ciudadana
-- Fuente: datos.gob.cl — granularidad regional (PDI 2024-2025)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datosgob_seguridad (
    id               SERIAL PRIMARY KEY,
    anio             SMALLINT     NOT NULL,
    comuna_id        VARCHAR(6),
    region_id        VARCHAR(3),
    categoria        VARCHAR(150) NOT NULL,
    subcategoria     VARCHAR(150),
    frecuencia       NUMERIC(12, 4),
    tasa_100k        NUMERIC(10, 4),
    fuente           VARCHAR(50)  NOT NULL DEFAULT 'datos.gob.cl',
    descargado_en    TIMESTAMPTZ          DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_datosgob_seguridad
    ON datosgob_seguridad (anio, COALESCE(region_id, ''), categoria, COALESCE(subcategoria, ''));

CREATE INDEX IF NOT EXISTS idx_datosgob_filtros
    ON datosgob_seguridad (anio, region_id, categoria);
