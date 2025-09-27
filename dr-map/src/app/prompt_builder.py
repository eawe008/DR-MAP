def build_test_prompt(symptoms, allowed_tests=None):
    """
    Build a prompt for Gemini
    :param symptoms: list of standardized symptom names (strings)
    :param allowed_tests: optional list of test names to restrict output

    Later you can replace symptoms with MeSH terms from QuickUMLS.
    Later you can replace allowed_tests with your curated test mapping.
    Prompt construction is fully modular.
    """
    symptoms_text = ", ".join(symptoms)
    tests_text = ", ".join(allowed_tests) if allowed_tests else "common diagnostic tests"

    prompt = f"""
You are a clinical decision support assistant.
Patient symptoms: {symptoms_text}.
Provide a ranked list of the most commonly used diagnostic tests to narrow down possible diagnoses.
Only include tests from this list: {tests_text}.
Return JSON with keys: "tests" (array of test names) and "reasoning" (brief explanation).
"""
    return prompt

