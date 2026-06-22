# GrammatikDuell

Deutsches Grammatik & Rechtschreibungs-Quiz fuer Klasse 5-9.
Spielmodi: Gegen KI, Zwei Spieler (am gleichen Geraet), Online-Lobby (verschiedene Geraete).

## Ordnerstruktur

```
grammatik-duell-server/
  server.js        <- Node.js WebSocket-Server (Lobby-Verwaltung)
  package.json     <- Abhaengigkeiten (express, ws)
  render.yaml      <- Render-Konfiguration
  public/
    index.html     <- Komplette WebApp (120 Fragen, alle Spielmodi)
```

## Auf Render deployen (kostenlos)

1. Diesen Ordner als GitHub-Repository hochladen
2. Auf render.com einloggen
3. "New" -> "Web Service"
4. GitHub-Repository auswaehlen
5. Einstellungen:
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
6. "Create Web Service" klicken
7. Warten bis Deployment abgeschlossen (ca. 2-3 Minuten)
8. Die angezeigte URL (z.B. https://grammatik-duell.onrender.com) aufrufen

## Hinweis zum Free-Tier

Render schaltet kostenlose Dienste nach 15 Minuten Inaktivitaet ab.
Beim naechsten Aufruf startet der Server neu (dauert ca. 30-50 Sekunden).
Waehrend des Unterrichts einfach die Seite kurz vorher laden, dann bleibt der Server aktiv.

## Online-Lobby nutzen

1. Spieler A: "Online-Lobby" -> "Erstellen" -> Name eingeben -> Lobby erstellen
2. Spieler A sieht einen 4-stelligen Code (z.B. 4829)
3. Spieler B: "Online-Lobby" -> "Beitreten" -> Code eingeben -> Beitreten
4. Beide sehen "Verbunden!" -> "Spiel starten" druecken
5. Jeder spielt die 10 Fragen in eigenem Tempo
6. Am Ende werden die Punktzahlen verglichen

## Lokales Testen

```bash
npm install
node server.js
# Browser: http://localhost:3000
```
