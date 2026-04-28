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
        // Invalid URL
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
                { name: 'description', weight: 0.3 },
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

async function loadFallbackData() {
    toolsData = [];
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    const messageTitle = 'Failed to load tools data';
    const messageDetail = 'Please check if tools.json file exists and is properly formatted';

    if (tableBody) {
        const tr = createElement('tr');
        const td = createElement('td', { attrs: { colspan: '4' }, className: 'px-6 py-12 text-center text-gray-400' });
        td.appendChild(createIconElement('fas fa-exclamation-triangle text-4xl mb-4 opacity-50'));
        td.appendChild(createElement('p', { text: messageTitle, className: 'text-lg' }));
        td.appendChild(createElement('p', { text: messageDetail, className: 'text-sm mt-2' }));
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }
    
    if (mobileCards) {
        const wrapper = createElement('div', { className: 'p-8 text-center text-gray-400' });
        wrapper.appendChild(createIconElement('fas fa-exclamation-triangle text-4xl mb-4 opacity-50'));
        wrapper.appendChild(createElement('p', { text: messageTitle, className: 'text-lg' }));
        wrapper.appendChild(createElement('p', { text: messageDetail, className: 'text-sm mt-2' }));
        mobileCards.appendChild(wrapper);
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
            tool.description.toLowerCase().includes(lowerQuery) ||
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

    const query = aiSearchInput ? aiSearchInput.value.trim() : '';
    const queryIsEmpty = query.length === 0;

    if (toolsToDisplay.length === 0) {
        const iconName = queryIsEmpty ? 'fa-exclamation-triangle' : 'fa-search';
        const messageTitle = queryIsEmpty ? 'No tools loaded or available.' : `No tools found matching "${query}"`;
        const messageSubtext = queryIsEmpty ? '' : 'Try different keywords or check your spelling';

        if (tableBody) {
            const tr = createElement('tr');
            const td = createElement('td', { attrs: { colspan: '4' }, className: 'px-6 py-12 text-center text-gray-400' });
            td.appendChild(createIconElement(`fas ${iconName} text-4xl mb-4 opacity-50`));
            td.appendChild(createElement('p', { text: messageTitle, className: 'text-lg' }));
            if (messageSubtext) {
                td.appendChild(createElement('p', { text: messageSubtext, className: 'text-sm mt-2' }));
            }
            tr.appendChild(td);
            tableBody.appendChild(tr);
        }

        if (mobileCards) {
            const wrapper = createElement('div', { className: 'p-8 text-center text-gray-400' });
            wrapper.appendChild(createIconElement(`fas ${iconName} text-4xl mb-4 opacity-50`));
            wrapper.appendChild(createElement('p', { text: messageTitle, className: 'text-lg' }));
            if (messageSubtext) {
                wrapper.appendChild(createElement('p', { text: messageSubtext, className: 'text-sm mt-2' }));
            }
            mobileCards.appendChild(wrapper);
        }

        return;
    }

    const buildLink = (link) => {
        const anchor = createElement('a', {
            href: sanitizeUrl(link.url),
            target: '_blank',
            className: 'tool-link inline-block px-4 py-1 text-zinc-300 hover:text-zinc-100 text-sm font-medium'
        });
        if (link.tooltip) {
            anchor.setAttribute('data-tooltip', link.tooltip);
        }
        anchor.addEventListener('contextmenu', (event) => copyLink(event, link.url, link.name));
        anchor.appendChild(createIconElement('fas fa-external-link-alt mr-1 text-xs'));
        anchor.appendChild(document.createTextNode(link.name));
        return anchor;
    };

    const buildCardLink = (link) => {
        const anchor = createElement('a', {
            href: sanitizeUrl(link.url),
            target: '_blank',
            className: 'tool-link block px-4 py-3 text-zinc-300 hover:text-zinc-100 text-sm font-medium mb-2 text-center'
        });
        if (link.tooltip) {
            anchor.setAttribute('data-tooltip', link.tooltip);
        }
        anchor.addEventListener('contextmenu', (event) => copyLink(event, link.url, link.name));
        anchor.appendChild(createIconElement('fas fa-external-link-alt mr-2'));
        anchor.appendChild(document.createTextNode(link.name));
        return anchor;
    };

    toolsToDisplay.forEach((tool, index) => {
        const row = createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-row', 'transition-all', 'duration-300', 'cursor-pointer');

        const nameCell = createElement('td', { className: 'px-6 py-4' });
        const nameInner = createElement('div', { className: 'flex items-center' });
        const iconWrapper = createElement('div', { className: 'flex-shrink-0 w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mr-3' });
        iconWrapper.appendChild(createIconElement('fas fa-tools text-zinc-400 text-sm'));
        nameInner.appendChild(iconWrapper);
        nameInner.appendChild(createElement('span', { className: 'text-zinc-100 font-semibold text-lg', text: tool.tool }));
        nameCell.appendChild(nameInner);

        const descCell = createElement('td', { className: 'px-6 py-4 text-zinc-400 max-w-md' });
        descCell.appendChild(createElement('p', { className: 'leading-relaxed', text: tool.description }));

        const linksCell = createElement('td', { className: 'px-6 py-4' });
        const linksWrapper = createElement('div', { className: 'flex flex-wrap gap-2' });
        tool.links.forEach(link => linksWrapper.appendChild(buildLink(link)));
        linksCell.appendChild(linksWrapper);

        const priceCell = createElement('td', { className: 'px-6 py-4' });
        const priceBadge = createElement('span', { className: `inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getPriceColorClass(tool.price)}`, text: tool.price });
        priceBadge.insertBefore(createIconElement('fas fa-tag mr-2'), priceBadge.firstChild);
        priceCell.appendChild(priceBadge);

        row.appendChild(nameCell);
        row.appendChild(descCell);
        row.appendChild(linksCell);
        row.appendChild(priceCell);
        if (tableBody) tableBody.appendChild(row);

        const card = createElement('div', { className: 'fade-in-row p-6 border-b border-zinc-800 last:border-b-0' });
        card.style.animationDelay = `${index * 0.05}s`;

        const cardHeader = createElement('div', { className: 'flex justify-between items-start mb-4' });
        const cardHeaderInner = createElement('div', { className: 'flex items-center' });
        const cardIconWrapper = createElement('div', { className: 'flex-shrink-0 w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mr-4' });
        cardIconWrapper.appendChild(createIconElement('fas fa-tools text-zinc-400'));
        cardHeaderInner.appendChild(cardIconWrapper);

        const cardHeaderText = createElement('div');
        cardHeaderText.appendChild(createElement('h3', { className: 'text-zinc-100 font-bold text-xl', text: tool.tool }));
        const cardPriceLabel = createElement('span', { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriceColorClass(tool.price)}`, text: tool.price });
        cardPriceLabel.insertBefore(createIconElement('fas fa-tag mr-2'), cardPriceLabel.firstChild);
        cardHeaderText.appendChild(cardPriceLabel);

        cardHeaderInner.appendChild(cardHeaderText);
        card.appendChild(cardHeaderInner);

        const descWrapper = createElement('div', { className: 'mb-4' });
        descWrapper.appendChild(createElement('p', { className: 'text-zinc-400 leading-relaxed', text: tool.description }));
        card.appendChild(descWrapper);

        const cardLinksSection = createElement('div', { className: 'space-y-2' });
        const linksSectionTitle = createElement('p', { className: 'text-zinc-500 text-sm font-semibold mb-2' });
        linksSectionTitle.appendChild(createIconElement('fas fa-link mr-2'));
        linksSectionTitle.appendChild(document.createTextNode('Links:'));
        cardLinksSection.appendChild(linksSectionTitle);
        tool.links.forEach(link => cardLinksSection.appendChild(buildCardLink(link)));

        card.appendChild(cardLinksSection);
        if (mobileCards) mobileCards.appendChild(card);
    });
}


function getPriceColorClass(price) {
    const priceLower = price.toLowerCase();
    const baseClasses = 'bg-zinc-800 border rounded-full shadow-sm';
    
    if (priceLower.includes('free') && !priceLower.includes('paid') && !priceLower.includes('freemium')) {
        return `${baseClasses} border-green-900/50 text-mc-lime`;
    } else if (priceLower.includes('freemium')) {
        return `${baseClasses} border-orange-900/50 text-mc-orange`;
    } else if (priceLower.includes('paid')) {
        return `${baseClasses} border-red-900/50 text-mc-red`;
    } else {
        return `${baseClasses} border-zinc-700 text-zinc-400`;
    }
}

function copyLink(event, url, name) {
    event.preventDefault();
    
    navigator.clipboard.writeText(url).then(() => {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-zinc-900 text-zinc-200 px-4 py-2 rounded-lg shadow-lg border border-zinc-700 z-50';
        const icon = createIconElement('fas fa-check-circle mr-2');
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
    aiSearchInput.addEventListener('input', function() {
        const query = this.value;
        
        if (query.length > 0) {
            const suggestions = [];
            const queryLower = query.toLowerCase();
            
            const categories = [...new Set(toolsData.map(tool => tool.tool))];
            categories.forEach(cat => {
                if (cat.toLowerCase().includes(queryLower)) {
                    suggestions.push({
                        type: 'category',
                        text: cat,
                        icon: 'fa-tools'
                    });
                }
            });
            
            if (query.length < 20) {
                toolsData.forEach(tool => {
                    if (tool.description.toLowerCase().includes(queryLower)) {
                        suggestions.push({
                            type: 'description',
                            text: tool.tool,
                            icon: 'fa-tools'
                        });
                    }
                });
            }
            
            const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.text, item])).values());

            if (uniqueSuggestions.length > 0) {
                suggestionsList.innerHTML = '';
                uniqueSuggestions.slice(0, 5).forEach(s => {
                    const suggestionItem = createElement('div', {
                        className: 'px-4 py-3 hover:bg-zinc-800 cursor-pointer flex items-center text-zinc-400 hover:text-zinc-100 transition-colors'
                    });
                    suggestionItem.addEventListener('click', () => selectSuggestion(s.text));
                    suggestionItem.appendChild(createIconElement(`fas ${s.icon} mr-3 text-zinc-600`));
                    suggestionItem.appendChild(createElement('span', { text: s.text }));
                    suggestionsList.appendChild(suggestionItem);
                });
                searchSuggestions.classList.remove('hidden');
            } else {
                searchSuggestions.classList.add('hidden');
            }
            
            clearTimeout(window.searchTimer);
            window.searchTimer = setTimeout(() => performSearch(query), 300);
            
        } else {
            searchSuggestions.classList.add('hidden');
            clearTimeout(window.searchTimer);
            populateTable();
        }
    });

    aiSearchInput.addEventListener('focus', function() {
        if (this.value.length > 0 && toolsData.length > 0) {
            searchSuggestions.classList.remove('hidden');
        }
    });

    document.addEventListener('click', function(e) {
        if (aiSearchInput && searchSuggestions && !aiSearchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.classList.add('hidden');
        }
    });
}


function selectSuggestion(text) {
    aiSearchInput.value = text;
    searchSuggestions.classList.add('hidden');
    
    const isCategory = toolsData.some(tool => tool.tool === text);
    
    if (isCategory) {
        const filtered = toolsData.filter(tool => tool.tool === text);
        populateTable(filtered);
    } else {
        performSearch(text);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    aiSearchInput = document.getElementById('aiSearchInput');
    searchSuggestions = document.getElementById('searchSuggestions');
    suggestionsList = document.getElementById('suggestionsList');
    searchIcon = document.getElementById('searchIcon');
    
    setupEventListeners();
    loadToolsData();
});
