// Type-only on purpose: `node --test` can't resolve the extensionless path at runtime.
import type { TimerSpec } from './duration';

// Step of the −/+ buttons on an adjustable range timer.
export const ADJUST_STEP_MS = 60_000;

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface TimerState {
	key: string;
	sourcePath: string;
	label: string;
	// Chosen round length; adjustable within [minMs, maxMs] while idle, and kept across resets.
	durationMs: number;
	minMs: number;
	maxMs: number;
	rounds: number;
	// 1-based round currently counting down (equals `rounds` once done).
	round: number;
	status: TimerStatus;
	// Remaining time of the current round while idle/paused; ignored while running.
	remainingMs: number;
	// Wall-clock deadline of the current round while running, so late ticks don't drift.
	endsAt: number | null;
}

/** `final` is true when the last round ends; false when a round ends and the next one starts. */
export type AlarmHandler = (timer: TimerState, final: boolean) => void;

type Listener = () => void;

/**
 * Single source of truth for countdown state. Lives on the plugin, not in the DOM:
 * reading mode tears down and rebuilds rendered sections freely (scrolling, switching
 * notes), and widgets re-attach to their timer by key.
 */
export class TimerStore {
	private timers = new Map<string, TimerState>();
	private listeners = new Map<string, Set<Listener>>();
	// Plain field, not a parameter property: `node --test` only strips types, it can't transform.
	private onAlarm: AlarmHandler;

	constructor(onAlarm: AlarmHandler) {
		this.onAlarm = onAlarm;
	}

	ensure(key: string, sourcePath: string, spec: TimerSpec): TimerState {
		let timer = this.timers.get(key);
		if (!timer) {
			timer = {
				key,
				sourcePath,
				label: spec.label,
				durationMs: spec.durationMs,
				minMs: spec.durationMs,
				maxMs: spec.maxMs,
				rounds: spec.rounds,
				round: 1,
				status: 'idle',
				remainingMs: spec.durationMs,
				endsAt: null,
			};
			this.timers.set(key, timer);
		}
		return timer;
	}

	get(key: string): TimerState | undefined {
		return this.timers.get(key);
	}

	remaining(timer: TimerState, now = Date.now()): number {
		return timer.status === 'running' && timer.endsAt !== null
			? Math.max(0, timer.endsAt - now)
			: timer.remainingMs;
	}

	/** Start / pause / resume. On a finished timer this acknowledges and resets it. */
	toggle(key: string, now = Date.now()): void {
		const timer = this.timers.get(key);
		if (!timer) return;
		switch (timer.status) {
			case 'idle':
			case 'paused':
				timer.endsAt = now + timer.remainingMs;
				timer.status = 'running';
				break;
			case 'running':
				timer.remainingMs = this.remaining(timer, now);
				timer.endsAt = null;
				timer.status = 'paused';
				break;
			case 'done':
				this.reset(key);
				return;
		}
		this.emit(key);
	}

	/**
	 * Manually skip to the start of the next round, keeping running/paused status.
	 * No alarm: the user triggered it. No-op on the last round.
	 */
	next(key: string, now = Date.now()): void {
		const timer = this.timers.get(key);
		if (!timer || timer.round >= timer.rounds) return;
		if (timer.status !== 'running' && timer.status !== 'paused') return;
		timer.round++;
		timer.remainingMs = timer.durationMs;
		if (timer.status === 'running') timer.endsAt = now + timer.durationMs;
		this.emit(key);
	}

	/**
	 * Move an idle range timer one step (`direction` +1 / -1) along the grid that starts at
	 * its minimum, clamped to [minMs, maxMs]. Locked once started.
	 */
	adjust(key: string, direction: 1 | -1): void {
		const timer = this.timers.get(key);
		if (!timer || timer.status !== 'idle') return;
		const offset = (timer.durationMs - timer.minMs) / ADJUST_STEP_MS;
		const steps = direction > 0 ? Math.floor(offset) + 1 : Math.ceil(offset) - 1;
		const next = Math.min(timer.maxMs, Math.max(timer.minMs, timer.minMs + steps * ADJUST_STEP_MS));
		if (next === timer.durationMs) return;
		timer.durationMs = next;
		timer.remainingMs = next;
		this.emit(key);
	}

	reset(key: string): void {
		const timer = this.timers.get(key);
		if (!timer) return;
		timer.status = 'idle';
		timer.round = 1;
		timer.remainingMs = timer.durationMs;
		timer.endsAt = null;
		this.emit(key);
	}

	pauseAll(now = Date.now()): void {
		for (const timer of this.timers.values()) {
			if (timer.status === 'running') this.toggle(timer.key, now);
		}
	}

	resetAll(status?: TimerStatus): void {
		for (const timer of this.timers.values()) {
			if (!status || timer.status === status) this.reset(timer.key);
		}
	}

	hasStatus(status: TimerStatus): boolean {
		for (const timer of this.timers.values()) {
			if (timer.status === status) return true;
		}
		return false;
	}

	subscribe(key: string, listener: Listener): () => void {
		let set = this.listeners.get(key);
		if (!set) this.listeners.set(key, (set = new Set()));
		set.add(listener);
		return () => set.delete(listener);
	}

	/**
	 * Driven by the plugin's interval. Advances rounds and finishes timers even when no
	 * widget is mounted. If the app was suspended across several round boundaries, the
	 * rounds are caught up and a single alarm fires for the latest one.
	 */
	tick(now = Date.now()): void {
		for (const timer of this.timers.values()) {
			if (timer.status !== 'running' || timer.endsAt === null) continue;
			if (timer.endsAt > now) {
				this.emit(timer.key);
				continue;
			}

			let final = false;
			while (timer.endsAt !== null && timer.endsAt <= now) {
				if (timer.round < timer.rounds) {
					timer.round++;
					timer.endsAt += timer.durationMs;
				} else {
					final = true;
					timer.status = 'done';
					timer.remainingMs = 0;
					timer.endsAt = null;
				}
			}
			this.emit(timer.key);
			this.onAlarm(timer, final);
		}
	}

	private emit(key: string): void {
		this.listeners.get(key)?.forEach((listener) => listener());
	}
}
