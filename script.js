let toolsData = [];
let fuse;

let aiSearchInput, searchSuggestions, suggestionsList, searchIcon;

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
    
    const errorMessage = `
        <i class="fas fa-exclamation-triangle text-4xl mb-4 opacity-50"></i>
        <p class="text-lg">Failed to load tools data</p>
        <p class="text-sm mt-2">Please check if tools.json file exists and is properly formatted</p>
    `;

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                    ${errorMessage}
                </td>
            </tr>
        `;
    }
    
    if (mobileCards) {
        mobileCards.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                ${errorMessage}
            </div>
        `;
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
    
    if (tableBody) tableBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';
    
    const query = aiSearchInput ? aiSearchInput.value.trim() : '';
    
    if (toolsToDisplay.length === 0) {
        
        const message = query 
            ? `<p class="text-lg">No tools found matching "${query}"</p><p class="text-sm mt-2">Try different keywords or check your spelling</p>`
            : `<p class="text-lg">No tools loaded or available.</p>`;
        
        const icon = query ? 'fa-search' : 'fa-exclamation-triangle';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                        <i class="fas ${icon} text-4xl mb-4 opacity-50"></i>
                        ${message}
                    </td>
                </tr>
            `;
        }
        if (mobileCards) {
            mobileCards.innerHTML = `
                <div class="p-8 text-center text-gray-400">
                    <i class="fas ${icon} text-4xl mb-4 opacity-50"></i>
                    ${message}
                </div>
            `;
        }
        return;
    }
    
    toolsToDisplay.forEach((tool, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-row', 'transition-all', 'duration-300', 'cursor-pointer');
        
        const linksHtml = tool.links.map(link => {
            const tooltipAttr = link.tooltip ? `data-tooltip="${link.tooltip.replace(/"/g, '&quot;')}"` : '';
            return `<a href="${link.url}" target="_blank" class="tool-link inline-block px-4 py-1 text-zinc-300 hover:text-zinc-100 text-sm font-medium" ${tooltipAttr} oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-1 text-xs"></i>${link.name}
                    </a>`;
        }).join('');
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mr-3">
                        <i class="fas fa-tools text-zinc-400 text-sm"></i>
                    </div>
                    <span class="text-zinc-100 font-semibold text-lg">${tool.tool}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-zinc-400 max-w-md">
                <p class="leading-relaxed">${tool.description}</p>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-2">
                    ${linksHtml}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getPriceColorClass(tool.price)}">
                    <i class="fas fa-tag mr-2"></i>${tool.price}
                </span>
            </td>
        `;
        
        if (tableBody) tableBody.appendChild(row);
        
        const card = document.createElement('div');
        card.classList.add('fade-in-row', 'p-6', 'border-b', 'border-zinc-800', 'last:border-b-0');
        card.style.animationDelay = `${index * 0.05}s`;
        
        const mobileLinksHtml = tool.links.map(link => {
            const tooltipAttr = link.tooltip ? `data-tooltip="${link.tooltip.replace(/"/g, '&quot;')}"` : '';
            return `<a href="${link.url}" target="_blank" class="tool-link block px-4 py-3 text-zinc-300 hover:text-zinc-100 text-sm font-medium mb-2 text-center" ${tooltipAttr} oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-2"></i>${link.name}
                    </a>`;
        }).join('');
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mr-4">
                        <i class="fas fa-tools text-zinc-400"></i>
                    </div>
                    <div>
                        <h3 class="text-zinc-100 font-bold text-xl">${tool.tool}</h3>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriceColorClass(tool.price)}">
                            <i class="fas fa-tag mr-2"></i>${tool.price}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-zinc-400 leading-relaxed">${tool.description}</p>
            </div>
            
            <div class="space-y-2">
                <p class="text-zinc-500 text-sm font-semibold mb-2">
                    <i class="fas fa-link mr-2"></i>Links:
                </p>
                ${mobileLinksHtml}
            </div>
        `;
        
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
        notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Copied ${name} link!`;
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
                suggestionsList.innerHTML = uniqueSuggestions.slice(0, 5).map(s => `
                    <div class="px-4 py-3 hover:bg-zinc-800 cursor-pointer flex items-center text-zinc-400 hover:text-zinc-100 transition-colors" onclick="selectSuggestion('${s.text}')">
                        <i class="fas ${s.icon} mr-3 text-zinc-600"></i>
                        <span>${s.text}</span>
                    </div>
                `).join('');
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
