# Génial Colloc

Application web de comparaison d'annonces de location pour une recherche de colocation à Lyon. Les annonces sont affichées sur une carte interactive, colorées selon plusieurs critères, avec le temps de trajet réel jusqu'à l'Université Lyon 2 Campus Porte des Alpes. Le projet inclut une extension navigateur pour importer les annonces SeLoger et un stockage partagé en temps réel.

## Fonctionnalités

- Carte interactive Leaflet avec cinq vues de coloration des marqueurs :
  - loyer mensuel
  - temps de trajet en TCL le matin
  - temps de trajet à vélo
  - prix au m²
  - vue mixte : loyer à l'intérieur, trajet TCL en contour
- Temps de trajet réels jusqu'au campus, en TCL et à vélo, via Transitous, avec repli sur une estimation par distance si le service est indisponible
- Légende flottante qui s'adapte à la vue active
- Géocodage des adresses via la Base Adresse Nationale, restreint à l'agglomération lyonnaise
- Pointage d'une adresse au clic sur la carte par géocodage inverse
- Édition d'une offre enregistrée : sélectionner un marqueur ou une offre la charge dans le formulaire, un clic sur le fond de carte revient en mode ajout
- Saisie assistée : coller un lien SeLoger pré-remplit la zone et le type, coller le texte de l'annonce ajoute le loyer et la surface
- Extension navigateur Firefox et Chrome pour importer une annonce SeLoger en un clic
- Stockage partagé en temps réel via Supabase, ou stockage local du navigateur sans configuration
- Attribution de chaque annonce à un colocataire

## Stack

| Domaine      | Choix                                      |
| ------------ | ------------------------------------------ |
| Langage      | TypeScript                                 |
| Front        | React 19, Vite                             |
| Cartographie | react-leaflet, fond CARTO Voyager          |
| Géocodage    | Base Adresse Nationale, direct et inverse  |
| Itinéraires  | Transitous, moteur MOTIS, données TCL      |
| Stockage     | Supabase en temps réel, repli localStorage |
| Extension    | WebExtension Manifest V3, web-ext          |

Les itinéraires (Transitous) et le géocodage (BAN) sont des API publiques gratuites et sans clé.

## Configuration

Sans configuration, l'application stocke les offres dans le navigateur local. Pour un stockage partagé en temps réel entre plusieurs personnes :

1. Créer un projet sur https://supabase.com
2. Exécuter [supabase/schema.sql](supabase/schema.sql) dans le SQL Editor
3. Copier les clés depuis Project Settings > API

```
cp .env.example .env
```

Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env`. La clé anon est publique par conception et protégée côté base par les règles RLS.

## Architecture

La persistance passe par l'interface `OfferStore` définie dans `src/lib/storage.ts`. Le store actif est Supabase si les clés sont présentes, sinon localStorage. Les composants ignorent l'implémentation.

```
src/
  config.ts            campus, bornes de budget, prix au m², paliers de trajet
  types.ts             modèle Offer
  lib/
    geo.ts             Haversine, paliers, géocodage direct et inverse
    routing.ts         temps de trajet TCL et vélo via Transitous
    color.ts           échelles loyer, temps et prix au m² vers couleur
    parseSeLoger.ts    extraction depuis un lien ou un texte collé
    supabase.ts        client Supabase optionnel
    storage.ts         couche de persistance, Supabase ou localStorage
  components/
    MapView.tsx        carte, vues, sélection, pointage
    AddOfferForm.tsx   ajout et édition d'une offre
    OfferList.tsx      liste latérale
    Legend.tsx         légende dynamique
supabase/
  schema.sql           table offers, RLS, temps réel
extension/
  manifest.json        WebExtension Manifest V3
  content.js           extraction SeLoger et ouverture de l'app
```

## Démarrage

```
npm install
npm run dev
```

## Extension navigateur

L'extension ajoute un bouton sur les pages SeLoger qui importe l'annonce dans l'application. Chargement et signature détaillés dans [extension/README.md](extension/README.md).

```
npm run ext:lint     # valide le manifeste
npm run ext:sign     # signe via AMO pour une installation permanente
```

## Feuille de route

- Filtres par loyer, surface et temps de trajet
- Mises à jour automatiques de l'extension via un update_url

## SeLoger

SeLoger est protégé par DataDome et ne peut pas être interrogé depuis un serveur. La récupération du loyer et de la surface passe donc par l'extension, qui lit la page dans le navigateur, ou par un collage manuel.
