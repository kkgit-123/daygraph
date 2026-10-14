import configparser
import copy
import importlib.util
import os
import sys
from app.utils.logger_config import get_logger

logger = get_logger(__name__)


def __load_config():
    logger.info('Loading config')
    _cfg = configparser.ConfigParser(interpolation=None)
    _cfg.read(os.path.join('data', 'config', 'config.ini'))
    _cfg_dict = {s: dict(_cfg.items(s)) for s in _cfg.sections()}
    return _cfg_dict


def __load_prompt_templates():
    logger.debug(f'Loading prompt templates')
    spec = importlib.util.spec_from_file_location("pt", "data/config/prompts.py")
    pt = importlib.util.module_from_spec(spec)
    sys.modules["module.name"] = pt
    spec.loader.exec_module(pt)
    prompt_templates = {item: getattr(pt, item) for item in dir(pt) if not item.startswith("__")}
    return prompt_templates


__config = __load_config()
__prompt_templates = __load_prompt_templates()


def get_config():
    global __config
    if __config is None:
        __config = __load_config()
    return copy.copy(__config)


def get_prompt_templates():
    global __prompt_templates
    if __prompt_templates is None:
        __prompt_templates = __load_prompt_templates()
    return copy.copy(__prompt_templates)


if __name__ == '__main__':
    print('-' * 100)
    print(get_prompt_templates())
    print('-' * 100)
    print(get_config())
    print('-' * 100)
