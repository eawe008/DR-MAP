from .europe_pmc import search_articles
from .europe_pmc import deduplicate_articles

class LiteratureFetcher:
    def __init__(self, source="EuropePMC"):
        self.source = source

    def search(self, query, max_results=10):
        if self.source =="EuropePMC":
            articles = search_articles(query, max_results)
            return deduplicate_articles(articles)

        # Future: add PubMed, ArXiv, etc.
        raise NotImplementedError(f"{self.source} not implemented")