import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	formatRemaining,
	parseDuration,
	parseDurationRange,
	parseTimerSpec,
} from '../src/duration.ts';

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
		maxMs: 600_000,
		rounds: 1,
		label: 'Simmer the sauce',
	});
});

test('parseTimerSpec: rounds', () => {
	const expected = { durationMs: 900_000, maxMs: 900_000, rounds: 3, label: 'Stir' };
	assert.deepEqual(parseTimerSpec('timer: 3x 15:00 Stir'), expected);
	assert.deepEqual(parseTimerSpec('timer: 3x15:00 Stir'), expected);
	assert.deepEqual(parseTimerSpec('Timer: 3 × 15m Stir'), expected);
});

test('parseDurationRange: single duration and ranges', () => {
	assert.deepEqual(parseDurationRange('10m'), [600_000, 600_000]);
	assert.deepEqual(parseDurationRange('15-20m'), [900_000, 1_200_000]);
	assert.deepEqual(parseDurationRange('15–20m'), [900_000, 1_200_000]);
	assert.deepEqual(parseDurationRange('15m-20m'), [900_000, 1_200_000]);
	assert.deepEqual(parseDurationRange('15:00-20:00'), [900_000, 1_200_000]);
	assert.deepEqual(parseDurationRange('1h-1h30m'), [3_600_000, 5_400_000]);
	assert.deepEqual(parseDurationRange('30-45s'), [30_000, 45_000]);
});

test('parseDurationRange: rejects empty or inverted ranges', () => {
	for (const bad of ['20-15m', '15-15m', '-20m', '15-', '15-20', '15-20-25m', '0-5m']) {
		assert.equal(parseDurationRange(bad), null, bad);
	}
});

test('parseTimerSpec: range with rounds and label', () => {
	assert.deepEqual(parseTimerSpec('timer: 2x 15-20m Ossa'), {
		durationMs: 900_000,
		maxMs: 1_200_000,
		rounds: 2,
		label: 'Ossa',
	});
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
