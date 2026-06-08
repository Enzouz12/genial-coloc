# Génial Colloc

Application web de comparaison d'annonces de location pour une recherche de colocation à Lyon. Les annonces ajoutées sont affichées sur une carte, colorées selon le loyer, avec une estimation du temps de trajet jusqu'à l'Université Lyon 2 Campus Porte des Alpes.

## Fonctionnalités

- Carte interactive Leaflet avec tuiles OpenStreetMap
- Marqueurs colorés du vert au rouge selon le loyer, de 700 à 1100 euros
- Distance et temps de trajet estimé calculés pour chaque annonce
- Classement du temps de trajet par paliers de 15, 30, 45 et 60 minutes
- Géocodage des adresses via la Base Adresse Nationale
- Saisie assistée : un texte collé pré-remplit le loyer, la surface et le lien
- Attribution de chaque annonce à un colocataire

## Stack

| Domaine      | Choix                                |
| ------------ | ------------------------------------ |
| Langage      | TypeScript                           |
| Front        | React 19, Vite                       |
| Cartographie | react-leaflet, tuiles OpenStreetMap  |
| Géocodage    | Base Adresse Nationale               |
| Stockage     | localStorage                         |

## Architecture

La persistance passe par l'interface OfferStore définie dans src/lib/storage.ts. L'implémentation actuelle repose sur localStorage. Le passage à Supabase pour une collaboration en temps réel se fait en réécrivant ce seul module, sans modifier les composants.

```
src/
  config.ts            campus, paliers de budget et de trajet, colocataires
  types.ts             modèle Offer
  lib/
    geo.ts             distance Haversine, temps de trajet, géocodage
    color.ts           échelle loyer vers couleur
    parseSeLoger.ts    extraction depuis un texte collé
    storage.ts         couche de persistance
  components/
    MapView.tsx
    AddOfferForm.tsx
    OfferList.tsx
```

## Démarrage

```
npm install
npm run dev
```

## Feuille de route

- Extension navigateur pour ajouter une annonce depuis SeLoger
- Stockage Supabase pour la collaboration en temps réel
- Temps de trajet routier via OSRM ou OpenRouteService
- Filtres par loyer, surface et temps de trajet

## SeLoger

SeLoger est protégé par DataDome et ne peut pas être interrogé depuis le navigateur. La saisie repose sur un collage manuel du contenu de l'annonce.
