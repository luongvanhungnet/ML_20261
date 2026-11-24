import { test } from 'node:test';
import assert from 'node:assert/strict';
import { methods, simulate } from './algorithm-simulation.js';

test('KMeans assigns and updates in separate steps and honors k', () => {
  const run = simulate('cluster', { k: 4, iterations: 6 });
  assert.equal(run.frames[0].centers.length, 4);
  assert.deepEqual(run.frames.slice(0, 3).map(frame => frame.line), [0, 1, 2]);
  assert.ok(run.frames[1].points.every(point => point.group >= 0 && point.group < 4));
  assert.ok(run.frames[2].work > run.frames[1].work);
  const inertia = frame => Number(frame.score.split(' ')[1]);
  assert.ok(inertia(run.frames[2]) <= inertia(run.frames[1]));
});


test('all methods emit valid snapshots at the upper limit of every control', () => {
  for (const [key, [, controls, code]] of Object.entries(methods)) {
    const run = simulate(key, { n: 100, ...Object.fromEntries(controls.map(([id, , , , max]) => [id, max])) });
    assert.ok(run.frames.length > 1, key);
    let lastWork = 0;
    let lastElapsed = 0;
    for (const frame of run.frames) {
      assert.ok(code[frame.line], key);
      assert.ok(frame.work >= lastWork && frame.elapsed >= lastElapsed, key);
      assert.ok(frame.curve?.every(point => point.every(Number.isFinite)) ?? true, key);
      lastWork = frame.work;
      lastElapsed = frame.elapsed;
    }
  }
});

test('ridge coefficient shrinks when regularization increases', () => {
  const fit = lambda => simulate('ridge', { lambda, iterations: 100, rate: .1 }).frames.at(-1).curve;
  const slope = curve => curve.at(-1)[1] - curve[0][1];
  assert.ok(slope(fit(0)) > slope(fit(1)));
});

test('changing tree depth and KNN neighborhood changes their learned or query output', () => {
  assert.ok(simulate('regtree', { depth: 3 }).frames.length > simulate('regtree', { depth: 1 }).frames.length);
  const neighbors = k => simulate('knn', { k }).frames.at(-1).neighbors.length;
  assert.equal(neighbors(1), 1);
  assert.equal(neighbors(8), 8);
});

test('neural network alternates forward and backward steps', () => {
  const { frames } = simulate('neural', { hidden: 3, iterations: 2 });
  assert.deepEqual(frames.map(frame => frame.line), [0, 1, 2, 1, 2]);
  assert.deepEqual(frames[0].curve, frames[1].curve);
  assert.notDeepEqual(frames[1].curve, frames[2].curve);
});

test('neural frames preserve weights for the network diagram', () => {
  const { frames } = simulate('neural', { hidden: 12, iterations: 2 });
  assert.equal(frames[0].network.hidden.length, 12);
  assert.deepEqual(frames[0].network, frames[1].network);
  assert.notDeepEqual(frames[1].network, frames[2].network);
  for (const { network, curve } of frames) {
    const logit = network.bias + network.hidden.reduce(
      (sum, [input, bias, output]) => sum + output * Math.tanh(input * .5 + bias), 0
    );
    assert.ok(Math.abs(curve[50][1] - 1 / (1 + Math.exp(-logit))) < 1e-12);
  }
});

test('logistic playback shows a forward calculation before applying the batch gradient', () => {
  const { frames } = simulate('logistic', { iterations: 2, rate: .3 });
  assert.deepEqual(frames.map(frame => frame.line), [0, 1, 2, 1, 2]);
  const [initial, forward, update] = frames;
  assert.deepEqual(initial.curve, forward.curve);
  const { sample, loss } = forward.logistic;
  assert.equal(sample.probability, .5);
  assert.equal(sample.error, .5 - sample.label);
  assert.equal(loss, Math.log(2));
  const { dw, db } = update.logistic.gradient;
  const expected = forward.points.reduce((sum, point) => sum + (.5 - point.label) * point.x, 0) / forward.points.length;
  assert.ok(Math.abs(dw - expected) < 1e-12);
  assert.ok(Math.abs(update.logistic.w + .3 * dw) < 1e-12);
  assert.ok(Math.abs(update.logistic.b + .3 * db) < 1e-12);
  assert.notDeepEqual(update.curve, forward.curve);
});

test('KNN ranks the selected neighbors before counting their votes', () => {
  const { frames } = simulate('knn', { k: 4, query: .25, queryY: .75 });
  const [, ranked, result] = frames;
  assert.equal(ranked.neighbors.length, 4);
  assert.deepEqual(ranked.neighbors, result.neighbors);
  const distances = ranked.points.map(point => Math.hypot(point.x - .25, point.y - .75)).sort((a, b) => a - b);
  assert.deepEqual(ranked.neighbors.map(point => point.distance), distances.slice(0, 4));
  assert.equal(ranked.vote, undefined);
  const b = ranked.neighbors.filter(point => point.label === 1).length;
  assert.deepEqual(result.vote, { a: 4 - b, b, winner: b > 2 ? 'B' : 'A' });
});
