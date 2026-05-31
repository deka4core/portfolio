import json
import redis
import requests
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
import base64, uuid, re

from .models import Project, ProjectMedia, Certificate

GITHUB_USER = "deka4core"
REDIS_TTL = 600

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


# ───────────────────────── pages ─────────────────────────

def index(request):
    return render(request, "portfolio/index.html")

def admin_panel(request):
    return render(request, "portfolio/admin.html")


# ───────────────────────── helpers ───────────────────────

def project_to_dict(p):
    return {
        "id": p.slug,
        "lineId": p.line,
        "year": p.year,
        "status": p.status,
        "onMap": p.on_map,
        "youAreHere": p.you_are_here,
        "name": {"ru": p.name_ru, "en": p.name_en},
        "desc": {"ru": p.desc_ru, "en": p.desc_en},
        "stack": p.stack,
        "repo": p.repo_slug,
        "media": [
            {
                "id": m.id,
                "type": m.media_type,
                "src": m.file.url if m.file else None,
                "caption": {"ru": m.caption_ru, "en": m.caption_en},
            }
            for m in p.media.all()
        ],
    }

def cert_to_dict(c):
    return {
        "id": c.id,
        "groupId": c.group,
        "year": c.year,
        "title":  {"ru": c.title_ru,  "en": c.title_en},
        "issuer": {"ru": c.issuer_ru, "en": c.issuer_en},
        "cred":   {"ru": c.cred_ru,   "en": c.cred_en},
        "skills": c.skills,
        "img": c.scan.url if c.scan else None,
    }

def save_dataurl(field_obj, data_url, prefix):
    """Save a base64 data URL to an ImageField. Returns True if saved."""
    if not data_url or not data_url.startswith("data:"):
        return False
    match = re.match(r"data:image/(\w+);base64,(.+)", data_url)
    if not match:
        return False
    ext, b64 = match.group(1), match.group(2)
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.{ext}"
    field_obj.save(filename, ContentFile(base64.b64decode(b64)), save=False)
    return True


# ───────────────────────── projects API ──────────────────

@csrf_exempt
@require_http_methods(["GET", "POST"])
def projects_list(request):
    if request.method == "GET":
        projects = [project_to_dict(p) for p in Project.objects.prefetch_related("media").all()]
        return JsonResponse({"projects": projects})

    # POST — create
    data = json.loads(request.body)
    slug = data.get("id") or f"p-{uuid.uuid4().hex[:8]}"
    p = Project(
        slug=slug,
        line=data.get("lineId", "algo"),
        year=data.get("year", ""),
        status=data.get("status", "done"),
        on_map=data.get("onMap", True),
        you_are_here=data.get("youAreHere", False),
        name_ru=data.get("name", {}).get("ru", ""),
        name_en=data.get("name", {}).get("en", ""),
        desc_ru=data.get("desc", {}).get("ru", ""),
        desc_en=data.get("desc", {}).get("en", ""),
        stack=data.get("stack", []),
        repo_slug=data.get("repo", ""),
    )
    p.save()
    _sync_media(p, data.get("media", []))
    return JsonResponse(project_to_dict(p), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def project_detail(request, slug):
    p = get_object_or_404(Project, slug=slug)

    if request.method == "GET":
        return JsonResponse(project_to_dict(p))

    if request.method == "DELETE":
        p.delete()
        return JsonResponse({"deleted": slug})

    # PUT — update
    data = json.loads(request.body)
    p.line         = data.get("lineId", p.line)
    p.year         = data.get("year", p.year)
    p.status       = data.get("status", p.status)
    p.on_map       = data.get("onMap", p.on_map)
    p.you_are_here = data.get("youAreHere", p.you_are_here)
    p.name_ru      = data.get("name", {}).get("ru", p.name_ru)
    p.name_en      = data.get("name", {}).get("en", p.name_en)
    p.desc_ru      = data.get("desc", {}).get("ru", p.desc_ru)
    p.desc_en      = data.get("desc", {}).get("en", p.desc_en)
    p.stack        = data.get("stack", p.stack)
    p.repo_slug    = data.get("repo", p.repo_slug)
    p.save()
    _sync_media(p, data.get("media", []))
    return JsonResponse(project_to_dict(p))


def _sync_media(project, media_list):
    """Replace project media with the incoming list."""
    project.media.all().delete()
    for i, m in enumerate(media_list):
        pm = ProjectMedia(
            project=project,
            media_type=m.get("type", "image"),
            caption_ru=m.get("caption", {}).get("ru", ""),
            caption_en=m.get("caption", {}).get("en", ""),
            order=i,
        )
        src = m.get("src", "")
        if src and src.startswith("data:"):
            save_dataurl(pm.file, src, f"proj_{project.slug}")
        elif src and src.startswith("/media/"):
            pm.file.name = src.replace("/media/", "")
        pm.save()


# ───────────────────────── certificates API ──────────────

@csrf_exempt
@require_http_methods(["GET", "POST"])
def certs_list(request):
    if request.method == "GET":
        certs = [cert_to_dict(c) for c in Certificate.objects.all()]
        return JsonResponse({"certs": certs})

    data = json.loads(request.body)
    c = Certificate(
        group=data.get("groupId", "courses"),
        year=data.get("year", ""),
        title_ru=data.get("title", {}).get("ru", ""),
        title_en=data.get("title", {}).get("en", ""),
        issuer_ru=data.get("issuer", {}).get("ru", ""),
        issuer_en=data.get("issuer", {}).get("en", ""),
        cred_ru=data.get("cred", {}).get("ru", ""),
        cred_en=data.get("cred", {}).get("en", ""),
        skills=data.get("skills", []),
    )
    img = data.get("img")
    if img and img.startswith("data:"):
        save_dataurl(c.scan, img, "cert")
    c.save()
    return JsonResponse(cert_to_dict(c), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def cert_detail(request, pk):
    c = get_object_or_404(Certificate, pk=pk)

    if request.method == "GET":
        return JsonResponse(cert_to_dict(c))

    if request.method == "DELETE":
        c.delete()
        return JsonResponse({"deleted": pk})

    data = json.loads(request.body)
    c.group    = data.get("groupId", c.group)
    c.year     = data.get("year", c.year)
    c.title_ru = data.get("title", {}).get("ru", c.title_ru)
    c.title_en = data.get("title", {}).get("en", c.title_en)
    c.issuer_ru = data.get("issuer", {}).get("ru", c.issuer_ru)
    c.issuer_en = data.get("issuer", {}).get("en", c.issuer_en)
    c.cred_ru  = data.get("cred", {}).get("ru", c.cred_ru)
    c.cred_en  = data.get("cred", {}).get("en", c.cred_en)
    c.skills   = data.get("skills", c.skills)
    img = data.get("img")
    if img and img.startswith("data:"):
        save_dataurl(c.scan, img, "cert")
    elif img is None:
        c.scan = None
    c.save()
    return JsonResponse(cert_to_dict(c))


# ───────────────────────── GitHub widget ─────────────────

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
        user  = _gh_get(f"https://api.github.com/users/{GITHUB_USER}", token)
        repos = _gh_get(f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&sort=updated", token)
        stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        events = _gh_get(f"https://api.github.com/users/{GITHUB_USER}/events/public?per_page=30", token)

        commits, seen = [], set()
        for event in events:
            if event["type"] != "PushEvent":
                continue
            repo_name = event["repo"]["name"].split("/")[-1]
            if repo_name in seen:
                continue
            seen.add(repo_name)
            msg = ""
            for c in event["payload"].get("commits", []):
                m = c.get("message", "").split("\n")[0]
                if m and not m.startswith("Merge"):
                    msg = m[:60]; break
            commits.append({"repo": repo_name, "msg": msg, "ago": event["created_at"]})
            if len(commits) >= 3:
                break

        data = {
            "commits": commits,
            "repos": user.get("public_repos", 0),
            "stars": stars,
            "latest_repo": commits[0]["repo"] if commits else "",
            "latest_ago":  commits[0]["ago"]  if commits else "",
            "source": "api",
        }
        try:
            r.setex(cache_key, REDIS_TTL, json.dumps(data))
        except redis.RedisError:
            pass
        return JsonResponse(data)

    except requests.RequestException as e:
        return JsonResponse({"error": str(e)}, status=502)


# ───────────────────────── portfolio data API ─────────────────────────

@require_GET
def portfolio_data(request):
    """
    Returns projects and certificates from the DB in the same shape
    as PORTFOLIO_DATA.lines and PORTFOLIO_DATA.certificates.
    The frontend merges this over the static data in portfolio-data.js.
    """
    # lines with stations from DB
    line_order = ["algo", "db", "sys"]
    lines_map = {lid: [] for lid in line_order}

    for p in Project.objects.prefetch_related("media").filter(on_map=True).order_by("-year", "order"):
        station = {
            "id": p.slug,
            "year": p.year,
            "status": p.status,
            "stack": p.stack,
            "youAreHere": p.you_are_here,
            "name": {"ru": p.name_ru, "en": p.name_en},
            "desc": {"ru": p.desc_ru, "en": p.desc_en},
            "media": [
                {
                    "type": m.media_type,
                    "src": request.build_absolute_uri(m.file.url) if m.file else None,
                    "caption": {"ru": m.caption_ru, "en": m.caption_en},
                }
                for m in p.media.all()
            ],
        }
        if p.line in lines_map:
            lines_map[p.line].append(station)

    # repos map from DB
    repos = {}
    for p in Project.objects.filter(repo_slug__gt=""):
        repos[p.slug] = p.repo_slug.replace("https://github.com/deka4core/", "")

    # certificates grouped
    group_order = ["courses", "olympiads", "awards"]
    certs_map = {g: [] for g in group_order}

    for c in Certificate.objects.all().order_by("-year", "order"):
        item = {
            "id": str(c.id),
            "year": c.year,
            "img": request.build_absolute_uri(c.scan.url) if c.scan else None,
            "title":  {"ru": c.title_ru,  "en": c.title_en},
            "issuer": {"ru": c.issuer_ru, "en": c.issuer_en},
            "cred":   {"ru": c.cred_ru,   "en": c.cred_en},
            "skills": c.skills,
        }
        if c.group in certs_map:
            certs_map[c.group].append(item)

    return JsonResponse({
        "lines": [
            {"id": lid, "stations": lines_map[lid]}
            for lid in line_order
            if lines_map[lid]
        ],
        "repos": repos,
        "certItems": certs_map,
    })
