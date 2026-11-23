import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComposition, isCompositionRequest, parseBrief } from '../src/composer.js';
import { applyCommands, interpret } from '../src/assistant.js';
import { extent, presets, validateProject } from '../src/model.js';

test('Élan joue le timbre précis demandé et respecte les exclusions et le tempo', () => {
  const plan = parseBrief('Production de 90 secondes à 211 BPM, guitare classique nylon et guitare électrique saturée seulement, sans intro et sans outro.');
  assert.deepEqual(plan.instruments, ['distorted-guitar', 'nylon']);
  assert.equal(plan.bpm, 211);
  assert.ok(plan.sections.every(s => !/intro|outro/i.test(s.name)));
  const p = buildComposition(plan);
  assert.ok(p.tracks.every(t => t.clips.length > 0));
  const quieter = parseBrief('Production afro, sans basse et sans batterie, avec accordéon et violoncelle.');
  assert.deepEqual(new Set(quieter.instruments), new Set(['accordion', 'cello']));
  assert.equal(isCompositionRequest('Tu penses que je devrais créer une autre production ?', { hasProject: true }), false);
});

test('Élan crée des arrangements jouables dans huit directions musicales', () => {
  for (const genre of ['afro mélodique', 'synth-pop', 'house', 'trap', 'rap', 'jazz', 'acoustique', 'mélodique']) {
    for (const duration of [30, 90, 180, 480]) {
      for (const mood of ['majeur', 'mineur', 'lumineux']) {
        const plan = parseBrief(`Composition ${genre} de ${duration} secondes, ${mood}.`);
        const p = buildComposition(plan);
        assert.equal(validateProject(p), p);
        assert.ok(Math.abs(extent(p) * 60 / p.bpm - duration) < .01);
        assert.ok(p.tracks.every(t => t.clips.length));
      }
    }
  }
});

test('l’intégralité du catalogue est accessible à la composition par son nom', () => {
  for (const {id,name} of presets) {
    const plan = parseBrief(`Compose 30 secondes avec ${name} uniquement.`);
    assert.deepEqual(plan.instruments, [id], name);
    assert.ok(buildComposition(plan).tracks[0].clips.some(c => c.notes.length), name);
  }
});

test('la transition ciblée conserve les notes hors de la mesure précédente', () => {
  const plan = parseBrief('Fais un beat house de 1 minute : 0:00-0:30 couplet, 0:30-1:00 refrain.');
  const p = buildComposition(plan);
  const before = structuredClone(p);
  const change = interpret('Améliore la transition vers le refrain', p);
  assert.equal(change.commands[0].operation, 'transition');
  const next = applyCommands(p, change.commands);
  assert.deepEqual(p, before);
  const section = p.markers[1].beat;
  for (const [i,t] of p.tracks.entries()) {
    assert.deepEqual(next.tracks[i].clips.filter(c => c.start >= section), t.clips.filter(c => c.start >= section));
  }
  assert.ok(next.arrangementChanges.at(-1).clipsChanged > 0);
});

test('remplacer un timbre garde les notes et les paramètres de mixage', () => {
  const p = buildComposition(parseBrief('Production de 30 secondes avec guitare classique nylon seulement.'));
  const results = interpret('Remplace la guitare classique nylon par une guitare électrique claire', p);
  const next = applyCommands(p, results.commands);
  assert.equal(next.tracks[0].preset, 'clean-electric');
  assert.equal(next.tracks[0].volume, p.tracks[0].volume);
  assert.deepEqual(next.tracks[0].clips, p.tracks[0].clips);
});
