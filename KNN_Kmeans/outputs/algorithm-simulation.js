(() => {
  const size = ['n', 'Số mẫu', 24, 8, 100, 1];
  const epochs = ['iterations', 'Số vòng tối đa', 20, 1, 100, 1];
  const rate = ['rate', 'Learning rate', .3, .01, 1, .01];
  const query = ['query', 'Giá trị cần dự đoán (x)', .52, 0, 1, .01];
  const depth = ['depth', 'Độ sâu tối đa', 3, 1, 5, 1];
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const fixed = value => value.toFixed(3);
  const sigmoid = value => 1 / (1 + Math.exp(-value));
  const methods = {
    preprocess: ['Tiền xử lý', [['fill', 'Điền thiếu (0 = mean, 1 = median)', 1, 0, 1, 1], ['scaling', 'Chuẩn hóa (0 = giữ nguyên, 1 = z-score)', 1, 0, 1, 1]], [
      'Tính thống kê từ các giá trị hiện có', 'Điền các giá trị bị thiếu', 'Tính mean và độ lệch chuẩn, rồi biến đổi', 'Mã hóa giao thức bằng one-hot'
    ], 'Thời gian O(n log n) với median do sắp xếp, O(n) với mean. Bộ nhớ O(n).'],
    linear: ['Linear Regression', [epochs, rate], ['Khởi tạo w và b', 'Tính gradient MSE, rồi cập nhật w và b'], 'Thời gian O(Tn) cho T vòng. Trạng thái mô hình gồm w và b.'],
    ridge: ['Ridge Regression', [epochs, rate, ['lambda', 'Hệ số phạt λ', .2, 0, 2, .01]], ['Khởi tạo w và b', 'Tính gradient MSE + λw², rồi cập nhật w và b'], 'Thời gian O(Tn). λ kéo hệ số w về 0 và giữ hệ số chặn b tự do.'],
    mean: ['Mean baseline', [], ['Đọc các giá trị đích', 'Cộng các giá trị và chia cho n', 'Dự đoán bằng giá trị trung bình'], 'Thời gian O(n). Mô hình lưu một giá trị.'],
    cluster: ['KMeans', [['k', 'Số cụm k', 3, 2, 6, 1], epochs], ['Chọn k điểm làm tâm ban đầu', 'Gán mỗi điểm vào tâm gần nhất', 'Cập nhật mỗi tâm bằng trung bình cụm'], 'Thời gian O(Tnk) với 2 đặc trưng. Bộ nhớ O(n + k) cho nhãn và tâm.'],
    logistic: ['Logistic Regression', [epochs, rate], ['Khởi tạo w và b', 'Tính xác suất, cross-entropy và gradient', 'Dùng gradient để cập nhật w và b'], 'Thời gian O(Tn). Ngưỡng dự đoán mặc định là p = 0,5.'],
    knn: ['K-Nearest Neighbors', [['k', 'Số láng giềng k', 5, 1, 8, 1], query, ['queryY', 'Tọa độ truy vấn (y)', .5, 0, 1, .01]], ['Chọn điểm truy vấn', 'Tính khoảng cách và chọn k điểm gần nhất', 'Đếm phiếu và dự đoán lớp'], 'Thời gian O(n log n) mỗi truy vấn do sắp xếp toàn bộ. Bộ nhớ O(n).'],
    regtree: ['Regression Tree', [depth], ['Đưa toàn bộ mẫu vào nút gốc', 'Thử các ngưỡng và chọn mức giảm SSE lớn nhất', 'Tạo nút lá và dự đoán bằng trung bình'], 'Mỗi nút có tối đa m − 1 ngưỡng cho m mẫu. Cài đặt tính lại lỗi cho từng ngưỡng, tối đa O(m²) mỗi nút.'],
    tree: ['Decision Tree', [depth], ['Đưa toàn bộ mẫu vào nút gốc', 'Thử các ngưỡng và chọn mức giảm Gini lớn nhất', 'Tạo nút lá và dùng tỉ lệ lớp B'], 'Mỗi nút có tối đa m − 1 ngưỡng cho m mẫu. Cài đặt tính lại Gini cho từng ngưỡng, tối đa O(m²) mỗi nút.'],
    forest: ['Random Forest', [depth, ['trees', 'Số cây', 5, 1, 15, 1]], ['Khởi tạo tập cây rỗng', 'Lấy mẫu bootstrap và huấn luyện một cây', 'Lấy trung bình xác suất của các cây'], 'Chi phí tăng theo số cây và độ sâu. Mỗi nút thử ngưỡng trên một đặc trưng được chọn ngẫu nhiên.'],
    bayes: ['Gaussian Naive Bayes', [query, ['smoothing', 'Giá trị tối thiểu cộng vào phương sai', .005, .0001, .1, .0001]], ['Chọn giá trị truy vấn', 'Ước lượng prior, mean và phương sai theo lớp', 'Cộng log-likelihood với log-prior, rồi chuẩn hóa'], 'Với một đặc trưng, fit O(n), dự đoán O(C) cho C lớp.'],
    neural: ['Neural Network', [epochs, rate, ['hidden', 'Số neuron ẩn', 4, 1, 12, 1]], ['Khởi tạo trọng số của lớp ẩn và lớp đầu ra', 'Forward pass qua tanh và sigmoid', 'Backpropagate cross-entropy, rồi cập nhật trọng số'], 'Thời gian O(Tnh) cho h neuron ẩn. Mô hình giữ 3h + 1 hệ số.'],
    svm: ['Linear SVM', [epochs, rate, ['penalty', 'Hệ số hinge loss C', 1, .05, 4, .05]], ['Khởi tạo w và b', 'Tính subgradient của ½w² + C × mean(hinge), rồi cập nhật'], 'Thời gian O(Tn). C lớn làm tăng chi phí vi phạm biên.'],
    majority: ['Majority-class baseline', [['balance', 'Tỉ lệ lớp B trước khi gán nhãn', .45, .1, .9, .01]], ['Đọc nhãn huấn luyện', 'Đếm số mẫu theo lớp', 'Luôn dự đoán lớp xuất hiện nhiều nhất'], 'Thời gian O(n). Bộ nhớ O(C) cho C lớp.'],
  };

  function simulate(key, overrides = {}) {
    const [, controls] = methods[key];
    const config = Object.fromEntries([size, ...controls].map(([id, , initial, min, max, step]) => {
      const value = overrides[id];
      if (!Number.isFinite(value)) return [id, initial];
      const bounded = Math.min(max, Math.max(min, value));
      const snapped = min + Math.round((bounded - min) / step) * step;
      return [id, Number(snapped.toFixed(8))];
    }));
    const regression = ['mean', 'linear', 'ridge', 'regtree'].includes(key);
    const spatial = ['cluster', 'knn'].includes(key);
    let seed = 137;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    }
    const points = Array.from({ length: config.n }, (_, i) => {
      const x = random();
      const y = random();
      const noise = (random() - .5) * .29;
      const label = x + .34 * (y - .5) + noise > 1 - (config.balance ?? .48) ? 1 : 0;
      if (key === 'cluster') {
        const [cx, cy] = [[.22, .28], [.73, .31], [.52, .76]][i % 3];
        return { x: cx + (x - .5) * .28, y: cy + (y - .5) * .24 };
      }
      return { x, y: spatial ? y : regression ? .14 + .66 * x + noise : label, label, feature2: y };
    });
    const frames = [];
    let work = 0;
    let elapsed = 0;
    let clock = performance.now();
    function emit(line, detail, view = {}) {
      elapsed += performance.now() - clock;
      const frame = { line, detail, work, elapsed, points, ...view };
      if (view.predict) {
        frame.curve = Array.from({ length: 101 }, (_, i) => [i / 100, view.predict(i / 100)]);
        const errors = points.map(point => {
          const prediction = view.predict(point.x, point.feature2);
          return regression ? (point.y - prediction) ** 2 : Number((prediction >= .5) === (point.label === 1));
        });
        frame.score = regression ? 'MSE ' + fixed(mean(errors)) : 'Accuracy ' + (100 * mean(errors)).toFixed(1) + '%';
        delete frame.predict;
      }
      if (view.centers && view.points) {
        const inertia = view.points.reduce((sum, point) => {
          const center = view.centers[point.group];
          return sum + (point.x - center.x) ** 2 + (point.y - center.y) ** 2;
        }, 0);
        frame.score = 'Inertia ' + fixed(inertia);
      }
      frames.push(frame);
      clock = performance.now();
    }

    if (key === 'cluster') {
      let centers = points.slice(0, config.k).map(({ x, y }) => ({ x, y }));
      emit(0, 'Tâm lấy từ ' + config.k + ' mẫu đầu tiên.', { centers, modelSize: config.k + ' tâm' });
      let previous = [];
      for (let i = 1; i <= config.iterations; i++) {
        let inertia = 0;
        const assigned = points.map(point => {
          let group = 0, best = Infinity;
          centers.forEach((center, index) => {
            const distance = (point.x - center.x) ** 2 + (point.y - center.y) ** 2;
            work++;
            if (distance < best) { best = distance; group = index; }
          });
          inertia += best;
          return { ...point, group };
        });
        emit(1, 'Vòng ' + i + ' · Gán cụm · Inertia ' + fixed(inertia), { points: assigned, centers, modelSize: config.k + ' tâm' });
        const updated = centers.map((center, group) => {
          const members = assigned.filter(point => { work++; return point.group === group; });
          return members.length ? { x: mean(members.map(point => point.x)), y: mean(members.map(point => point.y)) } : center;
        });
        const stable = assigned.every((point, index) => point.group === previous[index]);
        emit(2, 'Vòng ' + i + ' · Dời tâm' + (stable ? ' · Nhãn đã ổn định' : ''), { points: assigned, centers: updated, modelSize: config.k + ' tâm' });
        centers = updated;
        if (stable) break;
        previous = assigned.map(point => point.group);
      }
    } else if (['linear', 'ridge', 'logistic', 'svm', 'neural'].includes(key)) {
      const neural = key === 'neural';
      const logistic = key === 'logistic';
      const hidden = Array.from({ length: config.hidden ?? 0 }, () => [random() - .5, random() - .5, random() - .5]);
      let w = 0, b = 0;
      const raw = x => neural
        ? b + hidden.reduce((sum, [input, bias, output]) => sum + output * Math.tanh(input * x + bias), 0)
        : w * x + b;
      const predict = x => regression ? raw(x) : key === 'svm' ? .5 + raw(x) / 4 : sigmoid(raw(x));
      const modelSize = (neural ? 3 * hidden.length + 1 : 2) + ' hệ số';
      const modelView = (step = {}) => neural
        ? { predict, modelSize, network: { hidden: hidden.map(weights => [...weights]), bias: b } }
        : logistic
          ? { predict, modelSize, logistic: { w, b, ...step }, threshold: w === 0 ? undefined : -b / w }
          : { predict, modelSize };
      emit(0, neural ? 'Khởi tạo ' + hidden.length + ' neuron ẩn.' : 'w = 0, b = 0.', modelView());
      for (let i = 1; i <= config.iterations; i++) {
        const batch = points.map(point => {
          const activations = hidden.map(([input, bias]) => Math.tanh(input * point.x + bias));
          const output = neural
            ? b + activations.reduce((sum, activation, index) => sum + hidden[index][2] * activation, 0)
            : raw(point.x);
          return { ...point, output, activations };
        });
        if (neural) {
          work += points.length * hidden.length;
          const loss = mean(batch.map(({ output, label }) => Math.max(0, output) - label * output + Math.log1p(Math.exp(-Math.abs(output)))));
          emit(1, 'Vòng ' + i + ' · Cross-entropy trước cập nhật ' + fixed(loss), modelView());
        }
        const gradients = hidden.map(() => [0, 0, 0]);
        let dw = 0, db = 0, loss = 0, active = 0;
        for (const { x, y, label, output, activations } of batch) {
          let error;
          if (regression) {
            loss += (output - y) ** 2;
            error = 2 * (output - y);
          } else if (key === 'svm') {
            const sign = 2 * label - 1;
            const hinge = Math.max(0, 1 - sign * output);
            loss += hinge;
            if (hinge > 0) active++;
            error = hinge > 0 ? -config.penalty * sign : 0;
          } else {
            loss += Math.max(0, output) - label * output + Math.log1p(Math.exp(-Math.abs(output)));
            error = sigmoid(output) - label;
          }
          dw += error * x;
          db += error;
          work++;
          hidden.forEach(([, , outputWeight], index) => {
            const activation = activations[index];
            const delta = error * outputWeight * (1 - activation ** 2);
            gradients[index][0] += delta * x;
            gradients[index][1] += delta;
            gradients[index][2] += error * activation;
            work++;
          });
        }
        const step = config.rate / points.length;
        const objective = loss / points.length;
        const lossText = regression ? fixed(objective + (config.lambda ?? 0) * w ** 2)
          : key === 'svm' ? fixed(.5 * w ** 2 + config.penalty * objective) : fixed(objective);
        const gradient = logistic ? { dw: dw / points.length, db: db / points.length } : undefined;
        const previous = logistic ? { w, b } : undefined;
        if (logistic) {
          const { x, label, output: logit } = batch[0];
          const probability = sigmoid(logit);
          const sample = { x, label, logit, probability, error: probability - label };
          emit(1, 'Vòng ' + i + ' · Tính xác suất và gradient', modelView({ sample, loss: objective, gradient }));
        }
        w -= step * dw + config.rate * (key === 'svm' ? w : 2 * (config.lambda ?? 0) * w);
        b -= step * db;
        hidden.forEach((weights, index) => weights.forEach((weight, j) => {
          weights[j] = weight - step * gradients[index][j];
        }));
        const summary = neural ? 'b đầu ra = ' + fixed(b) + ' · Trọng số neuron 1: ' + hidden[0].map(fixed).join(', ') : 'w = ' + fixed(w) + ' · b = ' + fixed(b);
        if (logistic) {
          emit(2, 'Vòng ' + i + ' · Cập nhật hệ số và vẽ lại đường xác suất',
            modelView({ gradient, previous, rate: config.rate }));
          continue;
        }
        emit(neural ? 2 : 1, 'Vòng ' + i + ' · ' + summary
          + (neural ? '' : ' · Loss trước cập nhật: ' + lossText)
          + (key === 'svm' ? ' · Mẫu vi phạm biên trước cập nhật: ' + active : ''), modelView());
      }
    } else if (['tree', 'regtree', 'forest'].includes(key)) {
      const average = rows => mean(rows.map(row => row.y));
      function impurity(rows) {
        work += rows.length;
        const value = average(rows);
        return regression ? rows.reduce((sum, row) => sum + (row.y - value) ** 2, 0) : rows.length * 2 * value * (1 - value);
      }
      let nodes = 0;
      function fit(rows, level, report) {
        nodes++;
        const value = average(rows);
        const feature = key === 'forest' && random() < .5 ? 'feature2' : 'x';
        const ordered = [...rows].sort((a, b) => a[feature] - b[feature]);
        const initial = impurity(rows);
        let best;
        let loss = initial;
        if (level < config.depth && initial > 0) {
          for (let i = 1; i < ordered.length; i++) {
            if (ordered[i - 1][feature] === ordered[i][feature]) continue;
            const left = ordered.slice(0, i), right = ordered.slice(i);
            const score = impurity(left) + impurity(right);
            if (score < loss - 1e-12) {
              loss = score;
              best = { left, right, threshold: (left.at(-1)[feature] + right[0][feature]) / 2 };
            }
          }
        }
        if (!best) {
          report?.(2, 'Lá ở độ sâu ' + level + ' · ' + rows.length + ' mẫu · giá trị ' + fixed(value), rows);
          return () => value;
        }
        report?.(1, 'Độ sâu ' + level + ' · x ≤ ' + fixed(best.threshold) + ' · Giảm lỗi ' + fixed(initial - loss), rows, best.threshold);
        const { threshold } = best;
        const left = fit(best.left, level + 1, report);
        const right = fit(best.right, level + 1, report);
        return (x, y) => ((feature === 'x' ? x : y) <= threshold ? left : right)(x, y);
      }
      emit(0, key === 'forest' ? 'Chưa có cây trong ensemble.' : 'Nút gốc chứa ' + points.length + ' mẫu.');
      if (key === 'forest') {
        const trees = [];
        for (let i = 1; i <= config.trees; i++) {
          const sample = points.map(() => points[Math.floor(random() * points.length)]);
          trees.push(fit(sample, 0));
          const predict = (x, y = .5) => mean(trees.map(tree => tree(x, y)));
          emit(1, 'Cây ' + i + ' · ' + new Set(sample).size + ' mẫu bootstrap khác nhau · Xác suất trung bình tại x = y = 0,5: ' + fixed(predict(.5)), { predict, modelSize: nodes + ' nút' });
        }
        emit(2, 'Đã gộp xác suất của ' + trees.length + ' cây.', { predict: (x, y = .5) => mean(trees.map(tree => tree(x, y))), modelSize: nodes + ' nút' });
      } else {
        const predict = fit(points, 0, (line, detail, rows, threshold) => {
          const activeRows = new Set(rows);
          emit(line, detail, { points: points.map(point => ({ ...point, active: activeRows.has(point) })), threshold, modelSize: nodes + ' nút' });
        });
        emit(2, 'Cây hoàn chỉnh · dự đoán theo từng vùng.', { predict, modelSize: nodes + ' nút' });
      }
    } else if (key === 'knn') {
      const q = { x: config.query, y: config.queryY };
      const modelSize = points.length + ' mẫu';
      emit(0, 'Điểm truy vấn (' + fixed(q.x) + ', ' + fixed(q.y) + ').', { query: q, modelSize });
      const sorted = points.map((point, index) => {
        work++;
        return { ...point, index, distance: Math.hypot(point.x - q.x, point.y - q.y) };
      }).sort((a, b) => { work++; return a.distance - b.distance; });
      const neighbors = sorted.slice(0, config.k);
      emit(1, 'Đo khoảng cách Euclid đến mọi mẫu và chọn ' + neighbors.length + ' mẫu gần nhất.',
        { query: q, neighbors, modelSize });
      const bVotes = neighbors.reduce((sum, point) => { work++; return sum + point.label; }, 0);
      const aVotes = neighbors.length - bVotes;
      const winner = bVotes > aVotes ? 'B' : 'A';
      emit(2, 'Mỗi láng giềng được chọn bỏ một phiếu cho lớp của mình.',
        { query: q, neighbors, vote: { a: aVotes, b: bVotes, winner }, modelSize,
          score: winner + ' (' + Math.max(aVotes, bVotes) + '/' + neighbors.length + ' phiếu)' });
    } else if (key === 'bayes') {
      emit(0, 'Giá trị truy vấn x = ' + fixed(config.query), { threshold: config.query });
      const stats = [0, 1].map(label => {
        const rows = points.filter(point => { work++; return point.label === label; });
        if (!rows.length) return null;
        const center = mean(rows.map(point => point.x));
        const variance = mean(rows.map(point => (point.x - center) ** 2)) + config.smoothing;
        return { center, variance, prior: rows.length / points.length };
      });
      emit(1, stats.map((s, i) => s ? ['A', 'B'][i] + ': μ ' + fixed(s.center) + ', σ² ' + fixed(s.variance) + ', prior ' + fixed(s.prior) : ['A', 'B'][i] + ': không có mẫu').join(' · '), { threshold: config.query });
      function predict(x) {
        const score = stats.map(s => s ? Math.log(s.prior) - .5 * (Math.log(s.variance) + (x - s.center) ** 2 / s.variance) : -Infinity);
        return sigmoid(score[1] - score[0]);
      }
      const fittedClasses = stats.filter(Boolean).length;
      work += fittedClasses;
      emit(2, 'P(B | x truy vấn) = ' + fixed(predict(config.query)), { threshold: config.query, predict, modelSize: fittedClasses + ' bộ thống kê' });
    } else if (key === 'preprocess') {
      const known = points.filter((_, i) => i % 5 !== 0).map(point => point.x);
      work += points.length;
      if (config.fill) known.sort((a, b) => { work++; return a - b; });
      const middle = Math.floor(known.length / 2);
      const fill = config.fill ? (known[middle] + known[Math.floor((known.length - 1) / 2)]) / 2 : mean(known);
      const table = rows => ({ table: rows.slice(0, 8) });
      const rows = points.map((point, i) => [i + 1, i % 5 === 0 ? null : point.x, i % 2 ? 'UDP' : 'TCP']);
      emit(0, 'Giá trị dùng để điền: ' + fixed(fill), table(rows));
      const filled = rows.map(([id, x, protocol]) => [id, x ?? fill, protocol]);
      work += rows.length;
      emit(1, 'Đã điền ' + (rows.length - known.length) + ' ô.', table(filled));
      const center = config.scaling ? mean(filled.map(row => row[1])) : 0;
      const deviation = config.scaling ? Math.sqrt(mean(filled.map(row => (row[1] - center) ** 2))) || 1 : 1;
      const scaled = config.scaling ? filled.map(([id, x, protocol]) => [id, (x - center) / deviation, protocol]) : filled;
      if (config.scaling) work += 3 * rows.length;
      emit(2, config.scaling ? 'μ = ' + fixed(center) + ' · σ = ' + fixed(deviation) : 'Giữ nguyên thang đo.', table(scaled));
      work += rows.length;
      emit(3, 'Giao thức → [TCP, UDP].', table(scaled.map(([id, x, protocol]) => [id, x, protocol === 'TCP' ? '[1, 0]' : '[0, 1]'])));
    } else {
      emit(0, 'Đã đọc ' + points.length + ' mẫu.');
      const value = mean(points.map(point => point.y));
      work += points.length;
      emit(1, key === 'mean' ? 'Trung bình ' + fixed(value) : 'B: ' + Math.round(value * points.length) + ' / ' + points.length);
      emit(2, key === 'mean' ? 'Dự đoán ' + fixed(value) : 'Luôn dự đoán lớp ' + (value > .5 ? 'B' : 'A'), { predict: () => key === 'mean' ? value : Number(value > .5), modelSize: '1 giá trị' });
    }
    return { frames, config, regression, spatial };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { methods, simulate, size };
  else window.algorithmSimulation = { methods, simulate, size };
})();
