
try {
    const fs = require('fs');
    const dotenv = fs.readFileSync('.env', 'utf8');
    console.log("--- .env CONTENT ---");
    console.log(dotenv.split('\n').filter(line => line.includes('URL')).join('\n'));

    // Check if we can load it
    const envVars = {};
    dotenv.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length > 0) {
            envVars[key.trim()] = val.join('=').trim().replace(/"/g, '');
        }
    });
    console.log("--- PARSED VARS ---");
    console.log("POSTGRES_PRISMA_URL:", envVars["POSTGRES_PRISMA_URL"]);
} catch (e) {
    console.error(e);
}
