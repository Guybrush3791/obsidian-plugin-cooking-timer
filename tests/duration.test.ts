import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRemaining, parseDuration, parseTimerSpec } from '../src/duration.ts';

test('parseDuration: unit form', () => {
	assert.equal(parseDuration('10m'), 600_000);
	assert.equal(parseDuration('1h30m'), 5_400_000);
	assert.equal(parseDuration('45s'), 45_000);
	assert.equal(parseDuration('1h5m30s'), 3_930_000);
});

test('parseDuration: clock form', () => {
	assert.equal(parseDuration('5:00'), 300_000);
	assert.equal(parseDuration('15:00'), 900_000);
	assert.equal(parseDuration('1:05:00'), 3_900_000);
});

test('parseDuration: rejects invalid or zero', () => {
	for (const bad of ['', '0m', '0:00', '5:60', '1:60:00', 'abc', '10', 'm']) {
		assert.equal(parseDuration(bad), null, bad);
	}
});

test('parseTimerSpec: single round with label', () => {
	assert.deepEqual(parseTimerSpec('timer: 10m Simmer the sauce'), {
		durationMs: 600_000,
		rounds: 1,
		label: 'Simmer the sauce',
	});
});

test('parseTimerSpec: rounds', () => {
	const expected = { durationMs: 900_000, rounds: 3, label: 'Stir' };
	assert.deepEqual(parseTimerSpec('timer: 3x 15:00 Stir'), expected);
	assert.deepEqual(parseTimerSpec('timer: 3x15:00 Stir'), expected);
	assert.deepEqual(parseTimerSpec('Timer: 3 × 15m Stir'), expected);
});

test('parseTimerSpec: ignores other inline code', () => {
	assert.equal(parseTimerSpec('const x = 1'), null);
	assert.equal(parseTimerSpec('timer: soon'), null);
	assert.equal(parseTimerSpec('timer: 0x 5m'), null);
});

test('formatRemaining', () => {
	assert.equal(formatRemaining(600_000), '10:00');
	assert.equal(formatRemaining(599_001), '10:00');
	assert.equal(formatRemaining(3_900_000), '1:05:00');
	assert.equal(formatRemaining(0), '00:00');
	assert.equal(formatRemaining(-5), '00:00');
});
