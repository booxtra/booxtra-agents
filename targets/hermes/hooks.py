import json
import pathlib

_REFS_DIR = pathlib.Path(__file__).parent / 'references'
with open(_REFS_DIR / 'index.json') as _f:
    _INDEX = json.load(_f)

def pre_llm_call(message='', **kwargs):
    text = (message or '').lower()
    for entry in _INDEX:
        if any(kw.lower() in text for kw in entry['keywords']):
            return {'context': (_REFS_DIR / entry['file']).read_text()}
    return {}
