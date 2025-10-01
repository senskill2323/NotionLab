# Changelog

## RLS & Securite
- Documente l''activation RLS et les policies requises pour `chat_conversations` / `chat_messages` (rules/04-database/live-chat-client.mdc).

## Architecture temps reel
- Cadre unique `chatApi` + broadcast-only dans rules/00-architecture + rules/02-programming-languages.
- Clarifie l''usage temporaire de `postgres_changes` et les RPC a livrer pour le marquage lecture.

## Deploiement
- Ajoute des garde-fous (dry-run, dossier cible, backup) autour du workflow FTPS (rules/06-deployment/readme.mdc).
