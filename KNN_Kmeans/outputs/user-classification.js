(() => {
  const byId = id => document.getElementById(id);
  const file = byId('file');
  const defaultData = byId('default-data');
  const imputation = byId('imputation');
  const rerun = byId('rerun');
  const status = byId('status');
  const progress = byId('progress');
  const query = byId('query');
  const picker = byId('profile');
  const knnK = byId('knn-k');
  const kmeansK = byId('kmeans-k');
  const comparison = byId('comparison');
  const results = byId('results');
  const profiles = byId('profiles');
  const visualizations = byId('visualizations');
  const canvas = byId('cluster-plot');
  const axis = byId('plot-feature');
  const iteration = byId('iteration');
  const integer = new Intl.NumberFormat('vi');
  const decimal = new Intl.NumberFormat('vi', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const tick = new Intl.NumberFormat('vi', { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat('vi', { style: 'percent', maximumFractionDigits: 1 });
  const score = value => Number.isFinite(value) ? decimal.format(value) : '—';
  const palette = ['#2469a5', '#b05620', '#137768', '#8b53a3', '#a4375c'];
  let analysis, loaded, users, matches, selectedName, plotNames;

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function definition(term, value) {
    const item = element('div');
    item.append(element('dt', term), element('dd', value));
    return item;
  }

  function headingCell(text, scope) {
    const cell = element('th', text);
    cell.scope = scope;
    return cell;
  }

  function addBar(cell, fraction, color) {
    const track = element('div');
    const bar = element('div');
    track.className = 'bar-track';
    track.setAttribute('aria-hidden', 'true');
    bar.className = 'bar';
    bar.style.width = 100 * fraction + '%';
    if (color) bar.style.backgroundColor = color;
    track.append(bar);
    cell.append(track);
  }

  function comparisonRow(name, output, model, metric, fallback = false) {
    const row = element('tr');
    const heading = element('th', name);
    heading.scope = 'row';
    row.append(heading, element('td', output));
    if (!model) {
      const missing = element('td', 'Thiếu dữ liệu có nhãn cho các tập phát triển.');
      missing.colSpan = 4;
      row.append(missing);
      return row;
    }
    const validation = element('td', metric + ' ' + score(model.validation.score));
    validation.append(element('br'), element('small', 'k = ' + model.k70));
    const cv = element('td', metric + ' ' + score(model.score));
    const detail = element('details');
    detail.className = 'folds';
    const list = element('ul');
    model.folds.forEach((value, i) => list.append(element('li', 'Fold ' + (i + 1) + ' · ' + score(value))));
    detail.append(element('summary', 'Điểm từng fold'), list);
    cv.append(detail);
    const test = element('td', metric + ' ' + score(model.test.score));
    const sample = integer.format(model.test.count);
    const testDetail = metric === 'Silhouette'
      ? 'Mẫu chấm điểm: ' + sample + ' hồ sơ'
      : Number.isFinite(model.test.accuracy)
        ? 'Accuracy ' + percent.format(model.test.accuracy) + ' · ' + sample + ' hồ sơ có nhãn'
        : 'Tập test thiếu hồ sơ có nhãn';
    test.append(element('br'), element('small', testDetail));
    const selectedK = fallback ? model.k + ' (mặc định)' : String(model.k);
    row.append(validation, cv, test, element('td', selectedK));
    return row;
  }

  function selectedKnn() {
    return knnK.value ? analysis.knnByK.get(Number(knnK.value)) : analysis.attackType;
  }

  function selectedClustering() {
    return kmeansK.value ? analysis.clusteringByK.get(Number(kmeansK.value)) : analysis.clustering;
  }

  function renderKnnComparison() {
    const model = selectedKnn();
    const row = comparisonRow('KNN', 'Loại tấn công của hồ sơ', model, 'Macro F1');
    if (comparison.firstElementChild) comparison.firstElementChild.replaceWith(row);
    else comparison.append(row);
    byId('knn-k-status').textContent = model
      ? (knnK.value ? 'Chọn thủ công' : 'Tự chọn qua 5-fold CV') + ' · k = ' + model.k
      : 'Thiếu hồ sơ có nhãn loại tấn công.';
    renderMatrix(model);
  }

  function renderMatrix(model) {
    byId('matrix-block').hidden = !model?.test.count;
    const table = byId('matrix');
    table.replaceChildren();
    if (!model?.test.count) return;
    const { matrix, labels } = model.test;
    const head = table.createTHead().insertRow();
    head.append(headingCell('Nhãn', 'col'), ...labels.map(label => headingCell(label, 'col')));
    const body = table.createTBody();
    matrix.forEach((values, i) => {
      const total = values.reduce((sum, value) => sum + value, 0);
      const row = body.insertRow();
      row.append(headingCell(labels[i], 'row'));
      values.forEach(value => {
        const cell = row.insertCell();
        const fraction = total ? value / total : 0;
        cell.textContent = integer.format(value);
        cell.title = total ? percent.format(fraction) + ' trong hàng' : 'Hàng không có mẫu';
        cell.style.backgroundColor = 'rgba(36, 105, 165, ' + .38 * fraction + ')';
      });
    });
  }

  function renderNeighbors(user) {
    const test = selectedKnn()?.test;
    const neighbors = user && test?.neighbors.get(user.name);
    const summary = byId('vote-summary');
    const rows = byId('neighbors');
    byId('neighbor-scroll').hidden = !neighbors;
    rows.replaceChildren();
    if (!neighbors) {
      summary.textContent = test ? 'Chọn hồ sơ để xem phiếu KNN.' : 'Dữ liệu phát triển thiếu nhãn loại tấn công để chạy KNN.';
      return;
    }
    const counts = new Map();
    const longest = neighbors.at(-1).distance;
    for (const { name, label, distance } of neighbors) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
      const row = rows.insertRow();
      const length = element('td', score(distance));
      addBar(length, longest ? distance / longest : 0, palette[test.labels.indexOf(label) % palette.length]);
      row.append(headingCell(name, 'row'), element('td', label), length);
    }
    summary.textContent = [...counts].map(([label, count]) => label + ' · ' + count + ' phiếu').join(' / ');
  }

  function renderPlot() {
    if (!analysis || visualizations.hidden) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    const { history, points, groupAt, iterations, predictions } = selectedClustering().test;
    const step = Number(iteration.value), feature = Number(axis.value);
    const centers = history[step];
    const plotLabel = axis.selectedOptions[0].text;
    const stage = step === 0 ? 'Khởi tạo tâm' : 'Vòng ' + step + ' / ' + iterations;
    byId('iteration-label').textContent = stage;
    iteration.setAttribute('aria-valuetext', stage);

    const selected = points.get(selectedName);
    const shown = plotNames.map(name => [name, points.get(name)]);
    const range = [...shown.map(([, vector]) => vector[0]), ...history.flatMap(group => group.map(center => center[0]))];
    if (selected) range.push(selected[0]);
    const min = Math.min(...range), max = Math.max(...range);
    const padding = (max - min) * .05 || .5;
    const left = 52, top = 20, right = width - 12, bottom = height - 46;
    const x = value => left + (value - min + padding) / (max - min + 2 * padding) * (right - left);
    const y = value => bottom - value * (bottom - top);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#344b66';
    ctx.strokeStyle = '#d8e1ec';
    ctx.textAlign = 'right';
    for (const value of [0, .25, .5, .75, 1]) {
      ctx.beginPath();
      ctx.moveTo(left, y(value));
      ctx.lineTo(right, y(value));
      ctx.stroke();
      ctx.fillText(percent.format(value), left - 6, y(value) + 4);
    }
    ctx.textAlign = 'center';
    for (const fraction of [.05, .275, .5, .725, .95]) {
      const value = min - padding + fraction * (max - min + 2 * padding);
      ctx.fillText(tick.format(value), x(value), bottom + 16);
    }
    ctx.fillText('Độ dài gói trung bình (z-score)', (left + right) / 2, height - 7);
    ctx.textAlign = 'left';
    ctx.fillText('Tỷ lệ ' + plotLabel, left, 13, right - left);

    ctx.globalAlpha = .32;
    for (const [name, vector] of shown) {
      ctx.fillStyle = palette[groupAt(name, step) - 1];
      ctx.beginPath();
      ctx.arc(x(vector[0]), y(vector[feature]), 3, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    centers.forEach((center, i) => {
      const cx = x(center[0]), cy = y(center[feature]);
      ctx.fillStyle = palette[i];
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 8, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    if (selected) {
      const group = groupAt(selectedName, step);
      ctx.fillStyle = palette[group - 1];
      ctx.strokeStyle = '#142339';
      ctx.beginPath();
      ctx.arc(x(selected[0]), y(selected[feature]), 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    byId('plot-selection').textContent = selected
      ? selectedName + ' · Cụm ' + groupAt(selectedName, step) + ' tại mốc đang xem'
        + ' · Cụm cuối ' + predictions.get(selectedName)
      : 'Chọn hồ sơ để đánh dấu trên biểu đồ.';
  }

  function renderPrediction() {
    const user = matches[Number(picker.value)];
    selectedName = user?.name;
    renderNeighbors(user);
    renderPlot();
    const prediction = byId('prediction');
    const observed = byId('observed');
    if (!user) {
      prediction.replaceChildren();
      observed.textContent = '';
      return;
    }
    prediction.replaceChildren(
      definition('KNN · Loại tấn công', selectedKnn()?.test.predictions.get(user.name) ?? 'Chưa xác định'),
      definition('K-means', 'Cụm ' + selectedClustering().test.predictions.get(user.name)),
    );
    const info = [
      integer.format(user.count) + ' bản ghi',
      'Nhãn loại tấn công: ' + (user.attackType ?? 'chưa xác định'),
    ];
    observed.textContent = info.join(' · ');
  }

  function search() {
    const value = query.value.trim().toLocaleLowerCase('vi');
    const found = users.filter(user => user.name.toLocaleLowerCase('vi').includes(value));
    matches = found.slice(0, 50);
    picker.replaceChildren(...matches.map((user, i) => new Option(user.name, String(i))));
    picker.disabled = !matches.length;
    byId('match-count').textContent = found.length
      ? 'Hiển thị ' + integer.format(matches.length) + ' / ' + integer.format(found.length) + ' hồ sơ.'
      : 'Không tìm thấy hồ sơ phù hợp.';
    renderPrediction();
  }

  function renderClustering() {
    const clustering = selectedClustering();
    const fallback = !kmeansK.value && clustering.score === null;
    const comparisonEntry = comparisonRow('K-means', 'Cụm hành vi', clustering, 'Silhouette', fallback);
    if (comparison.rows[1]) comparison.rows[1].replaceWith(comparisonEntry);
    else comparison.append(comparisonEntry);
    const mode = kmeansK.value ? 'Chọn thủ công' : fallback ? 'Giá trị mặc định' : 'Tự chọn qua 5-fold CV';
    const centerCount = clustering.test.groups.length;
    byId('kmeans-k-status').textContent = mode + ' · k = ' + clustering.k
      + (centerCount < clustering.k ? ' · Số tâm tạo được: ' + centerCount : '');
    const rows = clustering.test.groups.map(({ id, count, bytes, events }) => {
      const row = element('tr');
      const total = count / analysis.split.test.length;
      const quantity = element('td', integer.format(count) + ' · ' + percent.format(total));
      quantity.className = 'nowrap';
      addBar(quantity, total, palette[id - 1]);
      row.append(headingCell('Cụm ' + id, 'row'), quantity, element('td', integer.format(events)),
        element('td', bytes === null ? '—' : integer.format(bytes) + ' B'));
      return row;
    });
    byId('cluster-counts').replaceChildren(...rows);
    const legend = [
      ...clustering.test.groups.map(({ id }) => ['Cụm ' + id, '', palette[id - 1]]),
      ['Tâm cụm', 'center'],
      ['Hồ sơ đã chọn', 'selected'],
    ];
    byId('cluster-legend').replaceChildren(...legend.map(([label, type, color]) => {
      const item = element('li');
      const mark = element('span');
      mark.className = 'legend-mark' + (type ? ' ' + type : '');
      mark.setAttribute('aria-hidden', 'true');
      if (color) mark.style.backgroundColor = color;
      item.append(mark, label);
      return item;
    }));
    iteration.max = clustering.test.iterations;
    iteration.value = clustering.test.iterations;
  }

  function renderKOptions(select, models) {
    const previousK = select.value;
    select.replaceChildren(new Option('Tự chọn qua 5-fold CV', ''),
      ...[...models.keys()].map(k => new Option('k = ' + k, String(k))));
    if (models.has(Number(previousK))) select.value = previousK;
    select.disabled = !models.size;
  }

  function render(data) {
    const { split, knnByK, clusteringByK, preprocessing } = analysis;
    byId('split').replaceChildren(
      definition('Tổng hồ sơ', integer.format(data.profiles.length)),
      definition('Train 70%', integer.format(split.train.length)),
      definition('Validation 10%', integer.format(split.validation.length)),
      definition('Test 20%', integer.format(split.test.length)),
    );
    const { fillValue, center, scale } = preprocessing;
    const missing = integer.format(data.missingPacketLengths) + ' bản ghi thiếu độ dài gói hợp lệ.';
    const fitted = fillValue === null
      ? 'Tập phát triển thiếu độ dài gói hợp lệ, nên đặc trưng số có giá trị chuẩn hóa bằng 0.'
      : (preprocessing.imputation === 'mean' ? 'Mean' : 'Median') + ' để điền thiếu: ' + tick.format(fillValue)
        + ' B. Z-score theo tập phát triển: μ = ' + tick.format(center) + ' B, hệ số chia = ' + tick.format(scale) + ' B.';
    byId('preprocessing-summary').textContent = missing + ' ' + fitted;
    renderKOptions(knnK, knnByK);
    renderKOptions(kmeansK, clusteringByK);
    comparison.replaceChildren();
    renderKnnComparison();
    renderClustering();
    plotNames = split.test.slice(0, 1000).map(user => user.name);
    byId('plot-sample').textContent = 'Hiển thị ' + integer.format(plotNames.length)
      + ' / ' + integer.format(split.test.length) + ' hồ sơ test, kèm hồ sơ đang chọn. Kéo thanh trượt để xem các lần cập nhật tâm.';
    users = [...split.test].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    query.value = '';
    results.hidden = profiles.hidden = visualizations.hidden = false;
    search();
  }

  async function analyze(readDataset, message) {
    file.disabled = defaultData.disabled = imputation.disabled = rerun.disabled = true;
    results.hidden = profiles.hidden = visualizations.hidden = true;
    status.classList.remove('error');
    status.textContent = message;
    progress.value = 0;
    progress.hidden = false;
    try {
      const { name, data } = await readDataset();
      analysis = await UserModels.runAnalysis(data.profiles, stage => {
        progress.value = stage;
        status.textContent = stage === 0 ? 'Đang đánh giá trên Validation 10%…'
          : stage <= 5 ? 'Đang chạy cross-validation · fold ' + stage + '/5…'
            : 'Đang fit lại trên 80% và đánh giá Test 20%…';
      }, { imputation: imputation.value });
      loaded = { name, data };
      render(data);
      status.textContent = integer.format(data.events) + ' bản ghi đã xử lý từ ' + name
        + (data.discarded ? ' · ' + integer.format(data.discarded) + ' dòng bị bỏ qua.' : '.');
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
    } finally {
      file.value = '';
      file.disabled = defaultData.disabled = imputation.disabled = false;
      rerun.disabled = !loaded;
      progress.hidden = true;
    }
  }

  function load(name, read) {
    loaded = undefined;
    return analyze(async () => ({ name, data: UserModels.readProfiles(await read()) }), 'Đang đọc ' + name + '…');
  }

  defaultData.hidden = !['http:', 'https:'].includes(location.protocol);
  defaultData.addEventListener('click', () => load('cybersecurity_attacks.csv', async () => {
    const response = await fetch('../dataset/cybersecurity_attacks.csv');
    if (!response.ok) throw new Error('Không tìm thấy dataset qua máy chủ. Hãy chọn tệp CSV trên máy.');
    return response.text();
  }));
  file.addEventListener('change', () => {
    const selected = file.files[0];
    if (selected) load(selected.name, () => selected.text());
  });
  rerun.addEventListener('click', () => {
    if (loaded) analyze(() => loaded, 'Đang áp dụng tiền xử lý…');
  });
  picker.addEventListener('change', renderPrediction);
  query.addEventListener('input', search);
  knnK.addEventListener('change', () => {
    renderKnnComparison();
    renderPrediction();
  });
  kmeansK.addEventListener('change', () => {
    renderClustering();
    renderPrediction();
  });
  axis.replaceChildren(...UserModels.plotFeatures.map(({ label, index }) =>
    new Option(label, String(index), label === 'TCP', label === 'TCP')));
  axis.addEventListener('change', renderPlot);
  iteration.addEventListener('input', renderPlot);
  new ResizeObserver(renderPlot).observe(canvas);
})();
