-- 003_create_ine_poblacion.sql
-- Tabla de Proyecciones de Población Comunal INE (base Censo 2017), serie 2002-2035.
-- Ejecutar: python backend/etl/cead/run_sql.py backend/etl/cead/sql/003_create_ine_poblacion.sql
--
-- Fuente oficial:
--   https://www.ine.gob.cl/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion
-- XLSX descargado por: etl/ine_proyecciones/runner.py

CREATE TABLE IF NOT EXISTS ine_poblacion (
    id              SERIAL          PRIMARY KEY,
    cut             VARCHAR(6)      NOT NULL,
    nombre          TEXT,
    anio            INT             NOT NULL,
    poblacion_total INT             NOT NULL,
    fuente          TEXT            NOT NULL DEFAULT 'ine_proyecciones_2017',
    snapshot_utc    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (cut, anio, fuente)
);

CREATE INDEX IF NOT EXISTS idx_ine_poblacion_cut_anio
    ON ine_poblacion (cut, anio);

COMMENT ON TABLE ine_poblacion IS
    'Proyecciones población comunal INE base Censo 2017, serie 2002-2035. '
    'Fuente: https://www.ine.gob.cl - Estimaciones y Proyecciones 2002-2035 comunas.';

COMMENT ON COLUMN ine_poblacion.cut IS
    'Código Único Territorial comunal (sin zero-padding, ej: "1101" no "01101"). '
    'Matchea directamente comunas.cut.';

COMMENT ON COLUMN ine_poblacion.fuente IS
    'Identificador de la versión del dataset. '
    '"ine_proyecciones_2017" = base Censo 2017 (vigente). '
    'Al publicar base Censo 2024, insertar nueva fuente sin borrar la anterior.';
