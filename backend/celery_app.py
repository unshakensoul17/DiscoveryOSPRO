import os
import socket
from celery import Celery

redis_url = os.environ.get("REDIS_URL", "")

def is_redis_available(url: str) -> bool:
    if not url or not url.startswith(("redis://", "rediss://")):
        return False
    try:
        # Parse redis://[password@]host:port[/db]
        # Strip scheme (redis:// or rediss://)
        addr = url.split("//")[1].split("/")[0]
        if "@" in addr:
            addr = addr.split("@")[1]
        if ":" in addr:
            host, port_str = addr.split(":")
            port = int(port_str)
        else:
            host = addr
            port = 6379
        s = socket.create_connection((host, port), timeout=1.0)
        s.close()
        return True
    except Exception:
        return False

# If Redis is configured but unreachable, fallback to SQLite broker
if redis_url and not is_redis_available(redis_url):
    print(f"Redis is configured ({redis_url}) but unreachable. Falling back to SQLite broker.")
    redis_url = "sqla+sqlite:///./celerydb.sqlite"
elif not redis_url:
    redis_url = "sqla+sqlite:///./celerydb.sqlite"

celery_app = Celery(
    "discoveryos",
    broker=redis_url,
    backend=redis_url if redis_url.startswith("redis") else "db+sqlite:///./celerydb.sqlite",
    include=["tasks.agent_tasks"]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Make tasks run synchronously in dev if celery is not running as a separate daemon (eager mode)
    task_always_eager=False,
    task_eager_propagates=True
)

if __name__ == "__main__":
    celery_app.start()
