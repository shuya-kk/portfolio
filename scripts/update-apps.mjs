import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import zlib from 'zlib';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPS_JSON_PATH = path.join(__dirname, '../src/data/apps.json');

async function fetchInternal(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function fetchReviews(appId) {
    // Fetch up to 50 reviews (default is often 50, but explicit limit is safer if we want more/less, max is usually 500 for RSS but let's start with 50 as 'all latest')
    // The user asked for "all", so let's try a reasonable chunk like 50 or 100. Let's use 100.
    const url = `https://itunes.apple.com/jp/rss/customerreviews/id=${appId}/sortBy=mostRecent/limit=50/json`;
    try {
        const data = await fetchInternal(url);

        if (!data.feed || !data.feed.entry) {
            return [];
        }

        // Handle case where entry is a single object instead of an array
        const entries = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];

        const reviews = entries
            .filter(entry => {
                // Skip entries that are not reviews (sometimes the first entry is the app info itself, though typically in this feed format it's cleaner, but good to be safe check existence of rating)
                return entry['im:rating'] && parseInt(entry['im:rating'].label) >= 4; // Filter 4 or 5 stars
            })
            .map(entry => ({
                id: entry.id.label,
                title: entry.title.label,
                content: entry.content.label,
                rating: parseInt(entry['im:rating'].label),
                author: entry.author.name.label
            }));
        // Removed .slice(0, 3) to get all matching reviews from the feed

        return reviews;
    } catch (error) {
        // Some apps might not have reviews or feed might differ
        console.warn(`Warning: Failed to fetch reviews for app ID ${appId}:`, error.message);
        return [];
    }
}

async function getAppStoreConnectToken() {
    const issuerId = process.env.APP_STORE_ISSUER_ID?.trim();
    const keyId = process.env.APP_STORE_KEY_ID?.trim();
    const privateKeyPath = process.env.APP_STORE_PRIVATE_KEY_PATH?.trim();
    const rawCandidate = (process.env.APP_STORE_PRIVATE_KEY || process.env.ASC_PRIVATE_KEY)?.trim();
    // Ignore dummy placeholder values like "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
    const privateKeyRaw = (rawCandidate && !rawCandidate.includes('...')) ? rawCandidate : undefined;

    if (!issuerId || !keyId || (!privateKeyPath && !privateKeyRaw)) {
        console.warn('App Store Connect API credentials not found in environment. Skipping download count update.');
        console.warn(`Present variables: APP_STORE_ISSUER_ID=${!!issuerId}, APP_STORE_KEY_ID=${!!keyId}, APP_STORE_PRIVATE_KEY=${!!privateKeyRaw}, APP_STORE_PRIVATE_KEY_PATH=${!!privateKeyPath}`);
        return null;
    }

    try {
        let privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : await fs.readFile(privateKeyPath, 'utf8');
        // Strip surrounding quotes if present in secret/env
        privateKey = privateKey.replace(/^["']|["']$/g, '').trim();
        // If someone pasted a single-line PEM without newlines around the body, normalize it
        if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = privateKey
                .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: issuerId,
            iat: now - 60, // 1 minute clock skew buffer
            exp: now + 10 * 60, // 10 minutes
            aud: 'appstoreconnect-v1'
        };
        return jwt.sign(payload, privateKey, { algorithm: 'ES256', keyid: keyId });
    } catch (error) {
        console.error('Failed to generate App Store Connect token:', error.message);
        return null;
    }
}

async function fetchReportDownloads(token, vendorNumber, frequency, reportDate) {
    const params = new URLSearchParams({
        'filter[frequency]': frequency,
        'filter[reportDate]': reportDate,
        'filter[reportSubType]': 'SUMMARY',
        'filter[reportType]': 'SALES',
        'filter[vendorNumber]': vendorNumber,
        'filter[version]': '1_0'
    });
    const url = `https://api.appstoreconnect.apple.com/v1/salesReports?${params.toString()}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/a-gzip, application/json'
            }
        });

        if (!response.ok) {
            if (response.status !== 404 && response.status !== 400) {
                const errText = await response.text().catch(() => '');
                console.error(`Failed to fetch ${frequency} report for ${reportDate}: ${response.status} ${response.statusText} ${errText}`);
            }
            return [];
        }

        const arrayBuffer = await response.arrayBuffer();
        const decompressed = zlib.gunzipSync(Buffer.from(arrayBuffer)).toString('utf-8');
        
        const lines = decompressed.split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split('\t');
        const appleIdIndex = headers.indexOf('Apple Identifier');
        const unitsIndex = headers.indexOf('Units');
        const productTypeIndex = headers.indexOf('Product Type Identifier');

        if (appleIdIndex === -1 || unitsIndex === -1 || productTypeIndex === -1) return [];

        const downloads = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > Math.max(unitsIndex, productTypeIndex)) {
                const type = cols[productTypeIndex];
                // Exclude updates (starts with 7) and in-app purchases (starts with IA)
                if (type && !type.startsWith('7') && !type.startsWith('IA')) {
                    downloads.push({
                        appleId: cols[appleIdIndex],
                        units: parseInt(cols[unitsIndex], 10)
                    });
                }
            }
        }
        return downloads;
    } catch (error) {
        console.error(`Error fetching/parsing ${frequency} report for ${reportDate}:`, error.message);
        return [];
    }
}

async function getLifetimeDownloadsMap(token, vendorNumber) {
    const downloadsMap = new Map();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    // You can change startYear based on your first app's release year.
    const startYear = 2020; 

    console.log(`Fetching App Store Connect reports from ${startYear} to ${currentYear}...`);

    const addRecords = (records) => {
        for (const record of records) {
            if (!isNaN(record.units)) {
                const current = downloadsMap.get(record.appleId) || 0;
                downloadsMap.set(record.appleId, current + record.units);
            }
        }
    };

    for (let year = startYear; year <= currentYear; year++) {
        if (year < currentYear) {
            console.log(`Fetching YEARLY report for ${year}...`);
            const records = await fetchReportDownloads(token, vendorNumber, 'YEARLY', year.toString());
            if (records.length > 0) {
                addRecords(records);
            } else if (year === currentYear - 1 && currentMonth === 1) {
                // Early in January, previous year's YEARLY report may not be generated yet
                console.log(`YEARLY report for ${year} not ready yet. Falling back to MONTHLY reports...`);
                for (let m = 1; m <= 12; m++) {
                    const mStr = `${year}-${String(m).padStart(2, '0')}`;
                    const mRecords = await fetchReportDownloads(token, vendorNumber, 'MONTHLY', mStr);
                    addRecords(mRecords);
                }
            }
        } else {
            // 1. Fetch completed MONTHLY reports for previous months in the current year
            for (let month = 1; month < currentMonth; month++) {
                const reportDate = `${year}-${String(month).padStart(2, '0')}`;
                console.log(`Fetching MONTHLY report for ${reportDate}...`);
                const records = await fetchReportDownloads(token, vendorNumber, 'MONTHLY', reportDate);
                if (records.length > 0) {
                    addRecords(records);
                } else if (month === currentMonth - 1 && currentDay <= 7) {
                    // Early in the month, the previous month's MONTHLY report might not be generated yet
                    const daysInPrevMonth = new Date(year, month, 0).getDate();
                    console.log(`MONTHLY report for ${reportDate} not ready yet. Falling back to DAILY reports...`);
                    const prevDailyPromises = [];
                    for (let day = 1; day <= daysInPrevMonth; day++) {
                        const dateStr = `${reportDate}-${String(day).padStart(2, '0')}`;
                        prevDailyPromises.push(fetchReportDownloads(token, vendorNumber, 'DAILY', dateStr));
                    }
                    const prevDailyResults = await Promise.all(prevDailyPromises);
                    for (const dRecords of prevDailyResults) {
                        addRecords(dRecords);
                    }
                }
            }

            // 2. Fetch DAILY reports for the current month (1st up to today)
            const currentMonthStr = `${year}-${String(currentMonth).padStart(2, '0')}`;
            console.log(`Fetching DAILY reports for ${currentMonthStr} (days 1 to ${currentDay})...`);
            const dailyPromises = [];
            for (let day = 1; day <= currentDay; day++) {
                const dateStr = `${currentMonthStr}-${String(day).padStart(2, '0')}`;
                dailyPromises.push(fetchReportDownloads(token, vendorNumber, 'DAILY', dateStr));
            }
            const dailyResults = await Promise.all(dailyPromises);
            for (const records of dailyResults) {
                addRecords(records);
            }
        }
    }
    return downloadsMap;
}

async function updateApps() {
    console.log('Reading apps.json...');
    const appsData = JSON.parse(await fs.readFile(APPS_JSON_PATH, 'utf-8'));

    // Extract IDs
    const appIds = [];
    const appMap = new Map();

    for (const app of appsData) {
        if (!app.appStoreLink) continue;

        // Extract ID from URL (e.g., https://.../id123456789)
        const match = app.appStoreLink.match(/\/id(\d+)/);
        if (match && match[1]) {
            const id = match[1];
            appIds.push(id);
            appMap.set(id, app);
        }
    }

    if (appIds.length === 0) {
        console.log('No App Store links found.');
        return;
    }

    // --- App Store Connect API Download Counts ---
    const token = await getAppStoreConnectToken();
    const vendorNumber = process.env.APP_STORE_VENDOR_NUMBER;
    let downloadsMap = new Map();

    if (token && vendorNumber) {
        downloadsMap = await getLifetimeDownloadsMap(token, vendorNumber);
    } else if (token && !vendorNumber) {
        console.warn('APP_STORE_VENDOR_NUMBER is not set in .env. Skipping download count update.');
    }

    console.log(`Found ${appIds.length} apps. Fetching data from iTunes Search API...`);

    // Fetch data in batches (iTunes API might have limits, but 20 is usually fine)
    // We can fetch multiple IDs at once: id=1,2,3
    const idsString = appIds.join(',');
    const apiUrl = `https://itunes.apple.com/jp/lookup?id=${idsString}`;

    try {
        const data = await fetchInternal(apiUrl);

        if (!data.results || data.results.length === 0) {
            console.log('No results returned from API.');
            return;
        }

        console.log(`API returned ${data.results.length} results. Updating data...`);

        for (const result of data.results) {
            const id = String(result.trackId);
            const app = appMap.get(id);

            if (app) {
                // Update fields
                app.name = result.trackName || app.name;
                app.description = result.description || app.description;

                // Get high-res icon (artworkUrl512 or 100)
                app.iconPlaceholder = result.artworkUrl512 || result.artworkUrl100 || app.iconPlaceholder;

                // Ratings
                app.rating = result.averageUserRating;
                app.ratingCount = result.userRatingCount;

                // Screenshots
                if (result.screenshotUrls && result.screenshotUrls.length > 0) {
                    app.images = result.screenshotUrls;
                }

                // Fetch Reviews
                console.log(`Fetching reviews for ${app.name}...`);
                const reviews = await fetchReviews(id);
                if (reviews.length > 0) {
                    app.reviews = reviews;
                }

                // Update Downloads
                if (downloadsMap.has(id)) {
                    app.downloads = downloadsMap.get(id);
                    console.log(`Updated downloads: ${app.downloads}`);
                }

                console.log(`Updated: ${app.name} (${reviews.length} reviews added)`);
            }
        }

        // Write back
        await fs.writeFile(APPS_JSON_PATH, JSON.stringify(appsData, null, 4), 'utf-8');
        console.log('Successfully updated apps.json');

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

updateApps();
