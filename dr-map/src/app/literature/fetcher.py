from .europe_pmc import search_articles

class LiteratureFetcher:
    def __init__(self, source="EuropePMC"):
        self.source = source

    def search(self, query, max_results=5):
        if self.source =="EuropePMC":
            return search_articles(query, max_results)
        # Future: add PubMed, ArXiv, etc.
        raise NotImplementedError(f"{self.source} not implemented")