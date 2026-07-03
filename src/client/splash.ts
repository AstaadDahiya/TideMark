import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const subtitleElement = document.getElementById('subtitle') as HTMLParagraphElement;
const lighthouseStatus = document.getElementById('lighthouse-status') as HTMLSpanElement;

// Launch the Phaser game in expanded mode
startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

// Fetch lighthouse status for splash footer
async function loadLighthouseStatus() {
  try {
    const res = await fetch('/api/lighthouse');
    if (res.ok) {
      const data = await res.json();
      const stageNames = ['🏚️ Broken', '🏠 Repaired', '🎆 Festival'];
      const stageName = stageNames[data.stage] || '🏚️ Broken';
      lighthouseStatus.textContent = `${stageName} · ${data.totalLight} light`;
    }
  } catch {
    lighthouseStatus.textContent = '🌊 The ocean awaits';
  }
}

function init() {
  // Personalize greeting if username is available
  if (context.username) {
    subtitleElement.textContent = `Welcome back, ${context.username}. Your bottles await.`;
  }
  loadLighthouseStatus();
}

init();
