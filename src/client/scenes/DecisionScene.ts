import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { STAMP_MAP, BASE_STAMP_IDS } from '../../shared/constants';
import type { Bottle, StampId } from '../../shared/types';

const STAMP_EMOJIS: Record<string, string> = {
  compass: '🧭', starfish: '⭐', anchor: '⚓', coral: '🪸',
  whale: '🐋', shell: '🐚', moon: '🌙', wave: '🌊', trident: '🔱',
};

export class DecisionScene extends Scene {
  private bottle: Bottle | null = null;
  private action: 'keep' | 'relaunch' = 'keep';
  private isProcessing = false;

  // Relaunch sub-state
  private selectedStamp: StampId | null = null;
  private selectedPhrase: 'A' | 'B' | null = null;
  private lossWording = '';

  // UI tracking for redraws
  private uiElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('DecisionScene');
  }

  init(data: any) {
    this.bottle = data?.bottle || null;
    this.action = data?.action || 'keep';
    this.isProcessing = false;
    this.selectedStamp = null;
    this.selectedPhrase = null;
    this.lossWording = '';
    this.uiElements = [];
  }

  create() {
    if (!this.bottle) {
      this.scene.start('OceanScene');
      return;
    }

    this.cameras.main.setBackgroundColor(0x0a1628);

    // Back to passport (persistent)
    this.add.text(16, 16, '← Passport', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('PassportScene', { bottle: this.bottle }));

    if (this.action === 'keep') {
      this.showKeepConfirmation();
    } else {
      this.loadLossChance();
      this.drawRelaunchUI();
    }
  }

  // ─── KEEP FLOW ───

  private showKeepConfirmation() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 70, '🏠', { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(width / 2, 120, 'Keep this bottle?', {
      fontFamily: 'Outfit, Arial', fontSize: '20px', color: '#e8f4f8', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 155, 'It will join your Collection forever.\nThe creator will receive a Postcard.', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#86c5da',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    // Confirm button
    const btnY = height / 2 + 20;
    const bg = this.add.graphics();
    bg.fillStyle(0x2e86ab, 1);
    bg.fillRoundedRect(width / 2 - 100, btnY - 24, 200, 48, 24);

    this.add.text(width / 2, btnY, '✨ Keep Forever', {
      fontFamily: 'Outfit, Arial', fontSize: '16px', fontStyle: 'bold', color: '#e8f4f8',
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, btnY, 200, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.executeKeep());

    this.add.text(width / 2, btnY + 50, 'After keeping, you can cast a new bottle.', {
      fontFamily: 'Outfit, Arial', fontSize: '11px', color: 'rgba(232,244,248,0.4)',
    }).setOrigin(0.5);
  }

  // ─── RELAUNCH FLOW ───

  private drawRelaunchUI() {
    // Tear down previous dynamic UI
    for (const el of this.uiElements) {
      el.destroy();
    }
    this.uiElements = [];

    const { width, height } = this.scale;

    const add = <T extends Phaser.GameObjects.GameObject>(el: T): T => {
      this.uiElements.push(el);
      return el;
    };

    add(this.add.text(width / 2, 55, 'Relaunch', {
      fontFamily: 'Outfit, Arial', fontSize: '20px', color: '#e8f4f8', fontStyle: 'bold',
    }).setOrigin(0.5));

    // Loss chance wording
    add(this.add.text(width / 2, 80, this.lossWording || 'Reading the tides...', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#d4727a', fontStyle: 'italic',
    }).setOrigin(0.5));

    add(this.add.text(width / 2, 105, 'Add your stamp before relaunching', {
      fontFamily: 'Outfit, Arial', fontSize: '11px', color: '#86c5da',
    }).setOrigin(0.5).setAlpha(0.6));

    // Stamp picker
    const stamps = [...BASE_STAMP_IDS] as StampId[];
    const cols = 4;
    const spacing = 58;
    const startX = width / 2 - ((Math.min(cols, stamps.length) - 1) * spacing) / 2;

    stamps.forEach((stampId, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const y = 155 + row * 55;

      const isSelected = this.selectedStamp === stampId;
      const bg = add(this.add.graphics());
      bg.fillStyle(isSelected ? 0x2e86ab : 0x1a3c5e, isSelected ? 0.8 : 0.3);
      bg.fillRoundedRect(x - 20, y - 20, 40, 40, 8);
      if (isSelected) {
        bg.lineStyle(2, 0x86c5da, 1);
        bg.strokeRoundedRect(x - 20, y - 20, 40, 40, 8);
      }

      add(this.add.text(x, y, STAMP_EMOJIS[stampId] || '📌', { fontSize: '20px' }).setOrigin(0.5));

      const hit = add(this.add.rectangle(x, y, 40, 40, 0x000000, 0)
        .setInteractive({ useHandCursor: true }));
      hit.on('pointerdown', () => {
        this.selectedStamp = stampId;
        this.selectedPhrase = null;
        this.drawRelaunchUI();
      });
    });

    // Phrase chips
    if (this.selectedStamp) {
      const stamp = STAMP_MAP.get(this.selectedStamp);
      if (stamp) {
        const phraseY = 300;
        [
          { id: 'A' as const, text: stamp.phraseA },
          { id: 'B' as const, text: stamp.phraseB },
        ].forEach((p, i) => {
          const y = phraseY + i * 50;
          const isSelected = this.selectedPhrase === p.id;

          const bg = add(this.add.graphics());
          bg.fillStyle(isSelected ? 0x2e86ab : 0x0f3460, isSelected ? 0.5 : 0.2);
          bg.fillRoundedRect(24, y - 16, width - 48, 36, 12);
          if (isSelected) {
            bg.lineStyle(1, 0x86c5da, 0.5);
            bg.strokeRoundedRect(24, y - 16, width - 48, 36, 12);
          }

          const truncated = p.text.length > 42 ? p.text.slice(0, 42) + '…' : p.text;
          add(this.add.text(width / 2, y, `"${truncated}"`, {
            fontFamily: 'Outfit, Arial', fontSize: '11px', color: '#e8f4f8', fontStyle: 'italic',
          }).setOrigin(0.5));

          const hit = add(this.add.rectangle(width / 2, y, width - 48, 36, 0x000000, 0)
            .setInteractive({ useHandCursor: true }));
          hit.on('pointerdown', () => {
            this.selectedPhrase = p.id;
            this.drawRelaunchUI();
          });
        });
      }
    }

    // Relaunch button
    const canRelaunch = this.selectedStamp && this.selectedPhrase;
    const btnY = height - 60;
    const btnBg = add(this.add.graphics());
    btnBg.fillStyle(canRelaunch ? 0x1a5276 : 0x1a3c5e, canRelaunch ? 1 : 0.3);
    btnBg.fillRoundedRect(width / 2 - 100, btnY - 24, 200, 48, 24);

    add(this.add.text(width / 2, btnY, '🌊 Send it Back', {
      fontFamily: 'Outfit, Arial', fontSize: '15px', fontStyle: 'bold',
      color: canRelaunch ? '#e8f4f8' : 'rgba(232,244,248,0.3)',
    }).setOrigin(0.5));

    if (canRelaunch) {
      const hit = add(this.add.rectangle(width / 2, btnY, 200, 48, 0x000000, 0)
        .setInteractive({ useHandCursor: true }));
      hit.on('pointerdown', () => this.executeRelaunch());
    }
  }

  // ─── SERVER CALLS ───

  private async loadLossChance() {
    if (!this.bottle) return;
    try {
      const res = await fetch('/api/tide');
      if (res.ok) {
        const tideData = await res.json();
        const hopCount = this.bottle.hopCount;
        const base = Math.min(30, 5 + 2 * hopCount);
        const stormPenalty = tideData.tideType === 'storm' ? 10 : 0;
        const pct = base + stormPenalty;

        if (pct <= 10) this.lossWording = '🌊 Calm waters ahead';
        else if (pct <= 20) this.lossWording = '🌀 The current pulls strongly';
        else if (pct <= 30) this.lossWording = '⛈️ Storm approaching — this voyage is dangerous';
        else this.lossWording = '💀 Treacherous seas — few bottles survive';

        this.drawRelaunchUI();
      }
    } catch { /* silent */ }
  }

  private async executeKeep() {
    if (this.isProcessing || !this.bottle) return;
    this.isProcessing = true;

    try {
      const res = await fetch('/api/bottle/keep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bottleId: this.bottle.id }),
      });

      if (res.ok) {
        this.showKeepSuccess();
      } else {
        this.isProcessing = false;
      }
    } catch {
      this.isProcessing = false;
    }
  }

  private showKeepSuccess() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.cameras.main.setBackgroundColor(0x0a1628);

    this.add.text(width / 2, height * 0.3, '✨', { fontSize: '64px' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.42, 'Bottle Kept!', {
      fontFamily: 'Outfit, Arial', fontSize: '24px', color: '#d4a574', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.48, 'A postcard has been sent to the creator.', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#86c5da',
    }).setOrigin(0.5);

    const btnY = height * 0.6;
    const bg1 = this.add.graphics();
    bg1.fillStyle(0x2e86ab, 1);
    bg1.fillRoundedRect(width / 2 - 110, btnY - 24, 220, 48, 24);
    this.add.text(width / 2, btnY, '🍾 Cast a New Bottle', {
      fontFamily: 'Outfit, Arial', fontSize: '15px', fontStyle: 'bold', color: '#e8f4f8',
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, btnY, 220, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('CreateScene'));

    this.add.text(width / 2, height * 0.72, 'Return to Ocean', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('OceanScene'));
  }

  private async executeRelaunch() {
    if (this.isProcessing || !this.bottle || !this.selectedStamp || !this.selectedPhrase) return;
    this.isProcessing = true;

    try {
      const res = await fetch('/api/bottle/relaunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bottleId: this.bottle.id,
          stampId: this.selectedStamp,
          phraseId: this.selectedPhrase,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.lost) {
          this.showLostAnimation();
        } else {
          this.showRelaunchSuccess();
        }
      } else {
        this.isProcessing = false;
      }
    } catch {
      this.isProcessing = false;
    }
  }

  private showLostAnimation() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.cameras.main.setBackgroundColor(0x0a1628);

    const waveG = this.add.graphics();
    this.tweens.addCounter({
      from: height,
      to: 0,
      duration: 2000,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const val = tween.getValue();
        waveG.clear();
        waveG.fillStyle(0x0f3460, 0.6);
        waveG.fillRect(0, val, width, height);
      },
      onComplete: () => {
        this.add.text(width / 2, height * 0.35, '🌊', { fontSize: '64px' }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.48, 'Lost to the Depths', {
          fontFamily: 'Outfit, Arial', fontSize: '22px', color: '#d4727a', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.54, 'The bottle was claimed by the sea...', {
          fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#86c5da',
        }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.7, 'Return to Ocean', {
          fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('OceanScene'));
      },
    });
  }

  private showRelaunchSuccess() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.cameras.main.setBackgroundColor(0x0a1628);

    this.add.text(width / 2, height * 0.35, '⛵', { fontSize: '64px' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.48, 'Bottle Relaunched!', {
      fontFamily: 'Outfit, Arial', fontSize: '22px', color: '#2e86ab', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.54, 'It sails on to the next stranger...', {
      fontFamily: 'Outfit, Arial', fontSize: '13px', color: '#86c5da',
    }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.7, 'Return to Ocean', {
      fontFamily: 'Outfit, Arial', fontSize: '14px', color: '#86c5da',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('OceanScene'));
  }
}
