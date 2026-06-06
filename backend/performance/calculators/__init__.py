"""Motor de calculadoras de tests de Zyfit Performance.

Importar este paquete registra todas las calculadoras en el REGISTRY (la fuente
única de verdad del catálogo). Para añadir un test: crear la subclase en el módulo
de su familia, decorarla con @register e importarla aquí.
"""

from .base import (  # noqa: F401
    FAMILIA_FISICO,
    FAMILIA_TACTICO,
    FAMILIA_TECNICO,
    REGISTRY,
    CalculatorError,
    TestCalculator,
    catalog,
    get_calculator,
    register,
)
from . import fisicos  # noqa: F401  — registra la Familia 1 (Físicos)
from . import tecnicos  # noqa: F401  — registra la Familia 2 (Técnicos)
from . import tacticos  # noqa: F401  — registra la Familia 3 (Tácticos)

__all__ = [
    'REGISTRY', 'CalculatorError', 'TestCalculator',
    'catalog', 'get_calculator', 'register',
]
