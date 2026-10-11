(function () {
  'use strict';
  var M = SupermarketModel, V = SupermarketView, state = M.start(M.initial()), timer = null, mode = null, dirty = false, promptId = null;
  var keys = Object.keys(M.LIMITS), $ = function (id) { return document.getElementById(id); };
  function announce(text) { $('announcement').textContent = text; }
  function clearSuccess() { $('prompt-feedback').textContent = ''; $('prompt-feedback').removeAttribute('data-correct'); }
  function controls() {
    var end = M.finished(state), busy = mode !== null;
    $('step').disabled = dirty || end || busy; $('finish').disabled = dirty || end || busy;
    $('play').disabled = dirty || end; $('play').textContent = busy ? 'Pause' : 'Run';
    $('check').disabled = dirty || !promptId || busy;
    document.querySelectorAll('[data-preset]').forEach(function (button) {
      var p = M.preset(button.dataset.preset);
      button.setAttribute('aria-pressed', !dirty && Object.keys(p).every(function (k) { return p[k] === state.params[k]; }) ? 'true' : 'false');
    });
    document.querySelectorAll('[data-prompt]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.prompt === promptId ? 'true' : 'false');
    });
  }
  function pause() { if (timer !== null) clearTimeout(timer); timer = null; mode = null; controls(); }
  function errors(map) {
    keys.concat(['express']).forEach(function (key) {
      $('error-' + key).textContent = map[key] || '';
      if (map[key]) $(key).setAttribute('aria-invalid', 'true'); else $(key).removeAttribute('aria-invalid');
    });
  }
  function syncFields() {
    keys.forEach(function (k) { $(k).value = state.params[k]; }); $('express').checked = state.params.express;
    dirty = false; errors({}); $('draft-status').textContent = '';
  }
  function render() {
    V.render(state); controls();
    var status = state.tick < 0 ? 'Ready, before tick 0. ' : 'Tick ' + state.tick + '. ';
    if (M.finished(state)) status += 'Comparison complete; both stores have drained.';
    else if (state.tick >= state.params.horizon - 1) status += 'Arrivals closed; draining the remaining shoppers.';
    else if (state.tick >= 0) status += 'Arrivals open through tick ' + (state.params.horizon - 1) + '.';
    if (mode) status += mode === 'finish' ? ' Finishing in batches; Pause remains available.' : ' Running.';
    $('run-status').textContent = status;
    var p = state.params;
    $('applied-settings').textContent = 'Applied: seed ' + p.seed + ' · arrivals ' + p.arrival + '% for ' + p.horizon + ' units · searchers ' + p.share + '% · inspect up to ' + p.depth + ' lanes at ' + p.cost + ' units each · express ' + (p.express ? 'on' : 'off') + ' · basket cutoff ' + p.cutoff + '.';
  }
  function reset(p, message) { pause(); state = M.start(p); syncFields(); clearSuccess(); render(); announce(message); }
  function clearPrompt() {
    promptId = null; $('answer-fieldset').hidden = true; $('answers').replaceChildren(); $('prompt-question').textContent = ''; clearSuccess();
  }
  function markDirty() {
    pause(); dirty = true; clearSuccess(); $('draft-status').textContent = 'Unapplied edits. Apply and restart, or Restart to discard these edits.'; controls();
    $('run-status').textContent = 'Paused for unapplied settings; the current comparison is retained.';
  }
  keys.forEach(function (k) { $(k).addEventListener('input', markDirty); }); $('express').addEventListener('change', markDirty);
  $('settings').addEventListener('submit', function (event) {
    event.preventDefault(); pause(); var p = { express: $('express').checked };
    keys.forEach(function (k) { p[k] = $(k).value; }); var map = M.validateParameters(p); errors(map); clearSuccess();
    if (Object.keys(map).length) { dirty = true; controls(); $(Object.keys(map)[0]).focus(); announce('Settings were not applied. Correct the highlighted field; the comparison is retained.'); return; }
    var applied = M.parameters(p), expected = promptId ? M.preset(promptId) : null;
    if (expected && Object.keys(expected).some(function (k) { return applied[k] !== expected[k]; })) clearPrompt();
    reset(applied, 'Settings applied. Both stores restarted with identical shoppers.');
  });
  $('restart').addEventListener('click', function () { reset(state.params, 'Restarted with applied settings; discarded any edits.'); });
  $('defaults').addEventListener('click', function () { clearPrompt(); reset(M.initial(), 'Restored defaults and cleared the guided question.'); });
  $('presets').addEventListener('click', function (event) {
    var button = event.target.closest('[data-preset]'); if (!button) return;
    clearPrompt(); reset(M.preset(button.dataset.preset), 'Loaded ' + button.textContent + '; both stores restarted.');
  });
  $('step').addEventListener('click', function () {
    var hadFocus = document.activeElement === $('step');
    state = M.advance(state); clearSuccess(); render();
    if (hadFocus && M.finished(state)) $('run-status').focus();
    announce('Processed tick ' + state.tick + (M.finished(state) ? '; comparison complete.' : '.'));
  });
  function batch() {
    if (!mode) return;
    var finishing = mode === 'finish', hadFocus = document.activeElement === $('play');
    state = M.advanceMany(state, finishing ? 200 : 10); render();
    if (M.finished(state)) { pause(); render(); if (hadFocus) $('run-status').focus(); announce('Comparison complete. Every admitted shopper has finished; see the results below.'); }
    else timer = setTimeout(batch, finishing ? 0 : 700);
  }
  $('play').addEventListener('click', function () {
    if (mode) { pause(); render(); announce('Paused at tick ' + state.tick + '.'); }
    else { mode = 'run'; clearSuccess(); controls(); render(); timer = setTimeout(batch, 700); announce('Running ten units every 700 milliseconds.'); }
  });
  $('finish').addEventListener('click', function () {
    var hadFocus = document.activeElement === $('finish');
    mode = 'finish'; clearSuccess(); controls(); render();
    if (hadFocus) $('play').focus();
    timer = setTimeout(batch, 0); announce('Finishing the comparison in batches. Pause is available.');
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && mode) { pause(); render(); announce('Paused because the page was hidden.'); } });
  Object.keys(M.PROMPTS).forEach(function (id) {
    var p = M.PROMPTS[id], button = document.createElement('button'); button.type = 'button'; button.textContent = p.title; button.dataset.prompt = id;
    button.addEventListener('click', function () {
      promptId = id; $('answer-fieldset').hidden = false; $('prompt-question').textContent = p.question;
      $('answers').replaceChildren();
      p.options.forEach(function (option) {
        var label = document.createElement('label'), input = document.createElement('input'); label.className = 'answer-label';
        input.type = 'radio'; input.name = 'answer'; input.value = option[0]; input.addEventListener('change', clearSuccess);
        label.append(input, document.createTextNode(option[1])); $('answers').appendChild(label);
      });
      reset(M.preset(id), 'Loaded guided experiment: ' + p.title + '. Finish both stores before checking.');
    }); $('prompts').appendChild(button);
  });
  $('check').addEventListener('click', function () {
    var checked = document.querySelector('input[name="answer"]:checked'), result = M.checkPrompt(promptId, state, checked ? checked.value : '');
    $('prompt-feedback').textContent = result.message; $('prompt-feedback').dataset.correct = result.correct;
  });
  $('history-details').addEventListener('toggle', function () { if (this.open) V.historyTable(state); });
  $('shopper-details').addEventListener('toggle', function () { if (this.open) V.shopperTable(state); });
  syncFields(); render();
})();
