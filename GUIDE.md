# Utiliser LYES

## Composer à la main

1. Ouvrir http://127.0.0.1:5173 et choisir « Créer une production ».
2. Nommer le projet et ouvrir le studio.
3. À gauche, cliquer sur un instrument pour le préécouter. Le bouton ＋ placé à sa droite ajoute une piste et un clip MIDI vide de quatre mesures.
4. Sélectionner le clip. Dans le piano roll, double-cliquer sur la grille pour créer une note. Déplacer son corps pour changer sa position et sa hauteur ; étirer son bord droit pour modifier sa durée.
5. Choisir l’octave affichée et la longueur des nouvelles notes. La grille définit le pas d’édition. Une note sélectionnée dispose d’un réglage de vélocité et d’un bouton de suppression.
6. Ajouter une guitare, une basse ou une batterie. La batterie suit une disposition MIDI simple : notes inférieures à 38 = kick, 38 à 41 = caisse claire, à partir de 42 = charleston. Il ne s’agit pas d’un kit General MIDI complet.
7. Cliquer sur Lecture. Le premier geste débloque le moteur audio du navigateur. Ajuster le BPM puis quitter le champ pour valider.

Le bouton « Composer avec une aide » produit une base de piano, guitare, basse et batterie en La mineur ou Do majeur. Ce moteur utilise des règles fixes, pas de l’IA générative. L’exemple `examples/Nocturne.lyes` est aussi réimportable depuis l’accueil.

## Arrangement

Cliquer sur la règle pour positionner le curseur. Double-cliquer dans une piste pour créer un clip d’une mesure. Déplacer le corps d’un clip pour le décaler ; son bord droit change sa durée. Un clip peut être déplacé sur une autre piste ; les notes adoptent alors le timbre et les effets de cette piste.

« Éditer le clip » permet de le renommer, saisir sa position et sa durée, le couper à un temps précis, le dupliquer ou le supprimer. Le temps zéro est le début du projet. Une mesure contient quatre temps. La duplication place la copie immédiatement après l’original. Répéter cette opération pour construire une boucle de clips ; le bouton ↻ boucle l’ensemble du projet.

Le menu ⋯ de piste permet de renommer, réordonner, changer l’instrument et la couleur, dupliquer ou supprimer une piste. Les marqueurs nomment les sections sans imposer leur structure. Les boutons − et ＋ règlent le zoom horizontal. Le menu « Projet » règle la durée minimale et l’état En cours/Terminé.

## Mixage et effets

M coupe une piste, S l’écoute en solo ; plusieurs solos peuvent être actifs. Les curseurs de piste règlent des volumes indépendants. Le panneau d’instrument règle volume, panoramique, réverbération et delay. Le mode avancé ajoute attaque, release et filtre passe-bas. Le mixeur affiche plusieurs tranches simultanément.

Les paramètres de mixage agissent pendant la lecture. Le master comporte un compresseur de protection ; cela ne remplace pas un limiteur à plafond garanti ni un mastering. Baisser les volumes si l’export indique une crête trop élevée.

## Producteur local

Sélectionner la piste et éventuellement une note, ouvrir la bulle puis saisir par exemple :

- `Monte cette note d’une octave` : vise la note sélectionnée ; sans note sélectionnée, transpose le clip MIDI sélectionné.
- `Mets cette note à Do4` : fixe la hauteur de la note sélectionnée.
- `Réverbération à 40 %`, `Delay à 25 %`, `Volume à 60 %` : vise la piste sélectionnée.
- `Tempo 100` : change le tempo global.
- `Décale de 20 ms` : déplace le clip sélectionné, en convertissant les millisecondes au tempo du projet.
- `Explique le BPM` : affiche une explication locale.

Vérifier l’aperçu puis cliquer sur Appliquer. Annuler avec Ctrl+Z si nécessaire. Une demande non reconnue est refusée explicitement. Il ne comprend pas le français général et ne sépare pas les instruments d’un fichier audio. Les messages ne sont pas conservés entre projets ; aucune préférence artistique n’est mémorisée.

## Sauvegarder et rouvrir

L’autosauvegarde se déclenche environ 700 ms après une modification. Attendre « Enregistré sur cet appareil » avant de fermer. « Sauvegarder » force une écriture. Le bouton de marque LYES revient à Ma bibliothèque. Ouvrir un projet restaure ses pistes, paramètres, fichiers audio et la sélection/position enregistrée.

« Projet ↓ » télécharge un `.lyes` contenant les notes ET les données audio. Le réimporter depuis l’accueil pour le transférer. Conserver ce fichier en dehors du navigateur : supprimer les données du site ou utiliser une fenêtre privée peut faire perdre la bibliothèque. L’historique d’annulation ne survit pas à la fermeture.

## Audio et voix

« Importer audio / MIDI » accepte les fichiers que le navigateur sait décoder. WAV PCM et MP3 sont les cibles prioritaires ; FLAC et AIFF dépendent du navigateur et de leur encodage. L’échec de décodage est signalé. L’audio garde sa vitesse d’origine quand le BPM change. Les durées de clips restent en temps musicaux : vérifier leurs fins après un changement de BPM.

Pour une voix, placer le curseur, cliquer sur ●, nommer la prise, choisir le microphone puis Enregistrer. Le navigateur demande sa permission. Utiliser un casque. Le bouton rouge ou Stop termine la prise. Chaque prise devient une nouvelle piste audio au-dessus des instruments. La durée minimale du projet fixe aussi la fin de l’accompagnement et de la prise. Pour une longue prise, augmenter d’abord la durée du projet. Il n’y a pas de monitoring direct du micro ni de compensation automatique de latence ; ajuster le début du clip si nécessaire. Ne pas modifier l’arrangement pendant une prise.

## Exporter

Choisir « Exporter », puis le mix complet ou une piste seule. Le WAV est stéréo PCM 16 bits à 44,1 kHz ; il inclut les effets et quatre secondes de queue. L’export d’une piste ignore son mute et son solo, pour permettre sa récupération isolée. Le mix complet respecte mute et solo. Le MIDI contient notes et tempo, pas les timbres, les effets ou les enregistrements. Les fichiers sont téléchargés par le navigateur.

## Raccourcis et mobile

Espace : lecture/pause ; pendant une prise, termine celle-ci. Ctrl/Cmd+S : sauvegarder. Ctrl/Cmd+Z : annuler. Ctrl/Cmd+Y ou Ctrl/Cmd+Maj+Z : rétablir. Ctrl/Cmd+D : dupliquer le clip. Ctrl/Cmd+C/V : copier/coller un clip au curseur. Suppr/Retour arrière : supprimer la note sélectionnée, sinon le clip.

Sur petit écran, « Sons » ouvre la bibliothèque superposée. Timeline et piano roll défilent séparément. Le double-tap sert à créer des éléments ; la précision tactile et les performances doivent encore être vérifiées sur de vrais appareils iOS et Android. Un ordinateur reste préférable pour les arrangements longs.
