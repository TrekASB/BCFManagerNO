# BCFManagerNO – Trimble Connect extension (pilot v0.3)

Dette repositoriet inneholder BCFManager som Trimble Connect 3D Viewer-extension. Når brukeren godkjenner tilgang, åpnes saksbehandlingen i et separat nettleservindu. Ingen 3D-modell lastes i saksbehandlingsvinduet.

## Installasjon
1. Under GitHub Settings → Pages: velg Deploy from branch, main, /(root), Save.
2. Sjekk https://trekasb.github.io/BCFManagerNO/manifest.json.
3. Legg inn denne manifest-URL-en som Project Extension (3D Viewer) i Trimble Connect.
4. Åpne extensionen i et *testprosjekt* og gi tilgang til access token.
5. Klikk «Åpne saksbehandling i eget vindu». Tillat popup fra github.io og hold connectoren åpen.

## Funksjoner
- Henter Topics fra det aktive prosjektet via BCF 3.0, med samme API-base som BCFTopicPulse.
- Tabell, søk, filtrering, CSV, kommentarer, status og prioritet, masseoppdateringer.
- Viewpoint snapshot i eget vindu uten åpning av modell.
- Finner mulige duplikater basert på lik normalisert tittel. **Ingen automatisk sletting.**

## Sikkerhet og teststatus
Pilot. Javascript er ikke verifisert mot et ekte Trimble-prosjekt. **Test kun i testprosjekt først.** Endringer i status, prioritet og kommentarer utfører ekte API-skriving etter bekreftelse. Test enkeltvis før bruk av masseoppdateringer. BCF-enumerasjoner og API-skjema bør valideres mot prosjektets extensions-endepunkt. Token oppbevares i extensionen og videresendes ikke til saksbehandlingsvinduet. Kommunikasjon bruker origin, window source og kanalverifisering.

Logoen `assets/norconsult-logo.svg` er en **plassholder fra BIM_proto**, ikke en godkjent offisiell logofil. Erstatt ved produksjonssetting.

Kilde: https://github.com/TrekASB/BIM_proto/blob/main/apps/bcf-topic-pulse.html

## Direkte redigering (2026-10-22)
Velg en sak i tabellen. Panelet **Rediger sak** støtter status, prioritet, ansvarlig, fag/etiketter (`labels`) og tidsfrist, samt en egen handling for å opprette kommentarer. Status og prioritet kan også endres direkte i tabellen. Lagre-knappen utfører `GET topic → PUT topic → GET topic` og bekrefter returnerte felt. Kommentarer legges til med `POST .../comments` og kommentarer leses tilbake. Masseoppdatering bruker samme verifikasjonsrutine.

**Pilot / begrensninger:** Test skrivetilgang på én test-sak. API-et håndhever prosjekt-/brukerrettigheter; vanligvis kan prosjektadministrator eller oppretter/ansvarlig redigere. Feltverdier må være godkjent i prosjektets BCF-innstillinger. Fag bruker `labels`, så behold eksisterende ikke-fag-relaterte labels ved redigering. Egendefinerte/ugyldige tags eller en e-post som ikke er bruker i prosjektet kan bli avvist. Manglende/blank tidsfrist sendes som `null`; test at Trimble aksepterer dette. Dette er ikke en webhook eller pushbasert sanntidsintegrasjon: lagringer går direkte til API-et, og endringer gjort av andre hentes ved **Oppdater**.

**Viktig:** Ingen API-skriving er testet med en ekte Trimble-konto i utviklingsmiljøet. Før produksjonsbruk må oppdatering av status, prioritet, assignee, labels, due date og kommentarer valideres i et testprosjekt.
