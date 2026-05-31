import json
import redis
import requests
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET

GITHUB_USER = "deka4core"
REDIS_TTL = 600

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def index(request):
    return render(request, "portfolio/index.html")


def admin_panel(request):
    return render(request, "portfolio/admin.html")


def _gh_get(url, token=None):
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers, timeout=5)
    resp.raise_for_status()
    return resp.json()


@require_GET
def github_activity(request):
    cache_key = f"github:{GITHUB_USER}"

    try:
        cached = r.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["source"] = "cache"
            return JsonResponse(data)
    except redis.RedisError:
        pass

    try:
        from django.conf import settings
        token = getattr(settings, "GITHUB_TOKEN", None)
    except Exception:
        token = None

    try:
        user = _gh_get(f"https://api.github.com/users/{GITHUB_USER}", token)

        repos = _gh_get(
            f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&sort=updated",
            token,
        )
        stars = sum(repo.get("stargazers_count", 0) for repo in repos)

        events = _gh_get(
            f"https://api.github.com/users/{GITHUB_USER}/events/public?per_page=30",
            token,
        )

        commits = []
        seen_repos = set()
        for event in events:
            if event["type"] != "PushEvent":
                continue
            repo_name = event["repo"]["name"].split("/")[-1]
            if repo_name in seen_repos:
                continue
            seen_repos.add(repo_name)

            msg = ""
            for c in event["payload"].get("commits", []):
                m = c.get("message", "").split("\n")[0]
                if m and not m.startswith("Merge"):
                    msg = m[:60]
                    break

            commits.append({
                "repo": repo_name,
                "msg": msg,
                "ago": event["created_at"],
            })

            if len(commits) >= 3:
                break

        data = {
            "commits": commits,
            "repos": user.get("public_repos", 0),
            "stars": stars,
            "latest_repo": commits[0]["repo"] if commits else "",
            "latest_ago": commits[0]["ago"] if commits else "",
            "source": "api",
        }

        try:
            r.setex(cache_key, REDIS_TTL, json.dumps(data))
        except redis.RedisError:
            pass

        return JsonResponse(data)

    except requests.RequestException as e:
        return JsonResponse({"error": str(e)}, status=502)
