# literature/__init__.py

from .fetcher import LiteratureFetcher
from .europe_pmc import search_articles, deduplicate_articles

__all__ = [
    "LiteratureFetcher",
    "search_articles",
    "deduplicate_articles",
]
