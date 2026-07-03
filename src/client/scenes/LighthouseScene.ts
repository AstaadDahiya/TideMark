import { Scene } from 'phaser';
import * as Phaser from 'phaser';

const STAGE_DATA = [
  { name: 'Broken', emoji: '🏚️', color: 0x4a4a5e, description: 'The lighthouse stands dark. Keep bottles to bring it light.' },
  { name: 'Repaired', emoji: '🏠', color: 0xd4a574, description: 'The lighthouse glows warmly. The community is growing.' },
  { name: 'Festival', emoji: '🎆', color: 0xffd700, description: 'The lighthouse blazes! The community has come together.' },
];

export class LighthouseScene extends Scene {
  private stage = 0;
  private totalLight = 0;

  constructor() {
    super('LighthouseScene');
  }

  init(data: any) {
    this.stage = data?.stage || 0;
    this.totalLight = data?.totalLight || 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a1628);

    // Back
    this.add.text(16, 16, '← Ocean', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('OceanScene'));

    // Refresh from server
    this.loadLighthouseData(width, height);
  }

  private async loadLighthouseData(width: number, height: number) {
    try {
      const res = await fetch('/api/lighthouse');
      if (res.ok) {
        const data = await res.json();
        this.stage = data.stage || 0;
        this.totalLight = data.totalLight || 0;
      }
    } catch { /* use init data */ }

    this.renderLighthouse(width, height);
  }

  private renderLighthouse(width: number, height: number) {
    const stageInfo = STAGE_DATA[this.stage] || STAGE_DATA[0];

    // Lighthouse drawing
    const lhX = width / 2;
    const lhY = height * 0.3;
    const g = this.add.graphics();

    // Base rock
    g.fillStyle(0x4a4a5e, 0.5);
    g.fillEllipse(lhX, lhY + 70, 120, 30);

    // Tower body
    g.fillStyle(0xd4c4a8, 1);
    g.fillRect(lhX - 16, lhY - 40, 32, 80);

    // Red stripe
    g.fillStyle(0xcc3333, 1);
    g.fillRect(lhX - 16, lhY - 10, 32, 16);

    // Tapered top
    g.fillStyle(0xd4c4a8, 1);
    g.fillRect(lhX - 12, lhY - 60, 24, 22);

    // Light room
    const lightColor = stageInfo.color;
    const lightAlpha = this.stage >= 1 ? 0.9 : 0.3;
    g.fillStyle(lightColor, lightAlpha);
    g.fillCircle(lhX, lhY - 68, 14);

    // Light glow
    if (this.stage >= 1) {
      g.fillStyle(lightColor, 0.1);
      g.fillCircle(lhX, lhY - 68, 40);
      g.fillStyle(lightColor, 0.05);
      g.fillCircle(lhX, lhY - 68, 70);
    }

    // Roof cap
    g.fillStyle(0x333333, 1);
    g.fillTriangle(lhX - 16, lhY - 60, lhX + 16, lhY - 60, lhX, lhY - 80);

    // Door
    g.fillStyle(0x6b4e12, 1);
    g.fillRoundedRect(lhX - 6, lhY + 24, 12, 16, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Stage info
    this.add.text(width / 2, height * 0.55, `${stageInfo.emoji} ${stageInfo.name}`, {
      fontFamily: 'Outfit, Arial', fontSize: '24px', color: '#e8f4f8', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.61, stageInfo.description, {
      fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#86c5da',
      align: 'center', wordWrap: { width: width - 60 },
    }).setOrigin(0.5);

    // Progress bar
    const barY = height * 0.70;
    const barWidth = width - 80;
    const nextThreshold = this.stage === 0 ? 50 : this.stage === 1 ? 200 : 200;
    const progress = Math.min(1, this.totalLight / nextThreshold);

    // Bar background
    const barG = this.add.graphics();
    barG.fillStyle(0x0f3460, 0.5);
    barG.fillRoundedRect(40, barY - 6, barWidth, 12, 6);

    // Bar fill
    barG.fillStyle(stageInfo.color, 0.8);
    barG.fillRoundedRect(40, barY - 6, barWidth * progress, 12, 6);

    // Light count
    this.add.text(width / 2, barY + 16, `${this.totalLight} / ${nextThreshold} light`, {
      fontFamily: 'Outfit, Arial', fontSize: '11px', color: '#86c5da',
    }).setOrigin(0.5).setAlpha(0.6);

    // Community note
    this.add.text(width / 2, height * 0.82, 'Every bottle kept or relaunched\nadds light to the lighthouse.', {
      fontFamily: 'Outfit, Arial', fontSize: '11px', color: 'rgba(232,244,248,0.4)',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // Animate glow pulse
    if (this.stage >= 1) {
      this.tweens.addCounter({
        from: 0.05,
        to: 0.15,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          // Pulse is handled via the main light alpha
        },
      });
    }
  }
}
