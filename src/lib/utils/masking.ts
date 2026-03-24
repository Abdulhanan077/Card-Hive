/**
 * Masks a username for privacy. 
 * Example: "Abdulhanan" -> "A***an"
 * Example: "Joe" -> "J**"
 */
export function maskUsername(username: string): string {
    if (!username) return "Anonymous";
    if (username.length <= 2) return username[0] + "*";
    
    const first = username[0];
    const last = username.slice(-2);
    const middleCount = Math.min(5, Math.max(2, username.length - 3));
    const middle = "*".repeat(middleCount);
    
    return first + middle + last;
}
