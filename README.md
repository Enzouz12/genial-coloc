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
- Attribution de chaque annonce à un colocataire

## Stack

| Domaine      | Choix                                |
| ------------ | ------------------------------------ |
| Langage      | TypeScript                           |
| Front        | React 19, Vite                       |
| Cartographie | react-leaflet, tuiles OpenStreetMap  |
| Géocodage    | Base Adresse Nationale               |
| Itinéraires  | Transitous, moteur MOTIS, données TCL |
| Stockage     | localStorage                         |

Le calcul d'itinéraire utilise l'API publique Transitous. Elle est gratuite, sans clé, et appelée directement depuis le navigateur. Aucune configuration n'est requise.

## Architecture

La persistance passe par l'interface OfferStore définie dans src/lib/storage.ts. L'implémentation actuelle repose sur localStorage. Le passage à Supabase pour une collaboration en temps réel se fait en réécrivant ce seul module, sans modifier les composants.

```
src/
  config.ts            campus, paliers de budget et de trajet, colocataires
  types.ts             modèle Offer
  lib/
    geo.ts             distance Haversine, paliers, géocodage
    routing.ts         temps de trajet TCL et vélo via Transitous
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
- Filtres par loyer, surface et temps de trajet

## SeLoger

SeLoger est protégé par DataDome et ne peut pas être interrogé depuis le navigateur. La saisie repose sur un collage manuel du contenu de l'annonce.
