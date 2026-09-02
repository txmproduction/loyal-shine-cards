# Contrat de Sous-traitance des Données Personnelles (DPA)

Version 1.1 — Dernière mise à jour : 2 septembre 2026

Conforme à l'article 28 du Règlement (UE) 2016/679 (RGPD).

## Préambule

Le présent Contrat de Sous-traitance (ci-après « DPA ») précise les obligations respectives du Commerçant (ci-après le « Responsable de traitement » ou « RT ») et de TXM Production (ci-après le « Sous-traitant »), relatives au traitement des données personnelles des clients finaux du Commerçant dans le cadre du Service Fidéo.

Le DPA fait partie intégrante des Conditions Générales et est accepté par le Commerçant lors de son inscription.

## 1. Qualification des parties

- Le Commerçant est le Responsable de traitement : il détermine les finalités et les moyens du programme de fidélité, collecte les données de ses clients finaux.
- TXM Production est le Sous-traitant : il traite ces données pour le compte du Commerçant, exclusivement sur instruction documentée de ce dernier.

## 2. Description du traitement

- **Objet** : hébergement, gestion et restitution des données du programme de fidélité du Commerçant.
- **Nature** : stockage, mise à disposition via interfaces web et API, génération de cartes de fidélité numériques (Apple Wallet, Google Wallet), envoi de notifications, statistiques, support.
- **Finalité** : permettre au Commerçant d'exploiter son programme de fidélité auprès de ses clients finaux.
- **Durée** : pendant toute la durée du contrat d'abonnement, jusqu'à suppression effective des données (cf. art. 9).
- **Catégories de personnes concernées** : clients finaux du Commerçant ayant souscrit au programme de fidélité.
- **Catégories de données traitées** : identification (nom, prénom), coordonnées (téléphone), historique de fidélité (passages ou montant cumulé, dates des visites, récompenses débloquées), identifiants techniques (numéro de série de la carte, jetons de notification push).

## 3. Obligations du Sous-traitant

TXM Production s'engage à :

- Traiter les données uniquement sur instruction documentée du Commerçant.
- Garantir la confidentialité : les personnels accédant aux données sont liés par une obligation de confidentialité.
- Mettre en œuvre les mesures de sécurité appropriées (article 32 RGPD, cf. art. 5).
- Aider le Commerçant à respecter ses propres obligations RGPD (réponse aux demandes d'exercice de droits, notification des violations, concours aux AIPD).
- Mettre à disposition du Commerçant toute information nécessaire pour démontrer le respect du présent DPA.

## 4. Sous-traitants ultérieurs

Le Commerçant autorise TXM Production à recourir à des sous-traitants ultérieurs pour fournir le Service, notamment :

- Supabase (base de données, UE)
- Lovable (hébergement applicatif)
- Stripe (prestataire de paiement)
- Apple et Google (distribution Wallet)

En cas d'ajout ou de remplacement d'un sous-traitant ultérieur, TXM Production en informera le Commerçant par email au moins 30 jours à l'avance.

## 5. Mesures de sécurité (article 32 RGPD)

- Chiffrement en transit : TLS (HTTPS).
- Chiffrement au repos (Supabase).
- Mots de passe hashés (bcrypt via Supabase Auth), jamais stockés en clair.
- Contrôle d'accès : Row Level Security (Postgres), accès interne strictement limité.
- Sauvegardes chiffrées régulières.
- Journalisation des accès et de l'activité.
- Procédure interne de détection, qualification et notification des violations sous 72h.

## 6. Notification des violations de données

En cas de violation de données affectant les données traitées pour le compte du Commerçant, TXM Production notifie le Commerçant sans retard injustifié et au plus tard sous 72 heures après en avoir pris connaissance.

Le Commerçant reste seul responsable, en sa qualité de Responsable de traitement, de la notification éventuelle à la CNIL (article 33 RGPD) et aux personnes concernées (article 34 RGPD).

## 7. Transferts internationaux de données

Les données sont principalement hébergées au sein de l'Union européenne (Supabase, région UE). Certains sous-traitants ultérieurs peuvent être établis hors UE (Stripe, Apple, Google). Ces transferts sont encadrés par le Data Privacy Framework ou les clauses contractuelles types de la Commission européenne.

## 8. Audit

Le Commerçant peut, à ses frais et après préavis raisonnable, demander à TXM Production de fournir toute documentation prouvant le respect du présent DPA.

## 9. Sort des données en fin de contrat

À la résiliation du contrat, le Commerçant peut, dans un délai de 30 jours, demander l'export complet des données au format CSV. À l'issue de ce délai, TXM Production procède à la suppression définitive des données dans un délai maximal de 30 jours, sauf obligation légale de conservation.

## 10. Responsabilité

Chaque partie supporte les conséquences pécuniaires des manquements à ses propres obligations. La responsabilité de TXM Production est encadrée par la limitation prévue à l'article 10 des Conditions Générales.

## 11. Contact

Pour toute question relative au présent DPA : contact.txmproduction@gmail.com

© 2026 TXM Production. Tous droits réservés.
