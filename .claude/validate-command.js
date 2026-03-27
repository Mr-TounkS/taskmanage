#!/usr/bin/env node
// Hook de sécurité — Bloque les commandes dangereuses
const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const command = input?.tool_input?.command || '';

const DANGEROUS = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+~/, 
  /sudo\s+rm/,
  /:\(\)\{.*\}/,   // fork bomb
  /curl.*\|\s*(bash|sh)/,
  /wget.*\|\s*(bash|sh)/,
];

const isDangerous = DANGEROUS.some(pattern => pattern.test(command));

if (isDangerous) {
  console.error(JSON.stringify({
    decision: 'block',
    reason: `Commande potentiellement dangereuse bloquée : ${command}`
  }));
  process.exit(0);
}

// Autorisé
console.log(JSON.stringify({ decision: 'allow' }));
