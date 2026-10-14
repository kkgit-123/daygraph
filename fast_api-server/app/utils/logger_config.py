import logging
import logging.config
import yaml
import os

from app.utils.request_context import install_log_factory

# every record gets request_id (used by logging.conf's format)
install_log_factory()

# Get the directory of the current file (logger_config.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Construct the path to logging.conf relative to the project root
# Assuming logger_config.py is in api-server/app/utils/
# and logging.conf is in api-server/
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
config_path = os.path.join(project_root, "logging.conf")

def setup_logging():
    """
    Sets up logging configuration from logging.conf.
    """
    if os.path.exists(config_path):
        with open(config_path, 'rt') as f:
            config = yaml.safe_load(f.read())
        logging.config.dictConfig(config)
    else:
        logging.basicConfig(level=logging.INFO)
        print(f"Warning: logging.conf not found at {config_path}. Using basic logging configuration.")

def get_logger(name):
    """
    Returns a logger instance with the specified name.
    """
    return logging.getLogger(name)

# Call setup_logging once when the module is imported
setup_logging()
