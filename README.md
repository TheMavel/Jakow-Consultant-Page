# Jakow Smirin – Consultant Page

Persönliche Portfolio-Seite von Jakow Smirin (AI Consultant, CEO STARTPLATZ AI HUB, Düsseldorf).
Reines HTML, CSS und JavaScript plus ein kleiner Node.js-Server ohne Zusatzpakete.

## Funktionen

- Animierter Hero, Werdegang mit Filter, Expertise, Sprachen
- **News-Ticker** mit Top-Schlagzeilen ([World News API](https://worldnewsapi.com))
- **Live-Wetter** für Düsseldorf ([Open-Meteo](https://open-meteo.com), ohne Key)
- **Motivation des Tages**, KI-generiert und passend zum Wetter (OpenAI Responses API)
- **Newsletter-Anmeldung**, gespeichert in [Supabase](https://supabase.com)
- **Kontaktformular**, das eine [n8n](https://n8n.io)-Automation per Webhook startet
- ElevenLabs Voice Agent

## Projektstruktur

```
portfolio/   Statische Seite (index.html, css/, js/)
server/      Node-Server: liefert die Seite aus und stellt die API-Endpunkte bereit
  server.mjs                 /api/news, /api/motivation, /api/newsletter, /api/contact
  .env.example               Vorlage für die Zugangsdaten
  supabase-newsletter.sql    Tabelle für die Newsletter-Anmeldungen
```

## Lokal starten

Voraussetzung: Node.js 20.12 oder neuer.

1. `server/.env.example` nach `server/.env` kopieren und die Keys eintragen.
2. In Supabase das SQL aus `server/supabase-newsletter.sql` ausführen.
3. Server starten:

   ```bash
   node server/server.mjs
   ```

4. Seite öffnen: http://localhost:5500

Fehlt ein Key, läuft die Seite trotzdem: Der jeweilige Bereich wird ausgeblendet oder zeigt einen Ersatz.

## Sicherheit

Alle API-Keys liegen ausschließlich in `server/.env` und werden **nie** an den Browser geschickt.
Die Datei ist per `.gitignore` vom Repository ausgeschlossen.
