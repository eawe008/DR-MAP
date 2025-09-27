from fetcher import LiteratureFetcher

def main():
    # Initialize the fetcher
    fetcher = LiteratureFetcher(source="EuropePMC")

    # Test queries
    test_queries = [
        "Abdominal Ultrasound",
        "Complete Blood Count",
        "MRI Brain"
    ]

    for query in test_queries:
        print(f"\nSearching for articles on: {query}")
        articles = fetcher.search(query, max_results=3)
        if not articles:
            print("No articles found.")
        else:
            for i, article in enumerate(articles, start=1):
                print(f"\nArticle {i}:")
                print(f"Title: {article.get('title')}")
                print(f"Abstract: {article.get('abstract')}")
                print(f"DOI: {article.get('doi')}")
                print(f"URLs: {article.get('url')}")

if __name__ == "__main__":
    main()
