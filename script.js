let toolsData = [];
let fuse;
let searchTimer = null;
let activeMobileTooltip = null;
let mobileTooltipTimer = null;
let SearchInput;
let searchSuggestions;
let suggestionsList;

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

function hideTooltip() {
    if (mobileTooltipTimer) {
        clearTimeout(mobileTooltipTimer);
        mobileTooltipTimer = null;
    }

    activeMobileTooltip?.classList.remove('tooltip-visible');
    activeMobileTooltip?.setAttribute('aria-expanded', 'false');
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
                { name: 'keywords', weight: 0.5 },
                { name: 'links.name', weight: 0.6 },
                { name: 'links.url', weight: 0.4 },
                { name: 'links.tooltip', weight: 0.3 }
            ],
            threshold: 0.4,
            includeScore: true
        };
        fuse = new Fuse(toolsData, options);
        
        renderCards();
    } catch (error) {
        console.error('Error loading tools data:', error);
        await loadFallbackData();
    }
}

function appendEmptyState(container, { iconName, title, detail }) {
    const state = createElement('div', { className: 'empty-state' });
    state.appendChild(createIconElement(`fas ${iconName} empty-state-icon`));
    state.appendChild(createElement('p', { text: title, className: 'empty-state-title' }));
    if (detail) {
        state.appendChild(createElement('p', { text: detail, className: 'empty-state-detail' }));
    }

    container.appendChild(state);
}

async function loadFallbackData() {
    toolsData = [];
    const toolCards = document.getElementById('toolCards');

    if (!toolCards) {
        console.error('Tool rendering failed: tool cards container is missing.');
        return;
    }

    appendEmptyState(toolCards, {
        iconName: 'fa-exclamation-triangle',
        title: 'Failed to load tools data',
        detail: 'Please check if tools.json file exists and is properly formatted'
    });
}

function performSearch(query) {
    const queryTrimmed = query.trim();
    
    if (!queryTrimmed) {
        renderCards();
        return;
    }
    
    if (fuse) {
        const results = fuse.search(queryTrimmed);
        const matchingLinks = new Map();
        const toolsToDisplay = results.map(result => {
            const links = result.item.links.filter(link =>
                [link.name, link.url, link.tooltip].some(value =>
                    value?.toLowerCase().includes(queryTrimmed.toLowerCase())
                )
            );
            if (links.length > 0 &&
                !result.item.tool.toLowerCase().includes(queryTrimmed.toLowerCase()) &&
                !result.item.keywords?.some(keyword => keyword.toLowerCase().includes(queryTrimmed.toLowerCase()))) {
                matchingLinks.set(result.item, links);
            }
            return result.item;
        });
        renderCards(toolsToDisplay, { matchingLinks });
    } else {
        const lowerQuery = queryTrimmed.toLowerCase();
        const matchingLinks = new Map();
        const filtered = toolsData.filter(tool => {
            const links = tool.links.filter(link =>
                [link.name, link.url, link.tooltip].some(value =>
                    value?.toLowerCase().includes(lowerQuery)
                )
            );
            const matchesTool = tool.tool.toLowerCase().includes(lowerQuery) ||
                (tool.keywords && tool.keywords.some(k => k.toLowerCase().includes(lowerQuery)));
            if (!matchesTool && links.length > 0) {
                matchingLinks.set(tool, links);
            }
            return matchesTool || links.length > 0;
        });
        renderCards(filtered, { matchingLinks });
    }
}


function renderCards(toolsToDisplay = toolsData, { expandedTools = new Set(), matchingLinks = null } = {}) {
    const toolCards = document.getElementById('toolCards');

    if (toolCards) {
        toolCards.innerHTML = '';
    }

    const query = SearchInput ? SearchInput.value.trim() : '';
    const queryIsEmpty = query.length === 0;

    if (toolsToDisplay.length === 0) {
        const iconName = queryIsEmpty ? 'fa-exclamation-triangle' : 'fa-search';
        const messageTitle = queryIsEmpty ? 'No tools loaded or available.' : `No tools found matching "${query}"`;
        const messageSubtext = queryIsEmpty ? '' : 'Try different keywords or check your spelling';

        if (toolCards) {
            appendEmptyState(toolCards, {
                iconName,
                title: messageTitle,
                detail: messageSubtext
            });
        }

        return;
    }

    const buildLink = link => {
        const wrapper = createElement('span', { className: 'tool-link-wrapper tool-link-wrapper--card' });
        const anchor = createElement('a', {
            href: sanitizeUrl(link.url),
            target: '_blank',
            className: 'tool-link tool-link--card'
        });
        if (link.tooltip) {
            anchor.setAttribute('data-tooltip', link.tooltip);
            anchor.setAttribute('aria-expanded', 'false');
        } else {
            anchor.removeAttribute('data-tooltip');
        }
        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (isTouchDevice) {
            anchor.addEventListener('click', event => {
                if (!link.tooltip) {
                    return;
                }

                if (activeMobileTooltip === anchor) {
                    hideTooltip();
                    return;
                }

                event.preventDefault();
                hideTooltip();
                activeMobileTooltip = anchor;
                anchor.classList.add('tooltip-visible');
                anchor.setAttribute('aria-expanded', 'true');
                mobileTooltipTimer = setTimeout(hideTooltip, 15000);
            });
        }
        anchor.appendChild(createIconElement('fas fa-external-link-alt external-link-icon'));
        anchor.appendChild(document.createTextNode(link.name));

        wrapper.appendChild(anchor);

        return wrapper;
    };

    toolsToDisplay.forEach((tool, index) => {
        const card = createElement('div', { className: 'tool-card' });

        const cardHeaderInner = createElement('div', { className: 'tool-card-header' });
        const title = createElement('h3', { className: 'tool-card-title' });
        const toggle = createElement('button', { className: 'tool-card-toggle' });
        const linksId = `tool-links-${index}`;
        toggle.type = 'button';
        const isExpanded = expandedTools.has(tool);
        toggle.setAttribute('aria-expanded', String(isExpanded));
        toggle.setAttribute('aria-controls', linksId);
        toggle.appendChild(document.createTextNode(tool.tool));
        toggle.appendChild(createIconElement('fas fa-chevron-down tool-card-toggle-icon'));
        title.appendChild(toggle);
        cardHeaderInner.appendChild(title);
        card.appendChild(cardHeaderInner);

        const cardLinksSection = createElement('div', { className: 'tool-card-links' });
        cardLinksSection.id = linksId;
        cardLinksSection.setAttribute('aria-hidden', String(!isExpanded));
        cardLinksSection.inert = !isExpanded;
        const cardLinksContent = createElement('div', { className: 'tool-card-links-inner' });
        cardLinksContent.style.overflow = isExpanded ? 'visible' : 'hidden';
        const linksSectionTitle = createElement('p', { className: 'tool-card-links-title' });
        linksSectionTitle.appendChild(createIconElement('fas fa-link heading-icon'));
        linksSectionTitle.appendChild(document.createTextNode('Links:'));
        cardLinksContent.appendChild(linksSectionTitle);
        const linksToRender = matchingLinks?.get(tool) ?? tool.links;
        linksToRender.forEach(link => cardLinksContent.appendChild(buildLink(link)));
        cardLinksSection.appendChild(cardLinksContent);

        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            const linksInner = cardLinksSection.firstElementChild;
            if (isExpanded) {
                linksInner.style.overflow = 'hidden';
            }
            toggle.setAttribute('aria-expanded', String(!isExpanded));
            cardLinksSection.setAttribute('aria-hidden', String(isExpanded));
            cardLinksSection.inert = isExpanded;
            cardLinksSection.style.zIndex = isExpanded ? '' : '1';
            if (!isExpanded) {
                const revealTooltips = event => {
                    if (event.target !== cardLinksSection || event.propertyName !== 'grid-template-rows') {
                        return;
                    }

                    cardLinksSection.removeEventListener('transitionend', revealTooltips);
                    if (toggle.getAttribute('aria-expanded') === 'true') {
                        linksInner.style.overflow = 'visible';
                    }
                };
                cardLinksSection.addEventListener('transitionend', revealTooltips);
            }
        });

        card.appendChild(cardLinksSection);
        if (toolCards) toolCards.appendChild(card);
    });
}

function setupEventListeners() {
    document.addEventListener('click', event => {
        if (activeMobileTooltip && !activeMobileTooltip.contains(event.target)) {
            hideTooltip();
        }
    });

    SearchInput.addEventListener('input', function() {
        const query = this.value;
        
        if (query.length > 0) {
            const suggestions = [];
            const queryLower = query.toLowerCase();
            
            toolsData.forEach(tool => {
                if (tool.tool.toLowerCase().includes(queryLower)) {
                    suggestions.push({ text: tool.tool });
                }
                tool.links.forEach(link => {
                    if (link.name.toLowerCase().includes(queryLower)) {
                        suggestions.push({ text: link.name });
                    }
                });
            });
            
            const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.text, item])).values());

            if (uniqueSuggestions.length > 0) {
                suggestionsList.innerHTML = '';
                uniqueSuggestions.slice(0, 8).forEach(s => {
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
            
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => performSearch(query), 300);
            
        } else {
            searchSuggestions.classList.add('is-hidden');
            clearTimeout(searchTimer);
            renderCards();
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

function setupDesktopHeader() {
    const header = document.querySelector('.page-header-layout');
    if (!header) {
        return;
    }

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const updateHeader = () => {
        const isCompact = header.classList.contains('is-compact');
        if (!desktopQuery.matches) {
            header.classList.remove('is-compact');
        } else if (!isCompact && window.scrollY > 140) {
            header.classList.add('is-compact');
        } else if (isCompact && window.scrollY < 60) {
            header.classList.remove('is-compact');
        }
    };

    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
    updateHeader();
}

function selectSuggestion(text) {
    SearchInput.value = text;
    searchSuggestions.classList.add('is-hidden');
    
    clearTimeout(searchTimer);

    const categoryMatches = toolsData.filter(tool => tool.tool === text);
    if (categoryMatches.length > 0) {
        renderCards(categoryMatches, { expandedTools: new Set(categoryMatches) });
    } else {
        const matchingLinks = new Map();
        const matchingTools = toolsData.filter(tool => {
            const links = tool.links.filter(link =>
                link.name === text || link.url === text || link.tooltip === text
            );
            if (links.length > 0) {
                matchingLinks.set(tool, links);
                return true;
            }
            return false;
        });
        renderCards(matchingTools, {
            expandedTools: new Set(matchingTools),
            matchingLinks
        });
    }
}


function init() {
    const searchInput = document.getElementById('SearchInput');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    const suggestionList = document.getElementById('suggestionsList');
    if (!searchInput || !suggestionsContainer || !suggestionList) {
        console.error('Search initialization failed: required search elements are missing.');
        return;
    }

    SearchInput = searchInput;
    searchSuggestions = suggestionsContainer;
    suggestionsList = suggestionList;
    setupDesktopHeader();
    setupEventListeners();
    loadToolsData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
