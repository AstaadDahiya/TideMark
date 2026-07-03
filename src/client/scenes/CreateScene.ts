import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { STAMPS, BOTTLE_TINTS, BASE_STAMP_IDS, STAMP_MAP } from '../../shared/constants';
import type { StampId, BottleTint } from '../../shared/types';

const TINT_COLORS: Record<string, number> = {
  seafoam: 0x7ec8b8, amber: 0xd4a574, cobalt: 0x4a90d9,
  rose: 0xd4727a, obsidian: 0x4a4a5e, pearl: 0xe8e0d0,
};

const STAMP_EMOJIS: Record<string, string> = {
  compass: '🧭', starfish: '⭐', anchor: '⚓', coral: '🪸',
  whale: '🐋', shell: '🐚', moon: '🌙', wave: '🌊', trident: '🔱',
};

export class CreateScene extends Scene {
  private selectedTint: BottleTint = 'seafoam';
  private selectedStamp: StampId | null = null;
  private selectedPhrase: 'A' | 'B' | null = null;
  private availableStamps: StampId[] = [...BASE_STAMP_IDS];
  private isSending = false;

  // Groups for teardown/redraw
  private uiElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('CreateScene');
  }

  init(data: any) {
    if (data?.availableStamps) {
      this.availableStamps = data.availableStamps;
    }
    this.selectedTint = 'seafoam';
    this.selectedStamp = null;
    this.selectedPhrase = null;
    this.isSending = false;
    this.uiElements = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a1628);

    // Back button (persistent — not part of redraw)
    const backBtn = this.add.text(16, 16, '← Back', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('OceanScene'));

    this.drawUI();
  }

  /** Destroy all dynamic UI and redraw with current selections */
  private drawUI() {
    // Tear down previous UI
    for (const el of this.uiElements) {
      el.destroy();
    }
    this.uiElements = [];

    const { width, height } = this.scale;

    // Helper to track elements
    const add = <T extends Phaser.GameObjects.GameObject>(el: T): T => {
      this.uiElements.push(el);
      return el;
    };

    // Title
    add(this.add.text(width / 2, 50, 'Cast a Bottle', {
      fontFamily: 'Outfit, Arial', fontSize: '22px', color: '#e8f4f8', fontStyle: 'bold',
    }).setOrigin(0.5));

    // Bottle preview
    const preview = add(this.add.graphics());
    const tintColor = TINT_COLORS[this.selectedTint];
    const cx = width / 2;
    const py = 120;
    preview.fillStyle(tintColor, 0.85);
    preview.fillRoundedRect(cx - 14, py - 28, 28, 48, 8);
    preview.fillStyle(tintColor, 0.7);
    preview.fillRect(cx - 6, py - 38, 12, 12);
    preview.fillStyle(0xd4a574, 1);
    preview.fillRoundedRect(cx - 7, py - 44, 14, 8, 3);
    preview.fillStyle(0xffffff, 0.15);
    preview.fillRoundedRect(cx - 8, py - 20, 8, 24, 4);

    // --- Tint picker ---
    add(this.add.text(width / 2, 175, 'Choose your glass', {
      fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#86c5da',
    }).setOrigin(0.5));

    const tintStartX = width / 2 - (BOTTLE_TINTS.length * 40) / 2 + 20;
    BOTTLE_TINTS.forEach((tint, i) => {
      const x = tintStartX + i * 40;
      const circle = add(this.add.graphics());
      circle.fillStyle(TINT_COLORS[tint], 1);
      circle.fillCircle(x, 200, 14);
      if (tint === this.selectedTint) {
        circle.lineStyle(2, 0xe8f4f8, 1);
        circle.strokeCircle(x, 200, 17);
      }

      const hitArea = add(this.add.rectangle(x, 200, 34, 34, 0x000000, 0)
        .setInteractive({ useHandCursor: true }));
      hitArea.on('pointerdown', () => {
        this.selectedTint = tint;
        this.drawUI();
      });
    });

    // --- Stamp picker ---
    add(this.add.text(width / 2, 240, 'Add your stamp', {
      fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#86c5da',
    }).setOrigin(0.5));

    const stampCols = 4;
    const stampSpacing = 65;
    const stampStartX = width / 2 - ((Math.min(stampCols, this.availableStamps.length) - 1) * stampSpacing) / 2;

    this.availableStamps.forEach((stampId, i) => {
      const col = i % stampCols;
      const row = Math.floor(i / stampCols);
      const x = stampStartX + col * stampSpacing;
      const y = 280 + row * 60;

      const emoji = STAMP_EMOJIS[stampId] || '📌';
      const isSelected = this.selectedStamp === stampId;

      const bg = add(this.add.graphics());
      bg.fillStyle(isSelected ? 0x2e86ab : 0x1a3c5e, isSelected ? 0.8 : 0.4);
      bg.fillRoundedRect(x - 24, y - 24, 48, 48, 10);
      if (isSelected) {
        bg.lineStyle(2, 0x86c5da, 1);
        bg.strokeRoundedRect(x - 24, y - 24, 48, 48, 10);
      }

      add(this.add.text(x, y - 4, emoji, {
        fontSize: '22px',
      }).setOrigin(0.5));

      add(this.add.text(x, y + 18, stampId, {
        fontFamily: 'Outfit, Arial', fontSize: '9px', color: '#86c5da',
      }).setOrigin(0.5).setAlpha(0.7));

      const hitArea = add(this.add.rectangle(x, y, 48, 48, 0x000000, 0)
        .setInteractive({ useHandCursor: true }));
      hitArea.on('pointerdown', () => {
        this.selectedStamp = stampId;
        this.selectedPhrase = null;
        this.drawUI();
      });
    });

    // --- Phrase chips (only when a stamp is selected) ---
    if (this.selectedStamp) {
      const stamp = STAMP_MAP.get(this.selectedStamp);
      if (stamp) {
        const phraseY = 420;
        add(this.add.text(width / 2, phraseY - 20, 'Choose your message', {
          fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#86c5da',
        }).setOrigin(0.5));

        const phrases = [
          { id: 'A' as const, text: stamp.phraseA },
          { id: 'B' as const, text: stamp.phraseB },
        ];

        phrases.forEach((phrase, i) => {
          const y = phraseY + 10 + i * 55;
          const isSelected = this.selectedPhrase === phrase.id;

          const bg = add(this.add.graphics());
          bg.fillStyle(isSelected ? 0x2e86ab : 0x0f3460, isSelected ? 0.6 : 0.3);
          bg.fillRoundedRect(24, y - 18, width - 48, 40, 14);
          if (isSelected) {
            bg.lineStyle(1, 0x86c5da, 0.6);
            bg.strokeRoundedRect(24, y - 18, width - 48, 40, 14);
          }

          const truncated = phrase.text.length > 42 ? phrase.text.slice(0, 42) + '…' : phrase.text;
          add(this.add.text(width / 2, y, `"${truncated}"`, {
            fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#e8f4f8',
            fontStyle: 'italic',
          }).setOrigin(0.5));

          const hitArea = add(this.add.rectangle(width / 2, y, width - 48, 40, 0x000000, 0)
            .setInteractive({ useHandCursor: true }));
          hitArea.on('pointerdown', () => {
            this.selectedPhrase = phrase.id;
            this.drawUI();
          });
        });
      }
    }

    // --- Cast button ---
    const canCast = this.selectedStamp && this.selectedPhrase;
    const castY = height - 60;

    const castBg = add(this.add.graphics());
    castBg.fillStyle(canCast ? 0x2e86ab : 0x1a3c5e, canCast ? 1 : 0.4);
    castBg.fillRoundedRect(width / 2 - 90, castY - 22, 180, 44, 22);

    add(this.add.text(width / 2, castY, '🌊 Cast into the Sea', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', fontStyle: 'bold',
      color: canCast ? '#e8f4f8' : 'rgba(232,244,248,0.3)',
    }).setOrigin(0.5));

    if (canCast) {
      const hitArea = add(this.add.rectangle(width / 2, castY, 180, 44, 0x000000, 0)
        .setInteractive({ useHandCursor: true }));
      hitArea.on('pointerdown', () => this.castBottle());
    }
  }

  private async castBottle() {
    if (this.isSending || !this.selectedStamp || !this.selectedPhrase) return;
    this.isSending = true;

    // Show sending state
    const { width, height } = this.scale;
    const statusText = this.add.text(width / 2, height - 100, '⏳ Casting...', {
      fontFamily: 'Outfit, Arial', fontSize: '12px', color: '#86c5da',
    }).setOrigin(0.5);

    try {
      const res = await fetch('/api/bottle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tint: this.selectedTint,
          stampId: this.selectedStamp,
          phraseId: this.selectedPhrase,
        }),
      });

      if (res.ok) {
        statusText.setText('✅ Bottle cast!');
        this.time.delayedCall(500, () => {
          this.scene.start('OceanScene');
        });
      } else {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Cast failed:', res.status, errData);
        statusText.setText(`❌ ${errData.error || 'Failed'} (${res.status})`);
        statusText.setColor('#d4727a');
        this.isSending = false;
      }
    } catch (err) {
      console.error('Error casting bottle:', err);
      statusText.setText(`❌ Network error`);
      statusText.setColor('#d4727a');
      this.isSending = false;
    }
  }
}

