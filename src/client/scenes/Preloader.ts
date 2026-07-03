import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;

    // Ocean gradient background
    this.cameras.main.setBackgroundColor(0x0a1628);

    // Loading bar
    const barX = width / 2 - 100;
    const barY = height / 2;
    this.add.rectangle(width / 2, barY, 204, 20).setStrokeStyle(1, 0x86c5da);
    const bar = this.add.rectangle(barX, barY, 4, 16, 0x2e86ab);

    // Loading text
    this.add.text(width / 2, barY - 40, 'Drifting in...', {
      fontFamily: 'Outfit, Arial',
      fontSize: '16px',
      color: '#86c5da',
    }).setOrigin(0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 196 * progress;
    });
  }

  preload() {
    // No external image assets needed — we generate everything procedurally
    // This preload exists for future asset loading (sounds, spritesheets)
  }

  create() {
    this.scene.start('OceanScene');
  }
}
