"""
Tests automatiques RandoFDR — lancés par GitHub Actions à chaque commit.
Ouvre les pages dans Chrome sans écran, remplace Supabase par de fausses
données (aucune écriture réelle, aucun mail, aucun agenda) et vérifie
le comportement. Lancer en local : python tests/tests.py
"""
import base64, functools, http.server, json, os, socketserver, sys, threading, urllib.parse
from playwright.sync_api import sync_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
BASE = f"http://localhost:{PORT}"
SUPA = "https://whlxbfnmyqdflmxosfse.supabase.co/**"
HORS_LIGNE = os.environ.get("HORS_LIGNE") == "1"   # test local sans Internet (CDN absents)

resultats = []
def verifier(nom, ok, detail=""):
    resultats.append(ok)
    print(("✅ " if ok else "❌ ") + nom + ("" if ok else f"  → {detail}"))

def serveur():
    class Silencieux(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    H = functools.partial(Silencieux, directory=RACINE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(("", PORT), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

# Hors ligne uniquement : bibliothèques CDN remplacées par des bouchons inertes
BOUCHON = "(function(){const P=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:P(),apply:()=>P(),construct:()=>P()});window.L=P();window.Chart=P();window.html2pdf=P();})();"

def erreurs_js(page):
    if HORS_LIGNE:
        for cdn in ("https://unpkg.com/**", "https://cdn.jsdelivr.net/**", "https://cdnjs.cloudflare.com/**"):
            page.route(cdn, lambda r: r.fulfill(body=BOUCHON if r.request.resource_type == "script" else "", content_type="application/javascript" if r.request.resource_type == "script" else "text/css"))
        page.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
    errs = []
    def f(e):
        msg = str(e)
        errs.append(msg)
    page.on("pageerror", f)
    return errs

ANIMATEURS = [{"nom": "BIZARD Dominique"}, {"nom": "DUPRÉ Roland"}]

def faux_supabase(page, fiches_du_jour, appels):
    def handler(route):
        req = route.request
        url = req.url
        try: body = json.loads(req.post_data or "{}")
        except Exception: body = {}
        if "get-animateurs" in url:
            return route.fulfill(json=ANIMATEURS)
        if "update-fiche" in url:
            appels.append(("update", body.get("id")))
            return route.fulfill(json={"success": True})
        if "dynamic-handler" in url:
            a = body.get("action")
            if a == "getFiches":
                f = (body.get("filters") or "")
                return route.fulfill(json=fiches_du_jour if "date_rando=eq." in f else [])
            if a == "saveFiche":
                appels.append(("creation", None))
            return route.fulfill(json={"success": True})
        return route.fulfill(json={"success": True})
    page.route(SUPA, handler)

# ─────────────── Formulaire FDR : choix création / mise à jour ───────────────
def test_envoi(b, nom, fiches_du_jour, animateur, attendu):
    page = b.new_page(); errs = erreurs_js(page); appels = []; fin = []
    page.on("console", lambda m: fin.append(1) if "[Résultat]" in m.text else None)
    faux_supabase(page, fiches_du_jour, appels)
    page.goto(f"{BASE}/index.html#k=TEST")
    page.wait_for_function("window._validerFormulaire && document.querySelectorAll('#animateur option').length > 2", timeout=20000)
    page.evaluate("""([anim]) => {
        window._validerFormulaire = () => true;
        document.getElementById('nomRando').value = 'Rando test';
        document.getElementById('dateRando').value = '2027-06-13';
        document.getElementById('animateur').value = anim;
        document.getElementById('resumeRando').textContent = 'Résumé de test';
    }""", [animateur])
    page.click("#btnEnvoyer")
    page.wait_for_function("1", timeout=1000)
    for _ in range(100):
        if fin: break
        page.wait_for_timeout(100)
    verifier(f"Envoi FDR — {nom}", appels == [attendu], f"appels = {appels}, attendu = [{attendu}]")
    verifier(f"Envoi FDR — {nom} — aucune erreur JS", not errs, errs)
    page.close()

# ─────────────── Formulaire FDR : pré-remplissage #fiche= ───────────────
def test_prefill(b):
    page = b.new_page(); errs = erreurs_js(page)
    faux_supabase(page, [], [])
    f = {"nomRando": "PREFILL OK", "distance": "12"}
    h = base64.b64encode(urllib.parse.quote(json.dumps(f)).encode()).decode()
    page.goto(f"{BASE}/index.html#fiche={h}")
    page.wait_for_timeout(4000)
    v = page.eval_on_selector("#nomRando", "e => e.value")
    verifier("Formulaire — pré-remplissage depuis une fiche", v == "PREFILL OK", f"nomRando = {v!r}")
    verifier("Formulaire — démarrage sans erreur JS", not errs, errs)
    page.close()

# ─────────────── planningFDR ───────────────
FICHES = [{"id": 1, "date_rando": "2099-06-13", "nom_rando": "Rando future", "animateur": "BIZARD Dominique",
           "distance": 12, "denivele": 600, "duree": "5h", "ibp": 45, "statut": "publiée"},
          {"id": 2, "date_rando": "2020-01-05", "nom_rando": "Rando passée", "animateur": "DUPRÉ Roland", "statut": "publiée"}]

def test_planning(b):
    page = b.new_page(viewport={"width": 700, "height": 700}); errs = erreurs_js(page)
    def handler(route):
        url = route.request.url
        try: body = json.loads(route.request.post_data or "{}")
        except Exception: body = {}
        if "dynamic-handler" in url and body.get("action") == "getFiches":
            return route.fulfill(json=FICHES)
        if "code-modif" in url and body.get("action") == "envoyerCode":
            return route.fulfill(json={"emailMasque": "d***@test.fr"})
        if "code-modif" in url and body.get("action") == "verifierCode":
            return route.fulfill(json={"valide": True})
        return route.fulfill(json={})
    page.route(SUPA, handler)
    page.route("https://api.open-meteo.com/**", lambda r: r.fulfill(status=500, body=""))
    page.goto(f"{BASE}/planningFDR.html")
    page.wait_for_selector(".fiche-row", timeout=10000)
    n = page.locator("#listeAvenir .fiche-row").count()
    verifier("planningFDR — liste des randos à venir", n == 1, f"{n} ligne(s)")

    page.locator("#listeAvenir .fiche-row").first.click()
    page.wait_for_selector("#modalDetail.open")
    yb = page.locator(".btn-modifier-detail").bounding_box()["y"]
    yr = page.locator("#modalDetailResume").bounding_box()["y"]
    verifier("planningFDR — boutons en haut de la modale détail", yb < yr, f"bouton y={yb}, résumé y={yr}")

    page.click(".btn-modifier-detail")
    page.wait_for_selector("#modalModif.open")
    verifier("planningFDR — boutons Enregistrer/Annuler cachés avant le code", not page.is_visible("#actionsModif"))
    page.click("#btnEnvoiCode"); page.wait_for_selector("#modifCode", state="visible")
    page.fill("#modifCode", "123456"); page.click("#btnValiderCode")
    page.wait_for_selector("#actionsModif", state="visible", timeout=5000)
    verifier("planningFDR — boutons visibles après validation du code", page.is_visible("#actionsModif"))
    page.eval_on_selector("#modalModif .modal-box", "e => e.scrollTop = 400")
    page.wait_for_timeout(200)
    d = page.eval_on_selector("#actionsModif", "e => e.getBoundingClientRect().top - e.closest('.modal-box').getBoundingClientRect().top")
    verifier("planningFDR — boutons restent en haut au défilement", abs(d) <= 2, f"décalage {d}px")
    verifier("planningFDR — aucune erreur JS", not errs, errs)
    page.close()

def main():
    serveur()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
        test_envoi(b, "aucune fiche ce jour → création", [], "BIZARD Dominique", ("creation", None))
        test_envoi(b, "fiche du même animateur → mise à jour", 
                   [{"id": 11, "nom_rando": "X", "animateur": "BIZARD Dominique", "ibp": None, "type": "rando"}],
                   "BIZARD Dominique", ("update", 11))
        test_envoi(b, "fiche d'un autre animateur → création (pas d'écrasement)",
                   [{"id": 10, "nom_rando": "X", "animateur": "DUPRÉ Roland", "ibp": None, "type": "rando"}],
                   "BIZARD Dominique", ("creation", None))
        test_envoi(b, "fiche « Autres » (CA) ce jour → création (CA intact)",
                   [{"id": 12, "nom_rando": "réunion CA", "animateur": None, "ibp": None, "type": "autre"}],
                   "BIZARD Dominique", ("creation", None))
        test_prefill(b)
        test_planning(b)
        b.close()
    ok = all(resultats)
    print(f"\n{sum(resultats)}/{len(resultats)} vérifications réussies")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
