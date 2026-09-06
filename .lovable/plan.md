# Relance géolocalisée automatique

## Le point important à savoir avant de commencer

Une page web (même installée comme application) **ne peut pas** suivre la position d'un client en arrière-plan. iOS et Android coupent la géolocalisation dès que le navigateur est fermé ou en arrière-plan. Faire du "geofencing" par le navigateur donnerait donc zéro notification en pratique (et viderait la batterie).

La bonne solution existe déjà et elle est native : **Apple Wallet et Google Wallet déclenchent eux-mêmes une notification sur l'écran verrouillé quand le téléphone s'approche du commerce**, à partir des coordonnées enregistrées dans la carte. Ça fonctionne app fermée, sans autorisation supplémentaire à demander, sur iPhone et Android.

Aujourd'hui les coordonnées sont déjà envoyées dans les cartes, mais :
- le rayon est figé (150 m) et non réglable ;
- le texte affiché est générique et non modifiable ;
- les cartes déjà installées ne sont pas mises à jour quand le commerçant change ces réglages.

## Ce qui sera fait

1. **Réglages commerçant** (base de données) : rayon de déclenchement (défaut 1,5 km, de 500 m à 5 km), message de relance personnalisable, et interrupteur marche/arrêt.
2. **Interface** dans la page Carte de fidélité : un curseur pour le rayon, un champ texte pour le message (avec message par défaut proposé), et l'interrupteur.
3. **Application aux cartes** : le rayon et le texte choisis sont injectés dans la carte Apple (`locations` + `maxDistance` + `relevantText`) et Google (`locations`).
4. **Mise à jour immédiate** : à l'enregistrement des réglages, les cartes déjà installées chez les clients sont rafraîchies (Apple via notification silencieuse, Google via l'API), donc pas besoin de réinstaller la carte.

## Sur les points 2 et 3 de la demande

- **Uniquement les clients ayant la carte au wallet** : c'est automatique. Seule une carte réellement installée peut déclencher la notification.
- **Pas de spam** : c'est le système d'exploitation qui gère l'affichage de proximité, il n'affiche pas la carte en boucle pour un même passage. Aucun compteur à écrire de notre côté. À noter : Apple limite chaque carte à 10 lieux, ce qui couvre largement les établissements actuels.

## Détails techniques

- Migration : ajout sur `merchants` de `geo_relance_active` (booléen, défaut vrai), `geo_relance_rayon_m` (entier, défaut 1500, contrainte 500–5000) et `geo_relance_message` (texte, nullable).
- `src/lib/wallet-data.server.ts` : lecture de ces champs et transmission dans l'entrée de carte.
- `src/lib/apple-wallet.server.ts` : `maxDistance` = rayon configuré, `relevantText` = message configuré ou message par défaut.
- `src/lib/google-wallet.server.ts` : inchangé côté rayon (Google gère lui-même la portée), locations conservées.
- `src/routes/_authenticated/carte.tsx` : nouveau bloc « Relance de proximité » ; la sauvegarde déclenche le rafraîchissement des cartes existantes via la logique de synchronisation déjà en place.
