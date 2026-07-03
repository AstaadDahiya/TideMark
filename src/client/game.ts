import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { OceanScene } from './scenes/OceanScene';
import { CreateScene } from './scenes/CreateScene';
import { PassportScene } from './scenes/PassportScene';
import { DecisionScene } from './scenes/DecisionScene';
import { CollectionScene } from './scenes/CollectionScene';
import { LighthouseScene } from './scenes/LighthouseScene';
import * as Phaser from 'phaser';

document.addEventListener('DOMContentLoaded', () => {
  const dpr = window.devicePixelRatio || 1;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    parent: 'game-container',
    backgroundColor: '#0a1628',
    roundPixels: true,
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
    },
    scene: [Boot, Preloader, OceanScene, CreateScene, PassportScene, DecisionScene, CollectionScene, LighthouseScene],
  };

  const game = new Phaser.Game(config);

  if (dpr > 1) {
    // ── HiDPI canvas fix ──
    // Phaser sets canvas.width/height to CSS pixels (e.g. 500×850).
    // On Retina (2x) screens, the browser stretches that to 1000×1700 physical
    // pixels → everything is blurry. Fix: make the canvas buffer 2x and tell
    // the 2D context to draw at 2x scale so Phaser's CSS-pixel coordinates
    // map to physical pixels correctly.
    //
    // Strategy:
    // 1. Intercept canvas.width/height setters so whenever Phaser resizes the
    //    canvas (on boot, on window resize), we actually set it to width*dpr.
    // 2. Intercept ctx.setTransform so Phaser's per-frame identity reset
    //    (1,0,0,1,0,0) becomes (dpr,0,0,dpr,0,0), scaling all drawing.
    // 3. Set CSS size to the original CSS pixel dimensions.
    //
    // Result: Phaser thinks it's drawing at 500×850, but the canvas buffer is
    // 1000×1700 and the context scales all drawing by 2x. Text and graphics
    // are rendered at physical pixel resolution → crisp on Retina.

    game.events.once('ready', () => {
      const canvas = game.canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Intercept setTransform so identity becomes DPR-scaled identity
      const origSetTransform = ctx.setTransform.bind(ctx);
      (ctx as any).setTransform = function (
        a: number | DOMMatrix2DInit,
        b?: number,
        c?: number,
        d?: number,
        e?: number,
        f?: number,
      ) {
        if (typeof a === 'number') {
          // Scale the transform matrix by DPR
          origSetTransform(a * dpr, (b || 0) * dpr, (c || 0) * dpr, (d || 0) * dpr, (e || 0) * dpr, (f || 0) * dpr);
        } else {
          // DOMMatrix2DInit variant — pass through
          origSetTransform(a);
        }
      };

      // Intercept canvas.width and canvas.height setters to multiply by DPR
      // and set CSS size to the original value
      const widthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')!;
      const heightDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height')!;

      Object.defineProperty(canvas, 'width', {
        get() { return widthDesc.get!.call(canvas); },
        set(v: number) {
          widthDesc.set!.call(canvas, Math.round(v * dpr));
          canvas.style.width = v + 'px';
        },
        configurable: true,
      });

      Object.defineProperty(canvas, 'height', {
        get() { return heightDesc.get!.call(canvas); },
        set(v: number) {
          heightDesc.set!.call(canvas, Math.round(v * dpr));
          canvas.style.height = v + 'px';
        },
        configurable: true,
      });

      // Trigger a resize to apply the DPR scaling now
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w;
      canvas.height = h;
    });
  }
});
