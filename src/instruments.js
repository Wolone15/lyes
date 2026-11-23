// Timbres synthétisés. Les paramètres décrivent l'enveloppe et le spectre.
const catalog = [
  ['grand-piano','Piano à queue','Pianos','triangle',.004,1.1,6200,'keys',[1,.4,.18,.09]],
  ['upright','Piano droit','Pianos','triangle',.008,.6,3800,'keys',[1,.31,.13,.07]],
  ['wurlitzer','Piano électrique Wurlitzer','Pianos','sine',.009,.7,3400,'keys',[1,.51,.08,.15]],
  ['clavinet','Clavinet','Pianos','triangle',.002,.18,5600,'pluck',[1,.44,.33,.12]],
  ['harpsichord','Clavecin','Pianos','sawtooth',.002,.13,8200,'pluck',[1,.38,.13,.06]],
  ['nylon','Guitare classique nylon','Guitares','sine',.003,.38,4200,'pluck',[1,.35,.19,.06]],
  ['steel','Guitare acoustique folk','Guitares','triangle',.003,.54,7200,'pluck',[1,.46,.35,.2,.08]],
  ['twelve-string','Guitare folk 12 cordes','Guitares','triangle',.004,.75,7600,'pluck',[1,.36,.28,.24],.38],
  ['clean-electric','Guitare électrique claire','Guitares','sine',.005,.5,6900,'pluck',[1,.55,.22,.19,.08]],
  ['muted-electric','Guitare électrique palm mute','Guitares','triangle',.002,.08,2200,'pluck',[1,.39,.24]],
  ['jazz-guitar','Guitare jazz','Guitares','sine',.004,.35,2350,'pluck',[1,.38,.18,.05]],
  ['crunch-guitar','Guitare électrique crunch','Guitares','sawtooth',.005,.6,4300,'lead',[1,.5,.4,.25,.15]],
  ['distorted-guitar','Guitare électrique saturée','Guitares','square',.016,.7,4900,'lead',[1,.36,.58,.12,.27,.08]],
  ['slide-guitar','Guitare slide','Guitares','triangle',.032,.45,5100,'lead',[1,.51,.32,.16],.16],
  ['ukulele','Ukulélé','Guitares','sine',.003,.2,4100,'pluck',[1,.32,.24,.09]],
  ['banjo','Banjo','Guitares','triangle',.002,.21,8500,'pluck',[1,.53,.41,.22]],
  ['mandolin','Mandoline','Guitares','triangle',.003,.28,7600,'pluck',[1,.4,.28,.16],.22],
  ['oud','Oud','Guitares','sine',.005,.38,4000,'pluck',[1,.58,.24,.08],.11],
  ['sitar','Sitar','Guitares','triangle',.003,.5,5900,'pluck',[1,.2,.43,.12,.22],.14],
  ['sub808','Basse 808','Basses','sine',.005,.65,440,'bass',[1,.14,.05]],
  ['electric-bass','Basse électrique','Basses','triangle',.008,.27,1600,'bass',[1,.43,.18,.06]],
  ['slap','Basse slap','Basses','triangle',.002,.15,4100,'bass',[1,.58,.29,.18]],
  ['upright-bass','Contrebasse','Basses','sine',.014,.42,1150,'bass',[1,.32,.15]],
  ['synth-bass','Basse synthé','Basses','sawtooth',.016,.14,1800,'bass',[1,.37,.32,.15]],
  ['acoustic-kit','Batterie acoustique','Batteries','sine',.001,.12,15800,'kit',[],0,{kick:.85,snare:1.15,hat:1.25}],
  ['trap-kit','Batterie trap','Batteries','sine',.001,.12,13600,'kit',[],0,{kick:1.15,snare:.8,hat:.74}],
  ['house-kit','Batterie house','Batteries','sine',.001,.12,15000,'kit',[],0,{kick:1.05,snare:1.28,hat:1.5}],
  ['congas','Congas','Percussions','sine',.002,.17,3600,'pluck',[1,.4,.13]],
  ['djembe','Djembé','Percussions','triangle',.002,.19,3100,'pluck',[1,.53,.1]],
  ['shaker','Shaker','Percussions','sine',.001,.11,13500,'noise'],
  ['marimba','Marimba','Percussions','sine',.002,.48,6300,'pluck',[1,.08,.32]],
  ['vibraphone','Vibraphone','Percussions','sine',.003,.95,6300,'pluck',[1,.13,.22],.07],
  ['violin','Violon','Cordes','triangle',.1,.37,5700,'lead',[1,.46,.4,.21,.1],.12],
  ['viola','Alto','Cordes','triangle',.12,.48,4200,'lead',[1,.39,.25,.15],.1],
  ['cello','Violoncelle','Cordes','sawtooth',.13,.55,3200,'harmony',[1,.55,.24,.14],.08],
  ['pizzicato','Cordes pizzicato','Cordes','triangle',.005,.31,4800,'pluck',[1,.39,.18]],
  ['harp','Harpe','Cordes','sine',.005,.92,6700,'pluck',[1,.31,.12,.07]],
  ['trumpet','Trompette','Cuivres','triangle',.058,.16,7300,'lead',[1,.65,.5,.19,.11]],
  ['trombone','Trombone','Cuivres','triangle',.077,.25,4300,'harmony',[1,.5,.35,.11]],
  ['french-horn','Cor','Cuivres','sine',.12,.4,3200,'harmony',[1,.52,.21,.08]],
  ['tuba','Tuba','Cuivres','sine',.08,.29,1900,'bass',[1,.55,.09]],
  ['clarinet','Clarinette','Vents','sine',.058,.28,4200,'lead',[1,.04,.43,.03,.13]],
  ['sax','Saxophone','Vents','triangle',.063,.26,6100,'lead',[1,.5,.28,.12,.06],.07],
  ['oboe','Hautbois','Vents','triangle',.046,.18,4900,'lead',[1,.34,.36,.2,.1]],
  ['accordion','Accordéon','Orgues','sawtooth',.044,.18,5100,'harmony',[1,.48,.32,.2],.2],
  ['pipe-organ','Orgue d’église','Orgues','sine',.065,.66,5000,'harmony',[1,.31,.35,.09,.07]],
  ['analog-pad','Nappe analogique','Synthétiseurs','sawtooth',.43,1.25,2700,'harmony',[1,.35,.23,.09],.24],
  ['analog-arp','Arpège analogique','Synthétiseurs','triangle',.012,.2,4200,'pluck',[1,.28,.17,.09],.19],
  ['synth-brass','Synthé cuivré rétro','Synthétiseurs','sawtooth',.048,.31,4400,'harmony',[1,.49,.37,.11],.12],
  ['soft-lead','Synthé solo doux','Synthétiseurs','triangle',.047,.38,2550,'lead',[1,.24,.09],.17],
  ['glass','Verre résonnant','Textures','sine',.081,1.26,7900,'pluck',[1,.09,.42,.16],.14]
];

export const extraInstruments = catalog.map(([id,name,category,wave,attack,release,filter,part,harmonics,width,kit]) =>
  ({id,name,category,wave,attack,release,filter,part,harmonics,width,kit}));

const originalParts = {
  drums:'kit', perc:'kit', bass:'bass', piano:'keys', epiano:'keys', guitar:'pluck',
  pad:'harmony', strings:'harmony', choir:'harmony', organ:'harmony', brass:'harmony'
};

export const instrumentPart = preset => preset?.part ?? originalParts[preset?.id] ?? 'lead';

export const normalizeText = value => String(value).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
