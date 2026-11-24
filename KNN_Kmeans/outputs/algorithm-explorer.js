(() => {
  const { methods, simulate, size } = window.algorithmSimulation;
  const byId = id => document.getElementById(id);
  const method = byId('method');
  const parameters = byId('parameters');
  const slider = byId('step');
  const diagram = byId('diagram');
  const play = byId('play');
  const pseudocode = byId('pseudocode');
  const colors = ['#087d91', '#a83d2a', '#7150ad', '#816000', '#2565ab', '#9c366c'];
  const workUnits = {
    preprocess: 'Đếm lượt xử lý dòng và so sánh khi sắp xếp.',
    cluster: 'Đếm phép tính khoảng cách và kiểm tra thành viên cụm.',
    knn: 'Đếm phép tính khoảng cách, so sánh khi sắp xếp và phiếu.',
    tree: 'Đếm mẫu được dùng trong các phép tính độ thuần nhất nút.',
    regtree: 'Đếm mẫu được dùng trong các phép tính SSE tại nút.',
    forest: 'Đếm mẫu được dùng trong các phép tính độ thuần nhất của các cây.',
    bayes: 'Đếm lượt kiểm tra nhãn và lớp có likelihood được tính.',
    neural: 'Đếm lượt xử lý mẫu, kích hoạt neuron ẩn và cộng dồn gradient của neuron.',
    mean: 'Đếm giá trị đích được dùng để tính trung bình.',
    majority: 'Đếm nhãn được dùng để tìm lớp đa số.',
  };
  const formulas = {
    preprocess: ['fill ← median(known) hoặc mean(known)', 'x ← fill nếu x bị thiếu', 'x ← (x − μ) / σ nếu bật chuẩn hóa', 'protocol ← [isTCP, isUDP]'],
    linear: ['w, b ← 0, 0', 'repeat T: w,b ← w,b − η ∇ mean((wx + b − y)²)'],
    ridge: ['w, b ← 0, 0', 'repeat T: w,b ← w,b − η ∇ (MSE + λw²)'],
    mean: ['y ← training targets', 'm ← sum(y) / n', 'return m'],
    cluster: ['centers ← X[0:k]', 'repeat: label[i] ← argminⱼ distance²(X[i], centers[j])', 'centers[j] ← mean(X where label = j); stop if labels unchanged'],
    logistic: ['w, b ← 0, 0', 'p ← sigmoid(wx + b); dw ← mean((p − y)x); db ← mean(p − y)', 'w ← w − η·dw; b ← b − η·db'],
    knn: ['q ← (qx, qy)', 'd[i] ← √((xᵢ − qx)² + (yᵢ − qy)²); neighbors ← argsort(d)[0:k]', 'return majority(labels[neighbors]); chọn A nếu hòa'],
    regtree: ['fit(X, depth = 0)', 'split ← argmin SSE(left) + SSE(right); recurse', 'if no gain or depth limit: return mean(y)'],
    tree: ['fit(X, depth = 0)', 'split ← argmin weighted_Gini(left, right); recurse', 'if no gain or depth limit: return mean(y)'],
    forest: ['trees ← []', 'repeat B: trees.append(fit(bootstrap(X), random_feature_per_node))', 'return mean(tree.predict(x) for tree in trees)'],
    bayes: ['q ← query feature', 'prior[c], μ[c], σ²[c] ← estimate(X where y = c)', 'return softmax(log prior + log Gaussian(q, μ, σ²))'],
    neural: ['W₁, b₁, W₂ ← random(); b₂ ← 0', 'repeat T: h ← tanh(W₁x + b₁); p ← sigmoid(W₂h + b₂)', 'θ ← θ − η ∇ CE(y,p) via backpropagation'],
    svm: ['w, b ← 0, 0; s ← 2y − 1', 'repeat T: w,b ← w,b − η ∂(½w² + C × mean(max(0, 1 − s·(wx+b))))'],
    majority: ['y ← training labels', 'counts[c] ← count(y = c)', 'return argmax(counts)'],
  };
  let run, cursor, timer, bytes;
  const baselines = new Map();

  for (const [key, [name]] of Object.entries(methods)) method.add(new Option(name, key));

  function stop() {
    clearInterval(timer);
    timer = undefined;
    play.textContent = 'Phát';
  }

  function svgElement(svg, tag, attrs, label) {
    const namespace = svg.namespaceURI;
    const node = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (label) node.textContent = label;
    svg.append(node);
  }

  function networkPlot({ hidden, bias }) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const height = Math.max(160, 64 + hidden.length * 26);
    const middle = height / 2;
    svg.setAttribute('viewBox', '0 0 620 ' + height);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'M?ng n?-ron v?i ' + hidden.length + ' neuron ?n');
    const draw = (tag, attrs, label) => svgElement(svg, tag, attrs, label);
    const label = (x, y, value) => draw('text', { x, y, 'text-anchor': 'middle', 'font-size': 14 }, value);
    const neuronY = index => middle + (index - (hidden.length - 1) / 2) * 26;
    function edge(x1, y1, x2, y2, weight) {
      draw('line', {
        x1, y1, x2, y2, stroke: weight === 0 ? '#8194aa' : weight < 0 ? colors[1] : colors[0],
        'stroke-width': 1 + 3 * Math.min(1, Math.abs(weight)), opacity: .75,
      });
    }
    function node(x, y, value) {
      draw('circle', { cx: x, cy: y, r: 11, fill: '#fff', stroke: '#152c44' });
      label(x, y + 5, value);
    }
    hidden.forEach(([input, , output], index) => {
      edge(90, middle, 310, neuronY(index), input);
      edge(310, neuronY(index), 530, middle, output);
    });
    label(90, 20, 'Đầu vào');
    label(310, 20, 'Lớp ẩn · tanh');
    label(530, 20, 'Đầu ra · sigmoid');
    node(90, middle, 'x');
    hidden.forEach((_, index) => node(310, neuronY(index), String(index + 1)));
    node(530, middle, 'p');
    label(530, middle + 36, 'b = ' + bias.toFixed(3));
    label(310, height - 8, 'Xanh: trọng số dương · Đỏ: trọng số âm');
    return svg;
  }

  function plot(frame) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 620 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Trạng thái mô phỏng. ' + frame.detail);
    const x = value => 46 + 550 * value;
    const curveY = run.regression ? (frame.curve ?? []).map(point => point[1]) : [];
    const bottom = Math.min(0, ...curveY);
    const top = Math.max(1, ...curveY);
    const y = value => 253 - 222 * Math.min(1, Math.max(0, (value - bottom) / (top - bottom)));
    const element = (tag, attrs, label) => svgElement(svg, tag, attrs, label);
    function line(a, b, c, d, stroke, dash = '') {
      element('line', { x1: x(a), y1: y(b), x2: x(c), y2: y(d), stroke, 'stroke-dasharray': dash });
    }
    for (const tick of [0, .25, .5, .75, 1]) {
      const yTick = bottom + tick * (top - bottom);
      line(0, yTick, 1, yTick, '#dce4ed');
      line(tick, bottom, tick, top, '#dce4ed');
      element('text', { x: x(tick), y: 273, 'text-anchor': 'middle', 'font-size': 13 }, String(tick));
      const tickLabel = Math.abs(yTick) > 999 ? yTick.toExponential(1) : String(Number(yTick.toFixed(2)));
      element('text', { x: 37, y: y(yTick) + 4, 'text-anchor': 'end', 'font-size': 12 }, tickLabel);
    }
    element('text', { x: 310, y: 294, 'text-anchor': 'middle', 'font-size': 14 }, 'Đặc trưng x');
    const yLabel = run.spatial ? 'Đặc trưng y' : run.regression ? 'Giá trị đích' : method.value === 'svm' ? 'Điểm SVM quy đổi' : 'Nhãn hoặc xác suất B';
    element('text', { x: 46, y: 20, 'font-size': 14 }, yLabel);
    if (!run.spatial && !run.regression) line(0, .5, 1, .5, '#8194aa', '5 4');
    if (frame.threshold >= 0 && frame.threshold <= 1) {
      line(frame.threshold, bottom, frame.threshold, top, '#ae441d', '5 4');
    }
    const sample = frame.logistic?.sample;
    if (sample) line(sample.x, sample.label, sample.x, sample.probability, '#7150ad', '4 3');
    const ranks = new Map(frame.neighbors?.map((point, index) => [point.index, index + 1]));
    if (frame.neighbors) {
      for (const neighbor of frame.neighbors) line(frame.query.x, frame.query.y, neighbor.x, neighbor.y, '#49637b', '3 3');
    }
    for (const [index, point] of frame.points.entries()) {
      const ink = colors[point.group ?? (run.regression || method.value === 'cluster' ? 0 : point.label)];
      const cy = y(point.y), cx = x(point.x);
      const rank = ranks.get(index);
      const opacity = frame.neighbors ? (rank ? 1 : .22) : point.active === false ? .19 : .79;
      if (method.value !== 'cluster' && !run.regression && point.label === 1) {
        element('rect', { x: cx - 4, y: cy - 4, width: 8, height: 8, fill: ink, opacity });
      } else {
        element('circle', { cx, cy, r: 4, fill: ink, opacity });
      }
      if (rank) {
        element('circle', { cx, cy, r: 7, fill: 'none', stroke: ink, 'stroke-width': 1.5 });
        element('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', 'font-size': 13,
          fill: ink, 'font-weight': 700, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, String(rank));
      }
    }
    for (const center of frame.centers ?? []) {
      element('text', { x: x(center.x), y: y(center.y) + 7, 'text-anchor': 'middle', 'font-size': 25, 'font-weight': 800 }, '×');
    }
    if (frame.query) {
      const { x: qx, y: qy } = frame.query;
      const queryInk = frame.vote ? colors[Number(frame.vote.winner === 'B')] : '#152c44';
      element('circle', { cx: x(qx), cy: y(qy), r: 8, fill: '#fff', stroke: queryInk, 'stroke-width': 2.5 });
      if (method.value === 'knn') {
        element('text', { x: x(qx), y: y(qy) + 4, 'text-anchor': 'middle', 'font-size': 11,
          'font-weight': 700, fill: queryInk }, frame.vote?.winner ?? '?');
      }
    }
    if (frame.curve) {
      element('polyline', { points: frame.curve.map(([a, b]) => x(a) + ',' + y(b)).join(' '), fill: 'none', stroke: '#152c44', 'stroke-width': 2.5 });
    }
    if (sample) {
      element('circle', { cx: x(sample.x), cy: y(sample.probability), r: 5, fill: '#7150ad', stroke: '#fff' });
    }
    return svg;
  }

  function knnDetails({ query, neighbors, vote }) {
    const content = document.createElement('div');
    content.className = 'step-details-panel';
    const heading = document.createElement('h2');
    heading.textContent = vote ? 'Kết quả bỏ phiếu' : neighbors ? 'Láng giềng theo khoảng cách' : 'Điểm cần phân loại';
    content.append(heading);
    const summary = document.createElement('p');
    content.append(summary);
    if (!neighbors) {
      summary.textContent = 'Điểm truy vấn (' + query.x.toFixed(2) + ', ' + query.y.toFixed(2)
        + ') được đánh dấu ?. Bấm Tiến để tìm ' + run.config.k + ' láng giềng gần nhất.';
      return content;
    }
    summary.textContent = vote
      ? 'A: ' + vote.a + ' phiếu · B: ' + vote.b + ' phiếu · Dự đoán lớp ' + vote.winner
        + (vote.a === vote.b ? ' (hòa, chọn A)' : '')
      : 'Các số trên biểu đồ chỉ thứ tự từ gần nhất đến xa nhất trong ' + neighbors.length + ' mẫu được chọn.';
    const list = document.createElement('table');
    const header = list.createTHead().insertRow();
    for (const label of ['Hạng', 'Lớp', 'Khoảng cách']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      header.append(cell);
    }
    const body = list.createTBody();
    neighbors.forEach((neighbor, index) => {
      const row = body.insertRow();
      for (const value of [index + 1, neighbor.label ? '■ B' : '● A', neighbor.distance.toFixed(4)]) {
        row.insertCell().textContent = value;
      }
    });
    content.append(list);
    return content;
  }

  function logisticDetails({ w, b, sample, loss, gradient, previous, rate }, threshold) {
    const content = document.createElement('div');
    content.className = 'step-details-panel';
    const heading = document.createElement('h2');
    heading.textContent = sample ? 'Từ đặc trưng đến xác suất' : previous ? 'Cập nhật hệ số' : 'Khởi tạo mô hình';
    content.append(heading);
    const fmt = value => value.toFixed(4);
    const add = text => {
      const line = document.createElement('p');
      line.textContent = text;
      content.append(line);
    };
    if (sample) {
      add('Mẫu đầu tiên · x = ' + fmt(sample.x) + ' · nhãn y = ' + sample.label);
      add('z = wx + b = ' + fmt(sample.logit) + ' → p = sigmoid(z) = ' + fmt(sample.probability));
      add('Sai số có dấu p − y = ' + fmt(sample.error));
      add('Trên toàn bộ mẫu · Cross-entropy = ' + fmt(loss)
        + ' · dw = ' + fmt(gradient.dw) + ' · db = ' + fmt(gradient.db));
    } else if (previous) {
      add('w mới = ' + fmt(previous.w) + ' − ' + rate + ' × (' + fmt(gradient.dw) + ') ≈ ' + fmt(w));
      add('b mới = ' + fmt(previous.b) + ' − ' + rate + ' × (' + fmt(gradient.db) + ') ≈ ' + fmt(b));
    } else {
      add('w = 0 và b = 0 nên mọi mẫu đều có xác suất p = 0,5.');
    }
    if (threshold >= 0 && threshold <= 1) add('Ranh giới dự đoán · x = −b/w ≈ ' + fmt(threshold));
    return content;
  }

  function table(rows) {
    const node = document.createElement('table');
    const heading = node.createTHead().insertRow();
    for (const name of ['Mẫu', 'Đặc trưng x', 'Giao thức']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = name;
      heading.append(cell);
    }
    const body = node.createTBody();
    for (const row of rows) {
      const item = body.insertRow();
      row.forEach((value, index) => {
        item.insertCell().textContent = index === 1 && typeof value === 'number' ? value.toFixed(3) : value ?? 'Thiếu';
      });
    }
    return node;
  }

  function render(index) {
    cursor = Math.max(0, Math.min(run.frames.length - 1, index));
    const frame = run.frames[cursor];
    slider.value = cursor;
    const position = 'Bước ' + (cursor + 1) + ' / ' + run.frames.length;
    byId('position').textContent = position;
    slider.setAttribute('aria-valuetext', position);
    byId('steps').textContent = (cursor + 1) + ' / ' + run.frames.length;
    byId('elapsed').textContent = frame.elapsed.toFixed(3) + ' ms';
    byId('work').textContent = frame.work.toLocaleString('vi');
    byId('model-size').textContent = frame.modelSize ?? '—';
    byId('memory').textContent = (bytes / 1024).toFixed(1) + ' KiB';
    byId('score').textContent = frame.score ?? '—';
    byId('description').textContent = frame.detail;
    byId('legend').textContent = frame.table ? 'Hiển thị tối đa 8 dòng đầu.'
      : frame.logistic ? '● nhãn A (0) · ■ nhãn B (1) · đường đậm là xác suất lớp B · p ≥ 0,5 dự đoán B'
        + (frame.logistic.sample ? ' · đoạn tím nối nhãn và xác suất của mẫu đầu tiên' : '')
        + (frame.threshold >= 0 && frame.threshold <= 1 ? ' · vạch cam là ranh giới dự đoán' : '')
      : method.value === 'cluster' ? 'Màu biểu thị cụm · × tâm cụm'
      : method.value === 'knn' ? '● lớp A · ■ lớp B · vòng tròn viền đậm là điểm truy vấn'
        + (frame.neighbors ? ' · nét đứt nối điểm truy vấn với các láng giềng được chọn' : '')
      : (run.regression ? '● mẫu hồi quy' : '● lớp A · ■ lớp B')
        + (frame.curve ? ' · đường đậm là dự đoán' : '') + (method.value === 'forest' ? ' tại đặc trưng thứ hai = 0,5' : '');
    const view = frame.table ? table(frame.table) : plot(frame);
    diagram.replaceChildren(...(frame.network ? [networkPlot(frame.network), view] : [view]));
    const details = method.value === 'knn' ? knnDetails(frame)
      : frame.logistic ? logisticDetails(frame.logistic, frame.threshold) : null;
    byId('step-details').replaceChildren(...(details ? [details] : []));
    for (const [i, line] of Array.from(pseudocode.children).entries()) {
      line.classList.toggle('active', i === frame.line);
      if (i === frame.line) line.setAttribute('aria-current', 'step');
      else line.removeAttribute('aria-current');
    }
    byId('reset').disabled = byId('previous').disabled = cursor === 0;
    const end = cursor === run.frames.length - 1;
    byId('next').disabled = byId('finish').disabled = end;
    if (end) stop();
  }

  function startRun() {
    stop();
    const fields = Array.from(parameters.querySelectorAll('input'));
    run = simulate(method.value, Object.fromEntries(fields.map(input => [input.name, input.valueAsNumber])));
    for (const input of fields) input.value = run.config[input.name];
    bytes = new TextEncoder().encode(JSON.stringify(run.frames)).length;
    slider.max = run.frames.length - 1;
    render(0);
    renderComparison();
  }

  function summarize() {
    const last = run.frames.at(-1);
    return {
      config: run.config, steps: run.frames.length, elapsed: last.elapsed,
      work: last.work, modelSize: last.modelSize, score: last.score, bytes,
    };
  }

  function renderComparison() {
    const baseline = baselines.get(method.value);
    const output = byId('comparison-result');
    byId('clear-baseline').disabled = !baseline;
    output.replaceChildren();
    if (!baseline) return;
    const current = summarize();
    if (baseline.config.n !== current.config.n) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = 'Số mẫu khác nhau. Thay đổi số liệu phản ánh cả khác biệt về dữ liệu đầu vào.';
      output.append(note);
    }
    const node = document.createElement('table');
    const heading = node.createTHead().insertRow();
    for (const name of ['Chỉ số', 'Mốc', 'Hiện tại']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = name;
      heading.append(cell);
    }
    const body = node.createTBody();
    const metric = (label, before, after) => {
      const row = body.insertRow();
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = label;
      row.append(name);
      for (const value of [before, after]) row.insertCell().textContent = value ?? '—';
    };
    for (const [id, caption] of [size, ...methods[method.value][1]]) {
      metric(caption, baseline.config[id], current.config[id]);
    }
    metric('Số bước', baseline.steps, current.steps);
    metric('Phép xử lý được đếm', baseline.work, current.work);
    metric('Thời gian (ms)', baseline.elapsed.toFixed(3), current.elapsed.toFixed(3));
    metric('Quy mô mô hình', baseline.modelSize, current.modelSize);
    metric('Lịch sử (KiB)', (baseline.bytes / 1024).toFixed(1), (current.bytes / 1024).toFixed(1));
    metric('Điểm trên mẫu mô phỏng', baseline.score, current.score);
    output.append(node);
  }

  function changeMethod() {
    const [, controls, code, analysis] = methods[method.value];
    parameters.replaceChildren();
    for (const [id, caption, value, min, max, step] of [size, ...controls]) {
      const label = document.createElement('label');
      label.textContent = caption;
      const input = document.createElement('input');
      Object.assign(input, { name: id, type: 'number', value, min, max, step });
      input.addEventListener('change', startRun);
      label.append(input);
      parameters.append(label);
    }
    pseudocode.replaceChildren(...code.map((instruction, index) => {
      const item = document.createElement('li');
      const formula = document.createElement('code');
      formula.textContent = formulas[method.value][index];
      item.append(instruction, formula);
      return item;
    }));
    byId('complexity').textContent = analysis;
    byId('work-unit').textContent = workUnits[method.value] ?? 'Đếm lượt xử lý mẫu để tính gradient.';
    startRun();
  }

  method.addEventListener('change', changeMethod);
  byId('save-baseline').addEventListener('click', () => {
    baselines.set(method.value, summarize());
    renderComparison();
  });
  byId('clear-baseline').addEventListener('click', () => {
    baselines.delete(method.value);
    renderComparison();
  });
  slider.addEventListener('input', () => { stop(); render(Number(slider.value)); });
  byId('reset').addEventListener('click', () => { stop(); render(0); });
  byId('previous').addEventListener('click', () => { stop(); render(cursor - 1); });
  byId('next').addEventListener('click', () => { stop(); render(cursor + 1); });
  byId('finish').addEventListener('click', () => { stop(); render(run.frames.length - 1); });
  play.addEventListener('click', () => {
    if (timer !== undefined) { stop(); return; }
    if (cursor === run.frames.length - 1) render(0);
    play.textContent = 'Tạm dừng';
    timer = setInterval(() => render(cursor + 1), 550);
  });
  changeMethod();
})();
