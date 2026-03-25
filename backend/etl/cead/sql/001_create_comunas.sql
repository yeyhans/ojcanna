-- Habilitar extensión espacial PostGIS en Neon
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla de geometrías comunales (carga única desde shapefile BCN)
-- cut: ID CEAD sin zero-padding (ej. "5602" no "05602")
CREATE TABLE IF NOT EXISTS comunas (
    cut         VARCHAR(6)  PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    region_id   VARCHAR(3),
    geom        GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);

-- Índice espacial R-Tree para consultas geográficas futuras
CREATE INDEX IF NOT EXISTS comunas_geom_gist ON comunas USING GIST(geom);

-- Índice compuesto en cead_hechos para el LEFT JOIN de la API
-- (cead_hechos debe existir antes de crear este índice)
-- Ejecutar después de CeadConsolidator.run():
-- CREATE INDEX IF NOT EXISTS idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);
