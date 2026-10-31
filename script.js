let toolsData = [];
let fuse;
const linkTooltipCache = new Map();
let activeMobileTooltip = null;
let mobileTooltipTimer = null;

let SearchInput, searchSuggestions, suggestionsList;

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.text) el.textContent = options.text;
    if (options.href) el.href = options.href;
    if (options.target) el.target = options.target;
    return el;
}

function createIconElement(classes) {
    const icon = document.createElement('i');
    icon.className = classes;
    return icon;
}

function getLinkDescription(url) {
    if (!linkTooltipCache.has(url)) {
        const descriptionPromise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    return null;
                }
                return response.text();
            })
            .then(html => {
                if (!html) {
                    return null;
                }

                const page = new DOMParser().parseFromString(html, 'text/html');
                return page.querySelector('meta[property="og:description"]')?.content.trim()
                    || page.querySelector('meta[name="description"]')?.content.trim()
                    || page.querySelector('meta[name="twitter:description"]')?.content.trim()
                    || null;
            })
            .catch(() => null);

        linkTooltipCache.set(url, descriptionPromise);
    }

    return linkTooltipCache.get(url);
}

function hideMobileTooltip() {
    if (mobileTooltipTimer) {
        clearTimeout(mobileTooltipTimer);
        mobileTooltipTimer = null;
    }

    activeMobileTooltip?.classList.remove('tooltip-visible');
    activeMobileTooltip = null;
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
                { name: 'keywords', weight: 0.5 }
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

function appendEmptyState(container, { iconName, title, detail, isTableCell = false }) {
    const state = createElement(isTableCell ? 'td' : 'div', {
        className: isTableCell ? 'empty-state-cell' : 'empty-state'
    });
    if (isTableCell) {
        state.setAttribute('colspan', '2');
    }

    state.appendChild(createIconElement(`fas ${iconName} empty-state-icon`));
    state.appendChild(createElement('p', { text: title, className: 'empty-state-title' }));
    if (detail) {
        state.appendChild(createElement('p', { text: detail, className: 'empty-state-detail' }));
    }

    if (isTableCell) {
        const row = createElement('tr');
        row.appendChild(state);
        container.appendChild(row);
    } else {
        container.appendChild(state);
    }
}

async function loadFallbackData() {
    toolsData = [];
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    const emptyState = {
        iconName: 'fa-exclamation-triangle',
        title: 'Failed to load tools data',
        detail: 'Please check if tools.json file exists and is properly formatted'
    };

    if (tableBody) {
        appendEmptyState(tableBody, { ...emptyState, isTableCell: true });
    }

    if (mobileCards) {
        appendEmptyState(mobileCards, emptyState);
    }
}

function performSearch(query) {
    const queryTrimmed = query.trim();
    
    if (!queryTrimmed) {
        populateTable();
        return;
    }
    
    if (fuse) {
        const results = fuse.search(queryTrimmed);
        const toolsToDisplay = results.map(result => result.item);
        populateTable(toolsToDisplay);
    } else {
        const lowerQuery = queryTrimmed.toLowerCase();
        const filtered = toolsData.filter(tool => 
            tool.tool.toLowerCase().includes(lowerQuery) || 
            (tool.keywords && tool.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
        );
        populateTable(filtered);
    }
}


function populateTable(toolsToDisplay = toolsData) {
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');

    if (tableBody) {
        tableBody.innerHTML = '';
    }
    if (mobileCards) {
        mobileCards.innerHTML = '';
    }

    const query = SearchInput ? SearchInput.value.trim() : '';
    const queryIsEmpty = query.length === 0;

    if (toolsToDisplay.length === 0) {
        const iconName = queryIsEmpty ? 'fa-exclamation-triangle' : 'fa-search';
        const messageTitle = queryIsEmpty ? 'No tools loaded or available.' : `No tools found matching "${query}"`;
        const messageSubtext = queryIsEmpty ? '' : 'Try different keywords or check your spelling';

        if (tableBody) {
            appendEmptyState(tableBody, {
                iconName,
                title: messageTitle,
                detail: messageSubtext,
                isTableCell: true
            });
        }

        if (mobileCards) {
            appendEmptyState(mobileCards, {
                iconName,
                title: messageTitle,
                detail: messageSubtext
            });
        }

        return;
    }

    const buildLink = (link, variant) => {
        const url = sanitizeUrl(link.url);
        const anchor = createElement('a', {
            href: url,
            target: '_blank',
            className: `tool-link tool-link--${variant}`
        });
        if (link.tooltip) {
            anchor.setAttribute('data-tooltip', link.tooltip);
        }
        const loadTooltip = () => {
            if (url === '#') {
                return Promise.resolve(null);
            }
            return getLinkDescription(url).then(description => {
                if (description) {
                    anchor.setAttribute('data-tooltip', description);
                } else if (!anchor.hasAttribute('data-tooltip')) {
                    anchor.setAttribute('data-tooltip', 'Description unavailable');
                }
            });
        };
        anchor.addEventListener('mouseenter', loadTooltip, { once: true });
        anchor.addEventListener('focus', loadTooltip, { once: true });
        anchor.addEventListener('click', event => {
            const isTouchInput = window.matchMedia('(hover: none), (pointer: coarse)').matches;
            if (!isTouchInput) {
                return;
            }

            if (activeMobileTooltip === anchor) {
                hideMobileTooltip();
                return;
            }

            event.preventDefault();
            hideMobileTooltip();
            activeMobileTooltip = anchor;
            anchor.classList.add('tooltip-visible');
            if (!anchor.hasAttribute('data-tooltip')) {
                anchor.setAttribute('data-tooltip', 'Loading description...');
            }
            loadTooltip();
            mobileTooltipTimer = setTimeout(hideMobileTooltip, 15000);
        });
        anchor.addEventListener('contextmenu', (event) => copyLink(event, link.url, link.name));
        anchor.appendChild(createIconElement('fas fa-external-link-alt external-link-icon'));
        anchor.appendChild(document.createTextNode(link.name));
        return anchor;
    };

    toolsToDisplay.forEach((tool, index) => {
        const row = createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('tool-row', 'fade-in-row');

        const nameCell = createElement('td', { className: 'table-cell' });
        nameCell.appendChild(createElement('span', { className: 'tool-name-text', text: tool.tool }));

        const linksCell = createElement('td', { className: 'table-cell' });
        const linksWrapper = createElement('div', { className: 'tool-links' });
        tool.links.forEach(link => linksWrapper.appendChild(buildLink(link, 'inline')));
        linksCell.appendChild(linksWrapper);

        row.appendChild(nameCell);
        row.appendChild(linksCell);
        if (tableBody) tableBody.appendChild(row);

        const card = createElement('div', { className: 'tool-card fade-in-row' });
        card.style.animationDelay = `${index * 0.05}s`;

        const cardHeaderInner = createElement('div', { className: 'tool-card-header' });
        const cardIconWrapper = createElement('div', { className: 'tool-card-icon' });
        cardIconWrapper.appendChild(createIconElement('fas fa-tools'));
        cardHeaderInner.appendChild(cardIconWrapper);

        cardHeaderInner.appendChild(createElement('h3', { className: 'tool-card-title', text: tool.tool }));
        card.appendChild(cardHeaderInner);

        const cardLinksSection = createElement('div', { className: 'tool-card-links' });
        const linksSectionTitle = createElement('p', { className: 'tool-card-links-title' });
        linksSectionTitle.appendChild(createIconElement('fas fa-link heading-icon'));
        linksSectionTitle.appendChild(document.createTextNode('Links:'));
        cardLinksSection.appendChild(linksSectionTitle);
        tool.links.forEach(link => cardLinksSection.appendChild(buildLink(link, 'card')));

        card.appendChild(cardLinksSection);
        if (mobileCards) mobileCards.appendChild(card);
    });
}

function copyLink(event, url, name) {
    event.preventDefault();
    
    navigator.clipboard.writeText(url).then(() => {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        const icon = createIconElement('fas fa-check-circle copy-notification-icon');
        notification.appendChild(icon);
        notification.appendChild(document.createTextNode(`Copied ${name} link!`));
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy link:', err);
    });
}


function setupEventListeners() {
    document.addEventListener('click', event => {
        if (activeMobileTooltip && !activeMobileTooltip.contains(event.target)) {
            hideMobileTooltip();
        }
    });

    SearchInput.addEventListener('input', function() {
        const query = this.value;
        
        if (query.length > 0) {
            const suggestions = [];
            const queryLower = query.toLowerCase();
            
            const categories = [...new Set(toolsData.map(tool => tool.tool))];
            categories.forEach(cat => {
                if (cat.toLowerCase().includes(queryLower)) {
                    suggestions.push({
                        text: cat
                    });
                }
            });
            
            const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.text, item])).values());

            if (uniqueSuggestions.length > 0) {
                suggestionsList.innerHTML = '';
                uniqueSuggestions.slice(0, 5).forEach(s => {
                    const suggestionItem = createElement('div', {
                        className: 'search-suggestion'
                    });
                    suggestionItem.addEventListener('click', () => selectSuggestion(s.text));
                    suggestionItem.appendChild(createElement('span', { text: s.text }));
                    suggestionsList.appendChild(suggestionItem);
                });
                searchSuggestions.classList.remove('is-hidden');
            } else {
                searchSuggestions.classList.add('is-hidden');
            }
            
            clearTimeout(window.searchTimer);
            window.searchTimer = setTimeout(() => performSearch(query), 300);
            
        } else {
            searchSuggestions.classList.add('is-hidden');
            clearTimeout(window.searchTimer);
            populateTable();
        }
    });

    SearchInput.addEventListener('focus', function() {
        if (this.value.length > 0 && toolsData.length > 0) {
            searchSuggestions.classList.remove('is-hidden');
        }
    });

    document.addEventListener('click', function(e) {
        if (SearchInput && searchSuggestions && !SearchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.classList.add('is-hidden');
        }
    });
}


function selectSuggestion(text) {
    SearchInput.value = text;
    searchSuggestions.classList.add('is-hidden');
    
    const isCategory = toolsData.some(tool => tool.tool === text);
    
    if (isCategory) {
        const filtered = toolsData.filter(tool => tool.tool === text);
        populateTable(filtered);
    } else {
        performSearch(text);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    SearchInput = document.getElementById('SearchInput');
    searchSuggestions = document.getElementById('searchSuggestions');
    suggestionsList = document.getElementById('suggestionsList');
    setupEventListeners();
    loadToolsData();
});
