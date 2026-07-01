let toolsData = [];
let fuse;

let aiSearchInput, searchSuggestions, suggestionsList, searchIcon;

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.text) el.textContent = options.text;
    if (options.html) el.innerHTML = options.html;
    if (options.href) el.href = options.href;
    if (options.target) el.target = options.target;
    if (options.type) el.type = options.type;
    if (options.placeholder) el.placeholder = options.placeholder;
    if (options.id) el.id = options.id;
    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            el.dataset[key] = value;
        });
    }
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }
    return el;
}

function createIconElement(classes) {
    const icon = document.createElement('i');
    icon.className = classes;
    return icon;
}

function sanitizeUrl(url) {
    try {
        const parsed = new URL(url, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:') {
            return parsed.href;
        }
    } catch (error) {
    }
    return '#';
}

async function loadToolsData() {
    try {
        const response = await fetch('tools.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        toolsData = await response.json();
        
        const options = {
            keys: [
                { name: 'tool', weight: 0.7 },
                { name: 'description', weight: 0.3 }
            ],
            threshold: 0.4,
            includeScore: true
        };
        fuse = new Fuse(toolsData, options);
        
        populateTable();
    } catch (error) {
        console.error('Error loading tools data:', error);
        await loadFallbackData();
    }
}

async function loadFallbackData() {
    toolsData = [];
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        const tr = createElement('tr');
        const td = createElement('td', { attrs: { colspan: '4' }, className: 'px-6 py-8 text-center text-zinc-500', text: 'Failed to load tools.json' });
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }
}

function performSearch(query) {
    if (!fuse) return;
    const results = fuse.search(query);
    const filteredTools = results.map(result => result.item);
    populateTable(filteredTools);
}

function populateTable(toolsToDisplay = toolsData) {
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');

    if (tableBody) tableBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    if (toolsToDisplay.length === 0) {
        const emptyState = createElement('tr');
        const emptyCell = createElement('td', {
            attrs: { colspan: '4' },
            className: 'px-6 py-12 text-center text-zinc-500',
            text: 'No tools found.'
        });
        emptyState.appendChild(emptyCell);
        if (tableBody) tableBody.appendChild(emptyState);
        return;
    }

    const buildLink = (link) => {
        const anchor = createElement('a', {
            href: sanitizeUrl(link.url),
            target: '_blank',
            className: 'tool-link mr-2 mb-2'
        });
        if (link.tooltip) {
            anchor.setAttribute('data-tooltip', link.tooltip);
        }
        anchor.appendChild(createIconElement('fas fa-external-link-alt mr-1'));
        anchor.appendChild(document.createTextNode(link.name));
        anchor.addEventListener('contextmenu', (event) => copyLink(event, link.url, link.name));
        return anchor;
    };

    toolsToDisplay.forEach((tool) => {
        const row = createElement('tr');

        const nameCell = createElement('td', { className: 'px-6 py-3' });
        const nameInner = createElement('div', { className: 'flex items-center' });
        nameInner.appendChild(createIconElement('fas fa-tools text-zinc-500 mr-3 text-sm'));
        nameInner.appendChild(createElement('span', { className: 'text-zinc-100', text: tool.tool }));
        nameCell.appendChild(nameInner);

        const descCell = createElement('td', { className: 'px-6 py-3 text-zinc-400 text-sm' });
        descCell.appendChild(createElement('p', { text: tool.description }));

        const linksCell = createElement('td', { className: 'px-6 py-3' });
        const linksWrapper = createElement('div', { className: 'flex flex-wrap' });
        tool.links.forEach(link => linksWrapper.appendChild(buildLink(link)));
        linksCell.appendChild(linksWrapper);

        const priceCell = createElement('td', { className: 'px-6 py-3' });
        const priceLabel = createElement('div', { className: 'flex items-center text-xs text-zinc-500' });
        priceLabel.appendChild(createIconElement('fas fa-tag mr-2'));
        priceLabel.appendChild(createElement('span', { text: tool.price }));
        priceCell.appendChild(priceLabel);

        row.appendChild(nameCell);
        row.appendChild(descCell);
        row.appendChild(linksCell);
        row.appendChild(priceCell);
        if (tableBody) tableBody.appendChild(row);

        const card = createElement('div', { className: 'p-4 border-b border-zinc-800' });
        card.appendChild(createElement('h3', { className: 'text-zinc-100 font-bold mb-1', text: tool.tool }));
        card.appendChild(createElement('p', { className: 'text-zinc-400 text-sm mb-2', text: tool.description }));
        const cardLinks = createElement('div', { className: 'flex flex-wrap' });
        tool.links.forEach(link => cardLinks.appendChild(buildLink(link)));
        card.appendChild(cardLinks);
        const cardPrice = createElement('div', { className: 'text-xs text-zinc-500 mt-2' });
        cardPrice.appendChild(createIconElement('fas fa-tag mr-1'));
        cardPrice.appendChild(document.createTextNode(tool.price));
        card.appendChild(cardPrice);
        if (mobileCards) mobileCards.appendChild(card);
    });
}

function copyLink(event, url, name) {
    event.preventDefault();
    navigator.clipboard.writeText(url).then(() => {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-zinc-800 text-zinc-200 px-3 py-1 border border-zinc-700 text-xs';
        notification.textContent = `Copied ${name}`;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
    });
}

function setupEventListeners() {
    aiSearchInput.addEventListener('input', function() {
        const query = this.value;
        if (query.length > 0) {
            suggestionsList.innerHTML = '';
            const categories = [...new Set(toolsData.map(tool => tool.tool))];
            const filteredCats = categories.filter(cat => cat.toLowerCase().includes(query.toLowerCase()));
            
            if (filteredCats.length > 0) {
                filteredCats.slice(0, 5).forEach(cat => {
                    const item = createElement('div', {
                        className: 'px-4 py-2 hover:bg-zinc-800 cursor-pointer text-zinc-400 text-sm',
                        text: cat
                    });
                    item.addEventListener('click', () => {
                        aiSearchInput.value = cat;
                        searchSuggestions.classList.add('hidden');
                        performSearch(cat);
                    });
                    suggestionsList.appendChild(item);
                });
                searchSuggestions.classList.remove('hidden');
            } else {
                searchSuggestions.classList.add('hidden');
            }
            performSearch(query);
        } else {
            searchSuggestions.classList.add('hidden');
            populateTable();
        }
    });

    document.addEventListener('click', (e) => {
        if (aiSearchInput && !aiSearchInput.contains(e.target)) {
            searchSuggestions.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    aiSearchInput = document.getElementById('aiSearchInput');
    searchSuggestions = document.getElementById('searchSuggestions');
    suggestionsList = document.getElementById('suggestionsList');
    setupEventListeners();
    loadToolsData();
});
