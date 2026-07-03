import { Scene } from 'phaser';
import * as Phaser from 'phaser';

// Tide palette definitions
const TIDE_PALETTES = {
  calm:      { sky: 0x0d2137, ocean: 0x0f3460, accent: 0x2e86ab, particle: 0x86c5da },
  storm:     { sky: 0x1a1a2e, ocean: 0x16213e, accent: 0x533483, particle: 0x7b68ee },
  whirlpool: { sky: 0x0d1b2a, ocean: 0x1b2838, accent: 0x1fa2ff, particle: 0x12d8fa },
  aurora:    { sky: 0x0a1628, ocean: 0x1a3c5e, accent: 0xd4a574, particle: 0xffd700 },
} as const;

// Bottle tint colors
const TINT_COLORS: Record<string, number> = {
  seafoam:  0x7ec8b8,
  amber:    0xd4a574,
  cobalt:   0x4a90d9,
  rose:     0xd4727a,
  obsidian: 0x4a4a5e,
  pearl:    0xe8e0d0,
};

type TideType = 'calm' | 'storm' | 'whirlpool' | 'aurora';

interface GameState {
  tideType: TideType;
  hasBottleToCatch: boolean;
  caughtBottle: any | null;
  lighthouseStage: number;
  totalLight: number;
  playerData: any | null;
}

export class OceanScene extends Scene {
  private state: GameState = {
    tideType: 'calm',
    hasBottleToCatch: false,
    caughtBottle: null,
    lighthouseStage: 0,
    totalLight: 0,
    playerData: null,
  };

  // Visual elements
  private waveGraphics: Phaser.GameObjects.Graphics[] = [];
  private bottleContainer: Phaser.GameObjects.Container | null = null;
  private lighthouseContainer: Phaser.GameObjects.Container | null = null;
  private dockContainer: Phaser.GameObjects.Container | null = null;
  private particles: Phaser.GameObjects.Graphics | null = null;
  private particleData: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }> = [];
  private tideText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private castButton: Phaser.GameObjects.Container | null = null;
  private time_acc = 0;

  constructor() {
    super('OceanScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(TIDE_PALETTES.calm.sky);

    // Create wave layers
    this.createWaves(width, height);

    // Create particles layer
    this.particles = this.add.graphics();

    // Lighthouse (diegetic navigation — tap to view lighthouse details)
    this.createLighthouse(width, height);

    // Dock area (diegetic navigation — tap to view collection)
    this.createDock(width, height);

    // Floating bottle (diegetic — tap to interact)
    this.createBottle(width, height);

    // Cast a Bottle button
    this.createCastButton(width, height);

    // Tide indicator
    this.tideText = this.add.text(width / 2, 28, '', {
      fontFamily: 'Outfit, Arial',
      fontSize: '13px',
      color: '#86c5da',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.7);

    // Status text
    this.statusText = this.add.text(width / 2, height - 24, '', {
      fontFamily: 'Outfit, Arial',
      fontSize: '11px',
      color: 'rgba(232, 244, 248, 0.4)',
      align: 'center',
    }).setOrigin(0.5);

    // Handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.handleResize(gameSize.width, gameSize.height);
    });

    // Load game state from server
    this.loadGameState();
  }

  update(_time: number, delta: number) {
    this.time_acc += delta;
    const t = this.time_acc / 1000;

    const { width, height } = this.scale;
    const palette = TIDE_PALETTES[this.state.tideType];

    // Animate waves
    this.animateWaves(t, width, height, palette);

    // Animate bottle bob
    this.animateBottle(t);

    // Animate particles
    this.animateParticles(t, width, height, palette, delta);

    // Lighthouse glow pulse
    this.animateLighthouse(t);
  }

  // ─── Visual Creation ───

  private createWaves(width: number, height: number) {
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      this.waveGraphics.push(g);
    }
  }

  private createLighthouse(width: number, height: number) {
    this.lighthouseContainer = this.add.container(width * 0.88, height * 0.18);

    // Lighthouse body (drawn procedurally)
    const g = this.add.graphics();

    // Base
    g.fillStyle(0x8b7355, 1);
    g.fillRect(-12, 10, 24, 30);

    // Tower
    g.fillStyle(0xd4c4a8, 1);
    g.fillRect(-8, -30, 16, 40);

    // Light room
    g.fillStyle(0xffd700, 0.8);
    g.fillCircle(0, -35, 8);

    // Stripe
    g.fillStyle(0xcc3333, 1);
    g.fillRect(-8, -15, 16, 8);

    this.lighthouseContainer.add(g);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 40, 80, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.lighthouseContainer.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.scene.start('LighthouseScene', {
        stage: this.state.lighthouseStage,
        totalLight: this.state.totalLight,
      });
    });
  }

  private createDock(width: number, height: number) {
    this.dockContainer = this.add.container(width * 0.12, height * 0.78);

    const g = this.add.graphics();

    // Dock planks
    g.fillStyle(0x8b6914, 0.7);
    g.fillRect(-18, -5, 36, 10);
    g.fillRect(-14, 5, 28, 8);

    // Dock post
    g.fillStyle(0x6b4e12, 0.8);
    g.fillRect(-4, -20, 8, 15);

    // Small bottle on dock
    g.fillStyle(0x7ec8b8, 0.6);
    g.fillEllipse(8, -8, 6, 10);

    this.dockContainer.add(g);

    // Collection label
    const label = this.add.text(0, 18, 'Collection', {
      fontFamily: 'Outfit, Arial',
      fontSize: '9px',
      color: '#86c5da',
    }).setOrigin(0.5).setAlpha(0.6);
    this.dockContainer.add(label);

    // Interactive
    const hitArea = this.add.rectangle(0, 0, 50, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.dockContainer.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.scene.start('CollectionScene');
    });
  }

  private createBottle(width: number, height: number) {
    this.bottleContainer = this.add.container(width / 2, height * 0.45);

    const g = this.add.graphics();

    // Bottle body
    g.fillStyle(0x7ec8b8, 0.85);
    g.fillRoundedRect(-10, -20, 20, 35, 6);

    // Bottle neck
    g.fillStyle(0x7ec8b8, 0.7);
    g.fillRect(-4, -28, 8, 10);

    // Cork
    g.fillStyle(0xd4a574, 1);
    g.fillRoundedRect(-5, -32, 10, 6, 2);

    // Glass highlight
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(-6, -16, 6, 18, 3);

    // Paper inside
    g.fillStyle(0xfaf0e6, 0.4);
    g.fillRect(-4, -8, 8, 12);

    this.bottleContainer.add(g);

    // Tap prompt text
    const prompt = this.add.text(0, 30, 'Tap to catch', {
      fontFamily: 'Outfit, Arial',
      fontSize: '12px',
      color: '#86c5da',
    }).setOrigin(0.5).setAlpha(0);
    this.bottleContainer.add(prompt);
    (this.bottleContainer as any)._promptText = prompt;

    // Make bottle interactive
    const hitArea = this.add.rectangle(0, 0, 40, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.bottleContainer.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.onBottleTap();
    });

    // Initially hidden until we know there's a bottle to catch
    this.bottleContainer.setVisible(false);
  }

  private createCastButton(width: number, height: number) {
    this.castButton = this.add.container(width / 2, height * 0.88);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x2e86ab, 1);
    bg.fillRoundedRect(-70, -18, 140, 36, 18);
    bg.lineStyle(1, 0x86c5da, 0.3);
    bg.strokeRoundedRect(-70, -18, 140, 36, 18);
    this.castButton.add(bg);

    // Button text
    const text = this.add.text(0, 0, '🍾  Cast a Bottle', {
      fontFamily: 'Outfit, Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#e8f4f8',
    }).setOrigin(0.5);
    this.castButton.add(text);

    // Interactive
    const hitArea = this.add.rectangle(0, 0, 140, 36, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.castButton.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.scene.start('CreateScene');
    });
  }

  // ─── Animations ───

  private animateWaves(t: number, width: number, height: number, palette: typeof TIDE_PALETTES.calm) {
    const speedMultiplier = this.state.tideType === 'storm' ? 1.8 : 1;
    const amplitudeMultiplier = this.state.tideType === 'storm' ? 1.5 : 1;

    this.waveGraphics.forEach((g, i) => {
      g.clear();
      const baseY = height * (0.55 + i * 0.08);
      const alpha = 0.15 - i * 0.03;
      const color = i === 0 ? palette.accent : palette.ocean;

      g.fillStyle(color, alpha + 0.05);
      g.beginPath();
      g.moveTo(0, height);

      for (let x = 0; x <= width; x += 4) {
        const waveY =
          baseY +
          Math.sin((x / width) * Math.PI * 2 + t * speedMultiplier * (0.8 + i * 0.3)) * (12 * amplitudeMultiplier) +
          Math.sin((x / width) * Math.PI * 4 + t * speedMultiplier * 1.2) * (4 * amplitudeMultiplier);
        g.lineTo(x, waveY);
      }

      g.lineTo(width, height);
      g.closePath();
      g.fillPath();
    });
  }

  private animateBottle(t: number) {
    if (!this.bottleContainer || !this.bottleContainer.visible) return;

    const speed = this.state.tideType === 'storm' ? 2.5 : 1.2;
    const amplitude = this.state.tideType === 'storm' ? 12 : 6;

    const { height } = this.scale;
    const baseY = height * 0.45;

    this.bottleContainer.y = baseY + Math.sin(t * speed) * amplitude;
    this.bottleContainer.rotation = Math.sin(t * speed * 0.7) * 0.12;

    // Whirlpool: slight rotation
    if (this.state.tideType === 'whirlpool') {
      this.bottleContainer.rotation += Math.sin(t * 0.5) * 0.3;
    }
  }

  private animateLighthouse(t: number) {
    if (!this.lighthouseContainer) return;

    // Glow pulse based on stage
    if (this.state.lighthouseStage >= 1) {
      const glowAlpha = 0.5 + Math.sin(t * 2) * 0.3;
      this.lighthouseContainer.setAlpha(0.7 + glowAlpha * 0.3);
    } else {
      this.lighthouseContainer.setAlpha(0.4);
    }
  }

  private animateParticles(t: number, width: number, height: number, palette: typeof TIDE_PALETTES.calm, delta: number) {
    if (!this.particles) return;
    this.particles.clear();

    // Spawn new particles
    if (Math.random() < 0.1) {
      this.particleData.push({
        x: Math.random() * width,
        y: height * 0.5 + Math.random() * height * 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2 - 0.1,
        life: 0,
        maxLife: 2000 + Math.random() * 3000,
        size: 1 + Math.random() * 2,
      });
    }

    // Aurora: more particles, golden
    if (this.state.tideType === 'aurora' && Math.random() < 0.3) {
      this.particleData.push({
        x: Math.random() * width,
        y: height * 0.1 + Math.random() * height * 0.3,
        vx: (Math.random() - 0.5) * 0.1,
        vy: Math.random() * 0.05,
        life: 0,
        maxLife: 4000 + Math.random() * 2000,
        size: 1 + Math.random() * 3,
      });
    }

    // Update and draw
    this.particleData = this.particleData.filter((p) => {
      p.life += delta;
      if (p.life >= p.maxLife) return false;

      p.x += p.vx;
      p.y += p.vy;

      const alpha = 1 - p.life / p.maxLife;
      this.particles!.fillStyle(palette.particle, alpha * 0.4);
      this.particles!.fillCircle(p.x, p.y, p.size);

      return true;
    });
  }

  // ─── Data Loading ───

  private async loadGameState() {
    try {
      // Load tide, player, lighthouse in parallel
      const [tideRes, playerRes, lighthouseRes] = await Promise.all([
        fetch('/api/tide').catch(() => null),
        fetch('/api/player/me').catch(() => null),
        fetch('/api/lighthouse').catch(() => null),
      ]);

      if (tideRes?.ok) {
        const tideData = await tideRes.json();
        this.state.tideType = tideData.tideType || 'calm';
        this.updateTideVisuals();
      }

      if (playerRes?.ok) {
        this.state.playerData = await playerRes.json();
      }

      if (lighthouseRes?.ok) {
        const lhData = await lighthouseRes.json();
        this.state.lighthouseStage = lhData.stage || 0;
        this.state.totalLight = lhData.totalLight || 0;
      }

      // Try to catch a bottle
      await this.tryLoadBottle();

    } catch (err) {
      console.error('Failed to load game state:', err);
      this.statusText?.setText('⚠ Could not connect to the ocean');
    }
  }

  private async tryLoadBottle() {
    try {
      const res = await fetch('/api/bottle/catch', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.bottle) {
          this.state.caughtBottle = data.bottle;
          this.state.hasBottleToCatch = true;
          this.showBottle(data.bottle);
        } else {
          this.showEmptyOcean();
        }
      } else {
        this.showEmptyOcean();
      }
    } catch {
      this.showEmptyOcean();
    }
  }

  private showBottle(bottle: any) {
    if (!this.bottleContainer) return;

    // Update bottle tint color
    const tintColor = TINT_COLORS[bottle.tint] || 0x7ec8b8;
    // Redraw bottle with correct tint
    const g = this.bottleContainer.getAt(0) as Phaser.GameObjects.Graphics;
    g.clear();

    g.fillStyle(tintColor, 0.85);
    g.fillRoundedRect(-10, -20, 20, 35, 6);
    g.fillStyle(tintColor, 0.7);
    g.fillRect(-4, -28, 8, 10);
    g.fillStyle(0xd4a574, 1);
    g.fillRoundedRect(-5, -32, 10, 6, 2);
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(-6, -16, 6, 18, 3);
    g.fillStyle(0xfaf0e6, 0.4);
    g.fillRect(-4, -8, 8, 12);

    this.bottleContainer.setVisible(true);

    // Show prompt
    const prompt = (this.bottleContainer as any)._promptText as Phaser.GameObjects.Text;
    if (prompt) {
      prompt.setAlpha(0);
      this.tweens.add({
        targets: prompt,
        alpha: 0.8,
        duration: 1000,
        delay: 500,
        yoyo: true,
        repeat: -1,
        hold: 2000,
      });
    }

    const tierName = this.computeTierName(bottle);
    this.statusText?.setText(`A ${tierName} drifts nearby...`);
  }

  private showEmptyOcean() {
    if (this.bottleContainer) {
      this.bottleContainer.setVisible(false);
    }
    this.statusText?.setText('The ocean is quiet today. Cast a bottle to begin.');
  }

  private computeTierName(bottle: any): string {
    const hopCount = bottle.hopCount || 0;
    const isRare = bottle.isRare || false;
    const stormStops = (bottle.stops || []).filter((s: any) => s.tide === 'storm').length;
    const score = hopCount * 10 + (isRare ? 50 : 0) + stormStops * 5;

    if (score >= 101) return 'Tidemark Legend';
    if (score >= 51) return 'Legendary Wanderer';
    if (score >= 21) return 'Storied Vessel';
    return 'Drifting Letter';
  }

  private updateTideVisuals() {
    const tideNames: Record<TideType, string> = {
      calm: '🌊 Calm Seas',
      storm: '⛈️ Storm Rising',
      whirlpool: '🌀 Whirlpool Currents',
      aurora: '✨ Golden Tide',
    };

    this.tideText?.setText(tideNames[this.state.tideType]);
    this.cameras.main.setBackgroundColor(TIDE_PALETTES[this.state.tideType].sky);
  }

  // ─── Interactions ───

  private onBottleTap() {
    if (this.state.caughtBottle) {
      this.scene.start('PassportScene', { bottle: this.state.caughtBottle });
    }
  }

  // ─── Responsive ───

  private handleResize(width: number, height: number) {
    this.cameras.resize(width, height);

    if (this.lighthouseContainer) {
      this.lighthouseContainer.setPosition(width * 0.88, height * 0.18);
    }
    if (this.dockContainer) {
      this.dockContainer.setPosition(width * 0.12, height * 0.78);
    }
    if (this.bottleContainer) {
      this.bottleContainer.setPosition(width / 2, height * 0.45);
    }
    if (this.castButton) {
      this.castButton.setPosition(width / 2, height * 0.88);
    }
    if (this.tideText) {
      this.tideText.setPosition(width / 2, 28);
    }
    if (this.statusText) {
      this.statusText.setPosition(width / 2, height - 24);
    }
  }
}
