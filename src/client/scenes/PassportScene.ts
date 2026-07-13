import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { STAMP_MAP } from '../../shared/constants';
import type { Bottle, Stop } from '../../shared/types';

const STAMP_EMOJIS: Record<string, string> = {
  compass: '🧭', starfish: '⭐', anchor: '⚓', coral: '🪸',
  whale: '🐋', shell: '🐚', moon: '🌙', wave: '🌊', trident: '🔱',
};

const TIDE_LABELS: Record<string, string> = {
  calm: '🌊 Calm', storm: '⛈️ Storm', whirlpool: '🌀 Whirlpool', aurora: '✨ Aurora',
};

const TINT_COLORS: Record<string, number> = {
  seafoam: 0x7ec8b8, amber: 0xd4a574, cobalt: 0x4a90d9,
  rose: 0xd4727a, obsidian: 0x4a4a5e, pearl: 0xe8e0d0,
};

export class PassportScene extends Scene {
  private bottle: Bottle | null = null;
  private score = 0;
  private tier = '';
  private lossWording = '';
  private scrollY = 0;
  private maxScroll = 0;
  private contentContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('PassportScene');
  }

  init(data: any) {
    this.bottle = data?.bottle || null;
    this.score = data?.score || 0;
    this.tier = data?.tier || '';
    this.lossWording = data?.lossWording || '';
    this.scrollY = 0;
  }

  create() {
    if (!this.bottle) {
      this.scene.start('OceanScene');
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a1628);

    // Back button
    this.add.text(16, 16, '← Ocean', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('OceanScene'));

    // Compute tier if not passed
    if (!this.tier) {
      const hopCount = this.bottle.hopCount;
      const isRare = this.bottle.isRare;
      const stormStops = this.bottle.stops.filter(s => s.tide === 'storm').length;
      const score = hopCount * 10 + (isRare ? 50 : 0) + stormStops * 5;
      this.score = score;
      if (score >= 200) this.tier = 'Tidemark Legend';
      else if (score >= 100) this.tier = 'Legendary Wanderer';
      else if (score >= 50) this.tier = 'Storied Vessel';
      else this.tier = 'Drifting Letter';
    }

    // Bottle icon + tint
    const tintColor = TINT_COLORS[this.bottle.tint] || 0x7ec8b8;
    const bottleG = this.add.graphics();
    bottleG.fillStyle(tintColor, 0.85);
    bottleG.fillRoundedRect(width / 2 - 10, 45, 20, 35, 6);
    bottleG.fillStyle(0xd4a574, 1);
    bottleG.fillRoundedRect(width / 2 - 5, 38, 10, 6, 2);

    // Tier title
    this.add.text(width / 2, 95, this.tier, {
      fontFamily: 'Outfit, Arial', fontSize: '18px', color: '#d4a574', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hop count
    this.add.text(width / 2, 116, `${this.bottle.hopCount} hops · ${this.bottle.stops.length} stops${this.bottle.isRare ? ' · ✨ Rare' : ''}`, {
      fontFamily: 'Outfit, Arial', fontSize: '11px', color: '#86c5da',
    }).setOrigin(0.5).setAlpha(0.7);

    // Divider
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x2e86ab, 0.3);
    divG.lineBetween(30, 135, width - 30, 135);

    // Scrollable passport content
    this.contentContainer = this.add.container(0, 145);

    let yOffset = 0;
    this.bottle.stops.forEach((stop, i) => {
      const stamp = STAMP_MAP.get(stop.stampId);
      const emoji = STAMP_EMOJIS[stop.stampId] || '📌';
      const tideLabel = TIDE_LABELS[stop.tide] || stop.tide;
      const phrase = stamp ? (stop.phraseId === 'A' ? stamp.phraseA : stamp.phraseB) : '';
      const timeAgo = this.formatTimeAgo(stop.ts);
      const isOrigin = i === 0;

      // Stop card background
      const cardG = this.add.graphics();
      cardG.fillStyle(0x0f3460, 0.3);
      cardG.fillRoundedRect(20, yOffset, width - 40, 70, 8);
      this.contentContainer!.add(cardG);

      // Connection line (except first)
      if (i > 0) {
        const lineG = this.add.graphics();
        lineG.lineStyle(1, 0x2e86ab, 0.2);
        lineG.lineBetween(40, yOffset - 5, 40, yOffset);
        this.contentContainer!.add(lineG);
      }

      // Stamp emoji
      const stampText = this.add.text(40, yOffset + 18, emoji, { fontSize: '22px' }).setOrigin(0.5);
      this.contentContainer!.add(stampText);

      // Stop label
      const label = isOrigin ? '🏠 Origin' : `Stop #${i}`;
      const labelText = this.add.text(60, yOffset + 8, `${label} · ${tideLabel}`, {
        fontFamily: 'Outfit, Arial', fontSize: '10px', color: '#86c5da',
      }).setAlpha(0.6);
      this.contentContainer!.add(labelText);

      // Phrase
      if (phrase) {
        const phraseText = this.add.text(60, yOffset + 24, `"${phrase}"`, {
          fontFamily: 'Outfit, Arial', fontSize: '11px', color: '#e8f4f8', fontStyle: 'italic',
          wordWrap: { width: width - 100 },
        });
        this.contentContainer!.add(phraseText);
      }

      // Time
      const timeText = this.add.text(width - 30, yOffset + 8, timeAgo, {
        fontFamily: 'Outfit, Arial', fontSize: '9px', color: '#86c5da',
      }).setOrigin(1, 0).setAlpha(0.4);
      this.contentContainer!.add(timeText);

      yOffset += 80;
    });

    this.maxScroll = Math.max(0, yOffset - (height - 250));

    // Action buttons at bottom
    const btnY = height - 55;

    // Keep button
    const keepBg = this.add.graphics();
    keepBg.fillStyle(0x2e86ab, 1);
    keepBg.fillRoundedRect(20, btnY - 18, (width - 50) / 2, 36, 12);
    this.add.text(20 + (width - 50) / 4, btnY, '🏠 Keep', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', fontStyle: 'bold', color: '#e8f4f8',
    }).setOrigin(0.5);
    this.add.rectangle(20 + (width - 50) / 4, btnY, (width - 50) / 2, 36, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('DecisionScene', {
          bottle: this.bottle,
          action: 'keep',
        });
      });

    // Relaunch button
    const relaunchX = width / 2 + 5;
    const relBg = this.add.graphics();
    relBg.fillStyle(0x1a5276, 1);
    relBg.fillRoundedRect(relaunchX, btnY - 18, (width - 50) / 2, 36, 12);
    this.add.text(relaunchX + (width - 50) / 4, btnY, '🌊 Relaunch', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', fontStyle: 'bold', color: '#e8f4f8',
    }).setOrigin(0.5);
    this.add.rectangle(relaunchX + (width - 50) / 4, btnY, (width - 50) / 2, 36, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('DecisionScene', {
          bottle: this.bottle,
          action: 'relaunch',
        });
      });

    // Touch scrolling
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.contentContainer) {
        const dy = pointer.prevPosition.y - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
        this.contentContainer.y = 145 - this.scrollY;
      }
    });
  }

  private formatTimeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'just now';
  }
}
