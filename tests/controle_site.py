"""
Contrôle du site RÉEL RandoFDR — en lecture seule.
Lancé par GitHub Actions chaque lundi (et à chaque commit).
Vérifie que les pages en ligne se chargent et que Supabase répond.
Garantie : aucune écriture. Toute requête Supabase autre qu'une lecture
(getFiches, pingDB, ping, get-animateurs) est bloquée avant de partir.
Lancer en local : python tests/controle_site.py
"""
import json, os, sys
from playwright.sync_api import sync_playwright

SITE = "https://lamarmotterando.github.io/randoFDR"
SUPA = "https://whlxbfnmyqdflmxosfse.supabase.co/**"
LECTURES = {"getFiches", "pingDB", "ping"}

resultats = []
def verifier(nom, ok, detail=""):
    resultats.append(ok)
    print(("✅ " if ok else "❌ ") + nom + ("" if ok else f"  → {detail}"))

def lecture_seule(page, bloquees):
    def handler(route):
        req = route.request
        try: action = json.loads(req.post_data or "{}").get("action")
        except Exception: action = None
        if "get-animateurs" in req.url or ("dynamic-handler" in req.url and action in LECTURES):
            return route.continue_()
        bloquees.append(f"{req.method} {req.url.split('/functions/v1/')[-1].split('/rest/v1/')[-1]} {action or ''}".strip())
        return route.abort()
    page.route(SUPA, handler)

def erreurs(page):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    return errs

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

        # ── Formulaire FDR ──
        page = b.new_page(); errs = erreurs(page); bloquees = []
        lecture_seule(page, bloquees)
        page.goto(f"{SITE}/index.html", wait_until="load", timeout=60000)
        try:
            page.wait_for_function("document.querySelectorAll('#animateur option').length > 2", timeout=30000)
            n = page.evaluate("document.querySelectorAll('#animateur option').length")
            verifier("Formulaire — liste des animateurs chargée depuis Supabase", n > 2, f"{n} option(s)")
        except Exception as e:
            verifier("Formulaire — liste des animateurs chargée depuis Supabase", False, str(e)[:150])
        libs = page.evaluate("({chart: window.Chart && Chart.version, leaflet: window.L && L.version, pdf: typeof window.html2pdf})")
        verifier("Formulaire — Chart.js chargé", bool(libs["chart"]), libs)
        verifier("Formulaire — Leaflet (carte) chargé", bool(libs["leaflet"]), libs)
        verifier("Formulaire — html2pdf chargé", libs["pdf"] == "function", libs)
        rows = page.evaluate("""async () => {
            const r = await fetch('https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({action: 'getFiches', select: 'id,date_rando', order: 'date_rando.desc', limit: 5})});
            return { status: r.status, data: await r.json().catch(() => null) };
        }""")
        verifier("Supabase — planning lisible (getFiches)", rows["status"] == 200 and isinstance(rows["data"], list) and len(rows["data"]) > 0, rows)
        ping = page.evaluate("""async () => {
            const r = await fetch('https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler', {
              method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'pingDB'})});
            return await r.json().catch(() => null);
        }""")
        verifier("Supabase — base de données joignable (pingDB)", bool(ping and ping.get("ok")), ping)
        verifier("Formulaire — aucune erreur JavaScript", not errs, errs)
        page.close()

        # ── planningFDR ──
        page = b.new_page(); errs = erreurs(page); bloquees2 = []
        lecture_seule(page, bloquees2)
        page.goto(f"{SITE}/planningFDR.html", wait_until="load", timeout=60000)
        try:
            page.wait_for_function("!document.getElementById('listeAvenir').textContent.includes('Chargement')", timeout=30000)
            t = page.inner_text("#listeAvenir")
            verifier("planningFDR — liste des randos chargée", "Erreur de chargement" not in t, t[:150])
        except Exception as e:
            verifier("planningFDR — liste des randos chargée", False, str(e)[:150])
        verifier("planningFDR — aucune erreur JavaScript", not errs, errs)
        page.close()

        # ── Autres pages publiques ──
        for nom in ("randonnees-club.html", "profil.html", "goanim.html"):
            page = b.new_page(); errs = erreurs(page); lecture_seule(page, [])
            r = page.goto(f"{SITE}/{nom}", wait_until="load", timeout=60000)
            page.wait_for_timeout(3000)
            verifier(f"{nom} — page en ligne", r is not None and r.ok, r.status if r else "pas de réponse")
            verifier(f"{nom} — aucune erreur JavaScript", not errs, errs)
            page.close()

        b.close()
        print("ℹ️ Requêtes d'écriture bloquées (normal, rien n'est écrit) :", len(bloquees) + len(bloquees2))

    print(f"\n{sum(resultats)}/{len(resultats)} vérifications réussies")
    sys.exit(0 if all(resultats) else 1)

if __name__ == "__main__":
    main()
