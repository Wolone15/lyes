# Mise à jour : comptes privés et modifications d’arrangement

Version 0.3, 23 novembre 2026. Ce document décrit l’état actuel et remplace les indications de la première version qui annonçaient une bibliothèque sans compte et un assistant limité aux paramètres individuels.

## Accès

Ouvrir http://127.0.0.1:5173 et choisir « Créer mon compte ». Trois champs seulement : pseudo, mot de passe et confirmation du mot de passe. Aucun mail ni téléphone. Deux comptes maximum sont disponibles pour cette période de test. Aucun compte personnel n’a été créé par l’assistant ; les comptes fictifs des tests utilisent un stockage et un serveur séparés.

Le pseudo accepte 3 à 32 lettres/chiffres/tirets/traits bas. Le mot de passe accepte 8 à 128 caractères. Aucun dispositif de récupération par mail n’existe. Les mots de passe sont hachés avec scrypt et un sel aléatoire propre à chaque compte. Ils ne sont pas conservés en clair. La session est un jeton aléatoire, transmis par cookie HttpOnly et SameSite=Strict ; les sessions expirent au bout de sept jours et sont invalidées au redémarrage du serveur. Les comptes et projets, eux, persistent sur disque.

Les listes, lectures, écritures et suppressions sont traitées dans le répertoire du compte authentifié. Fournir l’identifiant d’un projet d’un autre compte ne permet pas de le consulter ou de le supprimer. Une protection supplémentaire refuse une sauvegarde si le compte du navigateur a changé depuis le chargement de l’application.

Les projets sont désormais sauvegardés côté serveur, et non dans une bibliothèque IndexedDB commune au navigateur. Le premier compte créé dispose de « Récupérer mes anciens projets », pour copier volontairement l’ancienne bibliothèque de cet appareil dans son espace. Cette récupération ne supprime pas les données originales. Le second compte ne reçoit pas ce bouton. Un export .lyes peut toujours être importé volontairement dans un compte.

La mémoire musicale et le choix du niveau débutant/confirmé ont une clé distincte pour chaque compte. La mémoire reste facultative et effaçable. Les messages ouverts, références et sélections sont vidés lors d’une déconnexion.

## Où sont les données ?

Par défaut, le serveur écrit dans `work/lyes-data`, à côté du dossier `outputs`, hors de sa racine publique. `users.json` contient les identifiants et hachages. Les projets sont dans `projects/<identifiant-du-compte>/<identifiant-du-projet>.json`. Le ZIP de source ne contient pas ce répertoire privé. La variable d’environnement `LYES_DATA_DIR` permet de choisir un autre emplacement avant le démarrage. Sauvegarder ce répertoire si l’on veut conserver les comptes et leurs projets après déplacement du serveur.

Le serveur écoute encore uniquement sur la machine locale. Le lien 127.0.0.1 ne peut pas être utilisé depuis le domicile du cousin. Un hébergement ou une configuration réseau explicite, avec HTTPS pour un accès distant et le microphone, reste à mettre en place. Cette mise à jour n’a pas exposé la machine sur Internet.

## Demandes musicales maintenant prises en charge

L’assistant peut proposer des modifications de notes et de rythmes sur les sections nommées d’un projet MIDI, par exemple :

- « Le refrain est trop mou, je veux qu’il ambiance davantage. »
- « La production est trop pareille tout le long, varie les répétitions. »
- « Je veux que les couplets soient plus prononcés. »
- « Allège le refrain, il est trop chargé. »
- « Rends le dernier refrain plus dynamique. »

Le texte exact de la capture, avec « moux », « jaimerias » et « couplest », est couvert par un test. Il produit un aperçu de trois changements : densifier les refrains avec des accents de batterie/basse et des notes aiguës, mieux articuler les couplets, puis varier les répétitions. Cliquer sur Appliquer pour exécuter ces changements. Annuler restaure l’état précédent.

Ces opérations visent le morceau existant et n’en créent pas un autre. Elles conservent son identifiant, son tempo, sa durée et les pistes vocales. Les sections non ciblées sont conservées ; un clip traversant une frontière est découpé pour limiter la modification au bon passage. Une demande d’avis ne déclenche pas de modification.

L’interprétation demeure un moteur local à règles. Cela n’ajoute pas une compréhension générale du français ni un entraînement de modèle comparable à ChatGPT. Si les refrains/couplets ne sont pas nommés, l’assistant demande de les repérer au lieu d’inventer leur position. Un enregistrement audio déjà mixé ne peut pas être réécrit instrument par instrument par ce moteur. La séparation de sources et la transcription restent absentes.

## Vérifications de cette mise à jour

26 tests automatisés réussis au moment de cette livraison : les 17 précédents, 8 tests d’arrangement et un test d’intégration HTTP couvrant les comptes, cookies, mots de passe hachés, isolation des projets, refus d’une origine externe, refus des sauvegardes depuis un compte obsolète, déconnexion et persistance après redémarrage.

L’inscription d’un utilisateur fictif, le choix du niveau, la création d’un projet et l’envoi de la phrase exacte de la capture ont également été parcourus dans le navigateur sur un serveur distinct. Après application, le fichier réellement sauvegardé est passé de 261 à 299 notes. Les changements ont concerné 8 clips de refrain, 8 clips de couplet et 29 clips pour les variations ; le projet, la durée et le tempo étaient identiques. Cela vérifie la mutation musicale et sa persistance, sans prétendre à une évaluation artistique à l’écoute humaine.

Le blocage du rendu audio signalé dans la mise à jour précédente n’a pas fait l’objet d’une nouvelle validation ici. Cette livraison ne le déclare pas résolu. Les opérations testées dans cette mise à jour portent sur les comptes, l’édition MIDI et la sauvegarde.


## Administration

Adresse locale : http://127.0.0.1:5173/admin

Le premier compte créé est administrateur. Le premier compte existant des versions précédentes conserve ce droit grâce à son statut de propriétaire initial. Le serveur choisit le rôle ; un formulaire ne peut pas se déclarer administrateur. Un lien Administration apparaît dans le studio du propriétaire.

L’espace permet de rechercher les pseudos, consulter les profils, la date de création, le rôle et le résumé des productions enregistrées. Consultation seule : aucun changement de mot de passe, usurpation de session ou modification des projets d’autrui. Aucun mot de passe, hachage ou sel n’est renvoyé. Chaque requête admin relit les droits côté serveur. Les comptes ordinaires reçoivent un refus, même en visitant le lien direct.

Validation : 27 tests réussis, dont les accès anonymes et membres refusés, les rôles forgés ignorés, la révocation immédiate des droits et la compatibilité avec le premier compte existant. Interface vérifiée sur des comptes fictifs et un stockage isolé.
