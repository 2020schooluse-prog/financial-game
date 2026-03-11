/**
 * 理財小達人：老街小老闆的六個月挑戰
 * Game Logic
 */

// --- Game State ---
const state = {
    player: {
        class: '',
        name: '',
        gender: 'boy',
        avatarEmoji: '👦'
    },
    goal: {
        id: '',
        name: '',
        cost: 0,
        icon: ''
    },
    stats: {
        month: 1,
        wallet: 0,
        piggyBank: 0,
        hearts: 0
    },
    settings: {
        allowance: 600,
        maxMonths: 6,
        backendUrl: '' // Since not provided, we will just simulate for now.
    },
    history: [], // Stores monthly data
    currentMonthData: {
        strategy: '', // 'save_first' or 'spend_first'
        savedAmount: 0,
        events: [],
        expenses: [] // [{id, title, cost, type, correctType}]
    }
};

// --- DOM Elements ---
const screens = {
    start: document.getElementById('start-screen'),
    goal: document.getElementById('goal-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const modals = {
    container: document.getElementById('modal-container'),
    strategy: document.getElementById('strategy-modal'),
    event: document.getElementById('event-modal'),
    ledger: document.getElementById('ledger-modal'),
    alert: document.getElementById('alert-modal')
};

const UI = {
    wallet: document.getElementById('wallet-balance'),
    piggy: document.getElementById('piggy-balance'),
    progress: document.getElementById('goal-progress'),
    amountLeft: document.getElementById('amount-left'),
    month: document.getElementById('current-month'),
    hearts: document.getElementById('heart-count'),
    actionPrompt: document.getElementById('action-prompt'),
    nextBtn: document.getElementById('next-step-btn')
};

// --- Global start function (called by button onclick) ---
function handleStartGame() {
    const cls = document.getElementById('student-class').value.trim();
    const name = document.getElementById('student-name').value.trim();
    const errDiv = document.getElementById('form-error');

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
    state.player.name = name;
    switchScreen('goal');
}

// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Select Avatar
    document.querySelectorAll('.avatar-card').forEach(card => {
        card.addEventListener('click', (e) => {
            document.querySelectorAll('.avatar-card').forEach(c => c.classList.remove('selected'));
            const target = e.currentTarget;
            target.classList.add('selected');
            state.player.gender = target.dataset.gender;
            state.player.avatarEmoji = target.querySelector('.avatar-emoji').textContent;
        });
    });



    // Goal Selection
    document.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
            const target = e.currentTarget;
            target.classList.add('selected');
            
            state.goal.id = target.dataset.goal;
            state.goal.cost = parseInt(target.dataset.cost);
            state.goal.name = target.querySelector('h3').textContent.replace(/目標 .: /, '');
            state.goal.icon = target.querySelector('.goal-icon').textContent;

            // Short delay to show selection, then start game
            setTimeout(() => startGame(), 600);
        });
    });

    // Next Step / Action Button
    UI.nextBtn.addEventListener('click', handleNextAction);

    // Strategy Logic
    document.getElementById('strategy-save-first').addEventListener('click', function() {
        document.getElementById('save-slider-container').classList.remove('hidden');
    });
    
    document.getElementById('save-amount').addEventListener('input', function(e) {
        document.getElementById('save-amount-display').textContent = e.target.value;
    });

    document.getElementById('confirm-save-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const amount = parseInt(document.getElementById('save-amount').value);
        applyAllowance('save_first', amount);
    });

    document.getElementById('confirm-spend-btn').addEventListener('click', () => {
        applyAllowance('spend_first', 0);
    });

    // Alert OK button
    document.getElementById('alert-ok-btn').addEventListener('click', () => {
        hideModal('alert');
        // Resume flow
        checkMonthProgress();
    });

    // Ledger End Month
    document.getElementById('finish-month-btn').addEventListener('click', concludeMonth);
    
    // Restart Game
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
});

// --- Navigation & Core Flow ---
function switchScreen(screenId) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    screens[screenId].classList.remove('hidden');
    // small timeout to allow display:block to apply before opacity transition
    setTimeout(() => screens[screenId].classList.add('active'), 50);
}

function showModal(modalId) {
    modals.container.classList.remove('hidden');
    Object.values(modals).forEach(m => {
        if(m !== modals.container) m.classList.add('hidden');
    });
    modals[modalId].classList.remove('hidden');
}

function hideModal(modalId) {
    modals[modalId].classList.add('hidden');
    modals.container.classList.add('hidden');
}

function showAlert(message) {
    document.getElementById('alert-msg').textContent = message;
    showModal('alert');
}

// --- Game Logic functions ---

function startGame() {
    // Setup Header & Dashboard
    document.getElementById('header-avatar').textContent = state.player.avatarEmoji;
    document.getElementById('header-name').textContent = state.player.name;
    document.getElementById('current-goal-icon').textContent = state.goal.icon;
    document.getElementById('current-goal-name').textContent = state.goal.name;
    document.getElementById('target-amount').textContent = state.goal.cost;
    
    updateDashboard();
    switchScreen('game');
    
    UI.actionPrompt.textContent = "發零用錢囉！請選擇儲蓄策略。";
    UI.nextBtn.textContent = "領取零用錢 💰";
    state.currentStep = 'allowance';
}

function updateDashboard() {
    UI.wallet.textContent = state.stats.wallet;
    UI.piggy.textContent = state.stats.piggyBank;
    UI.month.textContent = state.stats.month;
    UI.hearts.textContent = state.stats.hearts;
    
    const left = Math.max(0, state.goal.cost - state.stats.piggyBank);
    UI.amountLeft.textContent = left;
    
    const perc = Math.min(100, (state.stats.piggyBank / state.goal.cost) * 100);
    UI.progress.style.width = \`\${perc}%\`;
}

function animateMoneyChange(amount, element, type = 'danger') {
    const anim = document.createElement('div');
    anim.className = 'money-fly';
    anim.textContent = amount > 0 ? \`+\$\${amount}\` : \`-\$\${Math.abs(amount)}\`;
    if(type === 'success') anim.style.color = 'var(--success)';
    
    const rect = element.getBoundingClientRect();
    anim.style.left = \`\${rect.left + rect.width/2}px\`;
    anim.style.top = \`\${rect.top}px\`;
    
    document.body.appendChild(anim);
    setTimeout(() => anim.remove(), 1000);
}

function flyHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart-fly';
    heart.textContent = '❤️';
    
    // Start from center
    heart.style.left = '50%';
    heart.style.top = '50%';
    
    // Target header hearts
    const target = document.querySelector('.hearts-display').getBoundingClientRect();
    const tx = target.left - window.innerWidth/2;
    const ty = target.top - window.innerHeight/2;
    
    heart.style.setProperty('--tx', \`\${tx}px\`);
    heart.style.setProperty('--ty', \`\${ty}px\`);
    
    document.body.appendChild(heart);
    setTimeout(() => {
        state.stats.hearts++;
        updateDashboard();
        heart.remove();
    }, 1500);
}

// --- Step handlers ---
function handleNextAction() {
    if (state.currentStep === 'allowance') {
        showModal('strategy');
        // Reset slider
        document.getElementById('save-amount').value = 200;
        document.getElementById('save-slider-container').classList.add('hidden');
    } else if (state.currentStep === 'events') {
        triggerNextEvent();
    } else if (state.currentStep === 'ledger') {
        initLedgerGame();
    }
}

function applyAllowance(strategy, savedAmount) {
    hideModal('strategy');
    
    const allowance = state.settings.allowance;
    state.currentMonthData = {
        strategy: strategy,
        savedAmount: parseInt(savedAmount),
        events: [],
        expenses: []
    };

    if (strategy === 'save_first') {
        state.stats.piggyBank += state.currentMonthData.savedAmount;
        state.stats.wallet += (allowance - state.currentMonthData.savedAmount);
        animateMoneyChange(state.currentMonthData.savedAmount, UI.piggy.parentElement, 'success');
    } else {
        // spend first
        state.stats.wallet += allowance;
        animateMoneyChange(allowance, UI.wallet.parentElement, 'success');
    }

    updateDashboard();
    
    state.currentStep = 'events';
    UI.actionPrompt.textContent = "在老街逛逛可能會遇到突發事件！";
    UI.nextBtn.textContent = "前進老街 🚶‍♂️";
    
    // Generate events for the month (2 to 3)
    const numEvents = Math.floor(Math.random() * 2) + 2; // 2 or 3
    state.currentMonthData.eventQueue = generateEvents(numEvents);
    
    // Auto-trigger first event after short delay for visual feedback
    setTimeout(() => triggerNextEvent(), 800);
}

// --- Events System ---
const EventDB = [
    { type: 'need', title: '學校文具', desc: '學校通知要買新的直笛，需要 $100 元。', cost: 100, correctType: 'need' },
    { type: 'need', title: '校外教學', desc: '這週要去博物館校外教學，繳交費用 $150 元。', cost: 150, correctType: 'need' },
    { type: 'want', title: '老街扭蛋', desc: '同學約你去老街新開的扭蛋店，要花 $150 元抽一次嗎？', cost: 150, correctType: 'want' },
    { type: 'want', title: '聯名甜點', desc: '超商推出最新的聯名款巧克力，只要 $60 元！', cost: 60, correctType: 'want' },
    { type: 'want', title: '手搖飲料', desc: '天氣好熱，想買一杯珍珠奶茶解渴？只要 $50 元。', cost: 50, correctType: 'want' },
    { type: 'charity', title: '受傷流浪貓', desc: '老街的流浪貓受傷了，動物醫院正在募款醫藥費。', cost: 0, correctType: 'need' },
    { type: 'charity', title: '街頭藝人', desc: '有人在表演溜溜球好厲害，你要打賞嗎？', cost: 0, correctType: 'want' }
];

function generateEvents(count) {
    // Shuffle and pick
    const shuffled = [...EventDB].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function triggerNextEvent() {
    if (!state.currentMonthData.eventQueue || state.currentMonthData.eventQueue.length === 0) {
        // No more events → automatically open the ledger
        state.currentStep = 'ledger';
        UI.actionPrompt.textContent = "月底到了，該來記帳囉！";
        UI.nextBtn.textContent = "打開記帳本 📝";
        // Auto-open ledger after brief pause
        setTimeout(() => initLedgerGame(), 600);
        return;
    }

    const currentEvent = state.currentMonthData.eventQueue.shift();
    displayEvent(currentEvent);
}

function displayEvent(evt) {
    document.getElementById('event-title').textContent = evt.title;
    document.getElementById('event-desc').textContent = evt.desc;
    
    const btnContainer = document.getElementById('event-actions');
    btnContainer.innerHTML = ''; // clear

    if (evt.type === 'need') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-danger';
        btn.textContent = \`確認扣款 $\${evt.cost}\`;
        btn.onclick = () => handleExpense(evt.title, evt.cost, 'need', evt.correctType);
        btnContainer.appendChild(btn);
    } else if (evt.type === 'want') {
        const btnBuy = document.createElement('button');
        btnBuy.className = 'btn btn-danger';
        btnBuy.textContent = \`買！扣 $\${evt.cost}\`;
        btnBuy.onclick = () => handleExpense(evt.title, evt.cost, 'want', evt.correctType);
        
        const btnPass = document.createElement('button');
        btnPass.className = 'btn btn-secondary';
        btnPass.textContent = '忍住不花錢';
        btnPass.onclick = () => { hideModal('event'); setTimeout(() => triggerNextEvent(), 400); };
        
        btnContainer.appendChild(btnBuy);
        btnContainer.appendChild(btnPass);
    } else if (evt.type === 'charity') {
        const btn50 = document.createElement('button');
        btn50.className = 'btn success-btn';
        btn50.textContent = '捐 $50';
        btn50.onclick = () => handleExpense(evt.title, 50, 'charity', evt.correctType, true);
        
        const btn100 = document.createElement('button');
        btn100.className = 'btn success-btn';
        btn100.textContent = '捐 $100';
        btn100.onclick = () => handleExpense(evt.title, 100, 'charity', evt.correctType, true);
        
        const btnPass = document.createElement('button');
        btnPass.className = 'btn btn-secondary';
        btnPass.textContent = '這次先不捐';
        btnPass.onclick = () => { hideModal('event'); setTimeout(() => triggerNextEvent(), 400); };

        btnContainer.appendChild(btn50);
        btnContainer.appendChild(btn100);
        btnContainer.appendChild(btnPass);
    }

    showModal('event');
}

function handleExpense(title, cost, type, correctType, isCharity = false) {
    hideModal('event');
    
    // Check if wallet has enough
    if (state.stats.wallet < cost) {
        // Overdraft!
        state.stats.wallet -= cost;
        state.currentMonthData.expenses.push({ id: Date.now(), title, cost, type, correctType });
        updateDashboard();
        animateMoneyChange(-cost, UI.wallet.parentElement);
        
        showAlert(\`餘額不足！你欠了別人 $\${Math.abs(state.stats.wallet)}。下個月的零用錢會先扣除這筆欠款哦。\`);
        return; // Progress stops until alert is dismissed
    } else {
        state.stats.wallet -= cost;
        state.currentMonthData.expenses.push({ id: Date.now(), title, cost, type, correctType });
        updateDashboard();
        animateMoneyChange(-cost, UI.wallet.parentElement);
        
        if (isCharity) {
            flyHeart();
            setTimeout(() => triggerNextEvent(), 1600); // wait for anim
            return;
        }
    }
    
    // Auto-advance to next event
    setTimeout(() => triggerNextEvent(), 400);
}

function checkMonthProgress() {
    // Kept for alert-dismiss path (overdraft warning)
    setTimeout(() => triggerNextEvent(), 400);
}

// --- Ledger Mini-game ---
function initLedgerGame() {
    showModal('ledger');
    document.getElementById('finish-month-btn').classList.add('hidden');
    
    // Calculate month totals
    const totalSpent = state.currentMonthData.expenses.reduce((acc, curr) => acc + curr.cost, 0);
    document.getElementById('month-expense').textContent = totalSpent;
    
    let toSave = 0;
    if (state.currentMonthData.strategy === 'save_first') {
        toSave = state.currentMonthData.savedAmount;
    } else {
        // spend first: save remaining wallet balance, ensuring wallet >= 0
        if (state.stats.wallet > 0) {
            toSave = state.stats.wallet;
            // Transfer wallet to piggy
            state.stats.wallet = 0;
            state.stats.piggyBank += toSave;
        }
    }
    state.currentMonthData.actuallySaved = toSave;
    document.getElementById('month-saved').textContent = toSave;
    updateDashboard();

    // Setup drag and drop
    const expenseList = document.getElementById('expense-list');
    expenseList.innerHTML = '';
    
    if (state.currentMonthData.expenses.length === 0) {
        expenseList.innerHTML = '<p style="width:100%; text-align:center; color:#7f8c8d;">這個月沒有任何花費！太棒了！</p>';
        document.getElementById('finish-month-btn').classList.remove('hidden');
    } else {
        state.currentMonthData.expenses.forEach(exp => {
            const el = document.createElement('div');
            el.className = 'expense-item';
            el.draggable = true;
            el.dataset.id = exp.id;
            el.textContent = \`\${exp.title} (\$\${exp.cost})\`;
            
            el.addEventListener('dragstart', handleDragStart);
            expenseList.appendChild(el);
        });
    }

    // Drop zones setup
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
        // Clear previous children except the text node
        Array.from(zone.children).forEach(c => c.remove());
    });
}

// Drag & Drop Handlers
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    setTimeout(() => this.style.opacity = '0.5', 0);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    this.classList.add('hover');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('hover');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    this.classList.remove('hover');
    
    if (draggedItem) {
        draggedItem.style.opacity = '1';
        this.appendChild(draggedItem);
        draggedItem.draggable = false; // once dropped, disable
        
        checkLedgerComplete();
    }
    return false;
}

function checkLedgerComplete() {
    const list = document.getElementById('expense-list');
    if (list.children.length === 0) {
        document.getElementById('finish-month-btn').classList.remove('hidden');
        // Simple Reward logic: Can check if they dropped in right category later
    }
}

function concludeMonth() {
    hideModal('ledger');

    // Archive data
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
        UI.actionPrompt.textContent = \`第 \${state.stats.month} 個月開始啦！發放零用錢。\`;
        UI.nextBtn.textContent = "領取零用錢 💰";
    }
}

// --- End Game Logic ---
function endGame() {
    switchScreen('end');
    
    document.getElementById('end-hearts').textContent = state.stats.hearts;
    
    const isSuccess = state.stats.piggyBank >= state.goal.cost;
    const titleEl = document.getElementById('end-result-title');
    const descEl = document.getElementById('end-result-desc');
    const chart = document.querySelector('.end-chart');
    
    // Calculate total spent on wants throughout 6 months
    let totalWantSpent = 0;
    state.history.forEach(m => {
        m.detail.expenses.forEach(e => {
            if(e.type === 'want') totalWantSpent += e.cost;
        });
    });

    if (isSuccess) {
        titleEl.textContent = "恭喜達成目標！🎉";
        titleEl.style.color = "var(--success)";
        descEl.innerHTML = \`你成功存到了 <strong>\$\${state.stats.piggyBank}</strong>！<br>可以買下你的夢想：\${state.goal.name} 了！\`;
        
        // Show goal icon jumping
        chart.innerHTML = \`<div class="large-icon" style="font-size: 8rem; animation: bounce 1s infinite;">\${state.goal.icon}</div>\`;
    } else {
        titleEl.textContent = "任務失敗... 😭";
        titleEl.style.color = "var(--danger)";
        descEl.innerHTML = \`哎呀，你只存了 <strong>\$\${state.stats.piggyBank}</strong>。<br>距離目標還差 $\${state.goal.cost - state.stats.piggyBank}。\`;
        
        let reason = "也許下個月該試著選擇「先存再花」的策略喔！";
        if (totalWantSpent > 500) {
            reason = \`你這六個月在「想要」的誘惑上花了 \$\${totalWantSpent}，下次試著忍耐一下吧！\`;
        }
        
        chart.innerHTML = \`<p style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 10px; color: var(--danger-hover);">💡 分析：\${reason}</p>\`;
    }

    // Assign title based on hearts
    const titleSpan = document.getElementById('end-title');
    if (state.stats.hearts === 0) titleSpan.textContent = "精打細算小老闆 (專注存錢)";
    else if (state.stats.hearts < 3) titleSpan.textContent = "熱心老街居民";
    else titleSpan.textContent = "老街愛心大天使 😇";

    submitToBackend(isSuccess, totalWantSpent);
}

// --- Backend Integration ---
function submitToBackend(isSuccess, totalWantSpent) {
    const payload = {
        timestamp: new Date().toISOString(),
        player: state.player,
        goal: state.goal,
        stats: state.stats,
        totalWantSpent: totalWantSpent,
        isSuccess: isSuccess
    };
    
    console.log("Submitting to backend:", payload);
    
    // Simulate Fetch
    setTimeout(() => {
        document.getElementById('backend-status').innerHTML = "✅ 遊戲紀錄已成功上傳！<br>（此為模擬傳送，待設定真實 Apps Script 網址後即可寫入試算表）";
        document.getElementById('restart-btn').classList.remove('hidden');
    }, 2000);
}
