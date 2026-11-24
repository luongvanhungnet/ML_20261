(function (root) {
  const categories = [
    ['Protocol', ['ICMP', 'TCP', 'UDP']],
    ['Packet Type', ['Control', 'Data']],
    ['Traffic Type', ['DNS', 'FTP', 'HTTP']],
    ['Network Segment', ['Segment A', 'Segment B', 'Segment C']],
  ];
  const length = 1 + categories.reduce((sum, [, values]) => sum + values.length + 1, 0);

  function* csvRows(source) {
    let row = [], field = '', quoted = false;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (quoted) {
        if (char !== '"') field += char;
        else if (source[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else if (char === '"' && !field) {
        quoted = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (row.length || field) yield [...row, field];
        if (char === '\r' && source[i + 1] === '\n') i++;
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (quoted) throw new Error('CSV có ô chứa dấu ngoặc kép chưa đóng.');
    if (row.length || field) yield [...row, field];
  }

  function readProfiles(csv) {
    const rows = csvRows(csv.replace(/^\uFEFF/, ''));
    const headers = rows.next().value?.map(value => value.trim()) ?? [];
    const required = ['User Information', 'Packet Length', ...categories.map(([name]) => name)];
    for (const name of required) {
      if (!headers.includes(name)) throw new Error('CSV thiếu cột ' + name + '.');
    }
    const indices = new Map(headers.map((name, index) => [name, index]));
    const groups = new Map();
    let events = 0, discarded = 0, missingPacketLengths = 0;
    for (const row of rows) {
      const column = name => row[indices.get(name)]?.trim() ?? '';
      const name = column('User Information');
      const rawLength = column('Packet Length');
      const bytes = Number(rawLength);
      if (row.length !== headers.length || !name) {
        discarded++;
        continue;
      }
      if (!groups.has(name)) {
        groups.set(name, { name, count: 0, packetLengths: [], features: Array(length).fill(0), types: new Map() });
      }
      const group = groups.get(name);
      group.count++;
      events++;
      if (rawLength && Number.isFinite(bytes) && bytes >= 0) group.packetLengths.push(bytes);
      else missingPacketLengths++;
      // Sum one-hot indicators for each event to obtain user-level category proportions.
      let position = 1;
      for (const [category, values] of categories) {
        const index = values.indexOf(column(category));
        group.features[position + (index < 0 ? values.length : index)]++;
        position += values.length + 1;
      }
      const type = column('Attack Type');
      if (type) group.types.set(type, (group.types.get(type) ?? 0) + 1);
    }
    const profiles = [...groups.values()].map(({ name, count, packetLengths, features, types }) => {
      const ranked = [...types].sort((a, b) => b[1] - a[1]);
      return {
        name, count, packetLengths,
        features: [packetLengths.length ? mean(packetLengths) : null, ...features.slice(1).map(value => value / count)],
        attackType: ranked[0] && ranked[0][1] !== ranked[1]?.[1] ? ranked[0][0] : null,
      };
    });
    return { profiles, events, discarded, missingPacketLengths };
  }

  function randomSource(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
  }

  function splitProfiles(profiles) {
    const shuffled = [...profiles];
    const random = randomSource(42);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const trainEnd = Math.round(shuffled.length * .7);
    const developmentEnd = Math.round(shuffled.length * .8);
    const development = shuffled.slice(0, developmentEnd);
    const folds = Array.from({ length: 5 }, (_, fold) => ({
      train: development.filter((_, index) => index % 5 !== fold),
      validation: development.filter((_, index) => index % 5 === fold),
    }));
    return {
      train: shuffled.slice(0, trainEnd),
      validation: shuffled.slice(trainEnd, developmentEnd),
      test: shuffled.slice(developmentEnd),
      development,
      folds,
    };
  }

  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const yieldToPage = () => new Promise(resolve => setTimeout(resolve, 0));

  function prepare(train, validation, imputation = 'median') {
    const observed = train.flatMap(user => user.packetLengths ?? [user.features[0]]).filter(Number.isFinite);
    let fillValue = null;
    if (observed.length && imputation === 'mean') {
      fillValue = mean(observed);
    } else if (observed.length) {
      observed.sort((a, b) => a - b);
      const upper = Math.floor(observed.length / 2);
      const lower = Math.floor((observed.length - 1) / 2);
      fillValue = (observed[lower] + observed[upper]) / 2;
    }

    function packetMean(user) {
      if (fillValue === null) return user.features[0];
      if (!user.packetLengths) return user.features[0] ?? fillValue;
      if (!user.packetLengths.length || user.packetLengths.length === user.count) return user.features[0] ?? fillValue;
      const observedSum = user.packetLengths.reduce((sum, value) => sum + value, 0);
      return (observedSum + (user.count - user.packetLengths.length) * fillValue) / user.count;
    }
    const trainMeans = train.map(packetMean);
    const center = fillValue === null ? null : mean(trainMeans);
    const scale = center === null ? null : Math.sqrt(mean(trainMeans.map(value => (value - center) ** 2))) || 1;
    function transform(user, bytes) {
      const rest = user.features.slice(1);
      const standardized = center === null ? 0 : (bytes - center) / scale;
      return { ...user, features: [bytes, ...rest], vector: [standardized, ...rest] };
    }
    return [
      train.map((user, i) => transform(user, trainMeans[i])),
      validation.map(user => transform(user, packetMean(user))),
      { imputation, fillValue, center, scale },
    ];
  }

  function distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const delta = a[i] - b[i];
      sum += delta * delta;
    }
    return sum;
  }

  function neighborTree(users) {
    if (!users.length) return null;
    const dimensions = users[0].vector.length;
    const sum = Array(dimensions).fill(0), squareSum = Array(dimensions).fill(0);
    const minimum = Array(dimensions).fill(Infinity), maximum = Array(dimensions).fill(-Infinity);
    for (const { vector } of users) {
      for (let i = 0; i < dimensions; i++) {
        const value = vector[i];
        sum[i] += value;
        squareSum[i] += value * value;
        minimum[i] = Math.min(value, minimum[i]);
        maximum[i] = Math.max(value, maximum[i]);
      }
    }
    let axis = 0, variance = -Infinity;
    for (let i = 0; i < dimensions; i++) {
      const candidate = squareSum[i] - sum[i] ** 2 / users.length;
      if (candidate > variance) { axis = i; variance = candidate; }
    }
    users.sort((a, b) => a.vector[axis] - b.vector[axis]);
    const middle = users.length >> 1;
    return {
      user: users[middle], axis, minimum, maximum,
      left: neighborTree(users.slice(0, middle)),
      right: neighborTree(users.slice(middle + 1)),
    };
  }

  function nearest(tree, vector, k) {
    const neighbors = [];
    function canImprove({ minimum, maximum }, limit) {
      let lowerBound = 0;
      for (let i = 0; i < vector.length; i++) {
        const delta = Math.max(minimum[i] - vector[i], vector[i] - maximum[i], 0);
        lowerBound += delta * delta;
        if (lowerBound >= limit) return false;
      }
      return true;
    }
    function visit(node) {
      if (!node) return;
      if (neighbors.length === k && !canImprove(node, neighbors.at(-1).squared)) return;
      const delta = vector[node.axis] - node.user.vector[node.axis];
      const source = delta < 0 ? node.left : node.right;
      const other = delta < 0 ? node.right : node.left;
      const squared = distance(vector, node.user.vector);
      if (neighbors.length < k || squared < neighbors.at(-1).squared) {
        let index = neighbors.length;
        while (index > 0 && squared < neighbors[index - 1].squared) index--;
        neighbors.splice(index, 0, { user: node.user, squared });
        if (neighbors.length > k) neighbors.pop();
      }
      visit(source);
      if (neighbors.length < k || delta * delta < neighbors.at(-1).squared) visit(other);
    }
    visit(tree);
    return neighbors;
  }

  function vote(neighbors, k) {
    const counts = new Map();
    for (let i = 0; i < k; i++) {
      const label = neighbors[i].user.attackType;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    // Equal vote counts follow the order of the closest contributing neighbor.
    return [...counts].sort((a, b) => b[1] - a[1])[0][0];
  }

  function classificationMetrics(users, predictions, labels) {
    labels = [...new Set([...labels, ...users.map(user => user.attackType).filter(Boolean)])];
    const matrix = labels.map(() => Array(labels.length).fill(0));
    const indices = new Map(labels.map((label, i) => [label, i]));
    let count = 0, correct = 0;
    for (const user of users) {
      if (!user.attackType) continue;
      const actual = indices.get(user.attackType);
      const predicted = indices.get(predictions.get(user.name));
      matrix[actual][predicted]++;
      count++;
      if (actual === predicted) correct++;
    }
    const score = mean(matrix.map((row, i) => {
      const denominator = row.reduce((sum, value) => sum + value, 0)
        + matrix.reduce((sum, values) => sum + values[i], 0);
      return denominator ? 2 * row[i] / denominator : 0;
    }));
    return { score: count ? score : null, accuracy: count ? correct / count : null, count, predictions, matrix, labels };
  }

  async function classify(train, validation, candidates, labels, recordNeighbors = false) {
    const tree = neighborTree(train.filter(user => user.attackType));
    const predictions = candidates.map(() => new Map());
    const explanations = new Map();
    const maxK = Math.max(...candidates);
    for (const [row, user] of validation.entries()) {
      if (row && row % 250 === 0) await yieldToPage();
      const neighbors = nearest(tree, user.vector, maxK);
      candidates.forEach((k, i) => predictions[i].set(user.name, vote(neighbors, k)));
      if (recordNeighbors) {
        explanations.set(user.name, neighbors.map(({ user: neighbor, squared }) => ({
          name: neighbor.name, label: neighbor.attackType, distance: Math.sqrt(squared),
        })));
      }
    }
    return predictions.map((values, i) => {
      const metrics = classificationMetrics(validation, values, labels);
      if (recordNeighbors) {
        metrics.neighbors = new Map();
        for (const [name, neighbors] of explanations) {
          metrics.neighbors.set(name, neighbors.slice(0, candidates[i]));
        }
      }
      return metrics;
    });
  }

  function runnableLabels(splits) {
    const labels = [...new Set(splits.development.map(user => user.attackType).filter(Boolean))].sort();
    if (labels.length < 2) return [];
    const hasAll = users => labels.every(label => users.some(user => user.attackType === label));
    const partitions = [splits.train, splits.validation,
      ...splits.folds.flatMap(fold => [fold.train, fold.validation])];
    return partitions.every(hasAll) ? labels : [];
  }

  function candidateScores(candidates, runs) {
    return candidates.map((k, i) => {
      const folds = runs.map(fold => fold[i].score);
      return { k, folds, score: folds.every(Number.isFinite) ? mean(folds) : null };
    });
  }

  function bestCandidate(scores) {
    return scores.reduce((best, result) => (result.score ?? -Infinity) > (best.score ?? -Infinity) ? result : best);
  }

  function closestCenter(vector, centers) {
    let group = 0, best = distance(vector, centers[0]);
    for (let i = 1; i < centers.length; i++) {
      const squared = distance(vector, centers[i]);
      if (squared < best) { group = i; best = squared; }
    }
    return group;
  }

  function fitClusters(train, k, recordHistory) {
    const random = randomSource(42);
    let centers = [train[Math.floor(random() * train.length)].vector];
    const weights = train.map(() => Infinity);
    while (centers.length < k) {
      let total = 0;
      for (let i = 0; i < train.length; i++) {
        weights[i] = Math.min(weights[i], distance(train[i].vector, centers.at(-1)));
        total += weights[i];
      }
      if (!total) break;
      let remaining = random() * total;
      const index = weights.findIndex(weight => (remaining -= weight) < 0);
      centers.push(train[index < 0 ? weights.findLastIndex(weight => weight > 0) : index].vector);
    }
    const history = recordHistory ? [centers] : undefined;
    let iterations = 0;
    while (iterations < 30) {
      iterations++;
      const sums = centers.map(center => center.map(() => 0));
      const counts = centers.map(() => 0);
      for (const { vector } of train) {
        const group = closestCenter(vector, centers);
        counts[group]++;
        for (let j = 0; j < vector.length; j++) sums[group][j] += vector[j];
      }
      const updated = sums.map((sum, i) => counts[i] ? sum.map(value => value / counts[i]) : centers[i]);
      const stable = centers.every((center, i) => distance(center, updated[i]) < 1e-10);
      centers = updated;
      history?.push(centers);
      if (stable) break;
    }
    return { centers, iterations, history };
  }

  function silhouette(users, assignments, k) {
    const counts = Array(k).fill(0);
    assignments.forEach(group => counts[group]++);
    const populated = counts.filter(Boolean).length;
    if (populated < 2 || populated === users.length) return null;
    return mean(users.map(({ vector }, i) => {
      const own = assignments[i];
      if (counts[own] === 1) return 0;
      const sums = counts.map(() => 0);
      users.forEach((other, j) => {
        if (i !== j) sums[assignments[j]] += Math.sqrt(distance(vector, other.vector));
      });
      const a = sums[own] / (counts[own] - 1);
      const b = Math.min(...sums.map((sum, group) => group === own || !counts[group] ? Infinity : sum / counts[group]));
      return a === 0 && b === 0 ? 0 : (b - a) / Math.max(a, b);
    }));
  }

  function cluster(train, validation, k, recordHistory = false) {
    const { centers, iterations, history } = fitClusters(train, k, recordHistory);
    const assignments = validation.map(user => closestCenter(user.vector, centers));
    const count = Math.min(validation.length, 256);
    const score = silhouette(validation.slice(0, count), assignments.slice(0, count), centers.length);
    const summaries = centers.map(() => ({ count: 0, bytes: 0, measured: 0, events: 0 }));
    const predictions = new Map();
    validation.forEach((user, i) => {
      const group = assignments[i];
      predictions.set(user.name, group + 1);
      summaries[group].count++;
      if (Number.isFinite(user.features[0])) {
        summaries[group].bytes += user.features[0];
        summaries[group].measured++;
      }
      summaries[group].events += user.count;
    });
    const groups = summaries.map(({ count: size, bytes, measured, events }, i) => ({
      id: i + 1, count: size, bytes: measured ? bytes / measured : null, events,
    }));
    const result = { score, count, groups, iterations, predictions };
    if (history) {
      const points = new Map(validation.map(({ name, vector }) => [name, vector]));
      Object.assign(result, {
        history,
        points,
        groupAt: (name, step) => closestCenter(points.get(name), history[step]) + 1,
      });
    }
    return result;
  }

  async function runAnalysis(profiles, progress = () => {}, { imputation = 'median' } = {}) {
    if (profiles.length < 20) throw new Error('Cần ít nhất 20 hồ sơ người dùng để chia dữ liệu và chạy 5-fold.');
    const split = splitProfiles(profiles);
    const stages = [split, ...split.folds, { train: split.development, validation: split.test }];
    const clusterCandidates = [2, 3, 4, 5];
    const clusterRuns = [];
    const clusteringByK = new Map();
    let clustering;
    let clusterHoldout;
    const labels = runnableLabels(split);
    const smallestTrain = Math.min(...stages.map(stage => stage.train.filter(user => user.attackType).length));
    const candidates = [1, 3, 7, 15].filter(k => k <= smallestTrain);
    const runs = [];
    const knnByK = new Map();
    let attackType;
    let holdoutResults;
    let preprocessing;

    for (const [i, stage] of stages.entries()) {
      progress(i);
      await yieldToPage();
      const [train, validation, stats] = prepare(stage.train, stage.validation, imputation);
      if (i === 0) {
        clusterHoldout = clusterCandidates.map(k => cluster(train, validation, k));
      } else if (i <= 5) {
        clusterRuns.push(clusterCandidates.map(k => ({ score: cluster(train, validation, k).score })));
      } else {
        preprocessing = stats;
        const scores = candidateScores(clusterCandidates, clusterRuns);
        for (const [index, result] of scores.entries()) {
          await yieldToPage();
          const test = cluster(train, validation, result.k, true);
          clusteringByK.set(result.k, { ...result, k70: result.k, validation: clusterHoldout[index], test });
        }
        const best = bestCandidate(scores);
        const k70 = 3;
        clustering = { ...clusteringByK.get(best.k), k70, validation: clusteringByK.get(k70).validation };
      }
      if (!labels.length) continue;
      if (i === 0) {
        holdoutResults = await classify(train, validation, candidates, labels);
      } else if (i <= 5) {
        const results = await classify(train, validation, candidates, labels);
        runs.push(results.map(({ score }) => ({ score })));
      } else {
        const scores = candidateScores(candidates, runs);
        const testResults = await classify(train, validation, candidates, labels, true);
        scores.forEach((result, index) => {
          knnByK.set(result.k, { ...result, k70: result.k, validation: holdoutResults[index], test: testResults[index] });
        });
        const k70 = candidates.filter(k => k <= 7).at(-1);
        attackType = { ...knnByK.get(bestCandidate(scores).k), k70, validation: knnByK.get(k70).validation };
      }
    }
    return { split, clustering, clusteringByK, attackType, knnByK, preprocessing };
  }

  const plotFeatures = categories.flatMap(([category, values]) => [...values, 'Other (' + category + ')'])
    .map((label, i) => ({ index: i + 1, label }));
  const api = { readProfiles, prepare, splitProfiles, runAnalysis, plotFeatures };
  if (typeof module !== 'undefined') module.exports = api;
  else root.UserModels = api;
})(globalThis);
