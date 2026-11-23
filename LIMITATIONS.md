# État réel et limites de la v0.1

## Livré mais encore à qualifier

- Enregistrement MediaRecorder avec choix du micro, plusieurs prises et traitement par volume/pan/filtre/reverb/delay. Aucun essai avec un microphone physique n’a été réalisé pendant cette livraison. La compensation de latence reste manuelle ; aucun monitoring de la voix n’est fourni.
- Import audio et MIDI implémenté. Le décodage de WAV produit par le moteur a été vérifié. Le test du sélecteur de fichier a été interrompu par l’outil de contrôle ; ne pas considérer l’import complet par l’interface comme validé sur cette machine.
- Édition par glissement et redimensionnement implémentée. Les interactions tactiles et les sessions longues n’ont pas encore subi de campagne complète de tests.
- Interface responsive écrite ; Mac, Safari, iPad, iPhone et Android ne sont pas certifiés. Le planificateur peut être affecté quand l’onglet est en arrière-plan.
- Le son est rendu et les différences d’effets sont mesurées ; la qualité perceptive, la latence et l’absence de craquements n’ont pas été validées à l’écoute humaine.

## Absences explicites

Pas de modèle IA connecté ; pas de génération par prompt libre ; pas d’analyse de trois références ; pas de téléchargement YouTube ; pas de séparation de voix, drums ou instruments ; pas de détection fiable de BPM, tonalité, timbre ou sections. Le niveau crête/RMS et la durée sont les seules analyses audio intégrées.

Pas d’autotune, correction de hauteur vocale, formants, pitch-shift audio, time-stretch, réduction du bruit, de-esser, gate, saturation ou compresseur par piste. Pas d’EQ multibande, de bus, de routage personnalisable, d’automation ou de mastering automatique. Le compresseur du master sert de protection simple.

Pas de banques acoustiques enregistrées, de samples vocaux réels ni de bibliothèque illimitée. Il y a 16 presets procéduraux couvrant des familles de timbres, sans sous-catalogues riches.

Un seul tempo global, une métrique 4/4 et des marqueurs ponctuels. Pas de changements de tempo, de sections à durée propre, de zoom vertical, de panneaux librement réorganisables ni de véritable éditeur vocal séparé au-dessus de l’instrumentale. Les clips audio et MIDI partagent l’arrangement ; les prises vocales sont insérées en tête de la liste.

Les clips bouclent par duplication, pas avec un contenu lié. La répétition globale lit toute la durée du projet. Les notes reprises au milieu sont réarticulées. Un changement de BPM conserve la vitesse de la source audio et sa durée de clip en temps musicaux ; la fin peut donc nécessiter un ajustement.

Pas de MP3/FLAC à l’export, ni d’archive de stems en un clic. Exporter les pistes individuellement en WAV. Pas de publication Spotify/Deezer, de compte, de synchronisation cloud ni de bibliothèque séparée d’exports/versions historiques. Les exports sont dans les téléchargements du navigateur. Annuler/rétablir est limité à la session.

## Bornes techniques

64 pistes, tempo 30–240 BPM, 512 mesures configurables, position/fin maximale de clip 2048 temps ; 10 000 notes au maximum dans un clip, 50 000 notes et 2 000 clips au total. Import de fichier limité à 100 Mo et audio limité à 15 minutes. Rendu WAV limité à 15 minutes, queues d’effets comprises. Le rendu conserve en mémoire les échantillons stéréo ; les mobiles peuvent manquer de mémoire bien avant cette limite.

Les ressources audio base64 alourdissent les projets d’environ un tiers. L’historique copie les projets et conserve leurs ressources. Des gros fichiers ou nombreuses modifications audio augmentent la mémoire et la durée des sauvegardes. La disponibilité IndexedDB dépend des quotas et des réglages du navigateur. Exporter souvent le `.lyes` pour une sauvegarde indépendante.

Le serveur écoute uniquement `127.0.0.1`, sans serveur de comptes ni service externe. Il ne constitue pas un déploiement public. Aucun correctif du pare-feu ou exposition réseau n’est nécessaire pour l’usage sur la machine locale.

