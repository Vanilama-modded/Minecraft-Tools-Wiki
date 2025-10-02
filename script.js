let toolsData = [];

// Load tools from JSON file
async function loadToolsData() {
    try {
        const response = await fetch('tools.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        toolsData = await response.json();
        populateTable();
    } catch (error) {
        console.error('Error loading tools data:', error);
        // Fallback to hardcoded data if JSON loading fails
        await loadFallbackData();
    }
}

// Fallback data in case JSON loading fails
async function loadFallbackData() {
    // This would contain the same data as the JSON file but hardcoded
    // For now, we'll use an empty array and show an error message
    toolsData = [];
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-exclamation-triangle text-4xl mb-4 opacity-50"></i>
                <p class="text-lg">Failed to load tools data</p>
                <p class="text-sm mt-2">Please check if tools.json file exists and is properly formatted</p>
            </td>
        </tr>
    `;
    
    mobileCards.innerHTML = `
        <div class="p-8 text-center text-gray-400">
            <i class="fas fa-exclamation-triangle text-4xl mb-4 opacity-50"></i>
            <p class="text-lg">Failed to load tools data</p>
            <p class="text-sm mt-2">Please check if tools.json file exists and is properly formatted</p>
        </div>
    `;
}

// AI-powered search functionality
const aiSearchInput = document.getElementById('aiSearchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const suggestionsList = document.getElementById('suggestionsList');

// Keywords mapping for AI search
const searchKeywords = {
    'command': ['command', 'generate', 'create', 'custom', 'mcstacker', 'gamergeeks'],
    'generator': ['generator', 'generate', 'create', 'build', 'make'],
    'structure': ['structure', 'find', 'locate', 'seed', 'chunkbase', 'biome'],
    'map': ['map', 'picture', 'image', 'upload', 'mc-map'],
    'armor': ['armor', 'stand', 'customize', 'haselkern'],
    'obj': ['obj', 'schematic', 'worldedit', 'litematica', 'convert'],
    'update': ['update', 'convert', 'version', 'papermc', 'command'],
    'wiki': ['wiki', 'information', 'guide', 'vanilla', 'minecraft'],
    'skin': ['skin', 'banner', 'totem', 'avatar', 'achievement'],
    'heads': ['heads', 'player', 'gallery', 'minecraft-heads'],
    'bedrock': ['bedrock', 'addon', 'creator', 'mctools'],
    'enchant': ['enchant', 'enchanting', 'efficient', 'optimize'],
    'world': ['world', 'convert', 'edit', 'universal'],
    'server': ['server', 'hosting', 'tunnel', 'playit', 'mctools'],
    'shape': ['shape', 'build', 'sphere', 'ellipsoid', 'plotz'],
    'datapack': ['datapack', 'misode', 'loot', 'advancement', 'recipe'],
    'science': ['science', 'command', 'minecraftcommand'],
    'asset': ['asset', 'mcasset', 'library', 'texture'],
    'resource': ['resource', 'pack', 'datapack', 'mod', 'planetminecraft', 'modrinth', 'curseforge'],
    'creator': ['creator', 'ija', 'minecraft', 'content'],
    'hosting': ['hosting', 'server', 'bisect', 'nitrado', 'aternos'],
    'modded': ['modded', 'kubejs', 'custom', 'gui'],
    'image': ['image', 'particle', 'display', 'convert'],
    'tag': ['tag', 'taglib', 'library'],
    'alphabet': ['alphabet', 'galactic', 'enchantment', 'encode', 'decode'],
    'emoji': ['emoji', 'emoticon', 'symbol'],
    'tools': ['tools', 'garretto', 'command', 'mrgarretto']
};

function calculateRelevance(query, tool) {
    const queryLower = query.toLowerCase();
    const toolLower = tool.tool.toLowerCase();
    const descLower = tool.description.toLowerCase();
    
    let score = 0;
    
    // Direct matches in tool name
    if (toolLower.includes(queryLower)) score += 10;
    
    // Direct matches in description
    if (descLower.includes(queryLower)) score += 8;
    
    // Keyword matches
    for (const [keyword, relatedWords] of Object.entries(searchKeywords)) {
        if (queryLower.includes(keyword)) {
            for (const word of relatedWords) {
                if (toolLower.includes(word) || descLower.includes(word)) {
                    score += 5;
                }
            }
        }
    }
    
    // Partial word matches
    const queryWords = queryLower.split(' ');
    for (const word of queryWords) {
        if (word.length > 2) {
            if (toolLower.includes(word) || descLower.includes(word)) {
                score += 3;
            }
        }
    }
    
    return score;
}

function performAISearch(query) {
    if (!query.trim()) {
        populateTable(); // Show all tools if empty query
        return;
    }
    
    const scoredTools = toolsData.map(tool => ({
        ...tool,
        relevance: calculateRelevance(query, tool)
    })).filter(tool => tool.relevance > 0);
    
    scoredTools.sort((a, b) => b.relevance - a.relevance);
    
    // Update display with filtered results
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    
    tableBody.innerHTML = '';
    mobileCards.innerHTML = '';
    
    if (scoredTools.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                    <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
                    <p class="text-lg">No tools found matching "${query}"</p>
                    <p class="text-sm mt-2">Try different keywords or check your spelling</p>
                </td>
            </tr>
        `;
        mobileCards.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
                <p class="text-lg">No tools found matching "${query}"</p>
                <p class="text-sm mt-2">Try different keywords or check your spelling</p>
            </div>
        `;
        return;
    }
    
    scoredTools.forEach((tool, index) => {
        // Desktop Table Row
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-row', 'hover:bg-gray-700/50', 'transition-all', 'duration-300', 'cursor-pointer');
        
        const linksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link inline-block px-3 py-2 rounded-lg text-cyan-300 hover:text-cyan-200 text-sm font-medium mb-1" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-1 text-xs"></i>${link.name}
                    </a>`;
        }).join('');
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <i class="fas fa-wrench text-white text-sm"></i>
                    </div>
                    <span class="text-white font-semibold text-lg">${tool.tool}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-300 max-w-md">
                <p class="leading-relaxed">${tool.description}</p>
            </td>
            <td class="px-6 py-4">
                <div class="space-y-2">
                    ${linksHtml}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getPriceColorClass(tool.price)}">
                    <i class="fas fa-dollar-sign mr-1"></i>${tool.price}
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Mobile Card
        const card = document.createElement('div');
        card.classList.add('fade-in-row', 'p-6', 'border-b', 'border-gray-700', 'last:border-b-0');
        card.style.animationDelay = `${index * 0.05}s`;
        
        const mobileLinksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link block px-4 py-3 rounded-lg text-cyan-300 hover:text-cyan-200 text-sm font-medium mb-2 text-center" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-2"></i>${link.name}
                    </a>`;
        }).join('');
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                        <i class="fas fa-wrench text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-white font-bold text-xl">${tool.tool}</h3>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriceColorClass(tool.price)}">
                            <i class="fas fa-dollar-sign mr-1"></i>${tool.price}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-300 leading-relaxed">${tool.description}</p>
            </div>
            
            <div class="space-y-2">
                <p class="text-gray-400 text-sm font-semibold mb-2">
                    <i class="fas fa-link mr-2"></i>Links:
                </p>
                ${mobileLinksHtml}
            </div>
        `;
        
        mobileCards.appendChild(card);
    });
}

// Search input event listeners
aiSearchInput.addEventListener('input', function() {
    const query = this.value;
    
    if (query.length > 0) {
        // Show suggestions
        const suggestions = [];
        
        // Add category suggestions
        const categories = [...new Set(toolsData.map(tool => tool.tool))];
        categories.forEach(cat => {
            if (cat.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({
                    type: 'category',
                    text: cat,
                    icon: 'fa-folder'
                });
            }
        });
        
        // Add description-based suggestions
        toolsData.forEach(tool => {
            if (tool.description.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({
                    type: 'description',
                    text: tool.tool,
                    icon: 'fa-tools'
                });
            }
        });
        
        if (suggestions.length > 0) {
            suggestionsList.innerHTML = suggestions.slice(0, 5).map(s => `
                <div class="px-4 py-3 hover:bg-gray-700/50 cursor-pointer flex items-center text-gray-300 hover:text-white transition-colors" onclick="selectSuggestion('${s.text}')">
                    <i class="fas ${s.icon} mr-3 text-cyan-400"></i>
                    <span>${s.text}</span>
                </div>
            `).join('');
            searchSuggestions.classList.remove('hidden');
        } else {
            searchSuggestions.classList.add('hidden');
        }
        
        // Perform search
        setTimeout(() => performAISearch(query), 300);
    } else {
        searchSuggestions.classList.add('hidden');
        populateTable();
    }
});

aiSearchInput.addEventListener('focus', function() {
    if (this.value.length > 0) {
        searchSuggestions.classList.remove('hidden');
    }
});

document.addEventListener('click', function(e) {
    if (!aiSearchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

function selectSuggestion(text) {
    aiSearchInput.value = text;
    searchSuggestions.classList.add('hidden');
    performAISearch(text);
}

function populateTable() {
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    
    // Clear existing content
    tableBody.innerHTML = '';
    mobileCards.innerHTML = '';
    
    toolsData.forEach((tool, index) => {
        // Desktop Table Row
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-row', 'hover:bg-gray-700/50', 'transition-all', 'duration-300', 'cursor-pointer');
        
        const linksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link inline-block px-3 py-2 rounded-lg text-cyan-300 hover:text-cyan-200 text-sm font-medium mb-1" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-1 text-xs"></i>${link.name}
                    </a>`;
        }).join('');
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <i class="fas fa-wrench text-white text-sm"></i>
                    </div>
                    <span class="text-white font-semibold text-lg">${tool.tool}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-300 max-w-md">
                <p class="leading-relaxed">${tool.description}</p>
            </td>
            <td class="px-6 py-4">
                <div class="space-y-2">
                    ${linksHtml}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getPriceColorClass(tool.price)}">
                    <i class="fas fa-dollar-sign mr-1"></i>${tool.price}
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Mobile Card
        const card = document.createElement('div');
        card.classList.add('fade-in-row', 'p-6', 'border-b', 'border-gray-700', 'last:border-b-0');
        card.style.animationDelay = `${index * 0.05}s`;
        
        const mobileLinksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link block px-4 py-3 rounded-lg text-cyan-300 hover:text-cyan-200 text-sm font-medium mb-2 text-center" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
                        <i class="fas fa-external-link-alt mr-2"></i>${link.name}
                    </a>`;
        }).join('');
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                        <i class="fas fa-wrench text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-white font-bold text-xl">${tool.tool}</h3>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriceColorClass(tool.price)}">
                            <i class="fas fa-dollar-sign mr-1"></i>${tool.price}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-300 leading-relaxed">${tool.description}</p>
            </div>
            
            <div class="space-y-2">
                <p class="text-gray-400 text-sm font-semibold mb-2">
                    <i class="fas fa-link mr-2"></i>Links:
                </p>
                ${mobileLinksHtml}
            </div>
        `;
        
        mobileCards.appendChild(card);
    });
}

function getPriceColorClass(price) {
    const priceLower = price.toLowerCase();
    if (priceLower.includes('free') && !priceLower.includes('paid')) {
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
    } else if (priceLower.includes('freemium')) {
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    } else if (priceLower.includes('paid')) {
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
    } else {
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadToolsData();
    
    // Add Discord-like scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
        .overflow-x-auto::-webkit-scrollbar {
            height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
            background: rgba(47, 49, 54, 0.5);
            border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
            background: rgba(88, 101, 242, 0.6);
            border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
            background: rgba(88, 101, 242, 0.8);
        }
        /* Ensure search icon stays visible */
        .fa-magnifying-glass {
            opacity: 1 !important;
        }
    `;
    document.head.appendChild(style);
});

// Function to copy link on right-click
function copyLink(event, url, name) {
    event.preventDefault();
    
    navigator.clipboard.writeText(url).then(() => {
        // Create a subtle notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-600 z-50';
        notification.innerHTML = `<i class="fas fa-link mr-2"></i>Copied ${name} link!`;
        document.body.appendChild(notification);
        
        // Remove notification after 2 seconds
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