# Refactorisation Ã©diteurs de Blocs - Plan de Suivi

## Objectifs gÃ©nÃ©raux
- Unifier l'eédition des contenus `block_samples` et `content_blocks` via un seul ensemble d'editeurs par layout.
- Centraliser la logique de serialisation, de previsualisation et de validation pour reduire les divergences entre modeles et blocs actifs.
- Garantir la compatibilite ascendante sur les 9 layouts existants, avec conservation des tables et des flux Supabase actuels.
- Faciliter le suivi et la communication d'avancement grace a des Ãtapes documentees et ordonnees.

## Ãtapes realisees
- [x] Etape 1 - Cartographie des layouts (2025-10-08)  
  - Comptage des occurrences par layout dans `block_samples` et `content_blocks`, mise en evidence des layouts absents d'une table (`global.footer`, `home.mask_reveal_scroll`, `home.final_cta`, `home.header`, `home.formations`, `home.stats`, `home.support`).  
  - Inventaire des schemas de contenu pour chaque layout, avec reperage des champs disponibles uniquement cote modeles ou uniquement cote blocs actifs.  
  - Identification des zones sans formulaire dedie (eédition JSON brut) et des layouts aux structures complexes (`mask_*`, `foot_*`) a harmoniser lors du registre partage.  
  - Conclusion sur la necessite d'un registre centralise pour assurer la serialisation bidirectionnelle et reduire la duplication (`dyn` vs `form`).
- [x] Etape 2 - Registre partage des layouts (2025-10-08)  
  - Creation d'un module unique (`src/components/admin/home-blocks/layoutRegistry.js`) decrivant pour chaque layout : metadonnees, etat par defaut, fonctions `serialize`/`deserialize` et mapping de previsualisation.  
  - Gestion des compatibilites heritees (`pr_*`, `sup_*`, `foot_*`) lors de la deserialisation afin de couvrir les contenus deja persistes.  
  - Normalisation des conversions cote preview via `getLayoutPreviewProps` et consolidation de `homeBlockRegistry.js` pour reutiliser les composants declares dans le registre.  
  - Exposition d'helpers (`getDefaultEditorState`, `serializeLayoutContent`, `deserializeLayoutContent`) qui serviront de fondation aux futurs editeurs unifies.
- [x] Etape 3 - Extraction des formulaires (2025-10-08)  
  - Creation d'une bibliotheque de composants d'eédition (`src/components/admin/home-blocks/layout-editors/`) couvrant les 13 layouts recenses (CozySpace, LaunchCTA, MaskReveal, etc.) avec API normalisee (`value`, `onChange`).  
  - Mutualisation des helpers (`shared.js`) pour gerer textes, booleens et collections (ajout/suppression, re-ordonnancement).  
  - Export d'un `layoutEditorMap` reutilisable par les ecrans front et futures integrations.
- [x] Etape 4 - Creation de l'orchestrateur d'e�dition unifie  
  - Introduction du hook `useHomeBlockEditor` et de `buildHomeBlockEditorBundle` pour partager hydratation, serialisation et fallback JSON entre tous les ecrans.  
  - Deplacement des helpers de normalisation (tubes, mask, ensure*) dans `layoutRegistry.shared.js` afin d'eliminer les duplications et garantir la meme logique de sanitisation.  
  - Exposition d'une API commune (`reset`, `hydrateFromRecord`, `getContentPayload`) pour gerer erreurs et toasts de maniere coherente.
- [x] Etape 5 - Integration cote bibliotheque (`BlockSamplesPanel`)  
  - Refonte du panneau pour n'utiliser que `HomeBlockLayoutEditor` + metadonnees, suppression des formulaires layout-specifiques et adoption du hook partage.  
  - Support natif des modeles HTML via un fallback dedie, conservation des actions historiques (import, duplication, utilisation, suppression).  
  - Initialisation et import des echantillons via `buildHomeBlockEditorBundle` afin d'aligner la structure des contenus sur celle des blocs actifs.
- [x] Etape 6 - Integration cote blocs actifs (`EditHomeBlockPage`)  
  - Remplacement des etats locaux, hydration via `hydrateFromRecord` et simplification de `onSubmit` avec `getContentPayload` + `buildBlockPayload`.  
  - Maintien du flux HTML (`home_blocks_create_html`) tout en harmonisant la partie dynamique avec l'orchestrateur commun.  
  - Gestion centralisee des toasts d'erreur et des fallback JSON grace au hook.
- [ ] Etape 7 - Validation, QA et nettoyage des reliquats



### Vue d'ensemble des layouts (au 2025-10-08)
| Layout              | block_samples | content_blocks | Block type (content_blocks) | Observations cles |
| ------------------- | ------------- | --------------- | --------------------------- | ----------------- |
| global.footer       | 0             | 1               | dynamic                     | Aucune entree dans `block_samples`; contenu pilote par les champs `foot_*` cote editeur actif. |
| home.cozy_space     | 1             | 2               | dynamic                     | Editeur complet dans `BlockSamplesPanel` et `EditHomeBlockPage`; modele aligne sur CozySpaceSection. |
| home.final_cta      | 0             | 1               | dynamic                     | Present cote blocs actifs (champs `fcta_*`), pas de formulaire dedie cote modeles (eédition JSON brut). |
| home.formations     | 0             | 1               | dynamic                     | Uniquement cote blocs actifs (`form_*`), aucune UI dans la bibliotheque. |
| home.header         | 0             | 1               | html                         | Bloc HTML isole sans contrepartie dans la bibliotheque (probablement herite). |
| home.launch_cta     | 1             | 2               | dynamic                     | Formulaire complet cote modeles (`lcta_*`) et valeurs par defaut cote blocs actifs. |
| home.main_hero      | 1             | 2               | dynamic                     | Champs image / opacite coherents entre les deux editeurs. |
| home.mask_reveal_scroll | 2         | 0               | -                           | Disponible seulement dans la bibliotheque (`mask_*`), pas encore expose cote blocs actifs. |
| home.personal_quote | 1             | 1               | dynamic                     | Champs `pq_*` presents des deux cotes. |
| home.promise        | 1             | 2               | dynamic                     | Items multiples (`pr_items`) varies entre modeles/blocs, necessitent un mapping commun. |
| home.stats          | 0             | 1               | dynamic                     | Exclusif aux blocs actifs (`stats_*`), pas d'editeur dedie encore. |
| home.support        | 0             | 1               | dynamic                     | Groupe `sup_*` uniquement cote actifs ; manque de previsualisation dans les modeles. |
| home.tubes_cursor   | 1             | 0               | -                           | Experimental cote bibliotheque (WebGL), non utilise cote actif. |

## Etape 2 - Registre partage des layouts

*(Contenu inchangï¿1⁄2)*

