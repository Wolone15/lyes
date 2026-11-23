# Architecture et format LYES v1

## Choix techniques

JavaScript ESM natif, CSS, Web Audio et IndexedDB. Ce premier incrément n’utilise pas React, TypeScript ni bibliothèque DSP externe : aucun téléchargement de dépendance n’est requis et le code s’exécute immédiatement dans un navigateur. La séparation en modules permet d’introduire ensuite un framework sans remplacer le moteur. L’absence actuelle de typage statique est une limite ; les données persistées et les commandes sont contrôlées à l’exécution.

| Module | Responsabilité |
| --- | --- |
| `model.js` | Projets, presets, notes, limites, historique, composition procédurale |
| `engine.js` | Synthèse, graphes d’effets, transport, décodeurs et rendu WAV |
| `storage.js` | Transactions IndexedDB, blobs et téléchargements |
| `midi.js` | Import Standard MIDI File 0/1 PPQ et export SMF 1 |
| `assistant.js` | Interprétation locale et commandes autorisées appliquées sur une copie |
| `app.js` | Interface, sélection, interactions, enregistrement et orchestration |
| `diagnostics.js` | Contrôles exécutés par le vrai navigateur |

## Horloge et graphe audio

Une seule horloge `AudioContext.currentTime` synchronise les pistes. Le transport remplit une fenêtre d’environ 180 ms toutes les 25 ms ; les événements sont programmés dans l’horloge audio, pas joués par les intervalles JavaScript. Les changements structurels redémarrent le graphe au temps courant. Une note tenue reprise au milieu est réarticulée, avec sa durée restante : l’état de son enveloppe n’est pas reconstruit exactement. Le mode arrière-plan d’un navigateur peut retarder le planificateur ; garder le studio au premier plan pour les prises.

Par piste : source → filtre passe-bas → panoramique → gain → master. Réverbération à convolution et delay avec feedback ajoutent des branches parallèles. Master → compresseur → analyseur de crête → destination. Le rendu `OfflineAudioContext` réutilise le même graphe à 44,1 kHz. Le WAV est encodé en PCM 16 bits entrelacé. Le métronome n’est pas rendu dans les exports. Un compresseur ne garantit pas l’absence de dépassement ; les valeurs PCM sont bornées lors de l’encodage.

La synthèse utilise oscillateurs, enveloppes, bruit déterministe et harmoniques. Les sons ne prétendent pas reproduire fidèlement un piano à queue ou une guitare enregistrée. Les sources terminées et graphes arrêtés sont déconnectés. Les ressources décodées sont mises en cache pour le projet actif.

## Format portable

Un `.lyes` est du JSON UTF-8 avec `format: "lyes"`, `version: 1`. Il contient :

```json
{
  "format": "lyes", "version": 1,
  "id": "uuid", "name": "Titre", "bpm": 90,
  "bars": 16, "master": 0.75,
  "tracks": [], "markers": [], "assets": {},
  "status": "En cours", "kind": "Instrumental", "updated": 0
}
```

Une piste contient `id`, `name`, `preset`, `color`, `volume`, `pan`, `mute`, `solo`, `attack`, `release`, `filter`, `reverb`, `delay` et `clips`. Les clips ont une position `start` et une durée `length` en noires depuis zéro. Une mesure vaut quatre noires (4/4 uniquement). Une note contient `id`, `pitch` MIDI 0–127, `time` relatif au clip, `duration` en noires et `velocity` entre 0,01 et 1.

Un clip audio contient `type: "audio"`, `asset`, `start`, `length` et `offset` en secondes dans la source. Les ressources sont indexées par identifiant : `{name, mime, data}`, où `data` est une URL `data:` base64 contenant le fichier intégral. L’import passe par le décodeur natif ; aucun accès réseau n’est nécessaire pour une ressource incorporée. L’export portable inclut également les ressources non utilisées encore présentes, pour préserver l’annulation pendant la session.

Le champ optionnel `view` conserve sélection, position, zoom et octave. Ce n’est pas une donnée audio. L’historique en mémoire conserve jusqu’à 60 états, sans persistance des versions. Une migration explicite sera requise pour un futur `version: 2`.

## Commandes du producteur

Le moteur accepte seulement `tempo`, `parameter` (volume/reverb/delay), `transpose` et `move`, avec identifiants et nombres bornés. Les commandes sont appliquées atomiquement sur une copie, validée avant d’entrer dans le projet. Aucune évaluation de code ni modification de fichier par un modèle. L’aperçu est invalidé par une mutation du projet. Un appel au conseiller ne modifie rien.

`providerContract` décrit le contrat d’un futur fournisseur. Ce contrat n’est pas une intégration IA opérationnelle. Une extension doit appeler un serveur local ou distant, y protéger la clé, retourner ces commandes, puis passer par `applyCommands` et `validateProject`. La sélection, les seules données autorisées par l’utilisateur et un contexte de projet limité pourront être transmis. La reprise d’anciennes productions doit rester opt-in ; aucun mécanisme de mémoire artistique n’est activé dans cette version.

## Extensions prévues, non implémentées

Importer d’autres DAW via adaptateurs vers le format interne ; packs d’instruments avec manifeste et licence ; AudioWorklet/WASM pour DSP vocal et scheduling plus robuste ; encodeurs MP3/FLAC ; analyse et séparation dans un worker ou service volontairement configuré ; stockage de blobs séparé et révisions ; panneau vocal dédié ; pistes de tempo ; proxy IA avec schéma JSON et tests d’intégration ; compte et synchronisation comme adaptateur de persistance.

Ces éléments sont des points d’intégration documentés, pas des modules existants ou déjà testés.
