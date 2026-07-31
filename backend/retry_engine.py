import time
import logging
from typing import Callable, Any

logger = logging.getLogger("backend.retry_engine")

def execute_with_exponential_backoff(func: Callable, max_attempts: int = 3, initial_delay: float = 2.0, *args, **kwargs) -> Any:
    """
    Executes a function with exponential backoff retries (e.g. 2s -> 6s -> 18s).
    Prevents API rate-limiting and transient network failures from losing posts.
    """
    delay = initial_delay
    last_exception = None

    for attempt in range(1, max_attempts + 1):
        try:
            result = func(*args, **kwargs)
            if attempt > 1:
                logger.info(f"✅ Retry succeeded on attempt {attempt}/{max_attempts}")
            return result
        except Exception as e:
            last_exception = e
            logger.warning(f"⚠️ Attempt {attempt}/{max_attempts} failed: {e}. Retrying in {delay}s...")
            if attempt < max_attempts:
                time.sleep(delay)
                delay *= 3.0

    logger.error(f"❌ All {max_attempts} attempts failed. Last error: {last_exception}")
    raise last_exception
