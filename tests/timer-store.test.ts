import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TimerStore, type TimerState } from '../src/timer-store.ts';

const MIN = 60_000;

function setup(rounds = 1, minMs = 15 * MIN, maxMs = 15 * MIN) {
	const alarms: Array<{ round: number; final: boolean }> = [];
	const store = new TimerStore((t: TimerState, final) => alarms.push({ round: t.round, final }));
	const spec = { durationMs: 15 * MIN, minMs, maxMs, rounds, label: '' };
	const timer = store.ensure('k', 'Recipes/Ragu.md', spec);
	return { store, timer, alarms };
}

test('start, pause, resume keeps remaining time', () => {
	const { store, timer } = setup();
	store.toggle('k', 0);
	assert.equal(timer.status, 'running');
	store.toggle('k', 5 * MIN);
	assert.equal(timer.status, 'paused');
	assert.equal(store.remaining(timer, 99 * MIN), 10 * MIN);
	store.toggle('k', 20 * MIN);
	assert.equal(store.remaining(timer, 25 * MIN), 5 * MIN);
});

test('single round rings once and finishes', () => {
	const { store, timer, alarms } = setup();
	store.toggle('k', 0);
	store.tick(15 * MIN - 1);
	assert.equal(alarms.length, 0);
	store.tick(15 * MIN);
	assert.equal(timer.status, 'done');
	assert.deepEqual(alarms, [{ round: 1, final: true }]);
});

test('rounds loop from one start and ring at every boundary', () => {
	const { store, timer, alarms } = setup(3);
	store.toggle('k', 0);
	store.tick(15 * MIN);
	assert.equal(timer.round, 2);
	assert.equal(timer.status, 'running');
	assert.equal(store.remaining(timer, 15 * MIN), 15 * MIN);
	store.tick(30 * MIN);
	store.tick(45 * MIN);
	assert.equal(timer.status, 'done');
	assert.deepEqual(alarms, [
		{ round: 2, final: false },
		{ round: 3, final: false },
		{ round: 3, final: true },
	]);
});

test('late tick catches up skipped rounds with a single alarm', () => {
	const { store, timer, alarms } = setup(3);
	store.toggle('k', 0);
	store.tick(31 * MIN);
	assert.equal(timer.round, 3);
	assert.equal(store.remaining(timer, 31 * MIN), 14 * MIN);
	assert.equal(alarms.length, 1);
});

test('clicking a finished timer dismisses and resets it', () => {
	const { store, timer } = setup(2);
	store.toggle('k', 0);
	store.tick(60 * MIN);
	assert.equal(timer.status, 'done');
	store.toggle('k');
	assert.equal(timer.status, 'idle');
	assert.equal(timer.round, 1);
	assert.equal(timer.remainingMs, 15 * MIN);
});

test('next skips to a fresh round without ringing, and stops at the last round', () => {
	const { store, timer, alarms } = setup(3);
	store.toggle('k', 0);
	store.next('k', 5 * MIN);
	assert.equal(timer.round, 2);
	assert.equal(timer.status, 'running');
	assert.equal(store.remaining(timer, 5 * MIN), 15 * MIN);

	store.toggle('k', 6 * MIN);
	store.next('k', 7 * MIN);
	assert.equal(timer.round, 3);
	assert.equal(timer.status, 'paused');
	assert.equal(timer.remainingMs, 15 * MIN);

	store.next('k', 8 * MIN);
	assert.equal(timer.round, 3);
	assert.equal(alarms.length, 0);
});

test('next is ignored while idle', () => {
	const { store, timer } = setup(3);
	store.next('k', 0);
	assert.equal(timer.round, 1);
});

test('adjust starts from the written duration and steps down to the minimum', () => {
	const { store, timer } = setup(1, 12 * MIN);
	assert.equal(timer.durationMs, 15 * MIN);
	store.adjust('k', 1);
	assert.equal(timer.durationMs, 15 * MIN);
	for (let i = 0; i < 5; i++) store.adjust('k', -1);
	assert.equal(timer.durationMs, 12 * MIN);
	assert.equal(store.remaining(timer), 12 * MIN);
	store.adjust('k', 1);
	assert.equal(timer.durationMs, 13 * MIN);
});

test('adjust steps up to the maximum', () => {
	const { store, timer } = setup(1, 15 * MIN, 20 * MIN);
	store.adjust('k', -1);
	assert.equal(timer.durationMs, 15 * MIN);
	for (let i = 0; i < 7; i++) store.adjust('k', 1);
	assert.equal(timer.durationMs, 20 * MIN);
	store.adjust('k', -1);
	assert.equal(timer.durationMs, 19 * MIN);
});

test('adjust keeps whole minutes from the written duration, clamping to an off-grid bound', () => {
	const { store, timer } = setup(1, 13.5 * MIN);
	store.adjust('k', -1);
	assert.equal(timer.durationMs, 14 * MIN);
	store.adjust('k', -1);
	assert.equal(timer.durationMs, 13.5 * MIN);
	store.adjust('k', 1);
	assert.equal(timer.durationMs, 14 * MIN);
});

test('adjust is locked once started, and reset keeps the chosen duration', () => {
	const { store, timer } = setup(2, 15 * MIN, 20 * MIN);
	store.adjust('k', 1);
	store.adjust('k', 1);
	store.toggle('k', 0);
	store.adjust('k', 1);
	assert.equal(timer.durationMs, 17 * MIN);
	store.tick(17 * MIN);
	assert.equal(timer.round, 2);
	assert.equal(store.remaining(timer, 17 * MIN), 17 * MIN);
	store.reset('k');
	assert.equal(timer.durationMs, 17 * MIN);
	assert.equal(timer.remainingMs, 17 * MIN);
});

test('total remaining spans all rounds and stays in step with the round countdown', () => {
	const { store, timer } = setup(3, 15 * MIN, 20 * MIN);
	assert.equal(store.totalRemaining(timer), 45 * MIN);
	store.adjust('k', 1);
	assert.equal(store.totalRemaining(timer), 48 * MIN);
	store.adjust('k', -1);

	store.toggle('k', 0);
	assert.equal(store.totalRemaining(timer, 3 * MIN + 28_000), 41 * MIN + 32_000);
	// A round boundary rings but neither countdown stops.
	store.tick(15 * MIN);
	assert.equal(timer.status, 'running');
	assert.equal(store.totalRemaining(timer, 29 * MIN + 58_000), 15 * MIN + 2_000);
	assert.equal(store.remaining(timer, 29 * MIN + 58_000), 2_000);

	store.toggle('k', 20 * MIN);
	assert.equal(store.totalRemaining(timer, 99 * MIN), 25 * MIN);
	// Skipping a round drops what was left of it from the total.
	store.next('k', 21 * MIN);
	assert.equal(store.totalRemaining(timer), 15 * MIN);

	store.toggle('k', 30 * MIN);
	store.tick(45 * MIN);
	assert.equal(timer.status, 'done');
	assert.equal(store.totalRemaining(timer), 0);
});
