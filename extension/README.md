# Extension Génial Colloc

Content script qui ajoute un bouton sur les pages d'annonces SeLoger. Au clic, il extrait le titre, le loyer et la surface depuis la page, puis ouvre Génial Colloc avec le formulaire pré-rempli. L'app se charge ensuite du géocodage, des itinéraires et de l'enregistrement.

Compatible Firefox et Chrome : WebExtensions Manifest V3, sans service worker ni permissions.

## Charger dans Firefox (temporaire, pour le développement)

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer sur **Charger un module complémentaire temporaire**
3. Sélectionner `extension/manifest.json`

Ce chargement disparaît au redémarrage de Firefox.

## Installation permanente dans Firefox (signature)

Firefox n'installe durablement que les extensions signées. La signature passe
par addons.mozilla.org en mode auto-distribution (unlisted), gratuit, sans
publication publique.

1. Créer un compte sur https://addons.mozilla.org
2. Générer des identifiants API : https://addons.mozilla.org/developers/addon/api/key/
   On obtient un `JWT issuer` et un `JWT secret`.
3. Signer depuis la racine du projet :

   ```
   npm run ext:sign -- --api-key=VOTRE_ISSUER --api-secret=VOTRE_SECRET
   ```

   Mozilla renvoie un `.xpi` signé dans `web-ext-artifacts/`.
4. L'installer : Firefox > `about:addons` > engrenage > **Installer un module depuis un fichier** > choisir le `.xpi`.

À chaque modification, incrémenter `version` dans `manifest.json`, resigner, réinstaller.

Scripts disponibles :

- `npm run ext:lint` valide le manifeste
- `npm run ext:build` produit un zip non signé dans `web-ext-artifacts/`
- `npm run ext:sign` signe via AMO

## Charger dans Chrome

1. Ouvrir `chrome://extensions`
2. Activer le **mode développeur**
3. **Charger l'extension non empaquetée**, sélectionner le dossier `extension/`

## Utilisation

1. Ouvrir une annonce sur seloger.com
2. Cliquer sur le bouton **➕ Génial Colloc** en bas à droite
3. Un onglet Génial Colloc s'ouvre avec les champs pré-remplis ; vérifier et ajouter

## Configuration

`APP_URL` dans `content.js` pointe vers l'app déployée. Pour tester en local, le remplacer par `http://localhost:5173/`.

## Limite

SeLoger modifie régulièrement son balisage. L'extraction tente d'abord les données structurées JSON-LD, puis un repli sur le texte de la page. Si un champ n'est pas récupéré, il reste à compléter à la main dans le formulaire.
