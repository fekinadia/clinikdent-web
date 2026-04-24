# ClinikDent Web — Frontend React

Application web de gestion de cabinet dentaire, connectée au backend **ClinikDent API**.

## 🛠️ Stack technique

- **React 18** + **TypeScript** — UI moderne et typée
- **Vite** — Build ultra-rapide, hot reload instantané
- **Tailwind CSS** — Styling utility-first avec design system
- **React Router v6** — Navigation SPA
- **React Query (TanStack)** — Gestion du cache & des requêtes API
- **Zustand** — Store global léger (auth)
- **Axios** — Client HTTP avec intercepteur JWT
- **Lucide React** — Icônes modernes
- **date-fns** — Manipulation de dates
- **React Hot Toast** — Notifications élégantes

## 📂 Structure du projet

```
clinikdent-web/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/                    → Client axios + endpoints
│   ├── components/
│   │   ├── layout/             → AppLayout (sidebar, topbar)
│   │   ├── ui/                 → Composants réutilisables
│   │   └── patients/           → Composants spécifiques
│   ├── pages/                  → Pages de l'app
│   ├── hooks/                  → Custom hooks
│   ├── lib/                    → Utils, store
│   ├── types/                  → Types TypeScript
│   ├── App.tsx                 → Router principal
│   ├── main.tsx                → Point d'entrée
│   └── index.css               → Styles globaux + Tailwind
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🚀 Installation

### Prérequis

- **Node.js** 20 ou plus
- **Backend ClinikDent API** déjà lancé sur le port 3000

### Étapes

```bash
# 1. Installer les dépendances
cd clinikdent-web
npm install

# 2. Configurer l'URL du backend
cp .env.example .env
# Éditer .env si le backend tourne sur une autre URL

# 3. Démarrer en mode dev
npm run dev
```

L'application tourne sur **http://localhost:5173**

### Compte de démo

- Email : `demo@clinikdent.tn`
- Mot de passe : `demo1234`

## 🎨 Design System

### Couleurs

- **Primary** (bleu profond) : `#0e6ba8` — Boutons principaux, liens
- **Accent** (teal) : `#14b8a6` — Accents, réussites
- **Primary-900** (marine) : `#0b1f33` — Sidebar, titres

### Typographie

- **Inter** — Corps de texte, UI
- **Fraunces** (serif) — Titres et nombres (style "display")

### Composants UI réutilisables

- `Avatar` — avec initiales et couleur selon le sexe
- `Spinner` / `LoadingScreen` — chargements
- `EmptyState` — états vides avec icône + action

### Classes utilitaires Tailwind

- `.card` — cartes avec bordure arrondie
- `.input` — champs de formulaire cohérents
- `.btn-primary` / `.btn-ghost` / `.btn-danger`
- `.badge-success` / `.badge-warning` / `.badge-info` / `.badge-danger`

## 📱 Pages implémentées

| Page | Route | État |
|---|---|---|
| Connexion | `/login` | ✅ Fonctionnelle |
| Inscription | `/register` | ✅ Fonctionnelle |
| Tableau de bord | `/` | ✅ Stats + RDV du jour |
| Liste patients | `/patients` | ✅ Recherche + pagination |
| Fiche patient | `/patients/:id` | ✅ 4 onglets (identité, soins, schéma, finance) |
| Agenda | `/agenda` | ✅ Vue semaine interactive |
| **Schéma dentaire** | Onglet patient | ✅ **Interactif, 32 dents, 10 états** |
| Soins | `/treatments` | 🚧 Placeholder |
| Ordonnances | `/prescriptions` | 🚧 Placeholder |
| Facturation | `/finance` | 🚧 Placeholder |
| Statistiques | `/stats` | 🚧 Placeholder |
| Paramètres | `/settings` | 🚧 Placeholder |

## 🔐 Architecture & sécurité

### Authentification JWT

- Token stocké dans `localStorage`
- Intercepteur axios qui ajoute `Authorization: Bearer <token>` automatiquement
- Redirection automatique vers `/login` si 401
- Routes protégées via `<ProtectedRoute>`

### Gestion d'état

- **Zustand** pour l'auth (user + token)
- **React Query** pour les données serveur (cache, refetch, mutations)

### Appels API

Chaque module a son fichier dans `src/api/endpoints.ts` :

```typescript
// Exemple
const { data, isLoading } = useQuery({
  queryKey: ['patients', search],
  queryFn: () => patientsApi.list({ search }),
});
```

## 🏗️ Compilation production

```bash
npm run build
```

Génère un bundle optimisé dans `dist/` prêt à déployer sur :
- Vercel / Netlify / Cloudflare Pages
- Un serveur nginx
- ou à wrapper dans Electron (étape 6)

## 🎯 Fonctionnalités phares

### Schéma dentaire interactif

- Représentation visuelle des 32 dents (notation FDI)
- 10 états avec code couleur
- Cliquer une dent → panneau d'édition rapide
- Synchronisation en temps réel avec la base

### Agenda semaine

- Navigation entre les semaines
- Blocs d'événements avec couleurs par type de RDV
- Cliquer un RDV → ouvre la fiche patient
- Highlight du jour courant

### Recherche patient intelligente

- Recherche par nom, prénom, GSM ou numéro de dossier
- Résultats en temps réel (debounced côté serveur)
- Pagination automatique

## 🚧 Prochaines étapes

- [ ] Formulaire complet de modification du patient
- [ ] Module de création de rendez-vous (dialog + drag & drop)
- [ ] Module d'ordonnances avec autocomplete médicaments
- [ ] Module de facturation complet
- [ ] Dashboard statistiques (graphiques Recharts)
- [ ] Upload d'images (radios, photos)
- [ ] Mode sombre
- [ ] Internationalisation (FR/EN/AR)
- [ ] Tests (Vitest + React Testing Library)
- [ ] Wrapper Electron pour desktop (étape 6)
