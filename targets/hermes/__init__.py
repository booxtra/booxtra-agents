import sys
import pathlib

PLUGIN_DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(PLUGIN_DIR))
from hooks import pre_llm_call as _pre_llm_call  # noqa: E402

SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']

def register(ctx):
    for skill in SKILLS:
        ctx.register_skill(skill, str(PLUGIN_DIR / 'skills' / skill / 'SKILL.md'))
    ctx.register_hook('pre_llm_call', _pre_llm_call)
