/**
 * Ember — Sound Alerts (Web Audio API, no external deps)
 * Sounds are generated programmatically — no audio files needed.
 */

let _ctx = null;
const getCtx = () => {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Resume if suspended (browser autoplay policy)
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
};

/**
 * Play a sequence of tones.
 * @param {number[]} freqs - Array of frequencies (Hz)
 * @param {number} noteDuration - Duration of each note (s)
 * @param {'sine'|'square'|'triangle'|'sawtooth'} type
 * @param {number} vol - Volume (0–1)
 */
const playSequence = (freqs, noteDuration = 0.12, type = 'sine', vol = 0.22) => {
    try {
        const ctx = getCtx();
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * noteDuration;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration * 0.9);
            osc.start(t);
            osc.stop(t + noteDuration);
        });
    } catch {
        // Fail silently — sounds are non-critical
    }
};

export const sounds = {
    /** New order received — ascending major arpeggio */
    newOrder: () => playSequence([523, 659, 784], 0.13, 'sine', 0.2),

    /** Order ready for serving — two quick pings */
    orderReady: () => playSequence([880, 880], 0.1, 'sine', 0.25),

    /** Payment completed — celebratory 4-note fanfare */
    payment: () => playSequence([523, 659, 784, 1047], 0.1, 'triangle', 0.18),

    /** Urgent alert — double square-wave beep for overdue orders */
    urgentAlert: () => playSequence([440, 330, 440], 0.15, 'square', 0.12),

    /** Soft notification — single gentle ping */
    ping: () => playSequence([698], 0.18, 'sine', 0.15),
};

/** Call this on first user interaction to unlock AudioContext */
export const unlockAudio = () => {
    try { getCtx(); } catch {}
};
