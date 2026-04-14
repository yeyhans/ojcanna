# backend/tests/etl/pjud/test_extractor.py
"""
Tests del extractor rule-v1.

Cubre los 6 campos principales: gramaje, veredicto, pena, tipo_delito,
receta_medica, atipicidad. Usa fixtures sintéticas inspiradas en sentencias
reales anonimizadas (sin datos sensibles).
"""
import pytest

from etl.pjud.extractor import (
    extract_gramaje,
    extract_veredicto,
    extract_pena_meses,
    extract_tipo_delito,
    extract_receta_medica,
    extract_atipicidad,
    extract_all,
)


class TestExtractGramaje:
    def test_gramos_simple(self):
        assert extract_gramaje("se encontraron 12 gramos de cannabis") == 12.0

    def test_gramos_con_decimales_coma(self):
        assert extract_gramaje("incautó 2,5 gramos de marihuana") == 2.5

    def test_gramos_con_decimales_punto(self):
        assert extract_gramaje("total: 3.5 g de cannabis") == 3.5

    def test_kilos_se_convierte_a_gramos(self):
        assert extract_gramaje("decomisó 2 kilos de cannabis") == 2000.0

    def test_texto_sin_gramaje(self):
        assert extract_gramaje("la audiencia se celebró") is None

    def test_texto_vacio(self):
        assert extract_gramaje("") is None


class TestExtractVeredicto:
    def test_condena(self):
        assert extract_veredicto("se condena al imputado a la pena") == "condena"

    def test_absolucion(self):
        assert extract_veredicto("se absuelve al imputado") == "absolucion"

    def test_sobreseimiento(self):
        assert extract_veredicto("se dicta sobreseimiento definitivo") == "sobreseimiento"

    def test_salida_alternativa(self):
        assert extract_veredicto("acuerdan suspensión condicional del procedimiento") == "salida_alternativa"

    def test_texto_sin_veredicto(self):
        assert extract_veredicto("la audiencia se realizó normalmente") is None


class TestExtractPenaMeses:
    def test_anios_simple(self):
        assert extract_pena_meses("se le impone la pena de 3 años de presidio") == 36

    def test_anios_solo_uno(self):
        assert extract_pena_meses("1 año de presidio menor") == 12

    def test_meses_solo(self):
        assert extract_pena_meses("6 meses de presidio") == 6

    def test_texto_sin_pena(self):
        assert extract_pena_meses("hechos no constituyen delito") is None


class TestExtractTipoDelito:
    def test_microtrafico(self):
        assert extract_tipo_delito("condenado por microtráfico de sustancias") == "microtrafico"

    def test_trafico(self):
        assert extract_tipo_delito("tráfico ilícito de estupefacientes según art. 3") == "trafico"

    def test_porte(self):
        assert extract_tipo_delito("porte ilícito de cannabis en la vía pública") == "porte"

    def test_consumo(self):
        assert extract_tipo_delito("se acredita consumo personal exclusivo") == "consumo"

    def test_sin_match(self):
        assert extract_tipo_delito("audiencia preparatoria normal") is None


class TestExtractRecetaMedica:
    def test_receta_explicita(self):
        assert extract_receta_medica("acompaña receta médica vigente") is True

    def test_articulo_8(self):
        assert extract_receta_medica("se invoca el artículo 8 de la Ley 20.000") is True

    def test_ley_21575(self):
        assert extract_receta_medica("ampara la Ley 21.575") is True

    def test_sin_receta(self):
        assert extract_receta_medica("no se acreditó justificación") is False


class TestExtractAtipicidad:
    def test_consumo_personal_exclusivo(self):
        assert extract_atipicidad("se acredita consumo personal exclusivo") is True

    def test_atipicidad_explicita(self):
        assert extract_atipicidad("concurre atipicidad de la conducta") is True

    def test_no_constituye_delito(self):
        assert extract_atipicidad("la conducta no constituye delito") is True

    def test_sin_atipicidad(self):
        assert extract_atipicidad("se condena al imputado") is False


class TestExtractAll:
    def test_caso_condena_completo(self):
        texto = (
            "Se condena al imputado a la pena de 5 años de presidio menor "
            "por el delito de microtráfico. Se incautaron 50 gramos de cannabis. "
            "No se invocó receta médica."
        )
        result = extract_all(texto)

        assert result.extractor_version == "rule-v1"
        assert result.veredicto == "condena"
        assert result.pena_meses == 60
        assert result.tipo_delito == "microtrafico"
        assert result.gramaje_g == 50.0
        assert result.confianza > 0.5

    def test_caso_absolucion_receta(self):
        texto = (
            "Se absuelve al imputado al acreditarse receta médica vigente "
            "para consumo personal exclusivo. La conducta no constituye delito."
        )
        result = extract_all(texto)

        assert result.veredicto == "absolucion"
        assert result.receta_medica is True
        assert result.atipicidad_consumo_personal is True

    def test_texto_vacio_retorna_extraccion_vacia(self):
        result = extract_all("")
        assert result.extractor_version == "rule-v1"
        assert result.veredicto is None
        assert result.gramaje_g is None
        assert result.confianza == 0.0
