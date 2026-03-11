/**
 * 理財小達人：老街小老闆的六個月挑戰
 * Game Logic - v2 (no template literals to avoid encoding issues)
 */

// --- Game State ---
var state = {
    player: { class: '', name: '', gender: 'boy', avatarEmoji: '👦' },
    goal: { id: '', name: '', cost: 0, icon: '' },
    stats: { month: 1, wallet: 0, piggyBank: 0, hearts: 0 },
    settings: { allowance: 600, maxMonths: 6, backendUrl: 'https://script.google.com/macros/s/AKfycbyi7HMY9IJITRsx91X5JvEl-8jufm9tMFu4phS26L_zKRJRKTv65cqG2G3sqPeTzUdK/exec' },
    history: [],
    currentMonthData: { strategy: '', savedAmount: 0, events: [], expenses: [], eventQueue: [] },
    currentStep: ''
};

// --- DOM Helpers ---
function el(id) { return document.getElementById(id); }

var UI = {};

// --- Global start function (called by button onclick) ---
function handleStartGame() {
    var cls  = el('student-class').value.trim();
    var name = el('student-name').value.trim();
    var errDiv = el('form-error');

    if (!cls && !name) {
        errDiv.textContent = '⚠️ 請填寫班級和姓名才能開始！';
        errDiv.style.display = 'block';
        return;
    }
    if (!cls) {
        errDiv.textContent = '⚠️ 請填寫你的班級！';
        errDiv.style.display = 'block';
        return;
    }
    if (!name) {
        errDiv.textContent = '⚠️ 請填寫你的姓名！';
        errDiv.style.display = 'block';
        return;
    }

    errDiv.style.display = 'none';
    state.player.class = cls;
    state.player.name  = name;
    switchScreen('goal');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    UI.wallet    = el('wallet-balance');
    UI.piggy     = el('piggy-balance');
    UI.progress  = el('goal-progress');
    UI.amountLeft= el('amount-left');
    UI.month     = el('current-month');
    UI.hearts    = el('heart-count');
    UI.actionPrompt = el('action-prompt');
    UI.nextBtn   = el('next-step-btn');

    // Avatar selection
    var avatarCards = document.querySelectorAll('.avatar-card');
    for (var i = 0; i < avatarCards.length; i++) {
        avatarCards[i].addEventListener('click', function() {
            for (var j = 0; j < avatarCards.length; j++) avatarCards[j].classList.remove('selected');
            this.classList.add('selected');
            state.player.gender      = this.getAttribute('data-gender');
            state.player.avatarEmoji = this.querySelector('.avatar-emoji').textContent;
        });
    }

    // Goal selection
    var goalCards = document.querySelectorAll('.goal-card');
    for (var k = 0; k < goalCards.length; k++) {
        goalCards[k].addEventListener('click', function() {
            for (var m = 0; m < goalCards.length; m++) goalCards[m].classList.remove('selected');
            this.classList.add('selected');
            state.goal.id   = this.getAttribute('data-goal');
            state.goal.cost = parseInt(this.getAttribute('data-cost'));
            state.goal.name = this.querySelector('h3').textContent.replace(/目標 .: /, '');
            state.goal.icon = this.querySelector('.goal-icon').textContent;
            setTimeout(startGame, 600);
        });
    }

    // Strategy: save first card click shows slider
    el('strategy-save-first').addEventListener('click', function() {
        el('save-slider-container').classList.remove('hidden');
    });

    el('save-amount').addEventListener('input', function() {
        el('save-amount-display').textContent = this.value;
    });

    el('confirm-save-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        applyAllowance('save_first', parseInt(el('save-amount').value));
    });

    el('confirm-spend-btn').addEventListener('click', function() {
        applyAllowance('spend_first', 0);
    });

    el('next-step-btn').addEventListener('click', handleNextAction);

    el('alert-ok-btn').addEventListener('click', function() {
        hideModal('alert');
        setTimeout(triggerNextEvent, 400);
    });

    el('finish-month-btn').addEventListener('click', concludeMonth);

    el('restart-btn').addEventListener('click', function() { location.reload(); });
});

// --- Screen Navigation ---
function switchScreen(screenId) {
    var ids = ['start-screen', 'goal-screen', 'game-screen', 'end-screen'];
    for (var i = 0; i < ids.length; i++) {
        var s = el(ids[i]);
        s.classList.remove('active');
        s.classList.add('hidden');
    }
    var target = el(screenId + '-screen');
    target.classList.remove('hidden');
    setTimeout(function() { target.classList.add('active'); }, 50);
}

function showModal(modalId) {
    el('modal-container').classList.remove('hidden');
    var modIds = ['strategy-modal', 'event-modal', 'ledger-modal', 'alert-modal'];
    for (var i = 0; i < modIds.length; i++) {
        el(modIds[i]).classList.add('hidden');
    }
    el(modalId + '-modal').classList.remove('hidden');
}

function hideModal(modalId) {
    el(modalId + '-modal').classList.add('hidden');
    el('modal-container').classList.add('hidden');
}

function showAlert(message) {
    el('alert-msg').textContent = message;
    showModal('alert');
}

// --- Game Core ---
function startGame() {
    el('header-avatar').textContent = state.player.avatarEmoji;
    el('header-name').textContent   = state.player.name;
    el('current-goal-icon').textContent = state.goal.icon;
    el('current-goal-name').textContent = state.goal.name;
    el('target-amount').textContent = state.goal.cost;
    updateDashboard();
    switchScreen('game');
    UI.actionPrompt.textContent = '發零用錢囉！請選擇儲蓄策略。';
    UI.nextBtn.textContent = '領取零用錢 💰';
    state.currentStep = 'allowance';
}

function updateDashboard() {
    UI.wallet.textContent = state.stats.wallet;
    UI.piggy.textContent  = state.stats.piggyBank;
    UI.month.textContent  = state.stats.month;
    UI.hearts.textContent = state.stats.hearts;
    var left = Math.max(0, state.goal.cost - state.stats.piggyBank);
    el('amount-left').textContent = left;
    var perc = Math.min(100, (state.stats.piggyBank / state.goal.cost) * 100);
    UI.progress.style.width = perc + '%';
}

function animateMoneyChange(amount, element, type) {
    var anim = document.createElement('div');
    anim.className = 'money-fly';
    anim.textContent = (amount > 0 ? '+$' : '-$') + Math.abs(amount);
    if (type === 'success') anim.style.color = 'var(--success)';
    var rect = element.getBoundingClientRect();
    anim.style.left = (rect.left + rect.width / 2) + 'px';
    anim.style.top  = rect.top + 'px';
    document.body.appendChild(anim);
    setTimeout(function() { anim.parentNode && anim.parentNode.removeChild(anim); }, 1000);
}

function flyHeart() {
    var heart = document.createElement('div');
    heart.className = 'heart-fly';
    heart.textContent = '❤️';
    heart.style.left = '50%';
    heart.style.top  = '50%';
    var target = document.querySelector('.hearts-display').getBoundingClientRect();
    var tx = target.left - window.innerWidth  / 2;
    var ty = target.top  - window.innerHeight / 2;
    heart.style.setProperty('--tx', tx + 'px');
    heart.style.setProperty('--ty', ty + 'px');
    document.body.appendChild(heart);
    setTimeout(function() {
        state.stats.hearts++;
        updateDashboard();
        heart.parentNode && heart.parentNode.removeChild(heart);
    }, 1500);
}

// --- Step Handlers ---
function handleNextAction() {
    if (state.currentStep === 'allowance') {
        showModal('strategy');
        el('save-amount').value = 200;
        el('save-amount-display').textContent = '200';
        el('save-slider-container').classList.add('hidden');
    } else if (state.currentStep === 'events') {
        triggerNextEvent();
    } else if (state.currentStep === 'ledger') {
        initLedgerGame();
    }
}

function applyAllowance(strategy, savedAmount) {
    hideModal('strategy');
    var allowance = state.settings.allowance;
    state.currentMonthData = {
        strategy: strategy,
        savedAmount: parseInt(savedAmount) || 0,
        events: [],
        expenses: [],
        eventQueue: []
    };

    if (strategy === 'save_first') {
        state.stats.piggyBank += state.currentMonthData.savedAmount;
        state.stats.wallet    += (allowance - state.currentMonthData.savedAmount);
        animateMoneyChange(state.currentMonthData.savedAmount, UI.piggy.parentElement, 'success');
    } else {
        state.stats.wallet += allowance;
        animateMoneyChange(allowance, UI.wallet.parentElement, 'success');
    }

    updateDashboard();
    state.currentStep = 'events';
    UI.actionPrompt.textContent = '在老街逛逛可能會遇到突發事件！';
    UI.nextBtn.textContent = '前進老街 🚶';
    var numEvents = Math.floor(Math.random() * 2) + 2;
    state.currentMonthData.eventQueue = generateEvents(numEvents);
    setTimeout(triggerNextEvent, 800);
}

// --- Events ---
var EventDB = [
    { type: 'need',    title: '學校文具',   desc: '學校通知要買新的直笛，需要 $100 元。',                   cost: 100 },
    { type: 'need',    title: '校外教學',   desc: '這週要去博物館，需要繳校外教學費用 $150 元。',           cost: 150 },
    { type: 'want',    title: '老街扭蛋',   desc: '同學約你去老街新開的扭蛋店，要花 $150 元抽一次嗎？',   cost: 150 },
    { type: 'want',    title: '聯名甜點',   desc: '超商推出最新的聯名款巧克力，只要 $60 元！',             cost: 60  },
    { type: 'want',    title: '手搖飲料',   desc: '天氣好熱，想買一杯珍珠奶茶解渴？只要 $50 元。',        cost: 50  },
    { type: 'charity', title: '受傷流浪貓', desc: '老街的流浪貓受傷了，動物醫院正在募款醫藥費。',         cost: 0   },
    { type: 'charity', title: '街頭藝人',   desc: '有人在表演溜溜球好厲害，你要打賞嗎？',                 cost: 0   }
];

function generateEvents(count) {
    var shuffled = EventDB.slice().sort(function() { return 0.5 - Math.random(); });
    return shuffled.slice(0, count);
}

function triggerNextEvent() {
    if (!state.currentMonthData.eventQueue || state.currentMonthData.eventQueue.length === 0) {
        state.currentStep = 'ledger';
        UI.actionPrompt.textContent = '月底到了，該來記帳囉！';
        UI.nextBtn.textContent = '打開記帳本 📝';
        setTimeout(initLedgerGame, 600);
        return;
    }
    var evt = state.currentMonthData.eventQueue.shift();
    displayEvent(evt);
}

function displayEvent(evt) {
    el('event-title').textContent = evt.title;
    el('event-desc').textContent  = evt.desc;
    var btnContainer = el('event-actions');
    btnContainer.innerHTML = '';

    if (evt.type === 'need') {
        var btn = document.createElement('button');
        btn.className = 'btn btn-danger';
        btn.textContent = '確認扣款 $' + evt.cost;
        btn.onclick = function() { handleExpense(evt.title, evt.cost, 'need', false); };
        btnContainer.appendChild(btn);

    } else if (evt.type === 'want') {
        var btnBuy = document.createElement('button');
        btnBuy.className = 'btn btn-danger';
        btnBuy.textContent = '買！扣 $' + evt.cost;
        btnBuy.onclick = function() { handleExpense(evt.title, evt.cost, 'want', false); };

        var btnPass = document.createElement('button');
        btnPass.className = 'btn btn-secondary';
        btnPass.textContent = '忍住不花錢';
        btnPass.onclick = function() { hideModal('event'); setTimeout(triggerNextEvent, 400); };

        btnContainer.appendChild(btnBuy);
        btnContainer.appendChild(btnPass);

    } else if (evt.type === 'charity') {
        var btn50 = document.createElement('button');
        btn50.className = 'btn success-btn';
        btn50.textContent = '捐 $50';
        btn50.onclick = function() { handleExpense(evt.title, 50, 'charity', true); };

        var btn100 = document.createElement('button');
        btn100.className = 'btn success-btn';
        btn100.textContent = '捐 $100';
        btn100.onclick = function() { handleExpense(evt.title, 100, 'charity', true); };

        var btnSkip = document.createElement('button');
        btnSkip.className = 'btn btn-secondary';
        btnSkip.textContent = '這次先不捐';
        btnSkip.onclick = function() { hideModal('event'); setTimeout(triggerNextEvent, 400); };

        btnContainer.appendChild(btn50);
        btnContainer.appendChild(btn100);
        btnContainer.appendChild(btnSkip);
    }

    showModal('event');
}

function handleExpense(title, cost, type, isCharity) {
    hideModal('event');
    if (state.stats.wallet < cost) {
        state.stats.wallet -= cost;
        state.currentMonthData.expenses.push({ id: Date.now(), title: title, cost: cost, type: type });
        updateDashboard();
        animateMoneyChange(-cost, UI.wallet.parentElement, 'danger');
        showAlert('餘額不足！你欠了別人 $' + Math.abs(state.stats.wallet) + '。下個月的零用錢會先扣除這筆欠款哦。');
        return;
    }

    state.stats.wallet -= cost;
    state.currentMonthData.expenses.push({ id: Date.now(), title: title, cost: cost, type: type });
    updateDashboard();
    animateMoneyChange(-cost, UI.wallet.parentElement, 'danger');

    if (isCharity) {
        flyHeart();
        setTimeout(triggerNextEvent, 1600);
        return;
    }
    setTimeout(triggerNextEvent, 400);
}

// --- Ledger Mini-game ---
var draggedItem = null;

function initLedgerGame() {
    showModal('ledger');
    el('finish-month-btn').classList.add('hidden');

    var totalSpent = 0;
    for (var i = 0; i < state.currentMonthData.expenses.length; i++) {
        totalSpent += state.currentMonthData.expenses[i].cost;
    }
    el('month-expense').textContent = totalSpent;

    var toSave = 0;
    if (state.currentMonthData.strategy === 'save_first') {
        toSave = state.currentMonthData.savedAmount;
    } else {
        if (state.stats.wallet > 0) {
            toSave = state.stats.wallet;
            state.stats.piggyBank += toSave;
            state.stats.wallet = 0;
        }
    }
    state.currentMonthData.actuallySaved = toSave;
    el('month-saved').textContent = toSave;
    updateDashboard();

    var expenseList = el('expense-list');
    expenseList.innerHTML = '';

    if (state.currentMonthData.expenses.length === 0) {
        expenseList.innerHTML = '<p style="width:100%;text-align:center;color:#7f8c8d;">這個月沒有任何花費！太棒了！</p>';
        el('finish-month-btn').classList.remove('hidden');
        return;
    }

    for (var j = 0; j < state.currentMonthData.expenses.length; j++) {
        (function(exp) {
            var div = document.createElement('div');
            div.className = 'expense-item';
            div.draggable = true;
            div.dataset.id = exp.id;
            div.textContent = exp.title + ' ($' + exp.cost + ')';
            div.addEventListener('dragstart', function(e) {
                draggedItem = this;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(function() { draggedItem.style.opacity = '0.5'; }, 0);
            });
            expenseList.appendChild(div);
        })(state.currentMonthData.expenses[j]);
    }

    // Also support touch drag (for tablets without mouse)
    setupTouchDrag(expenseList);

    var dropZones = document.querySelectorAll('.drop-zone');
    for (var k = 0; k < dropZones.length; k++) {
        var zone = dropZones[k];
        zone.innerHTML !== undefined && (zone.innerHTML = zone.getAttribute('data-type') === 'need' ? '必需品 (需要)' : '誘惑 (想要)');
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('hover');
        });
        zone.addEventListener('dragleave', function() {
            this.classList.remove('hover');
        });
        zone.addEventListener('drop', function(e) {
            e.stopPropagation();
            this.classList.remove('hover');
            if (draggedItem) {
                draggedItem.style.opacity = '1';
                draggedItem.draggable = false;
                this.appendChild(draggedItem);
                draggedItem = null;
                checkLedgerComplete();
            }
        });
    }
}

function setupTouchDrag(container) {
    var items = container.querySelectorAll('.expense-item');
    for (var i = 0; i < items.length; i++) {
        (function(item) {
            var startX, startY, clone;
            item.addEventListener('touchstart', function(e) {
                var t = e.touches[0];
                startX = t.clientX; startY = t.clientY;
                clone = item.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.zIndex = '9999';
                clone.style.opacity = '0.8';
                clone.style.pointerEvents = 'none';
                clone.style.width = item.offsetWidth + 'px';
                var rect = item.getBoundingClientRect();
                clone.style.left = rect.left + 'px';
                clone.style.top  = rect.top  + 'px';
                document.body.appendChild(clone);
                item.style.opacity = '0.3';
            }, { passive: true });
            item.addEventListener('touchmove', function(e) {
                e.preventDefault();
                var t = e.touches[0];
                clone.style.left = (t.clientX - clone.offsetWidth / 2) + 'px';
                clone.style.top  = (t.clientY - 25) + 'px';
                clone.style.display = 'none';
                var el2 = document.elementFromPoint(t.clientX, t.clientY);
                clone.style.display = '';
                if (el2) {
                    var zone = el2.closest ? el2.closest('.drop-zone') : null;
                    document.querySelectorAll('.drop-zone').forEach(function(z) { z.classList.remove('hover'); });
                    if (zone) zone.classList.add('hover');
                }
            }, { passive: false });
            item.addEventListener('touchend', function(e) {
                var t = e.changedTouches[0];
                clone.parentNode && clone.parentNode.removeChild(clone);
                item.style.opacity = '1';
                document.querySelectorAll('.drop-zone').forEach(function(z) { z.classList.remove('hover'); });
                clone.style.display = 'none';
                var el2 = document.elementFromPoint(t.clientX, t.clientY);
                if (el2) {
                    var zone = el2.closest ? el2.closest('.drop-zone') : null;
                    if (zone && item.parentNode !== zone) {
                        item.draggable = false;
                        zone.appendChild(item);
                        checkLedgerComplete();
                    }
                }
            });
        })(items[i]);
    }
}

function checkLedgerComplete() {
    var list = el('expense-list');
    if (list.children.length === 0) {
        el('finish-month-btn').classList.remove('hidden');
    }
}

function concludeMonth() {
    hideModal('ledger');
    state.history.push({
        month: state.stats.month,
        wallet: state.stats.wallet,
        piggy: state.stats.piggyBank,
        detail: state.currentMonthData
    });

    if (state.stats.month >= state.settings.maxMonths) {
        endGame();
    } else {
        state.stats.month++;
        updateDashboard();
        state.currentStep = 'allowance';
        UI.actionPrompt.textContent = '第 ' + state.stats.month + ' 個月開始啦！發放零用錢。';
        UI.nextBtn.textContent = '領取零用錢 💰';
    }
}

// --- Endgame ---
function endGame() {
    switchScreen('end');
    el('end-hearts').textContent = state.stats.hearts;

    var isSuccess = state.stats.piggyBank >= state.goal.cost;
    var titleEl = el('end-result-title');
    var descEl  = el('end-result-desc');
    var chart   = document.querySelector('.end-chart');

    var totalWantSpent = 0;
    for (var i = 0; i < state.history.length; i++) {
        var exps = state.history[i].detail.expenses;
        for (var j = 0; j < exps.length; j++) {
            if (exps[j].type === 'want') totalWantSpent += exps[j].cost;
        }
    }

    if (isSuccess) {
        titleEl.textContent = '恭喜達成目標！🎉';
        titleEl.style.color = 'var(--success)';
        descEl.innerHTML = '你成功存到了 <strong>$' + state.stats.piggyBank + '</strong>！<br>可以買下你的夢想：' + state.goal.name + ' 了！';
        chart.innerHTML = '<div class="large-icon" style="font-size:8rem;">' + state.goal.icon + '</div>';
    } else {
        titleEl.textContent = '任務失敗... 😭';
        titleEl.style.color = 'var(--danger)';
        descEl.innerHTML = '哎呀，你只存了 <strong>$' + state.stats.piggyBank + '</strong>。<br>距離目標還差 $' + (state.goal.cost - state.stats.piggyBank) + '。';
        var reason = '也許下次該試著選擇「先存再花」的策略喔！';
        if (totalWantSpent > 500) reason = '你這六個月在「想要」的誘惑上花了 $' + totalWantSpent + '，下次試著忍耐一下吧！';
        chart.innerHTML = '<p style="background:rgba(255,255,255,0.8);padding:15px;border-radius:10px;color:var(--danger-hover);">💡 分析：' + reason + '</p>';
    }

    var titleSpan = el('end-title');
    if (state.stats.hearts === 0) titleSpan.textContent = '精打細算小老闆（專注存錢）';
    else if (state.stats.hearts < 3) titleSpan.textContent = '熱心老街居民';
    else titleSpan.textContent = '老街愛心大天使 😇';

    submitToBackend(isSuccess, totalWantSpent);
}

// --- Backend ---
function submitToBackend(isSuccess, totalWantSpent) {
    var payload = {
        timestamp: new Date().toISOString(),
        player: state.player,
        goal: state.goal,
        stats: state.stats,
        totalWantSpent: totalWantSpent,
        isSuccess: isSuccess
    };
    console.log('Submitting to backend:', payload);

    var url = state.settings.backendUrl;
    if (url) {
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function() {
            el('backend-status').innerHTML = '✅ 遊戲紀錄已成功上傳！';
        }).catch(function() {
            el('backend-status').innerHTML = '⚠️ 上傳失敗，請確認網路連線。';
        });
    } else {
        setTimeout(function() {
            el('backend-status').innerHTML = '✅ 遊戲紀錄已記錄完成！<br>（待設定 Apps Script 網址後即可寫入試算表）';
        }, 1500);
    }
    setTimeout(function() { el('restart-btn').classList.remove('hidden'); }, 2000);
}
