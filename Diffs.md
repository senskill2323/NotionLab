# Diffs (rules)

- `rules/00-architecture/readme.mdc`: re-ecrit la section "Live Chat - Architecture" pour imposer l'utilisation exclusive de `chatApi`, documenter la cible broadcast-only et introduire les exigences RLS et `sender` normalises.
- `rules/02-programming-languages/live-chat-client.mdc`: remplace les patrons legacy par une check-list orientees helper (`chatApi.*`), ajoute le plan de migration du widget/admin et la cible RPC pour le marquage lecture.
- `rules/04-database/live-chat-client.mdc`: met a jour l'inventaire des RPC, signale les fonctions manquantes `client/admin_mark_chat_viewed`, detaille les policies RLS necessaires et verrouille les valeurs `sender`.
- `rules/06-deployment/readme.mdc`: complete les limites du workflow FTPS (dry-run, dossier cible, archivage) pour encadrer `dangerous-clean-slate`.
