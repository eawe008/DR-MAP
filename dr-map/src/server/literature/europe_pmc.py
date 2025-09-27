import requests
import re

def search_articles(keywords, max_results=5):
    """
      Search Europe PMC with one or multiple keywords.
      - keywords: str or list[str]
      - max_results: int
      """

    if isinstance(keywords, list):
        # require all keywords to appear
        query = " AND ".join([f'ALL:"{kw}"' for kw in keywords])
    else:
        query = f'ALL:"{keywords}"' # single string

    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {
        "query": query,
        "format": "json",
        "resultType": "core",
        "pageSize": max_results
    }

    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    articles = []
    for item in data.get("resultList", {}).get("result", []):
        # Flatten fullTextUrlList into a simple list of URLs
        urls = [
            url_entry["url"]
            for url_entry in item.get("fullTextUrlList", {}).get("fullTextUrl", [])
                if "url" in url_entry
        ]

        articles.append({
            "title": item.get("title"),
            "abstract": item.get("abstractText"),
            "doi": item.get("doi"),
            "url": urls
        })

    return articles

def deduplicate_articles(articles):
    seen_keys = set()
    deduped = []

    for article in articles:
        doi = article.get("doi")
        #Normalization steps
        title = normalize_title(article.get("title", ""))

        #use DOI, if available otherwise fallback to title
        key = doi if doi else title
        if key in seen_keys:
            continue

        seen_keys.add(key)
        deduped.append(article)

    return deduped

def normalize_title(title):
    title = title.lower()

    # removing punctuation
    title = re.sub(r'[^\w\s]', '', title)

    # collapsing multiple spaces
    title = re.sub(r'\s+', ' ', title).strip()
    return title

