#!/usr/bin/env node
/**
 * Hook post-écriture — détecte les fichiers importants et suggère
 * une entrée dans le journal de bord réflexif
 */

const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const filePath = input?.tool_input?.file_path || input?.tool_input?.path || '';

// Fichiers qui déclenchent une entrée journal
const JOURNAL_TRIGGERS = [
  /lib\/risk-algorithm\//,     // Algorithme SGR
  /prisma\/schema\.prisma/,    // Modèle de données
  /app\/api\//,                // Routes API
  /components\/kanban\//,      // Module Kanban
  /components\/risk\//,        // Module Risques
  /service-worker/,            // PWA Service Worker
];

const shouldLog = JOURNAL_TRIGGERS.some(pattern => pattern.test(filePath));

if (shouldLog) {
  const date = new Date().toISOString().split('T')[0];
  const fileName = filePath.split('/').pop();
  
  // Suggère une entrée journal sans bloquer
  console.error(JSON.stringify({
    type: 'suggestion',
    message: `📓 Fichier significatif modifié: ${fileName}\nPensez à lancer /journal-bord pour documenter cette décision dans le mémoire (Section 4.2.2)`
  }));
}

process.exit(0);
