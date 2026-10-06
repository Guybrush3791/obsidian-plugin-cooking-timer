import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCheckTime, parseDoneSpec, setDoneValue, uncheckAll } from '../src/done.ts';

test('parseDoneSpec: unchecked', () => {
	assert.deepEqual(parseDoneSpec('done: unchecked'), { checked: false, checkedAt: '' });
	assert.deepEqual(parseDoneSpec('Done:Unchecked'), { checked: false, checkedAt: '' });
	assert.deepEqual(parseDoneSpec('done:'), { checked: false, checkedAt: '' });
});

test('parseDoneSpec: checked keeps the written time', () => {
	assert.deepEqual(parseDoneSpec('done: 13.46'), { checked: true, checkedAt: '13.46' });
});

test('parseDoneSpec: rejects other code', () => {
	assert.equal(parseDoneSpec('timer: 10m'), null);
	assert.equal(parseDoneSpec('undone: x'), null);
	assert.equal(parseDoneSpec('done'), null);
});

test('formatCheckTime: zero-padded HH.mm', () => {
	assert.equal(formatCheckTime(new Date(2026, 0, 1, 13, 46)), '13.46');
	assert.equal(formatCheckTime(new Date(2026, 0, 1, 7, 5)), '07.05');
});

const NOTE = [
	'# Recipe',
	'',
	'## Fase 1 ~ do something `done: unchecked`',
	'',
	'Mix `done: unchecked` then rest `timer: 5m` and `done: 09.10`',
].join('\n');

test('setDoneValue: checks a heading span', () => {
	const out = setDoneValue(NOTE, 2, 2, 0, 'done: unchecked', '13.46');
	assert.equal(out?.split('\n')[2], '## Fase 1 ~ do something `done: 13.46`');
	assert.equal(out?.split('\n')[4], NOTE.split('\n')[4]);
});

test('setDoneValue: targets the n-th done span, skipping other code', () => {
	const out = setDoneValue(NOTE, 4, 4, 1, 'done: 09.10', 'unchecked');
	assert.equal(out?.split('\n')[4], 'Mix `done: unchecked` then rest `timer: 5m` and `done: unchecked`');
});

test('setDoneValue: keeps the keyword casing', () => {
	const out = setDoneValue('`Done: unchecked`', 0, 0, 0, 'Done: unchecked', '08.00');
	assert.equal(out, '`Done: 08.00`');
});

test('setDoneValue: refuses when the note changed', () => {
	assert.equal(setDoneValue(NOTE, 2, 2, 0, 'done: 10.00', '13.46'), null);
	assert.equal(setDoneValue(NOTE, 2, 2, 1, 'done: unchecked', '13.46'), null);
	assert.equal(setDoneValue(NOTE, 9, 9, 0, 'done: unchecked', '13.46'), null);
});

test('uncheckAll: unchecks every checked span outside code blocks', () => {
	const source = [
		'## Step `done: 13.46`',
		'Mix `Done: 09.10` and `done: unchecked` `timer: 5m`',
		'```',
		'`done: 10.00`',
		'```',
	].join('\n');
	const { text, count } = uncheckAll(source);
	assert.equal(count, 2);
	assert.deepEqual(text.split('\n'), [
		'## Step `done: unchecked`',
		'Mix `Done: unchecked` and `done: unchecked` `timer: 5m`',
		'```',
		'`done: 10.00`',
		'```',
	]);
});

test('uncheckAll: no change when nothing is checked', () => {
	assert.deepEqual(uncheckAll('`done: unchecked`'), { text: '`done: unchecked`', count: 0 });
});
