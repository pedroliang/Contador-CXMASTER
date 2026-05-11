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

// Initialize
function init() {
    loadFromLocalStorage();
    renderCounters();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    addCounterBtn.addEventListener('click', addCounter);
    saveBtn.addEventListener('click', saveToLocalStorage);
    loadBtn.addEventListener('click', () => {
        if (loadFromLocalStorage()) {
            renderCounters();
            alert('Progresso carregado com sucesso!');
        } else {
            alert('Nenhum dado salvo encontrado.');
        }
    });
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

// Load from LocalStorage
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

// Save to LocalStorage
function saveToLocalStorage() {
    state.processo = processoInput.value;
    state.cliente = clienteInput.value;
    localStorage.setItem('contadorCXMState', JSON.stringify(state));
    alert('Progresso salvo localmente com sucesso!');
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

// Clear All
function clearAll() {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
        state = { processo: '', cliente: '', counters: [] };
        processoInput.value = '';
        clienteInput.value = '';
        localStorage.removeItem('contadorCXMState');
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
