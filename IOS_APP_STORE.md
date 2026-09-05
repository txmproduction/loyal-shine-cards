# Publier Fidéo sur l'App Store (Capacitor + Xcode)

Identité de l'app : **Fidéo** — identifiant `app.fideoloyalty.card` — équipe Apple **QBR5LW4N8A**.
L'app embarque l'interface Fidéo et appelle le serveur `https://fideoloyalty.app` pour les cartes Wallet, les notifications et les données.

## 1. Récupérer le projet sur votre Mac

1. Dans Lovable : menu **…** (en haut à droite) → **GitHub** → **Connect to GitHub**, puis **Create repository**.
2. Sur le Mac, dans le Terminal :
   ```bash
   git clone https://github.com/<votre-compte>/<votre-repo>.git fideo
   cd fideo
   npm install
   ```

## 2. Générer l'app iOS

```bash
npm run build:mobile     # construit l'interface dans dist/mobile
npx cap add ios          # crée le dossier ios/ (une seule fois)
npx cap sync ios         # copie l'interface + les plugins natifs
npx cap open ios         # ouvre le projet dans Xcode
```

À chaque modification faite dans Lovable : `git pull` puis `npm run cap:sync`.

## 3. Réglages dans Xcode

Cible **App** → onglet **Signing & Capabilities** :

- **Team** : sélectionner l'équipe `QBR5LW4N8A`.
- **Bundle Identifier** : `app.fideoloyalty.card`.
- **Automatically manage signing** : coché.
- Bouton **+ Capability** → ajouter **Push Notifications**.
- Bouton **+ Capability** → ajouter **Background Modes**, puis cocher **Remote notifications**.

Onglet **Info** (ou `ios/App/App/Info.plist`), ajouter les textes d'autorisation :

- `NSCameraUsageDescription` : « Fidéo utilise la caméra pour scanner le QR code de la carte de fidélité de vos clients. »
- `NSPhotoLibraryAddUsageDescription` : « Fidéo enregistre les visuels de votre carte de fidélité. »

Icône et écran de lancement : glisser le logo Fidéo dans **App → Assets → AppIcon** (1024×1024, sans transparence).

## 4. Notifications sur l'app native

Dans le portail Apple Developer, créer une **clé APNs** (Keys → + → Apple Push Notifications service) pour l'identifiant `app.fideoloyalty.card`, puis me la transmettre : je la brancherai côté serveur pour l'envoi des alertes vers l'app installée. Sans cette clé, l'app enregistre bien l'appareil mais n'enverra pas encore d'alerte.

## 5. Tester puis envoyer sur App Store Connect

1. Brancher un iPhone, choisir l'appareil en haut de Xcode, **▶︎ Run** — vérifier le scan QR (caméra native) et la connexion.
2. Sur App Store Connect, créer l'app avec le même identifiant `app.fideoloyalty.card`.
3. Dans Xcode : **Product → Destination → Any iOS Device**, puis **Product → Archive**.
4. Dans l'Organizer : **Distribute App → App Store Connect → Upload**.
5. Sur App Store Connect : remplir la fiche (captures d'écran iPhone 6,7", description, lien vers la politique de confidentialité `https://fideoloyalty.app/privacy`), puis **Envoyer pour vérification**.

### Conseils pour la revue Apple (règle 4.2)

- Mettre en avant dans la description les fonctions propres à l'iPhone : scan caméra natif, notifications, retour haptique, partage.
- Fournir un compte de test (commerçant) dans les notes de revue, sinon Apple ne peut rien tester.
