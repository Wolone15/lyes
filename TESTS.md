# Rapport de vérification — 23 novembre 2026

Ce rapport distingue les tests exécutés, le code présent et les comportements restant à vérifier. Le cahier des charges complet n’est pas déclaré terminé.

## Tests Node exécutés

Commande : `node --test tests/studio.test.mjs`. Résultat final : **8 tests réussis, 0 échec**.

1. Compositions mineures/majeures de 4, 16 et 128 mesures : validation de toutes les pistes et notes.
2. Rejet de notes hors tessiture MIDI et d’identifiants dupliqués.
3. Transposition de la seule note sélectionnée ; conservation des autres notes ; annuler/rétablir avec restauration exacte.
4. Note nommée Do4, paramètres, tempo, refus de commandes et clés arbitraires.
5. Aller-retour MIDI de la polyphonie, des temps et durées, de la batterie et du tempo. Comparaison des positions en ticks PPQ pour respecter la précision du format ; aucune égalité stricte trompeuse de flottants.
6. Refus d’un fichier MIDI tronqué ou invalide.
7. En-tête WAV, taille, entrelacement stéréo et bornage PCM.
8. Sérialisation JSON du projet, conservation des ressources et validation d’un projet vide.

`node --check src/app.js` et `node --check src/engine.js` ont également réussi après les corrections finales.

## Diagnostic exécuté dans le navigateur

Accès : accueil → À propos → Vérifier le moteur audio et la sauvegarde.

Le diagnostic exécute les vrais modules et utilise un vrai `OfflineAudioContext`, sans mock audio. Les résultats observés :

- Projet à quatre instruments valide.
- Rendu multipiste non silencieux, crête mesurée de **0,344** pour le scénario de test.
- WAV stéréo 44,1 kHz / 16 bits, taille correspondant aux échantillons rendus.
- Commande de transposition appliquée à une copie, sans mutation de la source.
- Différence mesurée entre les échantillons avec et sans réverbération.
- Aller-retour MIDI sans perte du nombre de notes.
- Ressource audio incorporée conservée après écriture/relecture dans IndexedDB. Seul le projet temporaire créé par le diagnostic est ensuite supprimé.
- WAV encodé redécodable par le navigateur ; durée conservée à moins d’une milliseconde. Le nombre d’échantillons peut changer avec la fréquence de la carte son : ce rééchantillonnage n’est pas une corruption.

## Parcours d’interface observés

Studio servi en local, HTTP 200 vérifié. Le navigateur intégré a affiché l’accueil et le studio. Création d’un projet nommé « Session de validation », préécoute appelée, ajout de pistes piano, guitare et batterie, création d’une note Do4 par double-clic sur la grille. L’assistant a proposé puis appliqué Do4 → Do5 ; le panneau de note a affiché Do5. Une demande de réverbération à 40 % a été appliquée et le curseur a affiché 40 %. Le BPM saisi au clavier et validé en quittant le champ est passé à 100 ; la règle est passée à 2,4 secondes par mesure.

Annulation d’un ajout de piste observée. Rechargement de l’application et ouverture de la sauvegarde locale observés. Le générateur a créé « Nocturne » avec quatre instruments, 16 clips et des notes. Lecture lancée avec transport actif, puis arrêt. Export WAV depuis la boîte de dialogue : résultat affiché **42,4 s**, crête **−25,8 dBFS** pour le petit projet de validation à 100 BPM. Le codec WAV lui-même a été vérifié par le diagnostic ; cette exportation d’interface n’a pas fait l’objet d’une écoute humaine.

À une largeur de viewport de **390 px**, la mesure DOM a donné une largeur de document de **390 px**, sans débordement horizontal de page. Le bouton Sons a ouvert la bibliothèque. Le viewport a ensuite été rétabli. Une capture du studio réel est fournie séparément, `LYES-apercu.jpg`. Ce contrôle ne remplace pas un essai sur un téléphone physique.

Le sélecteur de fichier de l’outil navigateur a bloqué le test d’import avant sa vérification et la session de contrôle a dû être reprise. Aucun import de fichier via l’interface n’est déclaré validé. Les décodeurs audio/WAV et MIDI ont été exercés par les diagnostics et tests, ce qui valide une partie du chemin seulement.

## Correspondance avec les 17 critères demandés

| Critère | Constat |
| --- | --- |
| 1. Ouvrir et créer un projet | Réalisé dans l’interface |
| 2. Sélectionner un piano | Réalisé dans l’interface |
| 3. Écouter réellement le son | Préécoute déclenchée ; signal audio non nul mesuré ; écoute humaine non réalisée |
| 4. Créer une mélodie | Création d’une note testée ; génération d’une séquence polyphonique testée ; édition manuelle d’une mélodie complète non parcourue |
| 5. Ajouter guitare et batterie | Réalisé dans l’interface et présent dans le rendu multipiste de diagnostic |
| 6. Construire une timeline | Composition de 16 clips observée ; déplacement/découpe/redimensionnement présents mais campagne manuelle incomplète |
| 7. Modifier le BPM | Réalisé à 100 BPM, règle recalculée |
| 8. Demander à l’IA une modification de note | Interpréteur local opérationnel, aucun véritable modèle IA connecté |
| 9. Constater la modification | Do4 → Do5 observé dans l’éditeur ; commande vérifiée par test |
| 10. Ajouter une réverbération | 40 % appliqué dans l’interface ; différence réelle d’échantillons mesurée |
| 11. Sauvegarder un projet | Écritures IndexedDB et indicateur d’enregistrement observés |
| 12. Retrouver après fermeture | Rechargement puis réouverture observés ; arrêt complet/redémarrage du processus navigateur non testé |
| 13. Importer un fichier audio | Code présent ; décodage testé ; sélecteur de fichier d’interface non validé |
| 14. Enregistrer sa voix | Code présent ; pas de prise physique effectuée |
| 15. Plusieurs pistes vocales | Une nouvelle piste par prise implémentée ; scénario micro non exécuté |
| 16. Volumes indépendants | Contrôles et graphes par piste implémentés ; test manuel complet de chaque tranche non réalisé |
| 17. Exporter WAV | Réalisé depuis l’interface et encodeur/décodage vérifiés |

## Corrections issues des vérifications

Tolérance MIDI alignée sur les ticks, diagnostic WAV aligné sur la durée après rééchantillonnage, réaffichage des contrôles après sélection d’un clip, décompte des révisions pendant les sauvegardes asynchrones, conservation du temps musical lors d’un changement de tempo, annulation des démarrages de lecture devenus obsolètes, reprise de notes tenues par réarticulation, vidage du cache audio à l’ouverture d’un autre projet, export `.lyes` de secours même si IndexedDB échoue, refus de ressources distantes dans les projets importés.

## Vérifications encore nécessaires

Microphone réel, permission et refus de permission, choix du périphérique, plusieurs prises, latence et alignement ; import WAV/MP3/FLAC/AIFF par sélecteur natif ; glisser-déposer inter-pistes, découpes de notes chevauchantes et d’audio ; copier/coller ; Safari/Firefox et appareils iOS/Android ; manque de stockage, fermeture forcée pendant sauvegarde, projets lourds ; écoute critique du rendu et performance à forte polyphonie. Aucune absence de craquement ni qualité de mastering professionnelle n’est certifiée.
