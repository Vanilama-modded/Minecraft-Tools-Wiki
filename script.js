let toolsData = [];
let isSearching = false;

// Global UI elements
let aiSearchInput, searchSuggestions, suggestionsList, searchIcon, loadingSpinner;

// Helper function to manage loading state UI
function setLoading(loading) {
    isSearching = loading;
    if (loading) {
        if (searchIcon) searchIcon.classList.add('hidden');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    } else {
        if (searchIcon) searchIcon.classList.remove('hidden');
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
}

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
        await loadFallbackData();
    }
}

// Fallback data in case JSON loading fails
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

// Existing search keywords map
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
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    for (const word of queryWords) {
        if (toolLower.includes(word) || descLower.includes(word)) {
            score += 3;
        }
    }
    
    return score;
}

// --- LLM Search Implementation ---

async function performLLMSearch(query) {
    if (isSearching) return;
    setLoading(true);
    searchSuggestions.classList.add('hidden'); // Hide suggestions while waiting for AI
    
    const categories = toolsData.map(tool => tool.tool);
    if (categories.length === 0) {
        setLoading(false);
        return; 
    }
    
    try {
        const systemPrompt = `You are a sophisticated AI designed to map user requests to relevant Minecraft tool categories.\nThe available tool categories are: [${categories.join(', ')}].\nAnalyze the user's request, which might be a full sentence (e.g., "I need a tool to make custom commands"), and identify the MOST relevant tool category or categories (up to 3).\nRespond DIRECTLY with JSON, following this schema, and no other text:\n{\n  "relevant_tools": string[] // An array of relevant tool category names exactly matching the list provided.\n}\nIf no relevant tools are found, return an empty array for "relevant_tools".`;
        
        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            json: true,
        });
        
        const result = JSON.parse(completion.content);
        let relevantToolNames = result.relevant_tools || [];
        
        console.log('LLM identified tools:', relevantToolNames);
        
        if (relevantToolNames.length > 0) {
            // Filter tools based on LLM suggestions and prioritize them
            const prioritizedTools = toolsData.filter(tool => 
                relevantToolNames.some(name => tool.tool.toLowerCase() === name.toLowerCase())
            );
            populateTable(prioritizedTools);
        } else {
            // Fallback: If LLM failed to identify tools, run standard keyword search
            performAISearch(query, false);
        }
        
    } catch (error) {
        console.error("Error during LLM search:", error);
        // Fallback on error
        performAISearch(query, false);
    } finally {
        setLoading(false);
        // If query input is still focused and not empty, suggestions might reappear on next input event, which is fine.
    }
}


function performAISearch(query, useLLM = true) {
    const queryTrimmed = query.trim();
    
    // If empty query, show all tools
    if (!queryTrimmed) {
        populateTable();
        return;
    }
    
    // 1. Check if we should delegate to LLM for complex sentences
    const queryWords = queryTrimmed.split(/\s+/).filter(w => w.length > 0).length;
    // Check for sentences (more than 3 words, or contains complex indicators)
    const isSentence = queryWords > 3 || queryTrimmed.includes('?') || queryTrimmed.includes('a generator where') || queryWords > 1 && queryTrimmed.includes('i need');
    
    if (useLLM && isSentence) {
        // Delegate to LLM search
        performLLMSearch(query);
        return;
    }
    
    // 2. Perform standard keyword search
    const scoredTools = toolsData.map(tool => ({
        ...tool,
        relevance: calculateRelevance(query, tool)
    })).filter(tool => tool.relevance > 0);
    
    scoredTools.sort((a, b) => b.relevance - a.relevance);
    
    populateTable(scoredTools);
}


function populateTable(toolsToDisplay = toolsData) {
    const tableBody = document.getElementById('tableBody');
    const mobileCards = document.getElementById('mobileCards');
    
    // Clear existing content
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
        // Desktop Table Row
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-row', 'transition-all', 'duration-300', 'cursor-pointer');
        
        const linksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link inline-block px-4 py-1 text-zinc-300 hover:text-zinc-100 text-sm font-medium" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
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
        
        // Mobile Card
        const card = document.createElement('div');
        card.classList.add('fade-in-row', 'p-6', 'border-b', 'border-zinc-800', 'last:border-b-0');
        card.style.animationDelay = `${index * 0.05}s`;
        
        const mobileLinksHtml = tool.links.map(link => {
            return `<a href="${link.url}" target="_blank" class="tool-link block px-4 py-3 text-zinc-300 hover:text-zinc-100 text-sm font-medium mb-2 text-center" oncontextmenu="copyLink(event, '${link.url}', '${link.name}')">
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
    if (priceLower.includes('free') && !priceLower.includes('paid') && !priceLower.includes('freemium')) {
        return 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-full';
    } else if (priceLower.includes('freemium')) {
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full';
    } else if (priceLower.includes('paid')) {
        return 'bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-full';
    } else {
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full';
    }
}

// Function to copy link on right-click
function copyLink(event, url, name) {
    event.preventDefault();
    
    navigator.clipboard.writeText(url).then(() => {
        // Create a subtle notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-zinc-900 text-zinc-200 px-4 py-2 rounded-lg shadow-lg border border-zinc-700 z-50';
        notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Copied ${name} link!`;
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


// Search input event listeners
function setupEventListeners() {
    aiSearchInput.addEventListener('input', function() {
        const query = this.value;
        
        if (query.length > 0) {
            const suggestions = [];
            const queryLower = query.toLowerCase();
            
            // Add category suggestions
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
            
            // Add description-based suggestions (only if the query is short enough that it's likely keywords)
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
            
            // Filter unique suggestions
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
            
            // Perform search (may trigger LLM if it's a sentence)
            clearTimeout(window.searchTimer);
            window.searchTimer = setTimeout(() => performAISearch(query), 300);
            
        } else {
            searchSuggestions.classList.add('hidden');
            clearTimeout(window.searchTimer);
            populateTable();
        }
    });

    aiSearchInput.addEventListener('focus', function() {
        if (this.value.length > 0 && toolsData.length > 0 && !isSearching) {
            // Only show suggestions if we are not actively running an LLM search
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
    
    // Check if the suggestion selected is a full category name. If so, treat it as a direct filter.
    const isCategory = toolsData.some(tool => tool.tool === text);
    
    if (isCategory) {
        const filtered = toolsData.filter(tool => tool.tool === text);
        populateTable(filtered);
    } else {
        // If it was a description suggestion, run the full search
        performAISearch(text);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    aiSearchInput = document.getElementById('aiSearchInput');
    searchSuggestions = document.getElementById('searchSuggestions');
    suggestionsList = document.getElementById('suggestionsList');
    searchIcon = document.getElementById('searchIcon');
    loadingSpinner = document.getElementById('loadingSpinner');
    
    setupEventListeners();
    loadToolsData();
});
