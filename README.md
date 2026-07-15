# 7 WEEK CHALLENGE — telepítési útmutató (Cloudflare Pages)

## A legegyszerűbb út: GitHub + Cloudflare Pages (nincs szükség Node.js-re a gépeden)

1. **Csinálj egy ingyenes GitHub fiókot**, ha még nincs: https://github.com/signup
2. GitHubon hozz létre egy **új, üres repository-t** (pl. `mission49`), publikus vagy privát is lehet.
3. Töltsd fel ennek a mappának az ÖSSZES fájlját a repóba:
   - GitHub weboldalán: "Add file" → "Upload files" → húzd be az egész mappa tartalmát → Commit.
4. Menj a **Cloudflare Dashboard**-ra: https://dash.cloudflare.com (ingyenes fiók, ha nincs)
5. Bal oldali menü: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
6. Válaszd ki a most feltöltött `mission49` repót, engedélyezd a hozzáférést.
7. Build beállítások (ezt kéri a Cloudflare):
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
8. Kattints **Save and Deploy**. Kb. 1-2 perc alatt lefut, és kapsz egy linket:
   `https://mission49.pages.dev` (vagy hasonló, véletlenszerű alnévvel).

Ez már működő, önálló weboldal — nem függ a Claude-beszélgetéstől.

## Saját domain hozzáadása

Ha szeretnél saját domaint (pl. `mission49.hu` vagy bármi mást):

1. A Cloudflare-en belül is regisztrálhatsz új domaint: **Domain Registration** menüpont → keresd ki a szabad domaint → fizetés (Cloudflare nem tesz rá haszonkulcsot, csak a regisztrátor/ICANN díját fizeted).
   - Ha már van domained máshonnan (pl. Rackhoston, GoDaddyn), azt is használhatod — csak át kell irányítanod a névszervereket Cloudflare-re (ezt a Cloudflare lépésről lépésre elmagyarázza feltöltéskor).
2. A Pages projektednél: **Custom Domains** fül → **Set up a custom domain** → add meg a domaint → Cloudflare automatikusan beállítja a DNS-t és az SSL-t.
3. Pár perc múlva a saját domainen is élesben fut az oldal.

## Ha inkább a saját gépeden akarod tesztelni előbb

Ha van Node.js telepítve a gépeden (https://nodejs.org, LTS verzió):

```
npm install
npm run dev
```

Ez megnyit egy helyi címet (pl. `http://localhost:5173`), ahol böngészőben tesztelheted, mielőtt feltöltöd.

## Fontos tudnivaló az adatokról

Az app az adatokat (checklist, súly, fotók, edzésnapló) a böngésző **localStorage**-ában tárolja —
ez azt jelenti, hogy az adatok ahhoz a konkrét böngészőhöz/eszközhöz kötődnek, ahol megnyitod.
Ha törlöd a böngésző adatait, vagy másik eszközön/böngészőben nyitod meg, nem fogod látni a korábbi
bejegyzéseket. A **Command** fülön lévő **Export/Import** gombokkal tudsz biztonsági mentést készíteni
és átvinni az adatokat egyik eszközről/böngészőből a másikra.
