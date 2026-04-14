-- 005_create_pjud_tables.sql
-- Fase E: tablas para sentencias PJud (Poder Judicial) del pipeline judicial.
--
-- Arquitectura de dos capas (D6 - Opción B) para cumplir Acta 164-2024 CS y
-- Ley 19.628 de Protección de la Vida Privada:
--   • Capa pública: pjud_sentencias, pjud_extracciones, pjud_download_log
--   • Capa auditoría: pjud_audit (admin-only, HMAC salado con PJUD_AUDIT_SALT)
--
-- Cobertura: 2024-2025 en adelante (vigencia Acta 164 = 2025-01-01).
-- Fuentes: Portal Unificado Sentencias (scraping) + SAIP institucional.
--
-- Ejecutar: python etl/cead/run_sql.py etl/cead/sql/005_create_pjud_tables.sql

-- ---------------------------------------------------------------------------
-- 1. CAPA PÚBLICA — Sentencia anonimizada
-- ---------------------------------------------------------------------------
-- Granularidad: una fila por sentencia individual.
-- texto_anonimizado NUNCA contiene RUT, nombres ni domicilios en producción.
-- anonimizador_version permite auditar qué pipeline produjo el texto limpio.
CREATE TABLE IF NOT EXISTS pjud_sentencias (
    id                    UUID         PRIMARY KEY,
    rol                   VARCHAR(40)  NOT NULL,
    tribunal_id           VARCHAR(10),
    tribunal_nombre       TEXT,
    comuna_id             VARCHAR(6)   REFERENCES comunas(cut),
    region_id             VARCHAR(3),
    fecha_sentencia       DATE         NOT NULL,
    anio                  INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha_sentencia)) STORED,
    materia               TEXT,
    fuente                VARCHAR(20)  NOT NULL DEFAULT 'portal_unificado',
    texto_anonimizado     TEXT         NOT NULL,
    anonimizador_version  VARCHAR(20)  NOT NULL,
    idioma                VARCHAR(5)            DEFAULT 'es',
    ocr_required          BOOLEAN               DEFAULT FALSE,
    ingested_at           TIMESTAMPTZ           DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pjud_sentencias
    ON pjud_sentencias (rol, COALESCE(tribunal_id, ''), fecha_sentencia);

CREATE INDEX IF NOT EXISTS idx_pjud_sentencias_comuna_anio
    ON pjud_sentencias (comuna_id, anio);

CREATE INDEX IF NOT EXISTS idx_pjud_sentencias_tribunal_anio
    ON pjud_sentencias (tribunal_id, anio);

CREATE INDEX IF NOT EXISTS idx_pjud_sentencias_region_anio
    ON pjud_sentencias (region_id, anio);

COMMENT ON TABLE pjud_sentencias IS
  'Capa pública. Sentencias PJud Ley 20.000 anonimizadas. Cobertura 2024-2025+ (Acta 164-2024).';
COMMENT ON COLUMN pjud_sentencias.texto_anonimizado IS
  'Texto con RUT/nombres/domicilios suprimidos. No contiene datos sensibles Ley 19.628.';

-- ---------------------------------------------------------------------------
-- 2. CAPA PÚBLICA — Extracciones estructuradas (versionables)
-- ---------------------------------------------------------------------------
-- Múltiples versiones del extractor por sentencia permiten re-correr pipelines
-- sin duplicar texto crudo. Queries deben usar DISTINCT ON para última versión.
CREATE TABLE IF NOT EXISTS pjud_extracciones (
    sentencia_id                 UUID         NOT NULL REFERENCES pjud_sentencias(id) ON DELETE CASCADE,
    extractor_version            VARCHAR(20)  NOT NULL,
    gramaje_g                    NUMERIC(10, 2),
    thc_pct                      NUMERIC(5, 2),
    tipo_cultivo                 VARCHAR(20),    -- indoor | outdoor | sin_cultivo
    receta_medica                BOOLEAN,
    tipo_delito                  VARCHAR(30),    -- trafico | microtrafico | porte | consumo
    veredicto                    VARCHAR(30),    -- condena | absolucion | sobreseimiento | salida_alternativa
    pena_meses                   INTEGER,
    atipicidad_consumo_personal  BOOLEAN,
    confianza                    NUMERIC(3, 2),  -- 0.00 - 1.00
    extraido_at                  TIMESTAMPTZ             DEFAULT NOW(),
    PRIMARY KEY (sentencia_id, extractor_version)
);

CREATE INDEX IF NOT EXISTS idx_pjud_extracciones_veredicto
    ON pjud_extracciones (veredicto, extractor_version);

CREATE INDEX IF NOT EXISTS idx_pjud_extracciones_gramaje
    ON pjud_extracciones (gramaje_g)
    WHERE gramaje_g IS NOT NULL;

COMMENT ON TABLE pjud_extracciones IS
  'Variables estructuradas extraídas por NLP/rules. Versionado permite reprocesamiento.';

-- ---------------------------------------------------------------------------
-- 3. CAPA PÚBLICA — Log de descarga (idempotencia + reintentos)
-- ---------------------------------------------------------------------------
-- Evita re-scraping de sentencias ya procesadas. status='ocr_required' marca
-- sentencias escaneadas para pipeline OCR posterior.
CREATE TABLE IF NOT EXISTS pjud_download_log (
    rol             VARCHAR(40)  NOT NULL,
    tribunal_id     VARCHAR(10)  NOT NULL DEFAULT '',
    url_origen      TEXT,
    status          VARCHAR(20)  NOT NULL,  -- ok | pdf_error | not_found | ocr_required | rate_limited
    intentos        SMALLINT              DEFAULT 0,
    last_attempted  TIMESTAMPTZ           DEFAULT NOW(),
    PRIMARY KEY (rol, tribunal_id)
);

CREATE INDEX IF NOT EXISTS idx_pjud_download_log_status
    ON pjud_download_log (status, last_attempted);

COMMENT ON TABLE pjud_download_log IS
  'Log de descarga Portal Unificado. Idempotencia del scraper + cola de reintentos.';

-- ---------------------------------------------------------------------------
-- 4. CAPA DE AUDITORÍA — Hash salado del original (admin-only)
-- ---------------------------------------------------------------------------
-- NO expuesta por API pública. Permite:
--   (a) detectar duplicados antes de anonimizar (ahorro de compute)
--   (b) verificar integridad pipeline: reproducir anonimización de una sentencia
--   (c) auditoría externa sin exponer texto crudo
--
-- texto_hmac = hex(HMAC-SHA256(texto_original, env.PJUD_AUDIT_SALT))
-- Sin la sal, un dump accidental no permite rainbow attack contra corpus público.
CREATE TABLE IF NOT EXISTS pjud_audit (
    sentencia_id               UUID         PRIMARY KEY REFERENCES pjud_sentencias(id) ON DELETE CASCADE,
    texto_hmac                 VARCHAR(64)  NOT NULL,
    anonimizacion_diff_bytes   INTEGER,
    entidades_detectadas       JSONB,       -- {"PER": 3, "LOC": 2, "RUT": 1, "ORG": 0}
    audited_at                 TIMESTAMPTZ            DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pjud_audit_hmac
    ON pjud_audit (texto_hmac);

COMMENT ON TABLE pjud_audit IS
  'Capa auditoría admin-only. HMAC-SHA256 con sal privada (env PJUD_AUDIT_SALT). No exponer por API pública.';

-- Revocación de lectura pública (requiere rol postgres con privilegios de admin)
-- REVOKE SELECT ON pjud_audit FROM PUBLIC;
-- Neon maneja permisos vía roles; descomentar al deployar con rol específico.
