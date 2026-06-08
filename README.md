# 🏡 Génial Colloc

Comparateur visuel d'offres de location pour faciliter une recherche de
colocation à **Lyon**. On ajoute des annonces (SeLoger pour l'instant), elles
s'affichent sur une carte, colorées selon le budget, avec la distance jusqu'à
l'**Université Lyon 2 — Campus Porte des Alpes**.

![Stack](https://img.shields.io/badge/React-19-61dafb) ![TS](https://img.shields.io/badge/TypeScript-3178c6) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Leaflet](https://img.shields.io/badge/Leaflet-OpenStreetMap-199900)

## Fonctionnalités

- 🗺️ **Carte interactive** (Leaflet + OpenStreetMap, sans clé API)
- 🟢🔴 **Code couleur budget** : vert (≤ 700 €) → rouge (1100 €, le plafond)
- 📍 **Distance au campus** calculée pour chaque offre (Haversine)
- 🔎 **Géocodage** des quartiers via la Base Adresse Nationale (api-adresse.data.gouv.fr)
- 📝 **Saisie semi-manuelle** : coller une annonce pré-remplit prix / surface / lien
- 👥 Champ « ajouté par » pour distinguer les apports de chaque colocataire

## Stack technique

| Domaine        | Choix                                            |
| -------------- | ------------------------------------------------ |
| Langage        | TypeScript                                       |
| Front          | React 19 + Vite                                  |
| Cartographie   | Leaflet via react-leaflet, tuiles OpenStreetMap  |
| Géocodage      | Base Adresse Nationale (gratuit, sans clé)       |
| Stockage       | `localStorage` (couche abstraite, voir ci-dessous) |

## Architecture

La persistance passe par une interface unique `OfferStore`
([src/lib/storage.ts](src/lib/storage.ts)). Aujourd'hui implémentée avec
`localStorage` ; migrer vers **Supabase** (collaboration temps réel) ne
nécessitera que de réécrire ce module, sans toucher aux composants.

```
src/
├── config.ts            # campus, bornes de budget, colocataires
├── types.ts             # modèle Offer
├── lib/
│   ├── geo.ts           # Haversine + géocodage BAN
│   ├── color.ts         # dégradé prix → couleur
│   ├── parseSeLoger.ts  # extraction heuristique depuis un copier-coller
│   └── storage.ts       # couche de persistance (swappable Supabase)
└── components/
    ├── MapView.tsx
    ├── AddOfferForm.tsx
    └── OfferList.tsx
```

## Démarrer

```bash
npm install
npm run dev
```

## Roadmap

- [x] **B** — Saisie semi-manuelle des offres
- [ ] **C** — Extension navigateur « Ajouter à Génial Colloc » depuis SeLoger
- [ ] Stockage Supabase (collaboration temps réel à 2)
- [ ] Temps de trajet réel (vélo / TCL) via OSRM ou OpenRouteService
- [ ] Filtres (prix max, surface min, distance max)

## Note sur SeLoger

SeLoger est protégé par DataDome et ne peut pas être scrapé depuis le
navigateur ; d'où l'approche semi-manuelle (coller l'annonce) et la future
extension côté client.
