# Génial Colloc

Application web de comparaison d'annonces de location pour une recherche de colocation à Lyon. Les annonces ajoutées sont affichées sur une carte, colorées selon le loyer, avec le temps de trajet jusqu'à l'Université Lyon 2 Campus Porte des Alpes.

## Fonctionnalités

- Carte interactive Leaflet avec tuiles OpenStreetMap
- Marqueurs colorés du vert au rouge selon le loyer, de 700 à 1100 euros
- Temps de trajet jusqu'au campus en transport en commun TCL et à vélo, via Transitous
- Heure de référence fixée à un matin de semaine pour comparer les offres
- Repli sur une estimation par distance si le service de routage est indisponible
- Classement du temps de trajet par paliers de 15, 30, 45 et 60 minutes
- Géocodage des adresses via la Base Adresse Nationale, restreint à l'agglomération lyonnaise
- Saisie assistée : coller un lien SeLoger pré-remplit la zone, le type et le titre ; coller le texte de l'annonce ajoute le loyer et la surface
- Stockage partagé en temps réel via Supabase, ou stockage local du navigateur sans configuration
- Attribution de chaque annonce à un colocataire

## Stack

| Domaine      | Choix                                      |
| ------------ | ------------------------------------------ |
| Langage      | TypeScript                                 |
| Front        | React 19, Vite                             |
| Cartographie | react-leaflet, tuiles OpenStreetMap        |
| Géocodage    | Base Adresse Nationale                     |
| Itinéraires  | Transitous, moteur MOTIS, données TCL      |
| Stockage     | Supabase en temps réel, repli localStorage |

Le calcul d'itinéraire utilise l'API publique Transitous, gratuite et sans clé.

## Configuration

Sans configuration, l'application stocke les offres dans le navigateur local. Pour un stockage partagé en temps réel entre plusieurs personnes :

1. Créer un projet sur https://supabase.com
2. Exécuter [supabase/schema.sql](supabase/schema.sql) dans le SQL Editor
3. Copier les clés depuis Project Settings > API

```
cp .env.example .env
```

Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env. La clé anon est publique par conception et protégée côté base par les règles RLS.

## Architecture

La persistance passe par l'interface OfferStore définie dans src/lib/storage.ts. Le store actif est Supabase si les clés sont présentes, sinon localStorage. Les composants ignorent l'implémentation.

```
src/
  config.ts            campus, paliers de budget et de trajet, colocataires
  types.ts             modèle Offer
  lib/
    geo.ts             distance Haversine, paliers, géocodage
    routing.ts         temps de trajet TCL et vélo via Transitous
    color.ts           échelle loyer vers couleur
    parseSeLoger.ts    extraction depuis un lien ou un texte collé
    supabase.ts        client Supabase optionnel
    storage.ts         couche de persistance, Supabase ou localStorage
  components/
    MapView.tsx
    AddOfferForm.tsx
    OfferList.tsx
supabase/
  schema.sql           table offers, RLS, temps réel
```

## Démarrage

```
npm install
npm run dev
```

## Feuille de route

- Extension navigateur pour ajouter une annonce depuis SeLoger
- Filtres par loyer, surface et temps de trajet

## SeLoger

SeLoger est protégé par DataDome et ne peut pas être interrogé depuis le navigateur. La saisie repose sur un collage du lien ou du contenu de l'annonce.
