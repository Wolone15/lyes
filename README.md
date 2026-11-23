# LYES - studio musical personnel, v0.3

Ouvrir le studio : http://127.0.0.1:5173

## Lancer

Node.js 20 ou supérieur est nécessaire. Depuis ce dossier :

    node server.mjs

Sous Windows : double-cliquer sur « Lancer LYES.cmd ». Aucun npm install n’est nécessaire. Garder le serveur ouvert. L’application reste locale ; aucun hébergement distant n’a été configuré.

## Comptes privés

Créer son compte avec pseudo et mot de passe, sans mail ni téléphone. Deux comptes sont disponibles pour les tests. Chacun possède ses projets côté serveur. Les mots de passe sont hachés avec scrypt. Les sessions utilisent des cookies HttpOnly ; les fichiers privés sont hors de la racine publique, dans work/lyes-data par défaut. Le premier compte peut récupérer volontairement l’ancienne bibliothèque de cet appareil grâce au bouton prévu. Les projets restent exportables en .lyes.

Le lien 127.0.0.1 fonctionne uniquement sur l’ordinateur qui héberge le serveur. Un accès depuis un autre domicile nécessite un hébergement ou un accès réseau configuré, avec HTTPS. Les mots de passe ne disposent pas de récupération par mail.

## Fonctions présentes

- Moteur Web Audio, 16 presets synthétiques, pistes MIDI/audio et éditeur de notes.
- Arrangement, volume/panoramique, filtre, réverbération, écho, sauvegarde privée, import et exports WAV/MIDI.
- Description textuelle d’une composition : durée, ambiance, instruments et parties horodatées interprétés localement.
- Assistant d’arrangement : refrains plus dynamiques, couplets plus marqués, variations et allègement de parties, avec aperçu et annulation.
- Modes débutant et confirmé ; guide PDF téléchargeable en français.
- Mémoire locale facultative distincte par compte, analyse DSP de fichiers et lecture des métadonnées de certains liens musicaux.
- Espace vocal et préparation d’une instrumentale enregistrée ; des problèmes de rendu restent à qualifier.

L’assistant est un moteur maison à règles. Il ne comprend pas toutes les formulations et ne s’entraîne pas comme un modèle général de langage. Les estimations de BPM/tonalité restent approximatives. Un lien Spotify, YouTube ou SoundCloud seul ne signifie pas que son audio a été analysé.

## Vérifications

    node --test tests/*.test.mjs

26 tests ont réussi lors de la mise à jour : modèles, commandes, MIDI, WAV, description musicale, DSP, édition des sections et intégration HTTP de deux comptes privés. Le parcours navigateur de la demande fournie a également abouti à une modification réelle des notes et à sa sauvegarde. Aucune qualité artistique à l’écoute humaine n’est certifiée.

## Documentation

- COMPTES-ET-ASSISTANT.md : fonctionnement actuel, migration des anciens projets, données privées et vérifications de la v0.3.
- GUIDE.md : guide détaillé initial. Pour la sauvegarde, se référer aux comptes privés décrits ci-dessus, qui remplacent l’ancienne bibliothèque IndexedDB.
- assets/LYES-guide-debutant.pdf : bases musicales en trois pages.
- ARCHITECTURE.md, TESTS.md, LIMITATIONS.md : documentation de la première version, à lire avec les mises à jour de COMPTES-ET-ASSISTANT.md.

Le code n’utilise aucun sample tiers ni service IA payant obligatoire. Les sons sont synthétisés localement. Le ZIP de source ne contient ni comptes ni projets personnels du serveur.
