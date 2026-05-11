// State Management
let state = {
    processo: '',
    cliente: '',
    counters: []
};

// DOM Elements
const countersContainer = document.getElementById('counters-container');
const addCounterBtn = document.getElementById('add-counter-btn');
const newCodeInput = document.getElementById('new-code');
const newTotalInput = document.getElementById('new-total');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');
const processoInput = document.getElementById('processo');
const clienteInput = document.getElementById('cliente');
const sessionSelect = document.getElementById('session-select');

// Initialize
function init() {
    loadFromLocalStorage();
    loadHistory();
    renderCounters();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    addCounterBtn.addEventListener('click', addCounter);
    saveBtn.addEventListener('click', saveToLocalStorage);
    loadBtn.addEventListener('click', loadSelectedSession);
    exportBtn.addEventListener('click', exportToExcel);
    clearBtn.addEventListener('click', clearAll);
    
    processoInput.addEventListener('input', (e) => state.processo = e.target.value);
    clienteInput.addEventListener('input', (e) => state.cliente = e.target.value);
    
    // Allow enter key to add counter
    newCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') newTotalInput.focus();
    });
    newTotalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCounter();
    });
}

// Load current session from LocalStorage (Auto-load on refresh)
function loadFromLocalStorage() {
    const savedState = localStorage.getItem('contadorCXMState');
    if (savedState) {
        state = JSON.parse(savedState);
        processoInput.value = state.processo || '';
        clienteInput.value = state.cliente || '';
        return true;
    }
    return false;
}

// Load history and populate select
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('contadorCXMHistory') || '[]');
    sessionSelect.innerHTML = '<option value="">Selecione uma gravação...</option>';
    
    history.forEach((session, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${session.processo || 'S/P'} - ${session.cliente || 'S/C'} (${new Date(session.timestamp).toLocaleString()})`;
        sessionSelect.appendChild(option);
    });
}

// Save to LocalStorage (Current and History)
function saveToLocalStorage() {
    state.processo = processoInput.value;
    state.cliente = clienteInput.value;
    
    // Save current session
    localStorage.setItem('contadorCXMState', JSON.stringify(state));
    
    // Save to history
    const history = JSON.parse(localStorage.getItem('contadorCXMHistory') || '[]');
    
    // Find if session exists (by process and client)
    const existingIndex = history.findIndex(s => s.processo === state.processo && s.cliente === state.cliente);
    
    const sessionData = {
        processo: state.processo,
        cliente: state.cliente,
        counters: state.counters,
        timestamp: new Date().getTime()
    };
    
    if (existingIndex >= 0) {
        history[existingIndex] = sessionData; // Update
    } else {
        history.push(sessionData); // Add new
    }
    
    localStorage.setItem('contadorCXMHistory', JSON.stringify(history));
    loadHistory(); // Refresh dropdown
    alert('Progresso salvo com sucesso!');
}

// Load selected session from history
function loadSelectedSession() {
    const selectedIndex = sessionSelect.value;
    if (selectedIndex === '') {
        alert('Por favor, selecione uma gravação para carregar.');
        return;
    }
    
    const history = JSON.parse(localStorage.getItem('contadorCXMHistory') || '[]');
    const selectedSession = history[selectedIndex];
    
    if (selectedSession) {
        state.processo = selectedSession.processo;
        state.cliente = selectedSession.cliente;
        state.counters = selectedSession.counters;
        
        processoInput.value = state.processo || '';
        clienteInput.value = state.cliente || '';
        
        // Update current session storage so refresh works on this one
        localStorage.setItem('contadorCXMState', JSON.stringify(state));
        
        renderCounters();
        alert('Gravação carregada com sucesso!');
    }
}

// Add Counter
function addCounter() {
    const code = newCodeInput.value.trim();
    const total = parseInt(newTotalInput.value) || 0;
    const mode = document.querySelector('input[name="counting-mode"]:checked').value;
    
    if (!code) {
        alert('Por favor, insira o código da caixa.');
        return;
    }
    
    // Check if code already exists
    if (state.counters.find(c => c.code === code)) {
        alert('Este código já foi adicionado.');
        return;
    }
    
    const newCounter = {
        code,
        mode,
        total: total,
        current: mode === 'regressive' ? total : 0
    };
    
    state.counters.push(newCounter);
    renderCounters();
    
    // Clear inputs
    newCodeInput.value = '';
    newTotalInput.value = '';
    newCodeInput.focus();
}

// Render Counters
function renderCounters() {
    countersContainer.innerHTML = '';
    
    state.counters.forEach((counter, index) => {
        const card = document.createElement('div');
        card.className = `counter-card ${counter.mode}`;
        
        const isRegressive = counter.mode === 'regressive';
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-code">${counter.code}</span>
                <span class="card-mode">${isRegressive ? 'Regressivo' : 'Progressivo'}</span>
            </div>
            <div class="counter-display">
                <button class="counter-btn minus" onclick="updateCounter(${index}, -1)">−</button>
                <span class="counter-value">${counter.current}</span>
                <button class="counter-btn plus" onclick="updateCounter(${index}, 1)">+</button>
            </div>
            <div class="card-footer">
                <span>${isRegressive ? `Total: ${counter.total}` : `Início: 0`}</span>
                <button class="btn-delete" onclick="deleteCounter(${index})">Excluir</button>
            </div>
        `;
        
        countersContainer.appendChild(card);
    });
}

// Update Counter Value
window.updateCounter = function(index, delta) {
    const counter = state.counters[index];
    
    if (counter.mode === 'regressive') {
        // In regressive mode, + increases the count of boxes processed (decreases remaining)
        // Wait, usually regressive means counting DOWN.
        // If I have 100 boxes, I want to count down to 0.
        // So clicking "-" should decrease the remaining count (meaning I counted one more).
        // Or clicking "+" adds to the remaining count.
        // Let's make it intuitive: 
        // In regressive, "current" starts at Total.
        // Clicking "-" decreases "current" (counting down).
        // Clicking "+" increases "current" (correcting mistake).
        
        if (delta < 0 && counter.current <= 0) return; // Can't go below 0
        counter.current += delta;
    } else {
        // Progressive mode
        if (delta < 0 && counter.current <= 0) return; // Can't go below 0
        counter.current += delta;
    }
    
    renderCounters();
    // Auto save on change
    localStorage.setItem('contadorCXMState', JSON.stringify(state));
};

// Delete Counter
window.deleteCounter = function(index) {
    if (confirm('Tem certeza que deseja excluir este contador?')) {
        state.counters.splice(index, 1);
        renderCounters();
        localStorage.setItem('contadorCXMState', JSON.stringify(state));
    }
};

// Clear All (Only clears current screen, keeps history)
function clearAll() {
    if (confirm('Tem certeza que deseja limpar a tela atual? O histórico salvo NÃO será apagado.')) {
        state = { processo: '', cliente: '', counters: [] };
        processoInput.value = '';
        clienteInput.value = '';
        localStorage.removeItem('contadorCXMState'); // Clear auto-load state
        renderCounters();
    }
}

// Export to Excel
function exportToExcel() {
    if (state.counters.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    
    const data = state.counters.map(c => {
        const isRegressive = c.mode === 'regressive';
        return {
            'Processo': state.processo || 'Não informado',
            'Cliente': state.cliente || 'Não informado',
            'Código da Caixa': c.code,
            'Modo': isRegressive ? 'Regressivo' : 'Progressivo',
            'Meta/Total': isRegressive ? c.total : 'N/A',
            'Contagem Atual': c.current,
            'Diferença/Faltam': isRegressive ? (c.total - c.current) : 'N/A'
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Contagem');
    
    // Generate filename
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Relatorio_Contagem_${state.processo || 'Centralux'}_${date}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
}

// Run Init
init();
