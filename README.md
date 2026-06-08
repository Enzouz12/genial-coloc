# Génial Colloc

Application web de comparaison d'annonces de location pour une recherche de colocation à Lyon. Les annonces ajoutées sont affichées sur une carte, colorées selon le loyer, avec le temps de trajet jusqu'à l'Université Lyon 2 Campus Porte des Alpes.

## Fonctionnalités

- Carte interactive Leaflet avec tuiles OpenStreetMap
- Marqueurs colorés du vert au rouge selon le loyer, de 700 à 1100 euros
- Temps de trajet jusqu'au campus en transport en commun TCL et à vélo, via Navitia
- Heure de référence fixée à un matin de semaine pour comparer les offres
- Repli sur une estimation par distance en l'absence de token Navitia
- Classement du temps de trajet par paliers de 15, 30, 45 et 60 minutes
- Géocodage des adresses via la Base Adresse Nationale, restreint à l'agglomération lyonnaise
- Saisie assistée : un texte collé pré-remplit le loyer, la surface et le lien
- Attribution de chaque annonce à un colocataire

## Stack

| Domaine      | Choix                                |
| ------------ | ------------------------------------ |
| Langage      | TypeScript                           |
| Front        | React 19, Vite                       |
| Cartographie | react-leaflet, tuiles OpenStreetMap  |
| Géocodage    | Base Adresse Nationale               |
| Itinéraires  | Navitia, données TCL SYTRAL          |
| Stockage     | localStorage                         |

## Configuration

Le calcul d'itinéraire nécessite un token Navitia gratuit.

```
cp .env.example .env
```

Renseigner NAVITIA_TOKEN dans .env avec un token obtenu sur https://navitia.io. Le token est injecté côté serveur par le proxy Vite défini dans vite.config.ts et n'est jamais exposé au client. Sans token, l'application reste fonctionnelle et affiche une estimation de trajet par distance.

## Architecture

La persistance passe par l'interface OfferStore définie dans src/lib/storage.ts. L'implémentation actuelle repose sur localStorage. Le passage à Supabase pour une collaboration en temps réel se fait en réécrivant ce seul module, sans modifier les composants.

```
src/
  config.ts            campus, paliers de budget et de trajet, colocataires
  types.ts             modèle Offer
  lib/
    geo.ts             distance Haversine, paliers, géocodage
    routing.ts         temps de trajet TCL et vélo via Navitia
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
- Fonction serverless pour relayer Navitia en production
- Filtres par loyer, surface et temps de trajet

## SeLoger

SeLoger est protégé par DataDome et ne peut pas être interrogé depuis le navigateur. La saisie repose sur un collage manuel du contenu de l'annonce.
