import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { Bottle } from '../../shared/types';

const TINT_COLORS: Record<string, number> = {
  seafoam: 0x7ec8b8, amber: 0xd4a574, cobalt: 0x4a90d9,
  rose: 0xd4727a, obsidian: 0x4a4a5e, pearl: 0xe8e0d0,
};

export class CollectionScene extends Scene {
  private bottles: (Bottle & { tier?: string })[] = [];
  private scrollY = 0;
  private maxScroll = 0;
  private contentContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('CollectionScene');
  }

  init() {
    this.scrollY = 0;
    this.bottles = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a1628);

    // Back button
    this.add.text(16, 16, '← Ocean', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('OceanScene'));

    // Title
    this.add.text(width / 2, 50, 'Your Collection', {
      fontFamily: 'Outfit, Arial', fontSize: '22px', color: '#e8f4f8', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Loading state
    const loadingText = this.add.text(width / 2, height / 2, '🐚 Loading...', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setOrigin(0.5);

    this.loadCollection(width, height, loadingText);
  }

  private async loadCollection(width: number, height: number, loadingText: Phaser.GameObjects.Text) {
    try {
      const res = await fetch('/api/player/me');
      if (!res.ok) throw new Error('Failed to load player');

      const playerData = await res.json();
      const bottleIds: string[] = playerData.collection || [];

      // Fetch all bottles
      const bottles: Bottle[] = [];
      for (const id of bottleIds) {
        try {
          const bRes = await fetch(`/api/bottle/${id}`);
          if (bRes.ok) {
            const data = await bRes.json();
            bottles.push(data.bottle);
          }
        } catch { /* skip */ }
      }

      loadingText.destroy();
      this.bottles = bottles;
      this.renderCollection(width, height, playerData);

    } catch (err) {
      loadingText.setText('⚠ Could not load collection');
    }
  }

  private renderCollection(width: number, height: number, playerData: any) {
    // Stats bar
    const statsY = 80;
    this.add.text(width / 2, statsY, [
      `📦 ${playerData.bottlesCreated || 0} created`,
      `🏠 ${playerData.bottlesKept || 0} kept`,
      `🌊 ${playerData.bottlesRelaunched || 0} relaunched`,
      `🔥 ${playerData.streak || 0} day streak`,
    ].join('  ·  '), {
      fontFamily: 'Outfit, Arial', fontSize: '10px', color: '#86c5da',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.6);

    if (this.bottles.length === 0) {
      this.add.text(width / 2, height / 2, 'No bottles in your collection yet.\nCatch one from the ocean!', {
        fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
      return;
    }

    // Divider
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x2e86ab, 0.2);
    divG.lineBetween(20, 100, width - 20, 100);

    // Scrollable content
    this.contentContainer = this.add.container(0, 110);

    let yOffset = 0;
    this.bottles.forEach((bottle, i) => {
      const tintColor = TINT_COLORS[bottle.tint] || 0x7ec8b8;

      // Card
      const cardG = this.add.graphics();
      cardG.fillStyle(0x0f3460, 0.25);
      cardG.fillRoundedRect(16, yOffset, width - 32, 70, 10);
      this.contentContainer!.add(cardG);

      // Mini bottle icon
      const bottleG = this.add.graphics();
      bottleG.fillStyle(tintColor, 0.85);
      bottleG.fillRoundedRect(30, yOffset + 15, 14, 24, 4);
      bottleG.fillStyle(0xd4a574, 1);
      bottleG.fillRoundedRect(32, yOffset + 10, 10, 5, 2);
      this.contentContainer!.add(bottleG);

      // Bottle info
      const hopCount = bottle.hopCount || 0;
      const isRare = bottle.isRare;
      const stormStops = (bottle.stops || []).filter(s => s.tide === 'storm').length;
      const score = hopCount * 10 + (isRare ? 50 : 0) + stormStops * 5;
      let tier: string;
      if (score >= 101) tier = 'Tidemark Legend';
      else if (score >= 51) tier = 'Legendary Wanderer';
      else if (score >= 21) tier = 'Storied Vessel';
      else tier = 'Drifting Letter';

      this.add.text(56, yOffset + 12, tier, {
        fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#d4a574', fontStyle: 'bold',
      });
      this.contentContainer!.add(this.contentContainer!.getAt(this.contentContainer!.length - 1));

      const details = `${hopCount} hops · ${(bottle.stops || []).length} stops · ${bottle.tint}${isRare ? ' · ✨' : ''}`;
      const detText = this.add.text(56, yOffset + 30, details, {
        fontFamily: 'Outfit, Arial', fontSize: '10px', color: '#86c5da',
      }).setAlpha(0.6);
      this.contentContainer!.add(detText);

      const statusLabel = bottle.status === 'kept' ? '🏠 Kept' : bottle.status === 'drifting' ? '🌊 Drifting' : '💀 Lost';
      const statusText = this.add.text(width - 30, yOffset + 20, statusLabel, {
        fontFamily: 'Outfit, Arial', fontSize: '10px', color: '#86c5da',
      }).setOrigin(1, 0.5).setAlpha(0.5);
      this.contentContainer!.add(statusText);

      // Tap to view passport
      const hitArea = this.add.rectangle(width / 2, yOffset + 35, width - 32, 70, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.scene.start('PassportScene', { bottle });
      });
      this.contentContainer!.add(hitArea);

      yOffset += 80;
    });

    this.maxScroll = Math.max(0, yOffset - (height - 160));

    // Touch scrolling
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.contentContainer) {
        const dy = pointer.prevPosition.y - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
        this.contentContainer.y = 110 - this.scrollY;
      }
    });
  }
}
