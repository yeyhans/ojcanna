-- 004_create_fiscalia_boletin.sql
-- Tabla destino del pipeline ETL Fiscalía Nacional — Ministerio Público.
-- Fuente oficial: https://www.fiscaliadechile.cl/persecucion-penal/estadisticas

CREATE TABLE IF NOT EXISTS fiscalia_boletin (
  id                 SERIAL PRIMARY KEY,
  anio               SMALLINT NOT NULL,
  region_id          VARCHAR(3) NOT NULL,
  region_nombre      VARCHAR(80),
  categoria_delito   VARCHAR(100) NOT NULL,
  tipo_metrica       VARCHAR(30)  NOT NULL,    -- ingresos | terminos | formalizaciones
  n_causas           INTEGER,
  fuente             VARCHAR(50) NOT NULL DEFAULT 'fiscalia-boletin-anual',
  descargado_en      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscalia_boletin
  ON fiscalia_boletin (anio, region_id, categoria_delito, tipo_metrica);

CREATE INDEX IF NOT EXISTS idx_fiscalia_boletin_anio_region
  ON fiscalia_boletin (anio, region_id);

COMMENT ON TABLE fiscalia_boletin IS
  'Boletines estadísticos Fiscalía Nacional. Regional, categoría "Ley 20.000".';
