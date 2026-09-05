# Fidéo sur l'App Store via Capacitor

## Le point bloquant (à décider avant de coder)

Fidéo n'est pas une application purement client. Une partie du produit tourne obligatoirement sur un serveur :

- signature des cartes Apple Wallet (.pkpass) et service web PassKit
- notifications Apple (APNs) et mises à jour Google Wallet
- assistant IA, géocodage des adresses, inscription client publique par QR code

Transformer la sortie en site statique « 100 % client » supprimerait tout cela : plus de carte Wallet, plus de notifications, plus d'assistant. Ce n'est donc pas la bonne route.

**Ce que je propose à la place** : l'app iOS embarque l'interface Fidéo (fichiers compilés livrés dans l'app, pas une simple page web chargée à distance) et continue d'appeler le serveur `fideoloyalty.app` comme une API. C'est exactement le fonctionnement d'une app Capacitor classique et cela reste conforme.

## Ce que je ferai

1. **Cible de build « app mobile »**
   - Ajouter un mode de build dédié qui génère l'interface dans `dist/mobile` (HTML + JS embarqués dans l'app iOS), sans toucher au site web actuel ni à ses fonctions serveur.
   - Ce mode pointe les appels réseau vers `https://fideoloyalty.app`.

2. **Capacitor**
   - Installer `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`.
   - Créer `capacitor.config.ts` : `appId: "app.fideoloyalty.card"`, `appName: "Fidéo"`, `webDir: "dist/mobile"`.

3. **Fonctions natives (guideline 4.2 d'Apple)**
   - Scan QR : passer par `@capacitor/camera` (+ un lecteur de code-barres natif) sur iOS, et garder le lecteur web actuel dans le navigateur. Même bouton, même écran, deux moteurs selon la plateforme.
   - Notifications : `@capacitor/push-notifications` sur iOS (jeton APNs enregistré côté backend), Web Push conservé sur le navigateur.
   - Ajouts qui renforcent le dossier Apple : partage natif de la carte, vibration/retour haptique au scan réussi, icône et écran de lancement Fidéo.

4. **Instructions finales**
   - Étapes exactes : export GitHub, `npm install`, `npx cap add ios`, `npx cap sync`, ouverture dans Xcode, signature avec l'équipe **QBR5LW4N8A**, capabilities Push Notifications, permissions caméra, archive et envoi vers App Store Connect.

## Détails techniques

- La config Capacitor n'utilisera **pas** `server.url` (un simple pointeur vers le site distant est précisément ce qu'Apple refuse en 4.2).
- Les appels serveur passeront par une base d'URL configurable (`VITE_API_BASE_URL`), vide sur le web, `https://fideoloyalty.app` en mobile.
- Le code natif (`ios/`) est généré chez vous après export : Xcode ne peut pas tourner ici.
- Le service worker PWA reste désactivé dans le build mobile.

## À confirmer

- OK pour que l'app iOS s'appuie sur le serveur `fideoloyalty.app` (obligatoire pour Wallet/notifications) ?
- Bundle ID souhaité : `app.fideoloyalty.card` — attention, `pass.app.fideoloyalty.card` est déjà utilisé pour les cartes Wallet, les deux peuvent coexister.
