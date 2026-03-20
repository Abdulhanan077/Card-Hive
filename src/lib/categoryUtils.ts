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
