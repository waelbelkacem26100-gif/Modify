# Migration vers une nouvelle app Shopify (tokens expirants)

L'ancienne app (`client_id 036ad79f…`) émet des tokens offline **non-expirants**,
désormais rejetés par l'Admin API. Une app créée récemment émet des tokens
**expirants** (avec `refresh_token`) par défaut. Le code est 100% piloté par les
variables d'env — seuls le `client_id`/`client_secret` changent.

## Aucune perte de code / de données

- Le seul `client_id` en dur est dans `shopify.app.toml` (mis à jour au link).
- Tout le code lit `process.env.SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`.
- Les données Supabase (stores, audits, fixes, scores…) sont **conservées** : le
  token-exchange retrouve la boutique par `shop_domain` et met juste à jour le token.

## Étapes

### 1. Créer + lier la nouvelle app (CLI — recommandé)
```
shopify app config link
```
→ choisir **« Create a new app »**, lui donner un nom (ex. « Modify »).
La CLI réécrit `client_id` dans `shopify.app.toml`.

> Alternative : Partner Dashboard → Apps → Create app → copier le client_id.

### 2. Vérifier `shopify.app.toml` après le link
S'assurer qu'il contient TOUJOURS (réajouter si la CLI a réinitialisé) :
```toml
application_url = "https://modify-coral.vercel.app/shopify"
embedded = true

[access_scopes]
scopes = "read_themes,write_themes,read_products,write_products,read_analytics,write_content,read_content,read_orders"
use_legacy_install_flow = false

[auth]
redirect_urls = [
  "https://modify-coral.vercel.app/api/shopify/callback",
  "http://localhost:3000/api/shopify/callback"
]

[webhooks]
api_version = "2026-04"
  [webhooks.privacy_compliance]
  customer_data_request_url = "https://modify-coral.vercel.app/api/webhooks/customers/data_request"
  customer_deletion_url = "https://modify-coral.vercel.app/api/webhooks/customers/redact"
  shop_deletion_url = "https://modify-coral.vercel.app/api/webhooks/shop/redact"
```

### 3. Récupérer les nouvelles clés
Partner Dashboard → la nouvelle app → **API credentials** :
- `Client ID` (API key)
- `Client secret` (révéler)

### 4. Mettre à jour les variables d'env
**Vercel** → Project → Settings → Environment Variables (Production + Preview) :
- `SHOPIFY_CLIENT_ID` = nouveau client_id
- `SHOPIFY_CLIENT_SECRET` = nouveau client_secret

**Local** `.env.local` : mêmes deux valeurs.

### 5. Pousser la config vers la nouvelle app
```
shopify app deploy
```
→ publie embedded, URL `/shopify`, scopes, et les 3 webhooks GDPR sur la nouvelle app.

### 6. Redéployer Vercel
Les changements d'env ne s'appliquent qu'au prochain build → **Redeploy** dans Vercel
(ou pousser un commit).

### 7. Installer la nouvelle app sur la boutique de test
Partner Dashboard → la nouvelle app → **Test on development store** → choisir la boutique.
C'est une **install fraîche** → Shopify émet un token offline **expirant**.

### 8. Vérifier
- Ouvrir Modify depuis l'admin Shopify → `/shopify` → « Connexion sécurisée établie ».
- Logs Vercel : `[token-exchange] ok … expires_in: 86400 … refresh: yes`.
- En base, `token_expires_at` + `refresh_token` doivent être remplis (préfixe `shpat_`).
- `audit_logs` : ligne `token_exchange` avec `is_expiring: true`.

## Après migration
- Supprimer l'ancienne app du Partner Dashboard.
- (Optionnel) supprimer l'ancienne ligne `stores` au token mort si non remplacée
  automatiquement par la nouvelle install.
