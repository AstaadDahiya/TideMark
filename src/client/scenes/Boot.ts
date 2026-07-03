import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Boot loads minimal assets needed for the preloader itself
    // No heavy assets here — those go in Preloader
  }

  create() {
    this.scene.start('Preloader');
  }
}
