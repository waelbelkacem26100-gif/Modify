# Mody — notes de direction de marque (réflexion, NON implémenté)

> Déposé en Phase Bonus de la refonte v6. **Texte seulement** : aucune mascotte
> complète n'est codée ici. Ce fichier sert de point de départ à une session
> future dédiée à l'identité de Mody.

## Ce qui existe déjà (v6, implémenté)

- **Couleur signature** : violet `#8B7BFF` (`--mody`, + `mody-dark`/`mody-bright`/
  `mody-glow` dans `tailwind.config.ts`). Règle : *quand c'est violet, c'est Mody
  qui parle* — bouton flottant, bandeau d'activité, panneau de chat, avatar.
- **`<ModyAvatar />`** (`components/brand/ModyAvatar.tsx`) : squircle violet en
  dégradé + éclair ⚡ du logo Modify + une étincelle « compagnon ». SVG, taille
  libre. C'est le germe visuel de la mascotte.
- **Présence** : compagnon flottant permanent + bandeau teaser contextuel.
- **Voix** : tutoiement, orienté action (« Je peux préparer… », « Tes 5 produits… »).

## Pistes pour la mascotte complète (à explorer)

1. **De l'éclair au personnage.** L'avatar actuel est un badge. La mascotte
   pourrait être ce même éclair doté d'yeux/d'une expression minimale — garder
   le lien direct au logo Modify (l'éclair est l'ADN visuel partagé). Éviter le
   robot/bot générique : Mody n'est pas une IA-gadget, c'est un *collègue*.

2. **Système d'expressions** plutôt qu'une image figée :
   - neutre/prêt (état par défaut du bouton flottant)
   - « j'ai trouvé quelque chose » (quand une suggestion apparaît → la pastille)
   - « c'est corrigé » (moment de preuve — célébration discrète)
   - « ce n'est pas mon rayon » (garde-fou des 4 métiers — honnêteté incarnée)
   Chaque expression = une variante SVG dérivée du même squelette d'éclair.

3. **Les 4 métiers comme facettes**, pas comme personnages séparés : Contenu 🖋️,
   Réputation ⭐, Vidéo & Social 🎬, Stratégie 📊. Un seul Mody qui « met une
   casquette » selon la mission — éviter 4 mascottes (dilue l'identité).

4. **Mouvement avec parcimonie.** Le PRD v6 interdit les animations agressives
   (pas de bounce). Une mascotte vivante peut respirer par micro-mouvements
   (clignement rare, léger flottement) — jamais pour attirer l'attention de
   force, seulement pour signaler la présence.

5. **Cohérence cross-surface** : la même mascotte doit fonctionner en 16px
   (favicon/pastille), 40px (bouton), et grand format (email mensuel, onboarding,
   landing). Le squircle + éclair actuel passe déjà l'échelle ; une mascotte
   expressive devra être testée à 16px (souvent là que ça casse).

## Anti-patterns à éviter

- Le bot bleu type assistant SaaS (Intercom/Drift) — exactement ce dont v6 veut
  se démarquer.
- Les yeux trop « cartoon enfant » : la cible est un marchand pro, pas un jeu.
- Une mascotte qui parle à la 1ʳᵉ personne du pluriel corporate (« Nous avons
  détecté ») — Mody est un *je*, singulier et direct.

## Prochaine session suggérée

1. Décliner 4-5 expressions SVG depuis `<ModyAvatar />`.
2. Tester chaque expression à 16/40/96px.
3. Intégrer l'expression « c'est corrigé » dans la micro-interaction de preuve
   (`animate-proof-reveal`) déjà en place.
4. Décliner la mascotte sur l'email mensuel et l'onboarding.
