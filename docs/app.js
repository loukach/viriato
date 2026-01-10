/**
 * Viriato - Dados Abertos do Parlamento Português
 * Application JavaScript
 *
 * This file contains all JavaScript logic for the Viriato application.
 * Extracted from the monolithic index.html for better maintainability.
 *
 * Structure:
 * - Configuration & Global State
 * - Data Loading Patterns (see helper functions)
 * - View Rendering Functions
 * - Event Handlers
 * - Utility Functions
 */

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = 'https://viriato-api.onrender.com';

// ============================================================
// GLOBAL STATE
// ============================================================
let INITIATIVES_DATA = [];
let AGENDA_DATA = [];
let COMISSOES_DATA = [];
let DEPUTADOS_DATA = null;  // null = not loaded, object = { deputados: [], summary: {} }
let SEARCH_RESULTS = null;  // null = no search, array = search results
let SELECTED_LEGISLATURE = 'XVII';  // Track selected legislature (default to current)
let SELECTED_PARTY_FILTER = null;  // For filtering deputados by party

// Page titles for each route
const PAGE_TITLES = {
    'home': 'Viriato - Dados Abertos do Parlamento Português',
    'iniciativas': 'Iniciativas Legislativas - Viriato',
    'agenda': 'Agenda Parlamentar - Viriato',
    'comissoes': 'Comissões Parlamentares - Viriato',
    'assembleia': 'Composição da Assembleia - Viriato'
};

// Router
function navigateTo(hash) {
    window.location.hash = hash;
}

// Keyboard handler for cards
function handleCardKeydown(event, hash) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateTo(hash);
    }
}

function handleRoute() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2) || 'home';

    // Update page title
    document.title = PAGE_TITLES[route] || PAGE_TITLES['home'];

    // Update active tab and aria-selected
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.querySelector(`[data-view="${route}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
    }

    // Update active view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    const activeView = document.getElementById(`${route}-view`);
    if (activeView) {
        activeView.classList.add('active');

        // Load data for view if needed
        if (route === 'iniciativas' && INITIATIVES_DATA.length === 0) {
            loadInitiatives();
        } else if (route === 'agenda' && AGENDA_DATA.length === 0) {
            loadAgenda();
        } else if (route === 'comissoes' && COMISSOES_DATA.length === 0) {
            loadComissoes();
        } else if (route === 'assembleia' && !DEPUTADOS_DATA) {
            loadDeputados();
        }
    }
}

// ============================================================
// DATA LOADING & RENDERING PATTERNS
// ============================================================
// When adding new data views, follow these patterns to ensure
// consistent behavior and avoid common bugs (loader issues, etc.)
//
// LOAD FUNCTION PATTERN (loadXxx):
//   1. Call showLoading(containerId) if re-fetching
//   2. Fetch data from API
//   3. Update homepage count: updateHomeCount('home-xxx-count', data.length)
//   4. Call render function: renderXxx()
//   5. In catch block: call showError(containerId, retryFn, 'Error title')
//
// RENDER FUNCTION PATTERN (renderXxx):
//   1. Get container: const container = document.getElementById('xxx')
//   2. Remove loading state: container.classList.remove('loading')
//   3. Handle empty data: if (!DATA || DATA.length === 0) { ... return }
//   4. Build HTML and set: container.innerHTML = html
//
// RETRY FUNCTION PATTERN (retryLoadXxx):
//   1. Call showLoading(containerId)
//   2. Reset data: XXX_DATA = null/[]
//   3. Call load function: loadXxx()
// ============================================================

// Helper: Show loading state on a container
function showLoading(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('loading');
        container.innerHTML = message || 'A carregar...';
    }
}

// Helper: Remove loading state from a container
function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('loading');
    }
}

// Helper: Show error state with retry button
function showError(containerId, retryFunctionName, errorTitle, errorMessage) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('loading');
        container.innerHTML = `
            <div class="error" role="alert">
                <div class="error-title">${errorTitle || 'Erro ao carregar dados'}</div>
                <div class="error-message">${errorMessage || 'O servidor pode estar a iniciar (aguarde 10-30 segundos) ou houve um problema de ligação.'}</div>
                <button class="retry-btn" onclick="${retryFunctionName}()">Tentar novamente</button>
            </div>`;
    }
}

// Helper: Update homepage count element
function updateHomeCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = count;
    }
}

// Load Initiatives Data
async function loadInitiatives() {
    try {
        // Build URL with legislature filter if selected
        let url = `${API_URL}/api/iniciativas`;
        if (SELECTED_LEGISLATURE !== 'all') {
            url += `?legislature=${SELECTED_LEGISLATURE}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        INITIATIVES_DATA = await response.json();
        console.log(`Loaded ${INITIATIVES_DATA.length} initiatives for legislature ${SELECTED_LEGISLATURE}`);

        // Update stats
        document.getElementById('ini-total').textContent = INITIATIVES_DATA.length;
        const completed = INITIATIVES_DATA.filter(i => i._isCompleted).length;
        document.getElementById('ini-completed').textContent = completed;
        document.getElementById('home-ini-count').textContent = INITIATIVES_DATA.length;
        document.getElementById('home-ini-completed').textContent = completed;

        // Update header to show selected legislature
        const headerText = document.querySelector('.iniciativas-header p');
        if (SELECTED_LEGISLATURE === 'all') {
            headerText.textContent = 'All Legislatures (XIV-XVII)';
        } else if (SELECTED_LEGISLATURE === 'XVII') {
            headerText.textContent = 'XVII Legislature (2025-present)';
        } else {
            headerText.textContent = `Legislature ${SELECTED_LEGISLATURE}`;
        }

        renderLifecycleFunnels();
        renderAnalyticsWidgets();
        renderInitiatives('all');
        setupFilters();
    } catch (error) {
        console.error('Error loading initiatives:', error);
        showError('initiatives', 'retryLoadInitiatives', 'Erro ao carregar iniciativas');
    }
}

function retryLoadInitiatives() {
    showLoading('initiatives', 'A carregar iniciativas...');
    INITIATIVES_DATA = [];
    loadInitiatives();
}

// Load Agenda Data
async function loadAgenda() {
    try {
        const response = await fetch(`${API_URL}/api/agenda`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        AGENDA_DATA = await response.json();
        console.log(`Loaded ${AGENDA_DATA.length} agenda events`);

        updateHomeCount('home-agenda-count', AGENDA_DATA.length);

        // Render based on current view
        if (CURRENT_AGENDA_VIEW === 'timeline') {
            renderAgendaTimeline();
        } else {
            renderAgenda();
        }
    } catch (error) {
        console.error('Error loading agenda:', error);
        showError('agenda', 'retryLoadAgenda', 'Erro ao carregar agenda');
    }
}

function retryLoadAgenda() {
    showLoading('agenda', 'A carregar agenda...');
    AGENDA_DATA = [];
    loadAgenda();
}

// Load Comissões Data
async function loadComissoes() {
    try {
        const response = await fetch(`${API_URL}/api/orgaos/summary`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        COMISSOES_DATA = await response.json();
        console.log(`Loaded ${COMISSOES_DATA.length} committees`);

        updateHomeCount('home-comissoes-count', COMISSOES_DATA.length);
        renderComissoes();
    } catch (error) {
        console.error('Error loading comissões:', error);
        showError('comissoes-content', 'retryLoadComissoes', 'Erro ao carregar comissões');
    }
}

function retryLoadComissoes() {
    showLoading('comissoes-content', 'A carregar comissões...');
    COMISSOES_DATA = [];
    loadComissoes();
}

// Load Deputados Data
async function loadDeputados() {
    try {
        const response = await fetch(`${API_URL}/api/deputados`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        DEPUTADOS_DATA = await response.json();
        console.log(`Loaded ${DEPUTADOS_DATA.deputados.length} deputados (summary.total: ${DEPUTADOS_DATA.summary.total})`);

        // Update homepage count with summary total (Efetivo deputies)
        updateHomeCount('home-deputados-count', DEPUTADOS_DATA.summary.total);

        renderAssembleia();
    } catch (error) {
        console.error('Error loading deputados:', error);
        showError('assembleia-content', 'retryLoadDeputados', 'Erro ao carregar deputados');
    }
}

function retryLoadDeputados() {
    showLoading('assembleia-content', 'A carregar deputados...');
    DEPUTADOS_DATA = null;
    SELECTED_PARTY_FILTER = null;
    loadDeputados();
}

// Render Assembleia View
function renderAssembleia() {
    hideLoading('assembleia-content');
    const container = document.getElementById('assembleia-content');

    if (!DEPUTADOS_DATA || DEPUTADOS_DATA.deputados.length === 0) {
        container.innerHTML = '<div class="no-data">Nenhum deputado encontrado.</div>';
        return;
    }

    const { deputados, summary } = DEPUTADOS_DATA;
    const { total, party_composition, gender_breakdown, circulo_breakdown } = summary;

    // Sort parties by political spectrum (right to left, CH at center)
    const partyOrder = ['CDS-PP', 'IL', 'PSD', 'JPP', 'CH', 'PS', 'PAN', 'L', 'BE', 'PCP'];
    const sortedParties = Object.keys(party_composition).sort((a, b) => {
        const ai = partyOrder.indexOf(a);
        const bi = partyOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // Helper function to create hemicycle SVG arc path
    function createArcPath(startAngle, endAngle, innerRadius, outerRadius, cx, cy) {
        const startAngleRad = (startAngle - 90) * Math.PI / 180;
        const endAngleRad = (endAngle - 90) * Math.PI / 180;

        const x1 = cx + outerRadius * Math.cos(startAngleRad);
        const y1 = cy + outerRadius * Math.sin(startAngleRad);
        const x2 = cx + outerRadius * Math.cos(endAngleRad);
        const y2 = cy + outerRadius * Math.sin(endAngleRad);
        const x3 = cx + innerRadius * Math.cos(endAngleRad);
        const y3 = cy + innerRadius * Math.sin(endAngleRad);
        const x4 = cx + innerRadius * Math.cos(startAngleRad);
        const y4 = cy + innerRadius * Math.sin(startAngleRad);

        const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    // Build large hemicycle SVG
    const cx = 200, cy = 190;
    const outerRadius = 180, innerRadius = 70;
    let currentAngle = -90;

    let segments = '';
    sortedParties.forEach(party => {
        const count = party_composition[party] || 0;
        if (count > 0) {
            const sweepAngle = (count / total) * 180;
            const endAngle = currentAngle + sweepAngle;
            const color = PARTY_COLORS[party] || '#888888';
            const path = createArcPath(currentAngle, endAngle, innerRadius, outerRadius, cx, cy);
            const isActive = SELECTED_PARTY_FILTER === party ? 'active' : '';
            segments += `<path class="assembleia-hemicycle-segment ${isActive}" d="${path}" fill="${color}" stroke="white" stroke-width="1" onclick="filterByParty('${party}')"><title>${party}: ${count} deputados</title></path>`;
            currentAngle = endAngle;
        }
    });

    // Build legend
    let legendHtml = '<div class="assembleia-legend">';
    sortedParties.forEach(party => {
        const count = party_composition[party] || 0;
        const color = PARTY_COLORS[party] || '#888888';
        const isActive = SELECTED_PARTY_FILTER === party ? 'active' : '';
        legendHtml += `
            <div class="assembleia-legend-item ${isActive}" onclick="filterByParty('${party}')">
                <span class="assembleia-legend-color" style="background-color: ${color}"></span>
                <span class="assembleia-legend-label">${party}</span>
                <span class="assembleia-legend-count">${count}</span>
            </div>`;
    });
    // Add "All" option
    const allActive = !SELECTED_PARTY_FILTER ? 'active' : '';
    legendHtml += `
        <div class="assembleia-legend-item ${allActive}" onclick="filterByParty(null)">
            <span class="assembleia-legend-color" style="background-color: var(--text-muted)"></span>
            <span class="assembleia-legend-label">Todos</span>
            <span class="assembleia-legend-count">${total}</span>
        </div>`;
    legendHtml += '</div>';

    // Gender stats
    const maleCount = gender_breakdown['M'] || 0;
    const femaleCount = gender_breakdown['F'] || 0;
    const femalePercentage = total > 0 ? Math.round((femaleCount / total) * 100) : 0;

    // Build HTML
    let html = `
        <div class="assembleia-hemicycle-container">
            <svg class="assembleia-hemicycle" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
                ${segments}
            </svg>
            <div class="assembleia-total">
                <div class="assembleia-total-number">${total}</div>
                <div class="assembleia-total-label">Deputados</div>
            </div>
            ${legendHtml}
        </div>

        <div class="assembleia-stats">
            <div class="assembleia-stat-card">
                <div class="assembleia-stat-value">${Object.keys(party_composition).length}</div>
                <div class="assembleia-stat-label">Partidos</div>
            </div>
            <div class="assembleia-stat-card">
                <div class="assembleia-stat-value">${femalePercentage}%</div>
                <div class="assembleia-stat-label">Mulheres</div>
            </div>
            <div class="assembleia-stat-card">
                <div class="assembleia-stat-value">${Object.keys(circulo_breakdown).length}</div>
                <div class="assembleia-stat-label">Círculos</div>
            </div>
        </div>

        <h2 style="font-size: 1.5rem; margin-bottom: 16px;">Deputados${SELECTED_PARTY_FILTER ? ` - ${SELECTED_PARTY_FILTER}` : ''}</h2>

        <div class="deputados-filters">
            <input type="text" class="deputados-search" placeholder="Pesquisar deputado..." oninput="filterDeputados(this.value)" id="deputados-search-input">
            <select class="deputados-filter" onchange="filterByCirculo(this.value)" id="circulo-filter">
                <option value="">Todos os círculos</option>
                ${Object.keys(circulo_breakdown).sort().map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <select class="deputados-filter" onchange="filterByGender(this.value)" id="gender-filter">
                <option value="">Género</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
            </select>
        </div>

        <div class="deputados-grid" id="deputados-grid">
            ${renderDeputadosList(deputados)}
        </div>
    `;

    container.innerHTML = html;
}

function renderDeputadosList(deputados) {
    return deputados.map(dep => {
        const color = PARTY_COLORS[dep.party] || '#888888';
        const initials = dep.name.split(' ').map(n => n[0]).slice(0, 2).join('');

        // Gender icon
        const genderIcon = dep.gender === 'F' ? '♀️' : dep.gender === 'M' ? '♂️' : '';

        // Age display
        const ageDisplay = dep.age ? `${dep.age} anos` : '';

        // Comissões tags
        let comissoesHtml = '';
        if (dep.comissoes && dep.comissoes.length > 0) {
            comissoesHtml = '<div class="deputado-comissoes">';
            dep.comissoes.slice(0, 3).forEach(c => {
                const hasRole = c.role && c.role !== 'Vogal';
                const roleClass = hasRole ? 'role' : '';
                const label = c.acronym || c.name.replace('Comissão de ', '').substring(0, 20);
                comissoesHtml += `<span class="deputado-comissao-tag ${roleClass}" title="${c.name}${hasRole ? ' - ' + c.role : ''}">${label}</span>`;
            });
            if (dep.comissoes.length > 3) {
                comissoesHtml += `<span class="deputado-comissao-tag">+${dep.comissoes.length - 3}</span>`;
            }
            comissoesHtml += '</div>';
        }

        return `
            <div class="deputado-card" data-name="${dep.name.toLowerCase()}" data-party="${dep.party}" data-circulo="${dep.circulo}" data-gender="${dep.gender}">
                <div class="deputado-header">
                    <div class="deputado-avatar" style="background-color: ${color}">${initials}</div>
                    <div class="deputado-info">
                        <div class="deputado-name">${dep.name}</div>
                        <div class="deputado-party" style="color: ${color}">${dep.party || 'Sem partido'}</div>
                    </div>
                </div>
                <div class="deputado-meta">
                    <span class="deputado-meta-item"><span class="deputado-meta-icon">📍</span> ${dep.circulo || 'N/A'}</span>
                    ${genderIcon ? `<span class="deputado-meta-item"><span class="deputado-meta-icon">${genderIcon}</span></span>` : ''}
                    ${ageDisplay ? `<span class="deputado-meta-item">${ageDisplay}</span>` : ''}
                </div>
                ${comissoesHtml}
            </div>
        `;
    }).join('');
}

function filterByParty(party) {
    SELECTED_PARTY_FILTER = party;
    renderAssembleia();
    applyFilters();
}

function filterDeputados(searchText) {
    applyFilters();
}

function filterByCirculo(circulo) {
    applyFilters();
}

function filterByGender(gender) {
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('deputados-search-input');
    const circuloFilter = document.getElementById('circulo-filter');
    const genderFilter = document.getElementById('gender-filter');

    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    const circulo = circuloFilter ? circuloFilter.value : '';
    const gender = genderFilter ? genderFilter.value : '';

    const cards = document.querySelectorAll('.deputado-card');
    cards.forEach(card => {
        const name = card.dataset.name;
        const cardParty = card.dataset.party;
        const cardCirculo = card.dataset.circulo;
        const cardGender = card.dataset.gender;

        let show = true;

        // Party filter
        if (SELECTED_PARTY_FILTER && cardParty !== SELECTED_PARTY_FILTER) {
            show = false;
        }

        // Search filter
        if (searchText && !name.includes(searchText)) {
            show = false;
        }

        // Circulo filter
        if (circulo && cardCirculo !== circulo) {
            show = false;
        }

        // Gender filter
        if (gender && cardGender !== gender) {
            show = false;
        }

        card.style.display = show ? '' : 'none';
    });
}

// Party colors for committee visualization (official colors)
const PARTY_COLORS = {
    'PSD': '#FF6500',    // Orange
    'PS': '#FF66FF',     // Pink
    'CH': '#0f3468',     // Dark Blue (Chega)
    'IL': '#00abe4',     // Light Blue
    'L': '#C4D600',      // Lime/Chartreuse (Livre)
    'PCP': '#FF0000',    // Red
    'BE': '#EE4655',     // Red (Bloco)
    'CDS-PP': '#0071BC', // Blue
    'PAN': '#00798f',    // Teal
    'JPP': '#00ab85'     // Green (JPP)
};

// Render Comissões
function renderComissoes() {
    hideLoading('comissoes-content');
    const container = document.getElementById('comissoes-content');

    if (COMISSOES_DATA.length === 0) {
        container.innerHTML = '<div class="no-data">Nenhuma comissão encontrada.</div>';
        return;
    }

    // Build legend of parties
    const allParties = new Set();
    COMISSOES_DATA.forEach(c => {
        Object.keys(c.parties).forEach(p => allParties.add(p));
    });

    // Sort parties by political spectrum (right to left, CH at center)
    const partyOrder = ['CDS-PP', 'IL', 'PSD', 'JPP', 'CH', 'PS', 'PAN', 'L', 'BE', 'PCP'];
    const sortedParties = [...allParties].sort((a, b) => {
        const ai = partyOrder.indexOf(a);
        const bi = partyOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // Build legend (in political order)
    let legendHtml = '<div class="comissoes-legend">';
    sortedParties.forEach(party => {
        const color = PARTY_COLORS[party] || '#888888';
        legendHtml += `<div class="legend-item">
            <span class="legend-color" style="background-color: ${color}"></span>
            <span class="legend-label">${party}</span>
        </div>`;
    });
    legendHtml += '</div>';

    // Helper function to create hemicycle SVG arc path
    function createArcPath(startAngle, endAngle, innerRadius, outerRadius, cx, cy) {
        const startAngleRad = (startAngle - 90) * Math.PI / 180;
        const endAngleRad = (endAngle - 90) * Math.PI / 180;

        const x1 = cx + outerRadius * Math.cos(startAngleRad);
        const y1 = cy + outerRadius * Math.sin(startAngleRad);
        const x2 = cx + outerRadius * Math.cos(endAngleRad);
        const y2 = cy + outerRadius * Math.sin(endAngleRad);
        const x3 = cx + innerRadius * Math.cos(endAngleRad);
        const y3 = cy + innerRadius * Math.sin(endAngleRad);
        const x4 = cx + innerRadius * Math.cos(startAngleRad);
        const y4 = cy + innerRadius * Math.sin(startAngleRad);

        const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    // Build committee cards
    let html = legendHtml + '<div class="comissoes-grid">';

    COMISSOES_DATA.forEach(committee => {
        const shortName = committee.name
            .replace('Comissão de ', '')
            .replace('Comissão Parlamentar de Inquérito', 'Inquérito:')
            .replace('Comissão ', '');

        // Build hemicycle SVG
        const cx = 100, cy = 95;
        const outerRadius = 90, innerRadius = 35;
        let currentAngle = -90; // Start from left side (-90 degrees = 9 o'clock)

        let segments = '';
        sortedParties.forEach(party => {
            const count = committee.parties[party] || 0;
            if (count > 0) {
                const sweepAngle = (count / committee.total_members) * 180;
                const endAngle = currentAngle + sweepAngle;
                const color = PARTY_COLORS[party] || '#888888';
                const path = createArcPath(currentAngle, endAngle, innerRadius, outerRadius, cx, cy);
                segments += `<path class="hemicycle-segment" d="${path}" fill="${color}" stroke="white" stroke-width="0.5"><title>${party}: ${count} membros</title></path>`;
                currentAngle = endAngle;
            }
        });

        const hemicycleHtml = `
            <div class="hemicycle-container">
                <svg class="hemicycle" viewBox="0 0 200 100" preserveAspectRatio="xMidYMax meet">
                    ${segments}
                </svg>
            </div>`;

        // Build party counts
        let countsHtml = '<div class="party-counts">';
        sortedParties.forEach(party => {
            const count = committee.parties[party] || 0;
            if (count > 0) {
                const color = PARTY_COLORS[party] || '#888888';
                countsHtml += `<span class="party-count" style="color: ${color}">${party}: ${count}</span>`;
            }
        });
        countsHtml += '</div>';

        // Build initiative stats (top right corner)
        const hasAuthored = committee.ini_authored > 0;
        const statsHtml = `
            <div class="comissao-stats">
                ${hasAuthored ? `<span class="comissao-stat authored" title="Iniciativas de autoria"><span class="stat-icon">A</span>${committee.ini_authored}</span>` : ''}
                <span class="comissao-stat in-progress" title="Em analise"><span class="stat-icon">E</span>${committee.ini_in_progress}</span>
                <span class="comissao-stat approved" title="Aprovadas"><span class="stat-icon">+</span>${committee.ini_approved}</span>
                <span class="comissao-stat rejected" title="Rejeitadas"><span class="stat-icon">-</span>${committee.ini_rejected}</span>
            </div>`;

        html += `
            <div class="comissao-card" onclick="showCommitteeDetails(${committee.org_id}, '${committee.name.replace(/'/g, "\\'")}')">
                <div class="comissao-header">
                    <div class="comissao-name">${shortName}</div>
                    ${statsHtml}
                </div>
                <div class="comissao-total">${committee.total_members} membros</div>
                ${hemicycleHtml}
                ${countsHtml}
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Show committee details modal
async function showCommitteeDetails(orgId, committeeName) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'committee-modal-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) closeCommitteeModal();
    };

    overlay.innerHTML = `
        <div class="committee-modal">
            <div class="committee-modal-header">
                <div class="committee-modal-title">${committeeName}</div>
                <button class="committee-modal-close" onclick="closeCommitteeModal()">&times;</button>
            </div>
            <div class="committee-modal-body">
                <div class="committee-loading">A carregar dados...</div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Fetch committee details with initiatives and agenda
    try {
        const response = await fetch(`${API_URL}/api/orgaos/${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        const modalBody = overlay.querySelector('.committee-modal-body');
        let contentHtml = '';

        // Section 1: Initiatives (main content now!)
        const initiatives = data.initiatives || [];
        const leadInits = initiatives.filter(i => i.link_type === 'lead');
        const secondaryInits = initiatives.filter(i => i.link_type === 'secondary');

        if (initiatives.length > 0) {
            // Build status chart for lead initiatives (Competente)
            const statusOrder = [
                { key: 'submitted', label: 'Submetida', cssClass: 'status-submitted' },
                { key: 'announced', label: 'Anunciada', cssClass: 'status-announced' },
                { key: 'discussion', label: 'Em discussao', cssClass: 'status-discussion' },
                { key: 'voting', label: 'Em votacao', cssClass: 'status-voting' },
                { key: 'finalizing', label: 'A finalizar', cssClass: 'status-finalizing' },
                { key: 'approved', label: 'Aprovada', cssClass: 'status-approved' },
                { key: 'rejected', label: 'Rejeitada', cssClass: 'status-rejected' }
            ];

            // Count lead initiatives by status category
            const statusCounts = {};
            statusOrder.forEach(s => statusCounts[s.key] = 0);

            leadInits.forEach(item => {
                const ini = item.initiative;
                const statusInfo = getStatusCategory(ini.current_status);
                statusCounts[statusInfo.category]++;
            });

            // Find max for scaling
            const maxCount = Math.max(...Object.values(statusCounts), 1);
            const maxBarHeight = 80; // pixels

            // Build bar chart HTML
            let chartHtml = '<div class="committee-status-chart">';
            statusOrder.forEach(status => {
                const count = statusCounts[status.key];
                const barHeight = count > 0 ? Math.max((count / maxCount) * maxBarHeight, 8) : 4;
                chartHtml += `
                    <div class="committee-status-bar">
                        <div class="committee-status-bar-fill ${status.cssClass}" style="height: ${barHeight}px"></div>
                        <span class="committee-status-bar-count">${count}</span>
                        <span class="committee-status-bar-label">${status.label}</span>
                    </div>
                `;
            });
            chartHtml += '</div>';

            contentHtml += `
                <div class="committee-section">
                    <div class="committee-section-header">
                        <span class="committee-section-title">Iniciativas em analise</span>
                        <span class="committee-section-count">${initiatives.length}</span>
                    </div>
                    ${leadInits.length > 0 ? chartHtml : ''}
                    <div class="committee-initiatives-list">
            `;

            // Show lead initiatives first (competente)
            for (const item of leadInits) {
                const ini = item.initiative;
                const typeLabel = ini.type_description || ini.type;
                const statusClass = item.has_vote
                    ? (item.vote_result === 'Aprovado' ? 'voted' : 'rejected')
                    : 'pending';
                const statusLabel = item.has_vote
                    ? item.vote_result
                    : (ini.current_status ? ini.current_status.substring(0, 25) : 'Em analise');

                contentHtml += `
                    <div class="committee-ini-item ${ini.is_completed ? 'completed' : ''}"
                         onclick="window.open('https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${ini.ini_id}', '_blank')">
                        <div class="committee-ini-header">
                            <span class="committee-ini-type">${typeLabel} ${ini.number || ''}/XVII</span>
                            <span class="committee-ini-role">Competente</span>
                            <span class="committee-ini-status ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="committee-ini-title">${ini.title}</div>
                        <div class="committee-ini-meta">
                            <span>${ini.author_name || ''}</span>
                            ${item.has_rapporteur ? '<span>Com relator</span>' : ''}
                        </div>
                    </div>
                `;
            }

            // Then secondary initiatives (parecer)
            for (const item of secondaryInits) {
                const ini = item.initiative;
                const typeLabel = ini.type_description || ini.type;

                contentHtml += `
                    <div class="committee-ini-item secondary ${ini.is_completed ? 'completed' : ''}"
                         onclick="window.open('https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${ini.ini_id}', '_blank')">
                        <div class="committee-ini-header">
                            <span class="committee-ini-type">${typeLabel} ${ini.number || ''}/XVII</span>
                            <span class="committee-ini-role secondary">Parecer</span>
                        </div>
                        <div class="committee-ini-title">${ini.title}</div>
                    </div>
                `;
            }

            contentHtml += '</div></div>';
        }

        // Section 2: Upcoming Agenda Events
        const agendaEvents = data.agenda_events || [];
        if (agendaEvents.length > 0) {
            contentHtml += `
                <div class="committee-section">
                    <div class="committee-section-header">
                        <span class="committee-section-title">Proximas reunioes</span>
                        <span class="committee-section-count">${agendaEvents.length}</span>
                    </div>
                    <div class="committee-agenda-list">
            `;

            agendaEvents.forEach(event => {
                const dateStr = event.date ? new Date(event.date).toLocaleDateString('pt-PT', {
                    day: 'numeric', month: 'short', year: 'numeric'
                }) : '';
                const timeStr = event.time || '';

                contentHtml += `
                    <div class="committee-agenda-item">
                        <div class="committee-agenda-date">${dateStr} ${timeStr ? '- ' + timeStr : ''} ${event.location ? '- ' + event.location : ''}</div>
                        <div class="committee-agenda-title">${event.subtitle || 'Reuniao ' + (event.meeting_number || '')}</div>
                    </div>
                `;
            });

            contentHtml += '</div></div>';
        }

        // If nothing to show
        if (initiatives.length === 0 && agendaEvents.length === 0) {
            contentHtml = '<div class="committee-empty">Sem iniciativas ou reunioes registadas.</div>';
        }

        modalBody.innerHTML = contentHtml;

    } catch (error) {
        const modalBody = overlay.querySelector('.committee-modal-body');
        modalBody.innerHTML = '<div class="committee-empty">Erro ao carregar dados.</div>';
    }
}

function closeCommitteeModal() {
    const overlay = document.querySelector('.committee-modal-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommitteeModal();
});

// Render Lifecycle Funnels
function renderLifecycleFunnels() {
    // Define phase orders for each lifecycle path
    const lawsPhaseOrder = [
        'Entrada',
        'Admissão',
        'Anúncio',
        'Discussão na generalidade',
        'Votação na generalidade',
        'Baixa comissão especialidade',
        'Votação final global',
        'Enviado para promulgação',
        'Promulgação',
        'Referenda ministerial',
        'Publicação'
    ];

    const resolutionsPhaseOrder = [
        'Entrada',
        'Admissão',
        'Anúncio',
        'Discussão',
        'Votação na generalidade',
        'Votação deliberação',
        'Redação final',
        'Publicação (DAR)',
        'Publicação (DR)'
    ];

    // Phase name mappings (full name -> display name)
    const phaseDisplayNames = {
        'Entrada': 'Entrada',
        'Admissão': 'Admissão',
        'Anúncio': 'Anúncio',
        'Discussão na generalidade': 'Discussão',
        'Discussão': 'Discussão',
        'Votação na generalidade': 'Votação generalidade',
        'Baixa comissão especialidade': 'Comissão especialidade',
        'Votação final global': 'Votação final',
        'Enviado para promulgação': 'Envio promulgação',
        'Promulgação': 'Promulgação',
        'Referenda ministerial': 'Referenda',
        'Publicação': 'Lei (DR)',
        'Votação deliberação': 'Votação deliberação',
        'Redação final': 'Redação final',
        'Publicação (DAR)': 'Resolução (DAR)',
        'Publicação (DR)': 'Resolução (DR)'
    };

    // Count initiatives that reached each phase
    function countPhasesForType(initiatives, phaseOrder) {
        const counts = {};
        phaseOrder.forEach(phase => counts[phase] = 0);

        initiatives.forEach(ini => {
            const events = ini.IniEventos || [];
            const phases = new Set(events.map(e => e.Fase));

            phaseOrder.forEach(phase => {
                // Check if this initiative has reached this phase
                // Match by phase name contains (for flexibility)
                const hasPhase = events.some(e => {
                    const eventPhase = e.Fase || '';
                    return eventPhase.includes(phase) || phase.includes(eventPhase.split(' - ')[0]);
                });
                if (hasPhase) counts[phase]++;
            });
        });

        return phaseOrder.map(phase => ({
            name: phaseDisplayNames[phase] || phase,
            count: counts[phase]
        }));
    }

    // Filter initiatives by type for funnel calculation
    // Laws: J (Projeto de Lei) and P (Proposta de Lei)
    // Resolutions: R (Projeto de Resolução) and S (Proposta de Resolução)
    const lawsInitiatives = INITIATIVES_DATA.filter(ini =>
        ini.IniTipo === 'J' || ini.IniTipo === 'P'
    );
    const resolutionsInitiatives = INITIATIVES_DATA.filter(ini =>
        ini.IniTipo === 'R' || ini.IniTipo === 'S'
    );

    // Use simplified status categories for funnels
    let lawsPhases, resolutionsPhases;

    if (INITIATIVES_DATA.length > 0) {
        // Compute from data using simplified status categories
        lawsPhases = computeSimplifiedFunnel(lawsInitiatives);
        resolutionsPhases = computeSimplifiedFunnel(resolutionsInitiatives);
    } else {
        // Fallback to hardcoded values (simplified categories)
        lawsPhases = [
            { name: 'Submetida', count: 50, color: '#9ca3af' },
            { name: 'Anunciada', count: 180, color: '#38bdf8' },
            { name: 'Em discussão', count: 45, color: '#3b82f6' },
            { name: 'Em votação', count: 30, color: '#f97316' },
            { name: 'A finalizar', count: 10, color: '#8b5cf6' },
            { name: 'Aprovada', count: 14, color: '#10b981' },
            { name: 'Rejeitada', count: 5, color: '#ef4444' }
        ];

        resolutionsPhases = [
            { name: 'Submetida', count: 80, color: '#9ca3af' },
            { name: 'Anunciada', count: 250, color: '#38bdf8' },
            { name: 'Em discussão', count: 60, color: '#3b82f6' },
            { name: 'Em votação', count: 40, color: '#f97316' },
            { name: 'A finalizar', count: 15, color: '#8b5cf6' },
            { name: 'Aprovada', count: 81, color: '#10b981' },
            { name: 'Rejeitada', count: 8, color: '#ef4444' }
        ];
    }

    renderFunnelChart('laws-funnel', lawsPhases, '#3b82f6');
    renderFunnelChart('resolutions-funnel', resolutionsPhases, '#10b981');
}

function computeFunnelFromData(initiatives, type) {
    // Define phase patterns for matching
    const lawsPatterns = [
        { name: 'Entrada', pattern: /entrada/i },
        { name: 'Admissão', pattern: /admiss[ãa]o/i },
        { name: 'Anúncio', pattern: /an[úu]ncio/i },
        { name: 'Discussão', pattern: /discuss[ãa]o.*generalidade|generalidade.*discuss/i },
        { name: 'Votação generalidade', pattern: /vota[çc][ãa]o.*generalidade/i },
        { name: 'Comissão especialidade', pattern: /especialidade|comiss[ãa]o/i },
        { name: 'Votação final', pattern: /vota[çc][ãa]o.*final|final.*global/i },
        { name: 'Envio promulgação', pattern: /enviado.*promulga[çc][ãa]o|promulga[çc][ãa]o.*enviad/i },
        { name: 'Promulgação', pattern: /^promulga[çc][ãa]o$|decreto.*promulga/i },
        { name: 'Referenda', pattern: /referenda/i },
        { name: 'Lei (DR)', pattern: /publica[çc][ãa]o.*dr|di[áa]rio.*rep[úu]blica|lei.*publicad/i }
    ];

    const resolutionsPatterns = [
        { name: 'Entrada', pattern: /entrada/i },
        { name: 'Admissão', pattern: /admiss[ãa]o/i },
        { name: 'Anúncio', pattern: /an[úu]ncio/i },
        { name: 'Discussão', pattern: /discuss[ãa]o/i },
        { name: 'Votação generalidade', pattern: /vota[çc][ãa]o.*generalidade/i },
        { name: 'Votação deliberação', pattern: /delibera[çc][ãa]o|vota[çc][ãa]o.*deliber/i },
        { name: 'Redação final', pattern: /reda[çc][ãa]o.*final/i },
        { name: 'Resolução (DAR)', pattern: /dar|di[áa]rio.*assembleia/i },
        { name: 'Resolução (DR)', pattern: /dr|di[áa]rio.*rep[úu]blica/i }
    ];

    const patterns = type === 'laws' ? lawsPatterns : resolutionsPatterns;
    const counts = patterns.map(p => ({ name: p.name, count: 0 }));

    initiatives.forEach(ini => {
        const events = ini.IniEventos || [];
        const allPhases = events.map(e => (e.Fase || '').toLowerCase()).join(' ');

        patterns.forEach((p, i) => {
            if (p.pattern.test(allPhases)) {
                counts[i].count++;
            }
        });
    });

    return counts;
}

// Compute simplified funnel using status categories
function computeSimplifiedFunnel(initiatives) {
    // Define the category order and colors
    const categoryConfig = [
        { category: 'submitted', label: 'Submetida', color: '#9ca3af' },
        { category: 'announced', label: 'Anunciada', color: '#38bdf8' },
        { category: 'discussion', label: 'Em discussão', color: '#3b82f6' },
        { category: 'voting', label: 'Em votação', color: '#f97316' },
        { category: 'finalizing', label: 'A finalizar', color: '#8b5cf6' },
        { category: 'approved', label: 'Aprovada', color: '#10b981' },
        { category: 'rejected', label: 'Rejeitada', color: '#ef4444' }
    ];

    // Count initiatives by category
    const counts = {};
    categoryConfig.forEach(c => counts[c.category] = 0);

    initiatives.forEach(ini => {
        const status = ini._currentStatus || 'Desconhecido';
        const { category } = getStatusCategory(status);
        counts[category]++;
    });

    // Return array with counts and colors
    return categoryConfig.map(c => ({
        name: c.label,
        count: counts[c.category],
        color: c.color
    }));
}

function renderFunnelChart(containerId, phases, defaultColor) {
    const container = document.getElementById(containerId);
    const maxCount = Math.max(...phases.map(p => p.count));

    let html = '';
    phases.forEach(phase => {
        const heightPercent = (phase.count / maxCount) * 100;
        const height = Math.max(heightPercent * 2, 40);
        const barColor = phase.color || defaultColor;

        html += `
            <div class="phase-step">
                <div class="phase-bar" style="height: ${height}px; background: ${barColor};">
                    <div class="phase-count">${phase.count}</div>
                </div>
                <div class="phase-name">${phase.name}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render Analytics Widgets
function renderAnalyticsWidgets() {
    renderTypeWidget();
    renderMonthWidget();
    renderAuthorWidget();
}

function renderTypeWidget() {
    const container = document.getElementById('type-widget');

    // Count by type
    const typeCounts = {};
    INITIATIVES_DATA.forEach(ini => {
        const type = ini.IniTipo || 'Outro';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Type display names and colors (all 7 initiative types)
    const typeConfig = {
        'R': { name: 'Projetos de Resolução', color: 'linear-gradient(135deg, #16a34a, #15803d)' },
        'J': { name: 'Projetos de Lei', color: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
        'P': { name: 'Propostas de Lei', color: 'linear-gradient(135deg, #9333ea, #7c3aed)' },
        'D': { name: 'Proj. Deliberação', color: 'linear-gradient(135deg, #ea580c, #dc2626)' },
        'I': { name: 'Inquéritos Parl.', color: 'linear-gradient(135deg, #0891b2, #0e7490)' },
        'S': { name: 'Propostas de Resolução', color: 'linear-gradient(135deg, #059669, #047857)' },
        'A': { name: 'Apreciações Parl.', color: 'linear-gradient(135deg, #d97706, #b45309)' }
    };

    let html = '';
    Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const config = typeConfig[type] || { name: type, color: 'linear-gradient(135deg, #6b7280, #4b5563)' };
            html += `
                <div class="type-card" style="background: ${config.color}">
                    <div class="type-card-value">${count}</div>
                    <div class="type-card-label">${config.name}</div>
                </div>
            `;
        });

    container.innerHTML = html;
}

function renderMonthWidget() {
    const container = document.getElementById('month-widget');

    // Count by month using first event date (Entrada)
    const monthCounts = {};
    INITIATIVES_DATA.forEach(ini => {
        const events = ini.IniEventos || [];
        if (events.length > 0) {
            // Sort events by date and get the first one (Entrada)
            const sortedEvents = events.slice().sort((a, b) =>
                (a.DataFase || '').localeCompare(b.DataFase || '')
            );
            const firstDate = sortedEvents[0].DataFase;
            if (firstDate) {
                const monthKey = firstDate.substring(0, 7); // YYYY-MM
                monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
            }
        }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthCounts).sort();
    const maxCount = Math.max(...Object.values(monthCounts));

    // Month names in Portuguese
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    let html = '';
    sortedMonths.forEach(monthKey => {
        const count = monthCounts[monthKey];
        const heightPercent = (count / maxCount) * 100;
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        const label = `${monthName}`;

        html += `
            <div class="timeline-bar" style="height: ${heightPercent}%" title="${count} iniciativas em ${monthName} ${year}">
                <span class="timeline-bar-value">${count}</span>
                <span class="timeline-bar-label">${label}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderAuthorWidget() {
    const container = document.getElementById('author-widget');

    // Count government initiatives
    let governmentCount = 0;
    INITIATIVES_DATA.forEach(ini => {
        if (ini.IniAutorOutros && ini.IniAutorOutros.nome === 'Governo') {
            governmentCount++;
        }
    });

    // Count by parliamentary group
    const partyCounts = {};
    INITIATIVES_DATA.forEach(ini => {
        if (ini.IniAutorGruposParlamentares) {
            const groups = Array.isArray(ini.IniAutorGruposParlamentares)
                ? ini.IniAutorGruposParlamentares
                : [ini.IniAutorGruposParlamentares];
            groups.forEach(g => {
                if (g.GP) {
                    partyCounts[g.GP] = (partyCounts[g.GP] || 0) + 1;
                }
            });
        }
    });

    // Sort parties by count descending
    const sortedParties = Object.entries(partyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    // Build combined list: Government first, then parties
    const authors = [];
    if (governmentCount > 0) {
        authors.push(['Governo', governmentCount, 'government']);
    }
    sortedParties.forEach(([party, count]) => {
        authors.push([party, count, 'party']);
    });

    const maxCount = authors.length > 0 ? Math.max(...authors.map(a => a[1])) : 1;

    // Party color classes
    const partyColors = {
        'PAN': 'party-PAN',
        'CH': 'party-CH',
        'PCP': 'party-PCP',
        'L': 'party-L',
        'PS': 'party-PS',
        'BE': 'party-BE',
        'IL': 'party-IL',
        'CDS-PP': 'party-CDS-PP',
        'PSD': 'party-PSD'
    };

    let html = '';
    authors.forEach(([name, count, type]) => {
        const widthPercent = (count / maxCount) * 100;
        let barStyle = '';
        let colorClass = '';

        if (type === 'government') {
            barStyle = 'background: linear-gradient(135deg, #6b7280, #4b5563)';
        } else {
            colorClass = partyColors[name] || 'party-default';
        }

        html += `
            <div class="bar-item">
                <span class="bar-label">${name}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${widthPercent}%${barStyle ? '; ' + barStyle : ''}">
                        <span class="bar-value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p style="color: var(--text-muted); text-align: center;">Sem dados</p>';
}

// Render Initiatives
function getCurrentStatus(initiative) {
    return initiative._currentStatus || 'Desconhecido';
}

// Map type codes to short human-readable labels
function getTypeLabel(typeCode) {
    const labels = {
        'J': 'Proj. Lei',
        'P': 'Prop. Lei',
        'R': 'Proj. Res.',
        'S': 'Prop. Res.',
        'D': 'Deliberação',
        'I': 'Inquérito',
        'A': 'Apreciação'
    };
    return labels[typeCode] || typeCode;
}


// Map 60+ phases to 7 simplified categories
function getStatusCategory(status) {
    if (!status || status === 'Desconhecido') {
        return { category: 'submitted', label: 'Submetida', cssClass: 'status-submitted' };
    }

    const s = status.toLowerCase();

    // Approved (final positive states)
    if (s.includes('lei (publicação dr)') ||
        s.includes('resolução da ar (publicação dr)') ||
        s.includes('deliberação (publicação dr)')) {
        return { category: 'approved', label: 'Aprovada', cssClass: 'status-approved' };
    }

    // Rejected (final negative states)
    if (s.includes('rejeitad') ||
        s.includes('retirada') ||
        s.includes('caducad')) {
        return { category: 'rejected', label: 'Rejeitada', cssClass: 'status-rejected' };
    }

    // Finalizing (post-vote, pre-publication)
    if (s.includes('promulgação') ||
        s.includes('referenda') ||
        s.includes('redação final') ||
        s.includes('redacção final') ||
        s.includes('envio incm') ||
        s.includes('decreto (publicação)') ||
        s.includes('resolução (publicação dar)') ||
        s.includes('envio à comissão para fixação')) {
        return { category: 'finalizing', label: 'A finalizar', cssClass: 'status-finalizing' };
    }

    // Voting (critical decision points)
    if (s.includes('votação') ||
        s.includes('votacao')) {
        return { category: 'voting', label: 'Em votação', cssClass: 'status-voting' };
    }

    // In Discussion (active debate)
    if (s.includes('discussão') ||
        s.includes('discussao') ||
        s.includes('apreciação') ||
        s.includes('apreciacao') ||
        s.includes('parecer')) {
        return { category: 'discussion', label: 'Em discussão', cssClass: 'status-discussion' };
    }

    // Announced (committee assignment, waiting for discussion)
    if (s.includes('anúncio') ||
        s.includes('anuncio') ||
        s.includes('baixa comissão') ||
        s.includes('baixa comissao') ||
        s.includes('separata')) {
        return { category: 'announced', label: 'Anunciada', cssClass: 'status-announced' };
    }

    // Submitted (initial stages)
    if (s.includes('entrada') ||
        s.includes('publicação') ||
        s.includes('publicacao') ||
        s.includes('admissão') ||
        s.includes('admissao')) {
        return { category: 'submitted', label: 'Submetida', cssClass: 'status-submitted' };
    }

    // Default to announced for unknown active phases
    return { category: 'announced', label: 'Em progresso', cssClass: 'status-announced' };
}

function getAuthors(initiative) {
    const authors = [];

    if (initiative.IniAutorGruposParlamentares) {
        const groups = Array.isArray(initiative.IniAutorGruposParlamentares)
            ? initiative.IniAutorGruposParlamentares
            : [initiative.IniAutorGruposParlamentares];
        groups.forEach(g => {
            if (g.GP) authors.push(g.GP);
        });
    }

    if (initiative.IniAutorOutros && initiative.IniAutorOutros.nome) {
        authors.push(initiative.IniAutorOutros.nome);
    }

    return authors.length > 0 ? authors.join(', ') : 'N/A';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function renderInitiatives(filterType) {
    hideLoading('initiatives');

    // If there's an active search, use the search results renderer instead
    if (SEARCH_RESULTS !== null) {
        const matchingIds = new Set(SEARCH_RESULTS.map(r => r.ini_id));
        const matchedInitiatives = INITIATIVES_DATA.filter(ini => matchingIds.has(ini.IniId));
        renderSearchResults(matchedInitiatives);
        return;
    }

    const container = document.getElementById('initiatives');
    let filtered = filterType === 'all'
        ? INITIATIVES_DATA
        : INITIATIVES_DATA.filter(ini => ini.IniTipo === filterType);

    let html = '<div class="initiatives-grid">';
    filtered.forEach((ini, index) => {
        const status = getCurrentStatus(ini);
        const statusInfo = getStatusCategory(status);
        const typeClass = `type-${ini.IniTipo}`;
        const events = ini.IniEventos || [];

        html += `
            <article class="initiative-card"
                     data-ini-id="${ini.IniId}"
                     data-index="${index}"
                     onclick="toggleCardExpansion(this, event)"
                     onkeydown="handleInitiativeKeydown(event, this)"
                     tabindex="0"
                     role="button"
                     aria-expanded="false"
                     aria-label="${ini.IniTitulo}">
                <div class="initiative-header">
                    <span class="initiative-badge ${typeClass}" aria-label="Tipo ${ini.IniDescTipo}">${getTypeLabel(ini.IniTipo)}</span>
                    <span class="initiative-number">${ini.IniNr}/${ini.IniTipo}</span>
                </div>
                <div class="initiative-title">${ini.IniTitulo}</div>
                <div class="initiative-meta">
                    <span aria-label="Data de inicio"><span aria-hidden="true">📅</span> ${formatDate(ini.DataInicioleg)}</span>
                    <span aria-label="${events.length} fases"><span aria-hidden="true">📊</span> ${events.length} fases</span>
                </div>
                <div class="initiative-status ${statusInfo.cssClass}" title="${status}">
                    <span class="status-category-label">${statusInfo.label}</span>
                </div>
                <div class="initiative-details" aria-hidden="true"></div>
                <div class="expand-indicator">
                    <span class="expand-icon" aria-hidden="true">▼</span>
                    <span class="expand-text">Clique para ver ciclo de vida</span>
                </div>
            </article>
        `;
    });
    html += '</div>';

    container.innerHTML = filtered.length > 0 ? html : '<p style="text-align: center; color: #6b7280;">Nenhuma iniciativa encontrada</p>';
}

// Store current filtered data for expansion row access
let CURRENT_FILTERED_DATA = [];

function toggleCardExpansion(card, event) {
    // Prevent toggle if clicking on a link inside the card
    if (event && event.target.tagName === 'A') {
        return;
    }

    const grid = card.closest('.initiatives-grid');
    if (!grid) {
        // Fallback to old behavior if not in grid
        card.classList.toggle('expanded');
        return;
    }

    const iniId = card.dataset.iniId;
    const existingExpansion = grid.querySelector('.expansion-row');
    const wasSelected = card.classList.contains('selected');

    // Remove any existing expansion row and selection
    if (existingExpansion) {
        existingExpansion.remove();
    }
    grid.querySelectorAll('.initiative-card.selected').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-expanded', 'false');
    });

    // If clicking the same card, just close (toggle off)
    if (wasSelected) {
        return;
    }

    // Find the initiative data
    const ini = INITIATIVES_DATA.find(i => i.IniId === iniId);
    if (!ini) return;

    // Mark card as selected
    card.classList.add('selected');
    card.setAttribute('aria-expanded', 'true');

    // Create expansion row
    const expansionRow = createExpansionRow(ini);

    // Insert after the card (but grid will position it correctly)
    card.insertAdjacentElement('afterend', expansionRow);

    // Scroll to show the expansion row
    setTimeout(() => {
        expansionRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function createExpansionRow(ini) {
    const authors = getAuthors(ini);
    const events = ini.IniEventos || [];
    const status = getCurrentStatus(ini);
    const statusInfo = getStatusCategory(status);

    const div = document.createElement('div');
    div.className = 'expansion-row';
    div.innerHTML = `
        <div class="expansion-row-header">
            <div class="expansion-row-title">${ini.IniTitulo}</div>
            <button class="expansion-row-close" onclick="closeExpansionRow(event)">Fechar</button>
        </div>
        <div class="expansion-row-meta">
            <div class="expansion-row-meta-item">
                <strong>Tipo:</strong> ${ini.IniDescTipo}
            </div>
            <div class="expansion-row-meta-item">
                <strong>Autores:</strong> ${authors}
            </div>
            <div class="expansion-row-meta-item">
                <strong>Legislatura:</strong> ${ini.IniLeg}
            </div>
            <div class="expansion-row-meta-item">
                <strong>Estado:</strong> <span class="initiative-status ${statusInfo.cssClass}">${statusInfo.label}</span>
            </div>
            ${ini.IniLinkTexto ? `
            <div class="expansion-row-meta-item">
                <strong>Documento:</strong> <a href="${ini.IniLinkTexto}" target="_blank" rel="noopener">Ver PDF</a>
            </div>
            ` : ''}
        </div>
        <div class="horizontal-timeline">
            <div class="horizontal-timeline-title">Ciclo de Vida (${events.length} eventos)</div>
            ${renderHorizontalTimeline(events)}
        </div>
    `;
    return div;
}

function closeExpansionRow(event) {
    event.stopPropagation();
    const grid = document.querySelector('.initiatives-grid');
    if (!grid) return;

    const expansionRow = grid.querySelector('.expansion-row');
    if (expansionRow) {
        expansionRow.remove();
    }
    grid.querySelectorAll('.initiative-card.selected').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-expanded', 'false');
    });
}

function renderHorizontalTimeline(events) {
    if (!events || events.length === 0) {
        return '<p style="color: var(--text-muted); font-size: 0.9rem;">Sem eventos registados</p>';
    }

    // Sort events by date
    const sortedEvents = events.slice().sort((a, b) =>
        (a.DataFase || '').localeCompare(b.DataFase || '')
    );

    // Parse dates and filter valid ones
    const eventsWithDates = sortedEvents
        .map(evt => ({
            ...evt,
            date: evt.DataFase ? new Date(evt.DataFase) : null
        }))
        .filter(evt => evt.date && !isNaN(evt.date.getTime()));

    if (eventsWithDates.length === 0) {
        // Fallback to vertical timeline if no valid dates
        return `<div class="timeline-vertical">${sortedEvents.map(evt => `
            <div class="timeline-item">
                <span class="timeline-date">${formatDate(evt.DataFase)}</span>
                <span class="timeline-phase">${evt.Fase || 'N/A'}</span>
            </div>
        `).join('')}</div>`;
    }

    const firstDate = eventsWithDates[0].date;
    const lastDate = eventsWithDates[eventsWithDates.length - 1].date;
    const totalDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));

    // Calculate positions based on time
    let html = '<div class="timeline-track-container">';
    html += `<div class="timeline-dates-header">
        <span>${formatDate(eventsWithDates[0].DataFase)}</span>
        <span>${formatDate(eventsWithDates[eventsWithDates.length - 1].DataFase)}</span>
    </div>`;
    html += '<div class="timeline-track">';
    html += '<div class="timeline-track-line"></div>';

    eventsWithDates.forEach((evt, idx) => {
        const daysFromStart = (evt.date - firstDate) / (1000 * 60 * 60 * 24);
        const position = totalDays > 0 ? (daysFromStart / totalDays) * 100 : 50;

        // Clamp position between 2% and 98% to keep dots visible
        const clampedPosition = Math.max(2, Math.min(98, position));

        // Get status category for coloring
        const statusInfo = getStatusCategory(evt.Fase);

        html += `
            <div class="timeline-event" style="left: ${clampedPosition}%;" title="${evt.Fase}: ${formatDate(evt.DataFase)}">
                <div class="timeline-event-dot ${statusInfo.cssClass}"></div>
                <div class="timeline-event-label">${shortenPhaseName(evt.Fase)}</div>
                <div class="timeline-event-date">${formatShortDate(evt.DataFase)}</div>
            </div>
        `;

        // Add gap indicator between events if significant time passed
        if (idx < eventsWithDates.length - 1) {
            const nextEvt = eventsWithDates[idx + 1];
            const gapDays = (nextEvt.date - evt.date) / (1000 * 60 * 60 * 24);
            if (gapDays > 30) {
                const gapPosition = clampedPosition + ((nextEvt.date - firstDate) / (1000 * 60 * 60 * 24) / totalDays * 100 - clampedPosition) / 2;
                const gapText = gapDays > 365 ? `${Math.round(gapDays/365)}a` :
                               gapDays > 30 ? `${Math.round(gapDays/30)}m` : `${Math.round(gapDays)}d`;
                html += `<div class="timeline-gap-indicator" style="left: ${gapPosition}%;">${gapText}</div>`;
            }
        }
    });

    html += '</div></div>';
    return html;
}

function shortenPhaseName(phase) {
    if (!phase) return '';
    // Shorten common phase names
    const shortcuts = {
        'Entrada': 'Ent.',
        'Admissao': 'Adm.',
        'Anuncio': 'Anun.',
        'Baixa comissao para nova apreciacao': 'Baixa',
        'Discussao na generalidade': 'Disc.',
        'Votacao na generalidade': 'Vot.Gen.',
        'Votacao final global': 'Vot.Final',
        'Envio para promulgacao': 'Env.Prom.',
        'Promulgacao': 'Prom.',
        'Referenda': 'Ref.',
        'Publicacao': 'Pub.'
    };
    for (const [full, short] of Object.entries(shortcuts)) {
        if (phase.toLowerCase().includes(full.toLowerCase())) {
            return short;
        }
    }
    // Default: first 8 chars
    return phase.length > 8 ? phase.substring(0, 8) + '.' : phase;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function toggleCard(card, event) {
    // Prevent toggle if clicking on a link inside the card
    if (event && event.target.tagName === 'A') {
        return;
    }
    card.classList.toggle('expanded');
    const isExpanded = card.classList.contains('expanded');
    card.setAttribute('aria-expanded', isExpanded);

    const indicatorText = card.querySelector('.expand-text');
    if (indicatorText) {
        indicatorText.textContent = isExpanded ? 'Clique para ocultar' : 'Clique para ver ciclo de vida';
    }
}

function handleInitiativeKeydown(event, card) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleCard(card, event);
    }
}

function setupFilters() {
    // Type filter buttons
    const typeButtons = document.querySelectorAll('.filter-btn[data-type]');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            renderInitiatives(type);
        });
    });

    // Legislature filter buttons
    const legislatureButtons = document.querySelectorAll('.filter-btn[data-legislature]');
    legislatureButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            legislatureButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const legislature = btn.dataset.legislature;
            SELECTED_LEGISLATURE = legislature;

            // Clear search when changing legislature
            SEARCH_RESULTS = null;
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            document.getElementById('clear-search-btn').classList.remove('visible');
            document.getElementById('search-results-info').classList.remove('visible');

            // Reload data with new legislature filter
            document.getElementById('initiatives').innerHTML = '<div class="loading">A carregar iniciativas...</div>';
            INITIATIVES_DATA = [];
            await loadInitiatives();
        });
    });

    // Setup search on Enter key
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Search Functions
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-search-btn');
    const resultsInfo = document.getElementById('search-results-info');
    const query = searchInput.value.trim();

    if (!query) {
        clearSearch();
        return;
    }

    // Disable button while searching
    searchBtn.disabled = true;
    searchBtn.textContent = 'A pesquisar...';

    try {
        // Convert query to tsquery format (add :* for prefix matching)
        const tsQuery = query.split(/\s+/).map(word => word + ':*').join(' & ');

        // Build URL with legislature filter if selected
        let url = `${API_URL}/api/search?q=${encodeURIComponent(tsQuery)}&limit=100`;
        if (SELECTED_LEGISLATURE !== 'all') {
            url += `&legislature=${SELECTED_LEGISLATURE}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const results = await response.json();
        SEARCH_RESULTS = results;

        // Show results info
        resultsInfo.textContent = `Encontradas ${results.length} iniciativa${results.length !== 1 ? 's' : ''} para "${query}"`;
        resultsInfo.classList.add('visible');
        clearBtn.classList.add('visible');

        // Get the matching initiative IDs
        const matchingIds = new Set(results.map(r => r.ini_id));

        // Filter INITIATIVES_DATA to only show matching initiatives
        const matchedInitiatives = INITIATIVES_DATA.filter(ini => matchingIds.has(ini.IniId));

        // Render only matching initiatives
        renderSearchResults(matchedInitiatives);

    } catch (error) {
        console.error('Search error:', error);
        resultsInfo.textContent = `Erro na pesquisa: ${error.message}`;
        resultsInfo.classList.add('visible');
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Pesquisar';
    }
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const resultsInfo = document.getElementById('search-results-info');

    searchInput.value = '';
    SEARCH_RESULTS = null;
    clearBtn.classList.remove('visible');
    resultsInfo.classList.remove('visible');

    // Re-render with current filter (use [data-type] to avoid matching legislature buttons)
    const activeFilter = document.querySelector('.filter-btn.active[data-type]');
    const type = activeFilter ? activeFilter.dataset.type : 'all';
    renderInitiatives(type);
}

function renderSearchResults(matchedInitiatives) {
    hideLoading('initiatives');
    const container = document.getElementById('initiatives');

    // Apply current type filter to search results (use [data-type] to avoid matching legislature buttons)
    const activeFilter = document.querySelector('.filter-btn.active[data-type]');
    const filterType = activeFilter ? activeFilter.dataset.type : 'all';

    let filtered = filterType === 'all'
        ? matchedInitiatives
        : matchedInitiatives.filter(ini => ini.IniTipo === filterType);

    let html = '<div class="initiatives-grid">';
    filtered.forEach((ini, index) => {
        const status = getCurrentStatus(ini);
        const statusInfo = getStatusCategory(status);
        const typeClass = `type-${ini.IniTipo}`;
        const events = ini.IniEventos || [];

        html += `
            <article class="initiative-card"
                     data-ini-id="${ini.IniId}"
                     data-index="${index}"
                     onclick="toggleCardExpansion(this, event)"
                     onkeydown="handleInitiativeKeydown(event, this)"
                     tabindex="0"
                     role="button"
                     aria-expanded="false"
                     aria-label="${ini.IniTitulo}">
                <div class="initiative-header">
                    <span class="initiative-badge ${typeClass}" aria-label="Tipo ${ini.IniDescTipo}">${getTypeLabel(ini.IniTipo)}</span>
                    <span class="initiative-number">${ini.IniNr}/${ini.IniTipo}</span>
                </div>
                <div class="initiative-title">${ini.IniTitulo}</div>
                <div class="initiative-meta">
                    <span aria-label="Data de inicio"><span aria-hidden="true">📅</span> ${formatDate(ini.DataInicioleg)}</span>
                    <span aria-label="${events.length} fases"><span aria-hidden="true">📊</span> ${events.length} fases</span>
                </div>
                <div class="initiative-status ${statusInfo.cssClass}" title="${status}">
                    <span class="status-category-label">${statusInfo.label}</span>
                </div>
                <div class="initiative-details" aria-hidden="true"></div>
                <div class="expand-indicator">
                    <span class="expand-icon" aria-hidden="true">▼</span>
                    <span class="expand-text">Clique para ver ciclo de vida</span>
                </div>
            </article>
        `;
    });
    html += '</div>';

    container.innerHTML = filtered.length > 0 ? html : '<p style="text-align: center; color: #6b7280;">Nenhuma iniciativa encontrada</p>';
}

// Render Agenda - Grid Calendar Layout
function renderAgenda() {
    hideLoading('agenda');
    const container = document.getElementById('agenda');

    // Filter out metadata events and apply type filters
    const realEvents = AGENDA_DATA.filter(e => {
        if (e.Title.includes('Calendarização')) return false;
        const type = getAgendaEventType(e.Section, e.Title);
        return AGENDA_FILTERS[type];
    });

    // Group by date
    const grouped = {};
    realEvents.forEach(event => {
        const date = event.EventStartDate;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(event);
    });

    // Get unique dates sorted
    const dates = Object.keys(grouped).sort((a, b) => parseAgendaDate(a) - parseAgendaDate(b));

    // Take first 7 days max
    const displayDates = dates.slice(0, 7);

    // Find time range (min/max hours)
    let minHour = 24, maxHour = 0;
    displayDates.forEach(date => {
        grouped[date].forEach(event => {
            const hour = getAgendaHour(event.EventStartTime);
            if (hour !== null) {
                minHour = Math.min(minHour, hour);
                maxHour = Math.max(maxHour, hour);
            }
        });
    });

    // Default range if no times
    if (minHour > maxHour) {
        minHour = 9;
        maxHour = 18;
    }

    // Build grid
    let html = '<div class="calendar-grid">';

    // Header row - empty corner + day headers
    html += '<div class="time-label" style="border-bottom: 1px solid var(--border-light);"></div>';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    displayDates.forEach(date => {
        const dateObj = parseAgendaDate(date);
        const dayName = dateObj.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
        const dayNum = dateObj.getDate();
        const isToday = dateObj.getTime() === today.getTime();

        html += `
            <div class="calendar-day-header ${isToday ? 'today' : ''}">
                <div class="calendar-day-name">${dayName}</div>
                <div class="calendar-day-date">${dayNum}</div>
            </div>
        `;
    });

    // Time rows
    for (let hour = minHour; hour <= maxHour; hour++) {
        // Time label
        html += `<div class="time-label">${hour.toString().padStart(2, '0')}:00</div>`;

        // Cells for each day
        displayDates.forEach(date => {
            const dateObj = parseAgendaDate(date);
            const isToday = dateObj.getTime() === today.getTime();

            // Get events for this hour on this day
            const hourEvents = (grouped[date] || []).filter(e => {
                const eventHour = getAgendaHour(e.EventStartTime);
                return eventHour === hour;
            });

            // Also include all-day events (no time) in first row
            if (hour === minHour) {
                const allDayEvents = (grouped[date] || []).filter(e => !e.EventStartTime);
                hourEvents.push(...allDayEvents);
            }

            html += `<div class="grid-cell ${isToday ? 'today' : ''}">`;

            hourEvents.forEach(event => {
                const type = getAgendaEventType(event.Section, event.Title);
                const title = shortenAgendaTitle(event.Title);
                html += `<div class="agenda-event ${type}" title="${event.Title}" onclick="showAgendaInitiatives(${event.Id})">${title}</div>`;
            });

            html += '</div>';
        });
    }

    html += '</div>';
    container.innerHTML = html;
}

function parseAgendaDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

function getAgendaHour(timeStr) {
    if (!timeStr) return null;
    const hour = parseInt(timeStr.split(':')[0]);
    return hour;
}

function getAgendaEventType(section, title) {
    // Check section for specific event types
    if (section.includes('Visitas')) return 'visits';
    if (section.includes('Assistências')) return 'assistances';
    if (section.includes('Conferência')) return 'conference';
    if (section.includes('Grupo de Trabalho')) return 'workgroup';
    // Check title for specific patterns
    if (title && (title.includes('Audiências') || title.includes('Audiência'))) return 'groups';
    // Core parliamentary types
    if (section.includes('Plenário') || section.includes('Plenario')) return 'plenary';
    if (section.includes('Grupos') || section.includes('Partidos') || section.includes('DURP')) return 'groups';
    if (section.includes('Comiss')) return 'committee';
    return 'other';
}

function shortenAgendaTitle(title) {
    title = title.replace('Comissão Parlamentar de Inquérito', 'CPI');
    title = title.replace('Comissão de ', '');
    title = title.replace('Audiências do Grupo Parlamentar', 'Audiências GP');
    title = title.replace('Audiências do Grupo parlamentar', 'Audiências GP');
    title = title.replace('Grupo de Trabalho', 'GT');
    title = title.replace('Conferência de Líderes', 'Conf. Líderes');
    return title;
}

// Agenda View State
let CURRENT_AGENDA_VIEW = 'timeline';
const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 22;
const TIMELINE_TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1;

// Agenda filter state - which event types to show
const AGENDA_FILTERS = {
    plenary: true,
    committee: true,
    groups: true,
    visits: true,
    conference: true,
    workgroup: true,
    assistances: true
};

function toggleAgendaFilter(type, checked) {
    AGENDA_FILTERS[type] = checked;

    // Update visual state
    const label = document.querySelector(`.legend-filter[data-type="${type}"]`);
    if (label) {
        label.classList.toggle('active', checked);
    }

    // Re-render
    if (CURRENT_AGENDA_VIEW === 'timeline') {
        renderAgendaTimeline();
    } else {
        renderAgenda();
    }
}

function setAgendaView(view) {
    CURRENT_AGENDA_VIEW = view;

    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Re-render agenda
    if (view === 'grid') {
        renderAgenda();
    } else {
        renderAgendaTimeline();
    }
}

function timeToPercent(hour, minute = 0) {
    const totalMinutes = (hour - TIMELINE_START_HOUR) * 60 + minute;
    const totalTimelineMinutes = TIMELINE_TOTAL_HOURS * 60;
    return (totalMinutes / totalTimelineMinutes) * 100;
}

function getMinute(timeStr) {
    if (!timeStr) return 0;
    return parseInt(timeStr.split(':')[1] || 0);
}

// Render Agenda Timeline View
function renderAgendaTimeline() {
    hideLoading('agenda');
    const container = document.getElementById('agenda');
    const EVENT_HEIGHT = 18; // Height per event row in pixels

    // Filter out metadata events and apply type filters
    const realEvents = AGENDA_DATA.filter(e => {
        if (e.Title.includes('Calendarização')) return false;
        const type = getAgendaEventType(e.Section, e.Title);
        return AGENDA_FILTERS[type];
    });

    // Group by date
    const grouped = {};
    realEvents.forEach(event => {
        const date = event.EventStartDate;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(event);
    });

    // Get date range: from first to last event date (including weekends in between)
    const eventDates = Object.keys(grouped).sort((a, b) => parseAgendaDate(a) - parseAgendaDate(b));

    if (eventDates.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">Sem eventos agendados</p>';
        return;
    }

    const startDate = parseAgendaDate(eventDates[0]);
    const endDate = parseAgendaDate(eventDates[eventDates.length - 1]);

    // Generate all days from first to last event (including weekends)
    const displayDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
        displayDates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '<div class="timeline-container"><div class="timeline">';

    // Hour headers row
    html += '<div class="hour-headers">';
    html += '<div class="hour-header"></div>';
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
        html += `<div class="hour-header">${h.toString().padStart(2, '0')}h</div>`;
    }
    html += '</div>';

    // Day rows
    displayDates.forEach(date => {
        const dateObj = parseAgendaDate(date);
        const dayName = dateObj.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
        const dayNum = dateObj.getDate();
        const monthNum = dateObj.getMonth() + 1;
        const isToday = dateObj.getTime() === today.getTime();
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

        const dayEvents = grouped[date] || [];
        dayEvents.sort((a, b) => {
            const aHour = getAgendaHour(a.EventStartTime) || 0;
            const bHour = getAgendaHour(b.EventStartTime) || 0;
            return aHour - bHour;
        });

        // First pass: calculate positions and max stack depth
        let eventStacks = [];
        const eventPositions = [];

        dayEvents.forEach(event => {
            let startHour = getAgendaHour(event.EventStartTime);
            let startMin = getMinute(event.EventStartTime);
            let endHour = getAgendaHour(event.EventEndTime);
            let endMin = getMinute(event.EventEndTime);

            const isAllDay = startHour === null;
            if (isAllDay) {
                startHour = TIMELINE_START_HOUR;
                startMin = 0;
                endHour = TIMELINE_END_HOUR;
                endMin = 59;
            }

            if (endHour === null || endHour === 23) {
                endHour = TIMELINE_END_HOUR;
                endMin = 59;
            }

            if (endHour <= startHour && !isAllDay) {
                endHour = Math.min(startHour + 1, TIMELINE_END_HOUR);
                endMin = 0;
            }

            const leftPercent = timeToPercent(startHour, startMin);
            const rightPercent = timeToPercent(endHour, endMin);
            const widthPercent = Math.max(rightPercent - leftPercent, 4);

            // Find stack position
            let stackPos = 0;
            for (let s = 0; s < eventStacks.length; s++) {
                const canFit = eventStacks[s].every(e =>
                    leftPercent >= e.right || (leftPercent + widthPercent) <= e.left
                );
                if (canFit) {
                    stackPos = s;
                    break;
                }
                stackPos = s + 1;
            }

            if (!eventStacks[stackPos]) eventStacks[stackPos] = [];
            eventStacks[stackPos].push({ left: leftPercent, right: leftPercent + widthPercent });

            eventPositions.push({
                event,
                leftPercent,
                widthPercent,
                stackPos
            });
        });

        const maxStacks = eventStacks.length || 1;
        const rowHeight = maxStacks * EVENT_HEIGHT;

        const rowClasses = ['day-row'];
        if (isToday) rowClasses.push('today');
        if (isWeekend) rowClasses.push('weekend');
        html += `<div class="${rowClasses.join(' ')}" style="min-height: ${rowHeight}px;">`;
        html += `
            <div class="day-label">
                <div class="day-name">${dayName}</div>
                <div class="day-date">${dayNum}/${monthNum}</div>
            </div>
        `;

        html += `<div class="events-area" style="height: ${rowHeight}px;">`;

        // Hour grid lines
        html += '<div class="hour-grid">';
        for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
            html += '<div class="hour-line"></div>';
        }
        html += '</div>';

        // Render events with calculated positions
        eventPositions.forEach(({ event, leftPercent, widthPercent, stackPos }) => {
            const type = getAgendaEventType(event.Section, event.Title);
            const title = shortenAgendaTitle(event.Title);
            const topPx = stackPos * EVENT_HEIGHT + 1;
            const timeDisplay = event.EventStartTime ? event.EventStartTime.substring(0, 5) : '';

            html += `
                <div class="timeline-event ${type}"
                     title="${event.Title}"
                     onclick="showAgendaInitiatives(${event.Id})"
                     style="left: ${leftPercent}%; width: ${widthPercent}%; top: ${topPx}px;">
                    <span class="event-time">${timeDisplay}</span>
                    <span class="event-title">${title}</span>
                </div>
            `;
        });

        html += '</div>'; // events-area
        html += '</div>'; // day-row
    });

    html += '</div></div>';
    container.innerHTML = html;
}

// Agenda Event Modal Functions
async function showAgendaInitiatives(eventId) {
    const modal = document.getElementById('agenda-initiatives-modal');
    const modalBody = document.getElementById('modal-initiatives-body');
    const modalTitle = document.getElementById('modal-event-title');
    const modalSubtitle = document.getElementById('modal-event-subtitle');

    // Show modal with loading state
    modal.classList.add('active');
    modalBody.innerHTML = `
        <div class="modal-loading">
            <div class="modal-loading-spinner"></div>
            <div>A carregar iniciativas...</div>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/api/agenda/${eventId}/initiatives`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const { agenda_event, linked_initiatives } = data;

        // Update modal header
        modalTitle.textContent = agenda_event.title;
        modalSubtitle.textContent = `${agenda_event.date} • ${agenda_event.committee || agenda_event.section}`;

        // Helper to decode HTML entities
        function decodeHtml(html) {
            const txt = document.createElement('textarea');
            txt.innerHTML = html;
            return txt.value;
        }

        // Build modal content
        let html = '';

        // Show event description if available
        if (agenda_event.description_html) {
            const decodedHtml = decodeHtml(agenda_event.description_html);
            html += `<div class="event-description">${decodedHtml}</div>`;
        }

        // Render initiatives
        if (linked_initiatives.length === 0) {
            if (!agenda_event.description_html) {
                html += `
                    <div class="modal-empty">
                        <div class="modal-empty-icon">📋</div>
                        <div>Sem informação adicional para este evento.</div>
                    </div>
                `;
            }
        } else {
            html += `<div class="initiatives-section-title">Iniciativas Legislativas</div>`;
            linked_initiatives.forEach(ini => {
                const statusInfo = getStatusCategory(ini.status || 'Em curso');
                html += `
                    <div class="linked-initiative">
                        <div class="initiative-header-row">
                            <span class="initiative-type-badge">${ini.type_description}</span>
                            <span class="initiative-id">ID: ${ini.ini_id}</span>
                        </div>
                        <div class="initiative-title-text">${ini.title}</div>
                        <div class="initiative-meta-row">
                            ${ini.author ? `
                                <div class="initiative-meta-item">
                                    <span class="initiative-meta-label">Autor:</span> ${ini.author}
                                </div>
                            ` : ''}
                            <div class="initiative-meta-item">
                                <span class="initiative-meta-label">Estado:</span>
                                <span class="initiative-status ${statusInfo.cssClass}" title="${ini.status || ''}">${statusInfo.label}</span>
                            </div>
                        </div>
                        ${ini.text_link ? `
                            <a href="${ini.text_link}" target="_blank" class="initiative-link-btn" rel="noopener">
                                Ver detalhes completos →
                            </a>
                        ` : ''}
                    </div>
                `;
            });
        }
        modalBody.innerHTML = html;
    } catch (error) {
        console.error('Error loading agenda initiatives:', error);
        modalBody.innerHTML = `
            <div class="modal-error">
                <div class="modal-error-icon">⚠️</div>
                <div>Erro ao carregar iniciativas</div>
                <div style="font-size: 0.85rem; margin-top: 8px;">
                    ${error.message}
                </div>
            </div>
        `;
    }
}

function closeAgendaModal() {
    const modal = document.getElementById('agenda-initiatives-modal');
    modal.classList.remove('active');
}

// ===== FEEDBACK MODAL FUNCTIONS =====

function openFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.add('active');

    // Reset form
    document.getElementById('feedback-form').reset();
    document.getElementById('feedback-error').style.display = 'none';
    document.getElementById('feedback-submit-btn').disabled = false;
    document.getElementById('feedback-submit-btn').innerHTML = 'Enviar Feedback';

    // Restore form if it was replaced with success message
    const form = document.getElementById('feedback-form');
    if (form) form.style.display = 'flex';

    const successDiv = document.querySelector('.feedback-success');
    if (successDiv) successDiv.remove();

    // Focus on title field
    setTimeout(() => {
        document.getElementById('feedback-title').focus();
    }, 100);
}

function closeFeedbackModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('feedback-modal');
    modal.classList.remove('active');
}

async function submitFeedback(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('feedback-submit-btn');
    const errorDiv = document.getElementById('feedback-error');

    // Get form values
    const title = document.getElementById('feedback-title').value.trim();
    const description = document.getElementById('feedback-description').value.trim();
    const email = document.getElementById('feedback-email').value.trim();
    const honeypot = form.querySelector('[name="honeypot"]').value;

    // Hide previous errors
    errorDiv.style.display = 'none';

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> A enviar...';

    try {
        const response = await fetch(`${API_URL}/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                email: email,
                page: window.location.hash || '/',
                honeypot: honeypot
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao enviar feedback');
        }

        // Success - show thank you message
        const form = document.getElementById('feedback-form');
        form.style.display = 'none';

        const modalBody = document.getElementById('feedback-modal-body');
        const successDiv = document.createElement('div');
        successDiv.className = 'feedback-success';
        successDiv.innerHTML = `
            <div class="feedback-success-icon">✓</div>
            <h3>Obrigado pelo seu feedback!</h3>
            <p>A sua sugestao foi registada e sera analisada pela equipa.</p>
            <button class="feedback-submit" onclick="closeFeedbackModal()">Fechar</button>
        `;
        modalBody.appendChild(successDiv);

    } catch (error) {
        // Show error
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';

        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Enviar Feedback';
    }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeAgendaModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAgendaModal();
        closeFeedbackModal();
    }
});

// Initialize
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);
