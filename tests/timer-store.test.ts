import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TimerStore, type TimerState } from '../src/timer-store.ts';

const MIN = 60_000;

function setup(rounds = 1) {
	const alarms: Array<{ round: number; final: boolean }> = [];
	const store = new TimerStore((t: TimerState, final) => alarms.push({ round: t.round, final }));
	const timer = store.ensure('k', 'Recipes/Ragu.md', { durationMs: 15 * MIN, rounds, label: '' });
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
