let token = null;

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');

    if (screenId === 'balance-screen') fetchBalance();
}

// Cadastro
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    const response = await fetch('http://localhost:3000/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    alert(data.message);
    if (data.success) showScreen('login-screen');
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
        token = data.token; // Armazena o token JWT
        alert(data.message);
        showScreen('payment-screen');
    } else {
        alert(data.message);
    }
});

// Pagamento
document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = document.getElementById('payment-amount').value;

    const response = await fetch('http://localhost:3000/adicionar_saldo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ valor })
    });
    const data = await response.json();
    alert(data.message);
    if (data.success) showScreen('balance-screen');
});

// Consultar Saldo
async function fetchBalance() {
    const response = await fetch('http://localhost:3000/get_saldo', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();

    if (data.success) {
        document.getElementById('balance-amount').textContent = `R$ ${data.saldo}`;
        document.getElementById('last-payment').textContent = data.ultimaTransacao ? new Date(data.ultimaTransacao).toLocaleDateString() : 'Nenhum';
    } else {
        document.getElementById('balance-amount').textContent = `R$ 0,00`;
        document.getElementById('last-payment').textContent = 'Nenhum';
    }
}