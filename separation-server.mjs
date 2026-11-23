import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const audioFormats = 'mp3,wav,flac,mov,aac,ogg,matroska,webm,aiff';
const maxUpload = 32 * 1024 * 1024;
const labels = {
  vocals: 'Voix', no_vocals: 'Instrumentale', drums: 'Batterie', bass: 'Basse',
  guitar: 'Guitares', piano: 'Piano', other: 'Autres instruments'
};
const failure = (message, status) => Object.assign(Error(message), { status });

export function createSeparator(python) {
  let busy = false;
  return {
    available: Boolean(python),
    async separate(req, mode) {
      if (!python) throw failure('Le moteur Demucs n’est pas installé sur ce serveur LYES.', 503);
      if (busy) throw failure('Une séparation est déjà en cours. Attends qu’elle se termine.', 429);
      if (!['vocals', 'instruments'].includes(mode)) throw failure('Choisis un mode de séparation valide.', 400);
      busy = true;
      let directory;
      try {
        const chunks = [];
        let size = 0;
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          size += chunk.length;
          if (size > maxUpload) {
            req.resume();
            throw failure('Le fichier est limité à 32 Mo pour la séparation.', 413);
          }
          chunks.push(chunk);
        }
        if (!size) throw failure('Le fichier audio est vide.', 400);
        directory = await mkdtemp(path.join(tmpdir(), 'lyes-stems-'));
        const source = path.join(directory, 'source');
        await writeFile(source, Buffer.concat(chunks, size));
        let duration;
        try {
          const { stdout } = await run('ffprobe', [
            '-v', 'error', '-protocol_whitelist', 'file', '-format_whitelist', audioFormats, '-select_streams', 'a:0',
            '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', source
          ], { timeout: 10_000 });
          const probe = JSON.parse(stdout);
          duration = probe.streams?.[0]?.codec_type === 'audio' ? Number(probe.format?.duration) : NaN;
        } catch (error) {
          if (error.code === 'ENOENT') throw failure('Installe FFmpeg et ffprobe sur le serveur LYES.', 503);
          throw failure('Le format de ce fichier audio ne peut pas être lu.', 400);
        }
        if (!Number.isFinite(duration) || duration <= 0) throw failure('La durée du fichier audio est illisible.', 400);
        if (duration > 180.05) throw failure('La séparation traite des morceaux jusqu’à trois minutes.', 413);
        const input = path.join(directory, 'mix.wav');
        const model = mode === 'vocals' ? 'htdemucs' : 'htdemucs_6s';
        try {
          await run('ffmpeg', ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file', '-format_whitelist', audioFormats,
            '-i', source, '-map', '0:a:0', '-t', '180.05', '-ar', '44100', '-ac', '2', input], { timeout: 30_000 });
          await run(python, ['-m', 'demucs', '-n', model, '-d', 'cpu', '-j', '1', '--shifts', '0',
            '--mp3', '--mp3-bitrate', '160', '--out', directory,
            ...(mode === 'vocals' ? ['--two-stems', 'vocals'] : []), input], { timeout: 12 * 60_000 });
          const names = mode === 'vocals' ? ['vocals', 'no_vocals'] : ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];
          const tracks = await Promise.all(names.map(async id => ({
            id, name: labels[id],
            data: 'data:audio/mpeg;base64,' + (await readFile(path.join(directory, model, 'mix', id + '.mp3'))).toString('base64')
          })));
          return { tracks };
        } catch {
          throw failure('La séparation audio a échoué. Vérifie que Demucs et ses modèles sont installés et réessaie avec un fichier plus court.', 502);
        }
      } finally {
        busy = false;
        if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
      }
    }
  };
}
