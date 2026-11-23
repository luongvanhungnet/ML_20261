"""Select model families and keep existing serialized pipelines loadable."""

from algorithms.naive_bayes import models as naive_bayes
from algorithms.naive_bayes.models import QuantileBins as QuantileBins
from algorithms.naive_bayes.models import _reserve_unknown_code as _reserve_unknown_code
from algorithms.svm import models as svm


ALGORITHMS = ("naive_bayes", "svm")


def candidates(numeric, categorical, seed, *, algorithm="all"):
    """Build fresh pipelines and grids for the requested algorithm family."""
    if algorithm == "naive_bayes":
        return naive_bayes.candidates(numeric, categorical)
    if algorithm == "svm":
        return svm.candidates(numeric, categorical, seed)
    if algorithm != "all":
        raise ValueError(f"Unknown algorithm: {algorithm}")
    numeric, categorical = tuple(numeric), tuple(categorical)
    return {
        **naive_bayes.candidates(numeric, categorical),
        **svm.candidates(numeric, categorical, seed),
    }
