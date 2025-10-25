Objectif
- Ton outil MCPP [mcp_servers.ssh-docs] te sers à accéder à la documentation/instruction, et aussi accéder aux fonctions supabase (/root/volumes/functions)
- A chaque INPUT, initialise et utilise le serveur MCP [mcp_servers.ssh-docs] (config: C:\Users\yvallott\.codex\config.toml) pour lire sur le VPS, d’abord l’index "/root/index.md", puis les fichiers *.md pertinents dans "/root/rules site notionlab" et "/root/rules VPS"; sélectionne au moins une instruction utile; Ensuite base toi sur mon input et mes instructions pour faire le travail. 

IMPORTANT: 

- les fonctions supabase actives sont ici /root/volumes/functions. Tu dois utiliser le MCP shh [mcp_servers.ssh-docs] (qui se trouve là: C:\Users\yvallott\.codex\config.toml) pour la gestion des fonctions (analyser, éditer, etc...) 
- Ta base de connaissance principale pour toute tâche est REF, disponible via le MCP [mcp_servers.ref] (C:\Users\yvallott\.codex\config.toml). SI tu as le moindre doute sur un bout de code, sur une logique, ou avant TOUT CODAGE, jette un coup d'oeil ciblé sur REF. 