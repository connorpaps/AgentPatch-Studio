import http.cookiejar
import json
import urllib.request

BASE = "http://localhost:8000"


def build_opener_with_auth():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    req = urllib.request.Request(
        BASE + "/api/v1/auth/demo",
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with opener.open(req, timeout=5):
        pass
    return opener


def get(opener, path):
    with opener.open(BASE + path, timeout=10) as r:
        return json.load(r)


def section(title):
    print()
    print("=== " + title + " ===")


opener = build_opener_with_auth()

section("/api/v1/analytics/cost-by-workflow")
for row in get(opener, "/api/v1/analytics/cost-by-workflow"):
    name = row["workflow_name"]
    cost = row["total_cost"]
    runs = row["run_count"]
    print(f"  {name:30s} ${cost:.4f} over {runs} runs")

section("/api/v1/analytics/slowest-spans (top 5)")
for s in get(opener, "/api/v1/analytics/slowest-spans")[:5]:
    print(f"  {s['span_name']:30s} avg {s['avg_duration_ms']:.0f}ms x {s['occurrences']}")

section("/api/v1/analytics/token-heavy-spans (top 5)")
for s in get(opener, "/api/v1/analytics/token-heavy-spans")[:5]:
    print(f"  {s['span_name']:30s} avg {s['avg_tokens']:.0f} tokens x {s['occurrences']}")

section("/api/v1/runs/<id>/similar-failures (sample)")
runs = get(opener, "/api/v1/runs?limit=200")
failed = [r for r in runs if r["status"] == "failure" and r.get("failure_type")]
if failed:
    target = failed[0]
    sim = get(opener, f"/api/v1/runs/{target['id']}/similar-failures")
    print(f"  for run {target['id'][:8]} (failure_type={target['failure_type']}): {len(sim)} similar")
    for s in sim[:3]:
        rid = s["run_id"]
        score = s["similarity_score"]
        ftype = s.get("failure_type")
        print(f"    {rid[:8]}  sim={score:.2f}  type={ftype}")

section("/api/v1/projects/<id>/audit-logs")
projects = get(opener, "/api/v1/projects")
if projects:
    audit = get(opener, f"/api/v1/projects/{projects[0]['id']}/audit-logs")
    print(f"  audit log entries: {len(audit)}")
    for a in audit[:5]:
        created = a["created_at"][:10]
        actor = a["actor"]
        action = a["action"]
        note = a["note"][:60]
        print(f"    {created}  {actor:25s}  {action:25s}  {note}")