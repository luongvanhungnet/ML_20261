const { test } = require('node:test');
const assert = require('node:assert/strict');

test('CSV profiles combine quoted multiline events and leave tied attack types unlabeled', () => {
  const { readProfiles } = require('./user-models.js');
  const csv = 'User Information,Packet Length,Protocol,Packet Type,Traffic Type,Network Segment,Attack Type,Payload Data\r\n'
    + 'Alice,100,TCP,Data,HTTP,Segment A,DDoS,"line 1\r\nline 2, ""quoted"""\r\n'
    + 'Alice,300,UDP,Data,DNS,Segment B,Malware,plain\r\n';
  const { profiles, events } = readProfiles(csv);
  assert.equal(events, 2);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].features[0], 200);
  assert.equal(profiles[0].attackType, null);
});

test('preprocessing imputes before aggregation and fits numeric statistics only on training users', () => {
  const { readProfiles, prepare } = require('./user-models.js');
  const csv = [
    'User Information,Packet Length,Protocol,Packet Type,Traffic Type,Network Segment',
    'A,100,TCP,Data,HTTP,Segment A',
    'A,200,UDP,Data,HTTP,Segment A',
    'A,NaN,,Data,HTTP,Segment A',
    'B,900,ICMP,Control,DNS,Segment B',
    'C,,UDP,Data,FTP,Segment C',
    'D,10000,TCP,Data,DNS,Segment A',
  ].join('\n');
  const { profiles, events, discarded, missingPacketLengths } = readProfiles(csv);
  assert.deepEqual([events, discarded, missingPacketLengths], [6, 0, 2]);
  const train = profiles.slice(0, 2), heldOut = profiles.slice(2);
  const [fitted, transformed, stats] = prepare(train, heldOut, 'median');
  assert.equal(stats.fillValue, 200);
  assert.equal(fitted[0].features[0], 500 / 3);
  assert.deepEqual(fitted[0].features.slice(1, 5), [0, 1 / 3, 1 / 3, 1 / 3]);
  assert.equal(transformed[0].features[0], 200);
  assert.equal(transformed[1].features[0], 10000);
  assert.deepEqual(fitted.map(user => Math.round(user.vector[0])), [-1, 1]);
  assert.ok(Math.abs(transformed[0].vector[0] - (200 - stats.center) / stats.scale) < 1e-10);
  const [, meanImputed, meanStats] = prepare(train, heldOut, 'mean');
  assert.equal(meanStats.fillValue, 400);
  assert.equal(meanImputed[0].features[0], 400);
  const [, noLength, noLengthStats] = prepare([profiles[2]], [profiles[3]], 'median');
  assert.equal(noLengthStats.fillValue, null);
  assert.equal(noLength[0].vector[0], 0);
});

test('outer 70/10/20 split and five folds keep test users out of development', () => {
  const { splitProfiles } = require('./user-models.js');
  const users = Array.from({ length: 100 }, (_, index) => ({ name: 'User ' + index }));
  const { train, validation, test, folds } = splitProfiles(users);
  assert.deepEqual([train.length, validation.length, test.length], [70, 10, 20]);
  const testUsers = new Set(test);
  assert.equal(new Set([...train, ...validation, ...test]).size, 100);
  assert.equal(folds.length, 5);
  for (const fold of folds) {
    assert.equal(fold.train.length, 64);
    assert.equal(fold.validation.length, 16);
    assert.equal(new Set([...fold.train, ...fold.validation]).size, 80);
    assert.ok([...fold.train, ...fold.validation].every(user => !testUsers.has(user)));
  }
  assert.equal(new Set(folds.flatMap(fold => fold.validation)).size, 80);
});

test('KNN reports its attack-type votes and confusion matrix on held-out users', () => {
  const { readProfiles, runAnalysis } = require('./user-models.js');
  const rows = Array.from({ length: 100 }, (_, index) =>
    [`User ${index}`, index % 2 ? 1400 : 100, 'TCP', 'Data', 'HTTP', 'Segment A', index % 2 ? 'DDoS' : 'Malware', index % 2].join(','));
  const csv = ['User Information,Packet Length,Protocol,Packet Type,Traffic Type,Network Segment,Attack Type,Is Attacker', ...rows].join('\n');
  return runAnalysis(readProfiles(csv).profiles).then(({ attackType, knnByK, split, ...analysis }) => {
    assert.equal('binary' in analysis, false);
    assert.equal(attackType.folds.length, 5);
    assert.equal(attackType.test.score, 1);
    assert.equal(attackType.test.predictions.size, split.test.length);
    assert.deepEqual(attackType.test.labels, ['DDoS', 'Malware']);
    assert.equal(attackType.test.matrix.flat().reduce((sum, count) => sum + count, 0), split.test.length);
    const development = new Set(split.development.map(user => user.name));
    for (const [user, neighbors] of attackType.test.neighbors) {
      assert.equal(neighbors.length, attackType.k);
      assert.ok(neighbors.every(({ name, label, distance }) =>
        development.has(name) && label === attackType.test.predictions.get(user) && distance === 0));
    }
    assert.equal(attackType.test.neighbors.size, split.test.length);
    assert.deepEqual([...knnByK.keys()], [1, 3, 7, 15]);
    const manual = knnByK.get(15);
    assert.equal(manual.k, 15);
    assert.equal(manual.k70, 15);
    assert.equal(manual.folds.length, 5);
    assert.equal(manual.test.neighbors.get(split.test[0].name).length, 15);
    assert.deepEqual(manual.test.matrix, attackType.test.matrix);
  });
});

test('K-means finds groups on held-out data even without classification labels', async () => {
  const { runAnalysis } = require('./user-models.js');
  const users = Array.from({ length: 100 }, (_, i) => ({
    name: 'User ' + i, count: 1, features: [i % 2 ? 1200 : 80, 0],
  }));
  const { clustering, clusteringByK, attackType, split } = await runAnalysis(users);
  assert.equal(attackType, undefined);
  assert.equal(clustering.k, 2);
  assert.deepEqual(clustering.folds, [1, 1, 1, 1, 1]);
  assert.equal(clustering.test.score, 1);
  assert.equal(clustering.test.predictions.size, split.test.length);
  assert.equal(clustering.test.groups.reduce((sum, group) => sum + group.count, 0), split.test.length);
  const { history, points, groupAt, iterations, predictions } = clustering.test;
  assert.equal(history.length, iterations + 1);
  assert.equal(points.size, split.test.length);
  assert.equal(history[0].length, clustering.k);
  for (const user of split.test) {
    assert.equal(groupAt(user.name, iterations), predictions.get(user.name));
  }
  assert.deepEqual([...clusteringByK.keys()], [2, 3, 4, 5]);
  const manual = clusteringByK.get(5);
  assert.equal(manual.k, 5);
  assert.equal(manual.k70, 5);
  assert.equal(manual.folds.length, 5);
  assert.equal(manual.test.history[0].length, 2);
  assert.equal(manual.test.predictions.size, split.test.length);
});
