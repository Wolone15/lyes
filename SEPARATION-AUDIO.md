# Séparation audio dans LYES

Élan et le bouton **Séparer un morceau** ouvrent le même outil. Choisis un fichier ou sélectionne un clip audio dans le studio.
Le calcul crée des pistes audio éditables, alignées sur la timeline. Si tu pars d’un clip, LYES conserve le mix original et le met en sourdine. Une annulation permet de revenir au projet précédent.

- **Voix + instrumentale** utilise HTDemucs. L’instrumentale regroupe ce que le modèle sépare de la voix.
- **Six groupes** utilise HTDemucs 6s. Il estime la voix, la batterie, la basse, les guitares, le piano et les autres instruments. Plusieurs guitares peuvent rester mélangées dans une seule piste. La qualité dépend du morceau.
- Les fichiers sont traités sur la machine qui héberge LYES, jusqu’à 32 Mo et trois minutes. L’opération peut prendre plusieurs minutes. La première exécution télécharge les poids depuis la source de Demucs.

## Activation

Le studio et la composition continuent à fonctionner avec Node.js seul. Pour activer le calcul, installe séparément FFmpeg (avec `ffmpeg` et `ffprobe` dans le PATH) et Python sur la machine qui héberge LYES.

1. Crée un environnement Python dédié. Pour reproduire l’environnement testé, utilise Python 3.12, PyTorch et torchaudio CPU 2.5.1.
2. Dans cet environnement, installe les bibliothèques puis donne le chemin de son exécutable Python à LYES.

```text
python -m pip install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install demucs==4.0.1 lameenc
```

Sur Windows, depuis PowerShell dans le dossier LYES, après avoir situé le Python de cet environnement :

```powershell
$env:LYES_DEMUCS_PYTHON = 'C:\chemin\vers\environnement\Scripts\python.exe'
.\'Lancer LYES.cmd'
```

Pour un serveur Linux, définis `LYES_DEMUCS_PYTHON` sur le chemin de son exécutable Python et lance `node server.mjs`. Sur un hébergeur, la machine doit disposer de suffisamment de mémoire, de CPU et de temps de traitement pour Demucs. Le service Render gratuit actuel n’a pas été validé pour ce calcul.
