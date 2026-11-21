import { SoundId } from '../core/types';

export class SoundSynth {
  private ctx: AudioContext | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public muted = false;

  ensureReady(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      if (typeof this.ctx.createMediaStreamDestination === 'function') {
        this.recordDest = this.ctx.createMediaStreamDestination();
      }
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 1.5);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.08 * white) / 1.08;
      data[i] = white * 0.65 + last * 1.4;
    }
    return buf;
  }

  private connectOutput(ctx: AudioContext, node: AudioNode): void {
    node.connect(ctx.destination);
    if (this.recordDest) node.connect(this.recordDest);
  }

  getAudioStream(): MediaStream | null {
    this.ensureReady();
    return this.recordDest?.stream ?? null;
  }

  playLockTone(locked: boolean): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = locked ? 'sawtooth' : 'triangle';
      if (locked) {
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.setValueAtTime(1480, now + 0.055);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        this.connectOutput(ctx, gain);
        osc.start(now);
        osc.stop(now + 0.17);
      } else {
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.075);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        osc.connect(gain);
        this.connectOutput(ctx, gain);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch {
      // Ignore audio errors
    }
  }

  play(id: SoundId): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      if (id === 'explosion') {
        // موجة انفجار عميقة + هدير شظايا واقعي
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(125, now);
        subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.55);
        subGain.gain.setValueAtTime(0.32, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        subOsc.connect(subGain);
        this.connectOutput(ctx, subGain);
        subOsc.start(now);
        subOsc.stop(now + 0.66);

        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(140, now + 0.85);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.28, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          noise.connect(filter);
          filter.connect(nGain);
          this.connectOutput(ctx, nGain);
          noise.start(now);
          noise.stop(now + 0.92);
        }
        return;
      }

      if (id === 'jet_takeoff') {
        // زئير محرك نفاث متصاعد
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 1.6;
          bp.frequency.setValueAtTime(260, now);
          bp.frequency.exponentialRampToValueAtTime(1250, now + 0.45);
          bp.frequency.exponentialRampToValueAtTime(420, now + 0.9);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.01, now);
          g.gain.linearRampToValueAtTime(0.18, now + 0.2);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
          noise.connect(bp);
          bp.connect(g);
          this.connectOutput(ctx, g);
          noise.start(now);
          noise.stop(now + 0.96);
        }
        return;
      }

      if (id === 'missile_launch') {
        // انطلاق صاروخ باليستي: ضغط إشعال + اندفاع تصاعدي
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const hp = ctx.createBiquadFilter();
          hp.type = 'bandpass';
          hp.Q.value = 0.9;
          hp.frequency.setValueAtTime(500, now);
          hp.frequency.exponentialRampToValueAtTime(2100, now + 0.55);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.22, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          noise.connect(hp);
          hp.connect(g);
          this.connectOutput(ctx, g);
          noise.start(now);
          noise.stop(now + 0.66);
        }
        const osc = ctx.createOscillator();
        const og = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
        og.gain.setValueAtTime(0.1, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(og);
        this.connectOutput(ctx, og);
        osc.start(now);
        osc.stop(now + 0.43);
        return;
      }

      if (id === 'ship_horn') {
        // بوق سفينة/حاملة عميق
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.type = 'sawtooth';
        o2.type = 'triangle';
        o1.frequency.setValueAtTime(112, now);
        o2.frequency.setValueAtTime(148, now);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 380;
        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        o1.connect(lp);
        o2.connect(lp);
        lp.connect(g);
        this.connectOutput(ctx, g);
        o1.start(now);
        o2.start(now);
        o1.stop(now + 0.56);
        o2.stop(now + 0.56);
        return;
      }

      if (id === 'cannon_fire') {
        // دوي مدفع دبابة ثقيل: صدمة معدنية حادة + ضغط منخفض سريع
        const punch = ctx.createOscillator();
        const pGain = ctx.createGain();
        punch.type = 'triangle';
        punch.frequency.setValueAtTime(195, now);
        punch.frequency.exponentialRampToValueAtTime(38, now + 0.19);
        pGain.gain.setValueAtTime(0.36, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        punch.connect(pGain);
        this.connectOutput(ctx, pGain);
        punch.start(now);
        punch.stop(now + 0.25);

        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 0.85;
          bp.frequency.setValueAtTime(1950, now);
          bp.frequency.exponentialRampToValueAtTime(220, now + 0.28);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.34, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          noise.connect(bp);
          bp.connect(nGain);
          this.connectOutput(ctx, nGain);
          noise.start(now);
          noise.stop(now + 0.32);
        }
        return;
      }

      if (id === 'gunfire_burst') {
        // رشقة رصاص احترافية (5 طلقات متلاحقة بفرقعة حادة وصدى ميكانيكي)
        for (let i = 0; i < 5; i++) {
          const t = now + i * 0.068;
          const snapOsc = ctx.createOscillator();
          const snapGain = ctx.createGain();
          snapOsc.type = 'sawtooth';
          snapOsc.frequency.setValueAtTime(340 + (i % 2) * 35, t);
          snapOsc.frequency.exponentialRampToValueAtTime(65, t + 0.045);
          snapGain.gain.setValueAtTime(0.16, t);
          snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.052);
          snapOsc.connect(snapGain);
          this.connectOutput(ctx, snapGain);
          snapOsc.start(t);
          snapOsc.stop(t + 0.055);

          if (this.noiseBuffer) {
            const crack = ctx.createBufferSource();
            crack.buffer = this.noiseBuffer;
            const hp = ctx.createBiquadFilter();
            hp.type = 'bandpass';
            hp.Q.value = 1.1;
            hp.frequency.setValueAtTime(2600 + (i % 3) * 280, t);
            hp.frequency.exponentialRampToValueAtTime(750, t + 0.055);
            const cGain = ctx.createGain();
            cGain.gain.setValueAtTime(0.28, t);
            cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.062);
            crack.connect(hp);
            hp.connect(cGain);
            this.connectOutput(ctx, cGain);
            crack.start(t, (i * 0.13) % 0.6, 0.07);
          }
        }
        return;
      }

      if (id === 'artillery_fire') {
        // دوي مدفع هاوتزر عميق مع ارتداد بعيد
        const sub = ctx.createOscillator();
        const sg = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(145, now);
        sub.frequency.exponentialRampToValueAtTime(28, now + 0.42);
        sg.gain.setValueAtTime(0.38, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
        sub.connect(sg);
        this.connectOutput(ctx, sg);
        sub.start(now);
        sub.stop(now + 0.48);

        if (this.noiseBuffer) {
          const blast = ctx.createBufferSource();
          blast.buffer = this.noiseBuffer;
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1600, now);
          lp.frequency.exponentialRampToValueAtTime(180, now + 0.55);
          const bg = ctx.createGain();
          bg.gain.setValueAtTime(0.32, now);
          bg.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
          blast.connect(lp);
          lp.connect(bg);
          this.connectOutput(ctx, bg);
          blast.start(now);
          blast.stop(now + 0.6);
        }
        return;
      }

      if (id === 'torpedo_launch') {
        // اندفاع طوربيد تحت الماء
        if (this.noiseBuffer) {
          const bubble = ctx.createBufferSource();
          bubble.buffer = this.noiseBuffer;
          const lp = ctx.createBiquadFilter();
          lp.type = 'bandpass';
          lp.Q.value = 2.2;
          lp.frequency.setValueAtTime(420, now);
          lp.frequency.exponentialRampToValueAtTime(980, now + 0.25);
          lp.frequency.exponentialRampToValueAtTime(280, now + 0.55);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
          bubble.connect(lp);
          lp.connect(g);
          this.connectOutput(ctx, g);
          bubble.start(now);
          bubble.stop(now + 0.6);
        }
        return;
      }

      if (id === 'radar_ping') {
        const ping = ctx.createOscillator();
        const pg = ctx.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(1180, now);
        ping.frequency.exponentialRampToValueAtTime(880, now + 0.26);
        pg.gain.setValueAtTime(0.11, now);
        pg.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        ping.connect(pg);
        this.connectOutput(ctx, pg);
        ping.start(now);
        ping.stop(now + 0.35);
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      this.connectOutput(ctx, gain);

      if (id === 'spawn_pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (id === 'move_order') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (id === 'build_complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (id === 'alert_ping') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Ignore audio errors in restricted headless environments
    }
  }
}
