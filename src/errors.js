export function friendlyError(error){
 const name=error?.name||'',text=String(error?.message||error||'');
 if(name==='NotAllowedError'||/permission denied|permission dismissed/i.test(text))return 'L’accès au microphone a été refusé. Tu peux l’autoriser dans les permissions de ce site, puis réessayer.';
 if(name==='NotFoundError')return 'Aucun microphone compatible n’a été trouvé. Branche un microphone ou choisis une autre entrée.';
 if(name==='NotReadableError')return 'Le microphone est indisponible. Vérifie qu’aucune autre application ne le bloque.';
 if(name==='QuotaExceededError')return 'Le stockage local est plein. Télécharge ton projet pour le conserver.';
 if(name==='EncodingError'||/decode|unsupported.*format/i.test(text))return 'Ce fichier audio ne peut pas être lu. Essaie une version WAV ou MP3.';
 if(/fetch|network|ECONNREFUSED|timed out|timeout|aborted/i.test(text))return 'La connexion n’a pas abouti. Vérifie que le serveur LYES est démarré, puis réessaie.';
 if(/Cannot read|undefined|is not a function|null|InvalidState|parameter.*non-finite|stack|ReferenceError|TypeError/i.test(text))return 'Le moteur du studio a rencontré une erreur. Arrête la lecture et réessaie. Ton projet enregistré reste disponible dans la bibliothèque.';
 if(/access.*denied|forbidden|unauthorized/i.test(text))return 'L’accès à cette ressource n’est pas autorisé.';
 return text||'Une erreur est survenue. Réessaie dans quelques instants.';
}
