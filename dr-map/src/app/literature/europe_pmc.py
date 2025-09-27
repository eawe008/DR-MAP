import requests

def search_articles(query, max_results=5):
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {
        "query": query,
        "format": "json",
        "resultType": "core",
        "pageSize": max_results
    }

    resp = requests.get(url, params=params)
    data = resp.json()
    articles = []

    for item in data.get("resultList", {}).get("result", []):
        # Flatten fullTextUrlList into a simple list of URLs
        urls = []
        for url_entry in item.get("fullTextUrlList", {}).get("fullTextUrl", []):
            if "url" in url_entry:
                urls.append(url_entry["url"])

        articles.append({
            "title": item.get("title"),
            "abstract": item.get("abstractText"),
            "doi": item.get("doi"),
            "url": urls
        })

    return articles
