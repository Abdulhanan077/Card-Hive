import React from 'react';

export function sortCategories(a: string, b: string): number {
    // Extract currency from string (e.g., "USD" from "USD ($100)")
    const getCurrency = (str: string) => (str.split(' ')[0] || str).toUpperCase();

    // Extract numeric face value or min value
    const getValue = (str: string) => {
        const match = str.match(/\((?:\$|£|€)?(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };

    const currencyA = getCurrency(a);
    const currencyB = getCurrency(b);

    // Custom priority: USD first, then GBP, then others
    const getPriority = (curr: string) => {
        if (curr === 'USD') return 1;
        if (curr === 'GBP') return 2;
        if (curr === 'EUR') return 3;
        if (curr === 'CAD') return 4;
        if (curr === 'AUD') return 5;
        return 99; // others
    };

    const priorityA = getPriority(currencyA);
    const priorityB = getPriority(currencyB);

    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }

    if (currencyA !== currencyB) {
        return currencyA.localeCompare(currencyB);
    }

    // Currencies are same, sort by value ascending
    return getValue(a) - getValue(b);
}

export function isValueInCategory(valueStr: string | number, categoryName: string): boolean {
    if (!valueStr) return true; // If no value entered, it belongs to all categories
    
    const value = typeof valueStr === 'string' ? parseFloat(valueStr) : valueStr;
    if (isNaN(value)) return true; // If invalid number, do not filter out

    const matchRange = categoryName.match(/\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)/);
    const matchMin = categoryName.match(/\((?:\$|£|€)?(\d+)\+\)/);
    const matchExact = categoryName.match(/\((?:\$|£|€)?(\d+)\)/);

    if (matchRange) {
        const min = parseFloat(matchRange[1]);
        const max = parseFloat(matchRange[2]);
        return value >= min && value <= max;
    } else if (matchMin) {
        const min = parseFloat(matchMin[1]);
        return value >= min;
    } else if (matchExact) {
        const exact = parseFloat(matchExact[1]);
        return value === exact;
    }

    return true; // If format is unknown, keep it
}

export function validateCategoryAmount(value: number, categoryName: string): string {
    const matchRange = categoryName.match(/\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)/);
    const matchMin = categoryName.match(/\((?:\$|£|€)?(\d+)\+\)/);
    const matchExact = categoryName.match(/\((?:\$|£|€)?(\d+)\)/);

    if (matchRange) {
        const min = parseFloat(matchRange[1]);
        const max = parseFloat(matchRange[2]);
        if (value < min || value > max) {
            return `Amount must be between ${min} and ${max} for this category.`;
        }
    } else if (matchMin) {
        const min = parseFloat(matchMin[1]);
        if (value < min) {
            return `Amount must be at least ${min} for this category.`;
        }
    } else if (matchExact) {
        const exact = parseFloat(matchExact[1]);
        if (value !== exact) {
            return `Amount must be exactly ${exact} for this category.`;
        }
    }

    return "";
}

/**
 * Parses the category name to find if it represents an exact face value.
 * @returns the exact amount as a number, or null if it's a range/minimum/unknown.
 */
export function getExactCategoryAmount(categoryName: string): number | null {
    if (!categoryName) return null;
    const matchRange = categoryName.match(/\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)/);
    const matchMin = categoryName.match(/\((?:\$|£|€)?(\d+)\+\)/);
    const matchExact = categoryName.match(/\((?:\$|£|€)?(\d+)\)/);

    // If it's a range or minimum, it's not exact.
    if (matchRange || matchMin) return null;

    if (matchExact) {
        return parseFloat(matchExact[1]);
    }
    return null;
}

export function getFlagComponent(currency: string): React.ReactNode {
    const codes: Record<string, string> = {
        USD: "us",
        GBP: "gb",
        EUR: "eu",
        AUD: "au",
        CAD: "ca",
        CHF: "ch"
    };

    if (currency === "Global") {
        return React.createElement('span', { 
            style: { 
                marginRight: '8px', 
                fontSize: '1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px'
            } 
        }, "🌐");
    }

    if (codes[currency]) {
        return React.createElement('img', {
            src: `https://flagcdn.com/${codes[currency]}.svg`,
            width: 24,
            height: 18,
            alt: `${currency} flag`,
            style: {
                marginRight: '10px',
                verticalAlign: 'middle',
                display: 'inline-block',
                borderRadius: '3px',
                boxShadow: '0 1.5px 3px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.15)'
            }
        });
    }

    return null;
}

export function formatCategoryWithFlag(category: string): React.ReactNode {
    if (!category) return category;
    
    const CURRENCY_MAP: Record<string, string> = {
        Global: "Global",
        USD: "US Dollars",
        GBP: "British Pounds",
        EUR: "Euros",
        AUD: "Australian Dollars",
        CAD: "Canadian Dollars",
        CHF: "Swiss Francs",
    };

    const parts = category.split(' ');
    const firstWord = parts[0];
    const rest = parts.slice(1).join(' ');

    if (CURRENCY_MAP[firstWord]) {
        const fullName = CURRENCY_MAP[firstWord];
        const flag = getFlagComponent(firstWord);
        return React.createElement('span', { 
            style: { 
                display: 'inline-flex', 
                alignItems: 'center', 
                verticalAlign: 'middle' 
            } 
        },
            flag,
            React.createElement('span', null, `${fullName}${rest ? ' ' + rest : ''}`)
        );
    }

    return category;
}

export function searchAndSortRates<T extends {
    id: number;
    cardBrand: string;
    cardCountry: string;
    cardType?: string;
    rate: number;
    publicRate: number | null;
}>(
    rates: T[],
    searchQuery: string,
    typeFilter: "All" | "Physical" | "E-code",
    sortBy: "Default" | "Type" | "Brand"
): T[] {
    // 1. Filter by card type
    let result = rates.filter(r => {
        const rType = r.cardType || "Physical";
        if (typeFilter === "Physical") return rType === "Physical";
        if (typeFilter === "E-code") return rType === "E-code";
        return true;
    });

    // 2. Perform dynamic search and scoring
    const query = searchQuery.trim().toLowerCase();
    if (query) {
        const fillerWords = new Set(["gift", "card", "cards", "payout", "rate", "rates", "trade", "trades"]);
        const rawKeywords = query.split(/\s+/).filter(w => w.length > 0);
        const keywords = rawKeywords.filter(w => !fillerWords.has(w));
        
        // If all keywords were filler words, fall back to using the raw keywords
        const activeKeywords = keywords.length > 0 ? keywords : rawKeywords;

        // Currency synonyms mapping
        const synonymMap: Record<string, string[]> = {
            us: ["usd", "us dollars", "united states", "america"],
            usa: ["usd", "us dollars", "united states", "america"],
            america: ["usd", "us dollars", "united states", "america"],
            aus: ["aud", "australian dollars", "australia"],
            australia: ["aud", "australian dollars", "australia"],
            can: ["cad", "canadian dollars", "canada"],
            canada: ["cad", "canadian dollars", "canada"],
            uk: ["gbp", "british pounds", "pound", "pounds", "british", "england"],
            gb: ["gbp", "british pounds", "pound", "pounds", "british", "england"],
            england: ["gbp", "british pounds", "pound", "pounds", "british", "england"],
            pound: ["gbp", "british pounds"],
            pounds: ["gbp", "british pounds"],
            eu: ["eur", "euros", "euro", "europe", "germany", "france", "austria", "italy", "spain"],
            eur: ["eur", "euros", "euro", "europe", "germany", "france", "austria", "italy", "spain"],
            euro: ["eur", "euros", "europe"],
            euros: ["eur", "euros", "europe"],
            europe: ["eur", "euros", "europe"],
            austria: ["eur", "euros", "europe", "austria"],
            germany: ["eur", "euros", "europe", "germany"],
            france: ["eur", "euros", "europe", "france"],
            swiss: ["chf", "swiss francs", "switzerland"],
            switzerland: ["chf", "swiss francs", "switzerland"],
            franc: ["chf", "swiss francs"],
            francs: ["chf", "swiss francs"],
        };

        const scoredItems = result.map(r => {
            let score = 0;
            const brand = r.cardBrand.toLowerCase();
            const country = r.cardCountry.toLowerCase();
            const type = (r.cardType || "Physical").toLowerCase();

            // Format full string of rate for keyword checking
            // e.g. "apple/itunes physical us dollars ($100)"
            const fullString = `${brand} ${type} ${country}`;

            for (const kw of activeKeywords) {
                let matchesKw = false;
                
                // Direct match in the brand, country, type or full string
                if (fullString.includes(kw)) {
                    matchesKw = true;
                    // Boost score if keyword matches brand start or country name start
                    if (brand.startsWith(kw)) score += 0.5;
                    if (country.includes(kw)) score += 0.2;
                }

                // Synonym match
                if (!matchesKw && synonymMap[kw]) {
                    const synonyms = synonymMap[kw];
                    if (synonyms.some(syn => fullString.includes(syn))) {
                        matchesKw = true;
                        score += 0.5; // synonym match boost
                    }
                }

                if (matchesKw) {
                    score += 1;
                }
            }

            return { rate: r, score };
        });

        // Filter out items that match absolutely nothing and sort by score
        result = scoredItems
            .filter(item => item.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                // Equal score: apply chosen sort order
                if (sortBy === "Type") {
                    const typeA = a.rate.cardType || "Physical";
                    const typeB = b.rate.cardType || "Physical";
                    if (typeA !== typeB) return typeA.localeCompare(typeB);
                }
                const brandA = a.rate.cardBrand.toLowerCase();
                const brandB = b.rate.cardBrand.toLowerCase();
                if (brandA !== brandB) return brandA.localeCompare(brandB);
                return sortCategories(a.rate.cardCountry, b.rate.cardCountry);
            })
            .map(item => item.rate);
    } else {
        // 3. Apply sorting if no search query
        if (sortBy === "Type") {
            result = [...result].sort((a, b) => {
                const typeA = a.cardType || "Physical";
                const typeB = b.cardType || "Physical";
                if (typeA !== typeB) {
                    return typeA.localeCompare(typeB); // E-code vs Physical
                }
                return a.cardBrand.toLowerCase().localeCompare(b.cardBrand.toLowerCase()) || sortCategories(a.cardCountry, b.cardCountry);
            });
        } else if (sortBy === "Brand") {
            result = [...result].sort((a, b) => {
                const brandA = a.cardBrand.toLowerCase();
                const brandB = b.cardBrand.toLowerCase();
                if (brandA !== brandB) return brandA.localeCompare(brandB);
                return sortCategories(a.cardCountry, b.cardCountry);
            });
        } else {
            // Default sort: Brand alphabetically, then Category custom priority
            result = [...result].sort((a, b) => {
                const brandA = a.cardBrand.toLowerCase();
                const brandB = b.cardBrand.toLowerCase();
                if (brandA !== brandB) return brandA.localeCompare(brandB);
                return sortCategories(a.cardCountry, b.cardCountry);
            });
        }
    }

    return result;
}

