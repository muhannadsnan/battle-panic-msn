// Audio Manager - Handles all game audio using Web Audio API
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.allMuted = false;  // Master mute
        this.musicPaused = false;  // For game pause
        this.musicVolume = AUDIO_CONFIG.musicVolume;
        this.sfxVolume = AUDIO_CONFIG.sfxVolume;
        this.currentMusic = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Play a hit sound effect - more realistic thud/impact
    playHit() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Low thud for impact
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.setValueAtTime(120 + Math.random() * 40, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.08);
        osc.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.004, this.audioContext.currentTime + 0.1);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);

        // Add slight noise for flesh impact
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 6);
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 400;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseGain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
        noise.start();
    }

    // Play sword clash sound
    playSwordHit() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Metallic clash
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.value = 800 + Math.random() * 400;
        osc.type = 'sawtooth';
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.08);
    }

    // Play orc hit sound - heavy brutal impact
    playOrcHit() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Deep heavy thud
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.setValueAtTime(80, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.15);
        osc.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0.35, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);

        // Add grunt noise
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noise.buffer = buffer;
        noise.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        noise.start();
    }

    // Play defeat/game over sound
    playDefeat() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Sad descending notes
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                if (!this.audioContext) return;
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.frequency.value = freq;
                osc.type = 'sine';

                gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                osc.start();
                osc.stop(this.audioContext.currentTime + 0.3);
            }, i * 200);
        });
    }

    // Play arrow/projectile sound - bow twang with whoosh
    // volumeMultiplier: 1.0 = full volume, 0.4 = 60% quieter (for unit arrows)
    playArrow(volumeMultiplier = 1.0) {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Bow string twang - quick snap
        const twang = this.audioContext.createOscillator();
        const twangGain = this.audioContext.createGain();
        twang.connect(twangGain);
        twangGain.connect(this.sfxGain);
        twang.frequency.setValueAtTime(880, now);
        twang.frequency.exponentialRampToValueAtTime(220, now + 0.06);
        twang.type = 'triangle';
        twangGain.gain.setValueAtTime(0.12 * volumeMultiplier, now);
        twangGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        twang.start(now);
        twang.stop(now + 0.08);

        // Arrow whoosh - quick air sound
        const noiseLen = this.audioContext.sampleRate * 0.06;
        const noiseBuf = this.audioContext.createBuffer(1, noiseLen, this.audioContext.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
            const env = 1 - (i / noiseLen);
            noiseData[i] = (Math.random() * 2 - 1) * env * 0.2 * volumeMultiplier;
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = noiseBuf;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;
        noiseGain.gain.setValueAtTime(0.1 * volumeMultiplier, now);
        noise.start(now);
    }

    // Play magic sound
    playMagic() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.value = 400;
        osc2.frequency.value = 405;
        osc.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.start();
        osc2.start();
        osc.stop(this.audioContext.currentTime + 0.3);
        osc2.stop(this.audioContext.currentTime + 0.3);
    }

    // Play explosion sound
    playExplosion() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        noise.start();
    }

    // Play death sound - more realistic grunt/thud
    playDeath() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Low grunt
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.setValueAtTime(180, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 0.2);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.25);

        // Body fall thud
        setTimeout(() => {
            if (!this.audioContext || this.allMuted) return;
            const thud = this.audioContext.createOscillator();
            const thudGain = this.audioContext.createGain();
            thud.connect(thudGain);
            thudGain.connect(this.sfxGain);
            thud.frequency.value = 50;
            thud.type = 'sine';
            thudGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            thudGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            thud.start();
            thud.stop(this.audioContext.currentTime + 0.1);
        }, 100);
    }

    // Play gold mining sound - pickaxe tap
    playGold() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Metallic tap
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.08);
    }

    // Play promotion fanfare sound - short trumpet/bugle call
    playPromotion() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Trumpet fanfare - military promotion style
        // Short 3-note bugle call: G4 -> C5 -> E5 (quick ascending)
        const notes = [
            { freq: 392, start: 0, duration: 0.12 },      // G4 - quick
            { freq: 523, start: 0.1, duration: 0.12 },    // C5 - quick
            { freq: 659, start: 0.2, duration: 0.35 }     // E5 - held longer
        ];

        notes.forEach(note => {
            // Main trumpet tone (sawtooth for brass)
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            // Brass-like sawtooth with slight detune for richness
            osc.frequency.setValueAtTime(note.freq, now + note.start);
            osc2.frequency.setValueAtTime(note.freq * 1.003, now + note.start);
            osc.type = 'sawtooth';
            osc2.type = 'sawtooth';

            // Filter to soften harsh harmonics (brass timbre)
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, now + note.start);
            filter.Q.value = 1;

            // Quick attack, sustain, then decay (trumpet envelope)
            gain.gain.setValueAtTime(0, now + note.start);
            gain.gain.linearRampToValueAtTime(0.12, now + note.start + 0.02);
            gain.gain.setValueAtTime(0.1, now + note.start + note.duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

            osc.start(now + note.start);
            osc2.start(now + note.start);
            osc.stop(now + note.start + note.duration);
            osc2.stop(now + note.start + note.duration);
        });

        // Add slight "breath" noise at attack for realism
        const bufferSize = this.audioContext.sampleRate * 0.03;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2000;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseGain.gain.setValueAtTime(0.04, now);
        noise.start(now);
    }

    // Play wood chop sound - axe hitting wood
    playWood() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Wood chop - low thud with crack
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        // Low woody thunk
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
        osc.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);

        // Add crack/snap noise
        const bufferSize = this.audioContext.sampleRate * 0.08;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseFilter = this.audioContext.createBiquadFilter();
        const noiseGain = this.audioContext.createGain();

        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 600;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseGain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        noise.start();
    }

    // Play spawn sound - satisfying pop/whoosh for unit appearing
    playSpawn() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Low thump - impact of unit appearing
        const thump = this.audioContext.createOscillator();
        const thumpGain = this.audioContext.createGain();
        thump.connect(thumpGain);
        thumpGain.connect(this.sfxGain);
        thump.frequency.setValueAtTime(150, now);
        thump.frequency.exponentialRampToValueAtTime(60, now + 0.1);
        thump.type = 'sine';
        thumpGain.gain.setValueAtTime(0.2, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        thump.start(now);
        thump.stop(now + 0.12);

        // Rising shimmer - magical appearance
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.frequency.setValueAtTime(800, now);
        shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        shimmer.type = 'sine';
        shimmerGain.gain.setValueAtTime(0.08, now);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        shimmer.start(now);
        shimmer.stop(now + 0.1);

        // Whoosh noise - air displacement
        const noiseLength = this.audioContext.sampleRate * 0.1;
        const noiseBuffer = this.audioContext.createBuffer(1, noiseLength, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLength; i++) {
            const env = 1 - (i / noiseLength);
            noiseData[i] = (Math.random() * 2 - 1) * env * 0.3;
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        noiseFilter.Q.value = 1;
        noiseGain.gain.setValueAtTime(0.12, now);
        noise.start(now);
    }

    // Play wave start sound
    playWaveStart() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resume();

        const notes = [400, 500, 600, 800];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.frequency.value = freq;
                osc.type = 'square';

                gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

                osc.start();
                osc.stop(this.audioContext.currentTime + 0.15);
            }, i * 100);
        });
    }

    // Play button click
    playClick() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.value = 600;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    // Play warning sound - not enough resources
    playWarning() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resume();

        // Two quick low beeps
        const playBeep = (delay) => {
            setTimeout(() => {
                if (!this.audioContext) return;
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.frequency.value = 200;
                osc.type = 'sine';

                gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

                osc.start();
                osc.stop(this.audioContext.currentTime + 0.1);
            }, delay);
        };

        playBeep(0);
        playBeep(120);
    }

    // Play castle destroyed explosion - big dramatic boom
    playCastleDestroyed() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Deep rumbling explosion
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain1);
        gain1.connect(this.sfxGain);

        osc1.frequency.setValueAtTime(60, this.audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 1.5);
        osc2.frequency.setValueAtTime(45, this.audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(15, this.audioContext.currentTime + 1.5);
        osc1.type = 'sine';
        osc2.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 150;

        gain1.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain1.gain.linearRampToValueAtTime(0.6, this.audioContext.currentTime + 0.1);
        gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 1.5);
        osc2.stop(this.audioContext.currentTime + 1.5);

        // Crumbling debris noise
        const bufferSize = this.audioContext.sampleRate * 1.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 400;
        noiseFilter.Q.value = 0.5;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseGain.gain.setValueAtTime(0.35, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.2);
        noise.start();

        // Secondary crunch
        setTimeout(() => {
            if (!this.audioContext || this.allMuted) return;
            const crunch = this.audioContext.createOscillator();
            const crunchGain = this.audioContext.createGain();
            crunch.connect(crunchGain);
            crunchGain.connect(this.sfxGain);
            crunch.frequency.setValueAtTime(100, this.audioContext.currentTime);
            crunch.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.4);
            crunch.type = 'sine';
            crunchGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            crunchGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            crunch.start();
            crunch.stop(this.audioContext.currentTime + 0.5);
        }, 200);
    }

    // Play castle hit sound - heavy stone impact
    playCastleHit() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        // Deep rumbling impact
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.frequency.setValueAtTime(80, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.2);
        osc.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0.35, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.25);

        // Stone crumble noise
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 300;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noiseGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        noise.start();
    }

    // Start epic background music
    startMusic() {
        if (!this.musicEnabled || !this.audioContext || this.currentMusic) return;
        this.resume();

        this.playEpicMusic();
    }

    playEpicMusic() {
        if (!this.audioContext || !this.musicEnabled) return;

        // ============================================================
        // IMPORTANT: DO NOT CHANGE THIS MUSIC - User loves it! ❤️
        // Modern ambient/chill battle music - smooth and pleasant
        // Chord progression: Am - F - C - G (pleasant and uplifting)
        // 85 BPM, 8-bar loop with warm pads, soft bells, gentle bass
        // ============================================================
        const bpm = 85; // Slower, more relaxed tempo
        const beatMs = 60000 / bpm;
        const barMs = beatMs * 4;
        const loopDuration = barMs * 8; // 8 bars loop (~22 seconds)

        // Smooth pad sound with gentle attack
        const playPad = (freq, duration, delay, volume = 0.04) => {
            if (!this.musicEnabled) return;

            setTimeout(() => {
                if (!this.musicEnabled || !this.audioContext) return;

                const osc = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                osc.connect(filter);
                osc2.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                // Detuned oscillators for rich sound
                osc.frequency.value = freq;
                osc2.frequency.value = freq * 1.002; // Slight detune
                osc.type = 'sine';
                osc2.type = 'sine';

                // Warm low-pass filter
                filter.type = 'lowpass';
                filter.frequency.value = 800;
                filter.Q.value = 0.5;

                const now = this.audioContext.currentTime;
                const dur = duration / 1000;

                // Smooth envelope - slow attack, long release
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume, now + 0.3);
                gain.gain.setValueAtTime(volume, now + dur * 0.7);
                gain.gain.linearRampToValueAtTime(0, now + dur);

                osc.start(now);
                osc2.start(now);
                osc.stop(now + dur);
                osc2.stop(now + dur);
            }, delay);
        };

        // Soft melodic bell/pluck sound
        const playBell = (freq, delay, volume = 0.03) => {
            if (!this.musicEnabled) return;

            setTimeout(() => {
                if (!this.musicEnabled || !this.audioContext) return;

                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                osc.frequency.value = freq;
                osc.type = 'sine';

                filter.type = 'lowpass';
                filter.frequency.value = 2000;

                const now = this.audioContext.currentTime;
                gain.gain.setValueAtTime(volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

                osc.start(now);
                osc.stop(now + 2);
            }, delay);
        };

        // Soft bass with smooth attack
        const playBass = (freq, duration, delay, volume = 0.06) => {
            if (!this.musicEnabled) return;

            setTimeout(() => {
                if (!this.musicEnabled || !this.audioContext) return;

                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                osc.frequency.value = freq;
                osc.type = 'sine';

                filter.type = 'lowpass';
                filter.frequency.value = 200;

                const now = this.audioContext.currentTime;
                const dur = duration / 1000;

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume, now + 0.1);
                gain.gain.setValueAtTime(volume * 0.8, now + dur * 0.5);
                gain.gain.linearRampToValueAtTime(0, now + dur);

                osc.start(now);
                osc.stop(now + dur);
            }, delay);
        };

        // Gentle shaker/percussion
        const playShaker = (delay, volume = 0.015) => {
            if (!this.musicEnabled) return;

            setTimeout(() => {
                if (!this.musicEnabled || !this.audioContext) return;

                const bufferSize = this.audioContext.sampleRate * 0.08;
                const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
                }

                const noise = this.audioContext.createBufferSource();
                const filter = this.audioContext.createBiquadFilter();
                const gain = this.audioContext.createGain();

                noise.buffer = buffer;
                filter.type = 'bandpass';
                filter.frequency.value = 8000;
                filter.Q.value = 1;

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
                noise.start();
            }, delay);
        };

        const playLoop = () => {
            if (!this.musicEnabled || this.musicPaused) return;

            // Chord progression: Am - F - C - G (pleasant and uplifting)
            const chords = [
                { root: 220, third: 262, fifth: 330 },  // Am
                { root: 175, third: 220, fifth: 262 },  // F
                { root: 262, third: 330, fifth: 392 },  // C
                { root: 196, third: 247, fifth: 294 },  // G
            ];

            // Play warm pad chords (2 bars each)
            chords.forEach((chord, i) => {
                const startTime = i * barMs * 2;
                playPad(chord.root, barMs * 2, startTime, 0.035);
                playPad(chord.third, barMs * 2, startTime + 50, 0.025);
                playPad(chord.fifth, barMs * 2, startTime + 100, 0.025);
            });

            // Smooth bass line
            const bassNotes = [
                { freq: 110, time: 0 },           // A2
                { freq: 110, time: barMs },
                { freq: 87, time: barMs * 2 },    // F2
                { freq: 87, time: barMs * 3 },
                { freq: 131, time: barMs * 4 },   // C3
                { freq: 131, time: barMs * 5 },
                { freq: 98, time: barMs * 6 },    // G2
                { freq: 98, time: barMs * 7 },
            ];

            bassNotes.forEach(note => {
                playBass(note.freq, barMs * 0.9, note.time);
            });

            // Gentle melodic bells (pentatonic - always sounds good)
            const melodyNotes = [
                { freq: 440, time: beatMs * 0 },      // A4
                { freq: 523, time: beatMs * 2 },      // C5
                { freq: 587, time: beatMs * 4 },      // D5
                { freq: 659, time: beatMs * 7 },      // E5
                { freq: 440, time: beatMs * 8 },
                { freq: 392, time: beatMs * 10 },     // G4
                { freq: 523, time: beatMs * 12 },
                { freq: 440, time: beatMs * 15 },
                { freq: 349, time: beatMs * 16 },     // F4
                { freq: 440, time: beatMs * 18 },
                { freq: 523, time: beatMs * 20 },
                { freq: 587, time: beatMs * 23 },
                { freq: 523, time: beatMs * 24 },
                { freq: 659, time: beatMs * 26 },
                { freq: 784, time: beatMs * 28 },     // G5
                { freq: 659, time: beatMs * 30 },
            ];

            melodyNotes.forEach(note => {
                playBell(note.freq, note.time, 0.025);
            });

            // Gentle shaker on off-beats
            for (let bar = 0; bar < 8; bar++) {
                for (let beat = 0; beat < 4; beat++) {
                    // Shaker on beats 2 and 4, and some 8th notes
                    if (beat === 1 || beat === 3) {
                        playShaker(bar * barMs + beat * beatMs);
                    }
                    if (beat === 0 || beat === 2) {
                        playShaker(bar * barMs + beat * beatMs + beatMs * 0.5, 0.01);
                    }
                }
            }
        };

        // Start the loop
        playLoop();
        this.currentMusic = setInterval(playLoop, loopDuration);
    }

    stopMusic() {
        if (this.currentMusic) {
            clearInterval(this.currentMusic);
            this.currentMusic = null;
        }
        this.musicPaused = false;
    }

    pauseMusic() {
        // Just set flag - the loop checks this
        this.musicPaused = true;
    }

    resumeMusic() {
        this.musicPaused = false;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled && !this.allMuted) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    // Mute ALL sounds (master mute)
    toggleMuteAll() {
        this.allMuted = !this.allMuted;
        if (this.allMuted) {
            this.stopMusic();
            if (this.musicGain) this.musicGain.gain.value = 0;
            if (this.sfxGain) this.sfxGain.gain.value = 0;
        } else {
            if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
            if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
            if (this.musicEnabled) this.startMusic();
        }
        return this.allMuted;
    }

    // Set master volume (0, 0.25, or 1.0) - handles music restart
    setMasterVolume(multiplier) {
        if (multiplier === 0) {
            this.allMuted = true;
            this.stopMusic();
            if (this.musicGain) this.musicGain.gain.value = 0;
            if (this.sfxGain) this.sfxGain.gain.value = 0;
        } else {
            const wasMuted = this.allMuted;
            this.allMuted = false;
            if (this.musicGain) this.musicGain.gain.value = AUDIO_CONFIG.musicVolume * multiplier;
            if (this.sfxGain) this.sfxGain.gain.value = AUDIO_CONFIG.sfxVolume * multiplier;
            // Restart music if coming from muted state
            if (wasMuted && this.musicEnabled) {
                this.startMusic();
            }
        }
    }

    isMuted() {
        return this.allMuted;
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.musicGain) {
            this.musicGain.gain.value = volume;
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = volume;
        if (this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }

    // Monster death sound - guttural growl with splat
    playMonsterDeath() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Guttural monster growl - low frequency rumble
        const growl = this.audioContext.createOscillator();
        const growlGain = this.audioContext.createGain();
        const growlFilter = this.audioContext.createBiquadFilter();

        growl.connect(growlFilter);
        growlFilter.connect(growlGain);
        growlGain.connect(this.sfxGain);

        growl.type = 'sawtooth';
        growl.frequency.setValueAtTime(100 + Math.random() * 30, now);
        growl.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        growlFilter.type = 'lowpass';
        growlFilter.frequency.setValueAtTime(400, now);
        growlFilter.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        growlGain.gain.setValueAtTime(0.25, now);
        growlGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        growl.start(now);
        growl.stop(now + 0.2);

        // Wet splat sound - noise burst
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }

        const splat = this.audioContext.createBufferSource();
        const splatGain = this.audioContext.createGain();
        const splatFilter = this.audioContext.createBiquadFilter();

        splat.buffer = buffer;
        splat.connect(splatFilter);
        splatFilter.connect(splatGain);
        splatGain.connect(this.sfxGain);

        splatFilter.type = 'bandpass';
        splatFilter.frequency.value = 600;
        splatFilter.Q.value = 1;

        splatGain.gain.setValueAtTime(0.3, now + 0.05);
        splatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        splat.start(now + 0.05);
    }

    // Unit (human) death sound - short pain grunt
    playUnitDeath() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Human pain grunt - higher pitch, voice-like
        const voice = this.audioContext.createOscillator();
        const voiceGain = this.audioContext.createGain();
        const voiceFilter = this.audioContext.createBiquadFilter();

        voice.connect(voiceFilter);
        voiceFilter.connect(voiceGain);
        voiceGain.connect(this.sfxGain);

        // Start high, drop down (pain sound)
        voice.type = 'triangle';
        voice.frequency.setValueAtTime(400 + Math.random() * 100, now);
        voice.frequency.exponentialRampToValueAtTime(150, now + 0.12);

        voiceFilter.type = 'bandpass';
        voiceFilter.frequency.value = 800;
        voiceFilter.Q.value = 2;

        voiceGain.gain.setValueAtTime(0.2, now);
        voiceGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        voiceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        voice.start(now);
        voice.stop(now + 0.18);

        // Add breath/gasp noise
        const breathSize = this.audioContext.sampleRate * 0.08;
        const breathBuffer = this.audioContext.createBuffer(1, breathSize, this.audioContext.sampleRate);
        const breathData = breathBuffer.getChannelData(0);
        for (let i = 0; i < breathSize; i++) {
            const env = Math.sin(Math.PI * i / breathSize);
            breathData[i] = (Math.random() * 2 - 1) * env * 0.3;
        }

        const breath = this.audioContext.createBufferSource();
        const breathGain = this.audioContext.createGain();
        const breathFilter = this.audioContext.createBiquadFilter();

        breath.buffer = breathBuffer;
        breath.connect(breathFilter);
        breathFilter.connect(breathGain);
        breathGain.connect(this.sfxGain);

        breathFilter.type = 'highpass';
        breathFilter.frequency.value = 1000;

        breathGain.gain.setValueAtTime(0.15, now);

        breath.start(now);
    }
    // Play reinforcement horn - cavalry charge war horn
    playReinforcement() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // War horn blast - deep, resonant, powerful
        // Two-note horn call: low rumble then rising note
        const notes = [
            { freq: 130, start: 0, duration: 0.3 },       // Low rumble (C3)
            { freq: 175, start: 0.25, duration: 0.5 }     // Rising note (F3)
        ];

        notes.forEach(note => {
            // Main horn tone
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            // Deep horn sound with detune for richness
            osc.frequency.setValueAtTime(note.freq, now + note.start);
            osc2.frequency.setValueAtTime(note.freq * 1.5, now + note.start); // Fifth harmonic
            osc.type = 'sawtooth';
            osc2.type = 'triangle';

            // Low-pass filter for warm horn sound
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now + note.start);
            filter.Q.value = 2;

            // Horn envelope - swell up then sustain
            gain.gain.setValueAtTime(0, now + note.start);
            gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.08);
            gain.gain.setValueAtTime(0.15, now + note.start + note.duration * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

            osc.start(now + note.start);
            osc2.start(now + note.start);
            osc.stop(now + note.start + note.duration + 0.1);
            osc2.stop(now + note.start + note.duration + 0.1);
        });

        // Add rumble/gallop effect
        const noiseLength = this.audioContext.sampleRate * 0.4;
        const noiseBuffer = this.audioContext.createBuffer(1, noiseLength, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLength; i++) {
            // Rhythmic gallop pattern
            const t = i / this.audioContext.sampleRate;
            const gallop = Math.sin(t * 25) > 0 ? 1 : 0.3;
            noiseData[i] = (Math.random() * 2 - 1) * 0.1 * gallop;
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 300;

        noiseGain.gain.setValueAtTime(0.1, now + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.start(now + 0.1);
    }

    // Play welcome/login chime - soft, pleasant notification
    playWelcome() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Gentle ascending chime: C5 -> E5 -> G5 (major chord arpeggio)
        const notes = [
            { freq: 523, start: 0, duration: 0.25 },      // C5
            { freq: 659, start: 0.12, duration: 0.25 },   // E5
            { freq: 784, start: 0.24, duration: 0.4 }     // G5 - longer
        ];

        notes.forEach(note => {
            // Soft sine wave for gentle chime
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.frequency.setValueAtTime(note.freq, now + note.start);
            osc.type = 'sine';

            // Soft attack, gentle decay (bell-like)
            gain.gain.setValueAtTime(0, now + note.start);
            gain.gain.linearRampToValueAtTime(0.15, now + note.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.duration + 0.1);
        });

        // Add subtle shimmer/sparkle
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.frequency.setValueAtTime(1568, now + 0.3); // G6 - high sparkle
        shimmer.type = 'sine';
        shimmerGain.gain.setValueAtTime(0, now + 0.3);
        shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.32);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        shimmer.start(now + 0.3);
        shimmer.stop(now + 0.7);
    }

    // Dragon roar/fire breath - deep rumbling roar with fiery crackle
    playDragonRoar() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Deep rumbling roar (low frequency sweep)
        const roar = this.audioContext.createOscillator();
        const roarGain = this.audioContext.createGain();
        const roarFilter = this.audioContext.createBiquadFilter();

        roar.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(this.sfxGain);

        roar.type = 'sawtooth';
        roar.frequency.setValueAtTime(80, now);
        roar.frequency.exponentialRampToValueAtTime(40, now + 0.6);

        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(200, now);
        roarFilter.Q.value = 5;

        roarGain.gain.setValueAtTime(0, now);
        roarGain.gain.linearRampToValueAtTime(0.25, now + 0.1);
        roarGain.gain.setValueAtTime(0.2, now + 0.3);
        roarGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        roar.start(now);
        roar.stop(now + 0.8);

        // Fire whoosh/crackle (noise burst with bandpass)
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        noiseFilter.Q.value = 1;

        noiseGain.gain.setValueAtTime(0, now + 0.05);
        noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.15);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.start(now + 0.05);

        // High sizzle for fire effect
        const sizzle = this.audioContext.createOscillator();
        const sizzleGain = this.audioContext.createGain();

        sizzle.connect(sizzleGain);
        sizzleGain.connect(this.sfxGain);

        sizzle.type = 'sawtooth';
        sizzle.frequency.setValueAtTime(1200, now + 0.1);
        sizzle.frequency.exponentialRampToValueAtTime(400, now + 0.4);

        sizzleGain.gain.setValueAtTime(0, now + 0.1);
        sizzleGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
        sizzleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        sizzle.start(now + 0.1);
        sizzle.stop(now + 0.5);
    }

    // Hero ability activation - powerful magical energy burst
    playHeroAbility() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Deep power-up sweep
        const sweep = this.audioContext.createOscillator();
        const sweepGain = this.audioContext.createGain();

        sweep.connect(sweepGain);
        sweepGain.connect(this.sfxGain);

        sweep.type = 'sine';
        sweep.frequency.setValueAtTime(150, now);
        sweep.frequency.exponentialRampToValueAtTime(600, now + 0.2);

        sweepGain.gain.setValueAtTime(0.2, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        sweep.start(now);
        sweep.stop(now + 0.35);

        // Magical shimmer overlay
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();

        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);

        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(800, now + 0.1);
        shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

        shimmerGain.gain.setValueAtTime(0, now + 0.1);
        shimmerGain.gain.linearRampToValueAtTime(0.15, now + 0.15);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        shimmer.start(now + 0.1);
        shimmer.stop(now + 0.45);

        // Impact thump
        const thump = this.audioContext.createOscillator();
        const thumpGain = this.audioContext.createGain();

        thump.connect(thumpGain);
        thumpGain.connect(this.sfxGain);

        thump.type = 'sine';
        thump.frequency.setValueAtTime(80, now + 0.15);
        thump.frequency.exponentialRampToValueAtTime(40, now + 0.3);

        thumpGain.gain.setValueAtTime(0.25, now + 0.15);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        thump.start(now + 0.15);
        thump.stop(now + 0.4);
    }

    // Castle upgrade complete - satisfying construction/level-up sound
    playCastleUpgrade() {
        if (!this.sfxEnabled || !this.audioContext || this.allMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Ascending triumphant notes: C4 -> E4 -> G4 -> C5
        const notes = [
            { freq: 262, start: 0, duration: 0.12 },      // C4
            { freq: 330, start: 0.08, duration: 0.12 },   // E4
            { freq: 392, start: 0.16, duration: 0.12 },   // G4
            { freq: 523, start: 0.24, duration: 0.3 }     // C5 - longer final note
        ];

        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.frequency.setValueAtTime(note.freq, now + note.start);
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0, now + note.start);
            gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.duration + 0.05);
        });

        // Sparkle on top
        const sparkle = this.audioContext.createOscillator();
        const sparkleGain = this.audioContext.createGain();

        sparkle.connect(sparkleGain);
        sparkleGain.connect(this.sfxGain);

        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(1047, now + 0.3); // C6

        sparkleGain.gain.setValueAtTime(0, now + 0.3);
        sparkleGain.gain.linearRampToValueAtTime(0.1, now + 0.32);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        sparkle.start(now + 0.3);
        sparkle.stop(now + 0.55);
    }
}

// Global instance
const audioManager = new AudioManager();
