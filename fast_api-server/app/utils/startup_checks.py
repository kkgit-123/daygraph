import os
from app.utils.logger_config import get_logger

logger = get_logger(__name__)

def ensure_paths_exist(paths_to_check):
    """
    Ensures that a list of specified files and folders exist.
    If a path is a directory and doesn't exist, it will be created.
    If a path is a file and its parent directory doesn't exist, the parent directory will be created.
    """
    for path in paths_to_check:
        if not os.path.exists(path):
            if os.path.splitext(path)[1]:  
                parent_dir = os.path.dirname(path)
                if parent_dir and not os.path.exists(parent_dir):
                    os.makedirs(parent_dir, exist_ok=True)
                    logger.info(f"Created parent directory: {parent_dir}")
                # For files, we only ensure the parent directory exists, not the file itself.
                # If the user wants an empty file, they can specify it.
                logger.warning(f"File path does not exist: {path}. Parent directory ensured.")
            else:  # It's a directory
                os.makedirs(path, exist_ok=True)
                logger.info(f"Created directory: {path}")
        else:
            logger.info(f"Path already exists: {path}")
