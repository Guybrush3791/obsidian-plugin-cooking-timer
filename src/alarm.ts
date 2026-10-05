// Synthesized with Web Audio so the plugin ships no sound assets and works on mobile.

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
	if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
	return ctx;
}

/**
 * Create/resume the shared AudioContext. Call from a user gesture (the start click):
 * browsers — iOS/Android webviews especially — keep a context created outside a gesture
 * suspended, which would make the alarm silent when the countdown ends minutes later.
 */
export function unlockAudio(): void {
	const audio = getContext();
	if (audio.state === 'suspended') void audio.resume();
}

/** `final` plays a longer, more insistent pattern than the end-of-round chime. */
export function playAlarm(final: boolean, volume: number): void {
	const audio = getContext();
	if (audio.state === 'suspended') void audio.resume();

	const beeps = final ? 6 : 2;
	const freq = final ? 880 : 660;
	const start = audio.currentTime + 0.05;
	const gain = Math.max(0, Math.min(1, volume));

	for (let i = 0; i < beeps; i++) {
		const t = start + i * 0.3;
		const osc = audio.createOscillator();
		const env = audio.createGain();
		osc.type = 'square';
		osc.frequency.value = freq;
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(gain, t + 0.01);
		env.gain.setValueAtTime(gain, t + 0.18);
		env.gain.linearRampToValueAtTime(0, t + 0.2);
		osc.connect(env).connect(audio.destination);
		osc.start(t);
		osc.stop(t + 0.21);
	}
}

export function closeAudio(): void {
	void ctx?.close();
	ctx = null;
}
