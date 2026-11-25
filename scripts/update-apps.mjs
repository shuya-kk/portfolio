import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import zlib from 'zlib';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPS_JSON_PATH = path.join(__dirname, '../src/data/apps.json');
// Shuya Komiya's Apple Developer Artist ID
const DEVELOPER_ARTIST_ID = process.env.APPLE_ARTIST_ID || '1504097686';

// Major App Store storefronts to aggregate global rating counts & fallback reviews
const GLOBAL_STOREFRONTS = [
    'jp', 'us', 'gb', 'cn', 'kr', 'tw', 'hk', 'de', 'fr', 'ca',
    'au', 'br', 'mx', 'in', 'id', 'th', 'vn', 'ph', 'my', 'sg',
    'it', 'es', 'nl', 'se', 'ch', 'pl', 'tr', 'sa', 'ae', 'nz'
];

// Map 3-letter territory codes (from App Store Connect customerReviews) to 2-letter ISO codes
const TERRITORY_3_TO_2 = {
    JPN: 'JP', USA: 'US', GBR: 'GB', CHN: 'CN', KOR: 'KR', TWN: 'TW', HKG: 'HK',
    DEU: 'DE', FRA: 'FR', CAN: 'CA', AUS: 'AU', BRA: 'BR', MEX: 'MX', IND: 'IN',
    IDN: 'ID', THA: 'TH', VNM: 'VN', PHL: 'PH', MYS: 'MY', SGP: 'SG', ITA: 'IT',
    ESP: 'ES', NLD: 'NL', SWE: 'SE', CHE: 'CH', POL: 'PL', TUR: 'TR', SAU: 'SA',
    ARE: 'AE', NZL: 'NZ', RUS: 'RU', FIN: 'FI', NOR: 'NO', DNK: 'DK', BEL: 'BE',
    AUT: 'AT', PRT: 'PT', IRL: 'IE', GRC: 'GR', CZE: 'CZ', HUN: 'HU', ROU: 'RO',
    UKR: 'UA', ZAF: 'ZA', EGY: 'EG', NGA: 'NG', KEN: 'KE', ARG: 'AR', CHL: 'CL',
    COL: 'CO', PER: 'PE', PAK: 'PK', BGD: 'BD', LKA: 'LK', NPL: 'NP', KHM: 'KH',
    KGZ: 'KG', KAZ: 'KZ', UZB: 'UZ', ISR: 'IL', QAT: 'QA', KWT: 'KW', OMN: 'OM'
};

function normalizeCountryCode(code) {
    if (!code) return 'JP';
    const upper = code.trim().toUpperCase();
    if (upper.length === 2) return upper;
    return TERRITORY_3_TO_2[upper] || upper;
}

async function fetchInternal(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function getAppStoreConnectToken() {
    const issuerId = process.env.APP_STORE_ISSUER_ID?.trim();
    const keyId = process.env.APP_STORE_KEY_ID?.trim();
    const privateKeyPath = process.env.APP_STORE_PRIVATE_KEY_PATH?.trim();
    const rawCandidate = (process.env.APP_STORE_PRIVATE_KEY || process.env.ASC_PRIVATE_KEY)?.trim();
    const privateKeyRaw = (rawCandidate && !rawCandidate.includes('...')) ? rawCandidate : undefined;

    if (!issuerId || !keyId || (!privateKeyPath && !privateKeyRaw)) {
        console.warn('App Store Connect API credentials not found in environment. Skipping download count update.');
        console.warn(`Present variables: APP_STORE_ISSUER_ID=${!!issuerId}, APP_STORE_KEY_ID=${!!keyId}, APP_STORE_PRIVATE_KEY=${!!privateKeyRaw}, APP_STORE_PRIVATE_KEY_PATH=${!!privateKeyPath}`);
        return null;
    }

    try {
        let privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : await fs.readFile(privateKeyPath, 'utf8');
        privateKey = privateKey.replace(/^["']|["']$/g, '').trim();
        if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = privateKey
                .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: issuerId,
            iat: now - 60,
            exp: now + 10 * 60,
            aud: 'appstoreconnect-v1'
        };
        return jwt.sign(payload, privateKey, { algorithm: 'ES256', keyid: keyId });
    } catch (error) {
        console.error('Failed to generate App Store Connect token:', error.message);
        return null;
    }
}

/**
 * Fetch ALL worldwide customer reviews for an app directly from App Store Connect API
 */
async function fetchAppStoreConnectReviews(token, appId) {
    if (!token) return [];
    const reviews = [];
    let nextUrl = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/customerReviews?sort=-createdDate&limit=200`;

    try {
        while (nextUrl && reviews.length < 500) {
            const response = await fetch(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) break;
            const data = await response.json();
            for (const item of data.data || []) {
                const attr = item.attributes || {};
                reviews.push({
                    id: String(item.id),
                    title: attr.title || '',
                    content: attr.body || '',
                    rating: Number(attr.rating || 5),
                    author: attr.reviewerNickname || 'App Store User',
                    date: attr.createdDate || null,
                    territory: normalizeCountryCode(attr.territory || 'JPN')
                });
            }
            nextUrl = data.links?.next || null;
        }
    } catch (error) {
        console.warn(`Warning: Failed to fetch ASC customerReviews for ${appId}:`, error.message);
    }
    return reviews;
}

/**
 * Fallback/Supplement: Fetch public RSS customer reviews for a given storefront
 */
async function fetchRssReviews(appId, country = 'jp') {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=mostRecent/limit=50/json`;
    try {
        const data = await fetchInternal(url);
        if (!data.feed || !data.feed.entry) return [];

        const entries = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];
        return entries
            .filter(entry => entry['im:rating'] && !isNaN(parseInt(entry['im:rating'].label, 10)))
            .map(entry => ({
                id: entry.id.label,
                title: entry.title?.label || '',
                content: entry.content?.label || '',
                rating: parseInt(entry['im:rating'].label, 10),
                author: entry.author?.name?.label || 'App Store User',
                date: entry.updated?.label || null,
                territory: country.toUpperCase()
            }));
    } catch {
        return [];
    }
}

/**
 * Merge reviews from App Store Connect API (all territories) and RSS feeds, removing duplicates
 */
async function fetchAllGlobalReviews(token, appId, existingReviews = []) {
    const ascReviews = await fetchAppStoreConnectReviews(token, appId);
    const jpRssReviews = await fetchRssReviews(appId, 'jp');
    const usRssReviews = await fetchRssReviews(appId, 'us');

    const merged = [];
    const seenKeys = new Set();

    const addUnique = (rev) => {
        if (!rev || (!rev.title && !rev.content)) return;
        // Deduplicate by ID or by (author + title + content prefix)
        const contentKey = `${(rev.author || '').trim()}::${(rev.title || '').trim()}::${(rev.content || '').trim().slice(0, 40)}`;
        if (seenKeys.has(rev.id) || seenKeys.has(contentKey)) return;
        seenKeys.add(rev.id);
        seenKeys.add(contentKey);
        merged.push({
            id: rev.id,
            title: rev.title,
            content: rev.content,
            rating: rev.rating,
            author: rev.author,
            ...(rev.date ? { date: rev.date } : {}),
            territory: normalizeCountryCode(rev.territory || 'JP')
        });
    };

    // Prioritize official App Store Connect API reviews (has accurate territory and timestamp)
    for (const r of ascReviews) addUnique(r);
    for (const r of jpRssReviews) addUnique(r);
    for (const r of usRssReviews) addUnique(r);
    for (const r of existingReviews) addUnique(r);

    return merged;
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

        const headers = lines[0].split('\t').map(h => h.trim());
        const appleIdIndex = headers.indexOf('Apple Identifier');
        const unitsIndex = headers.indexOf('Units');
        const productTypeIndex = headers.indexOf('Product Type Identifier');
        const countryCodeIndex = headers.indexOf('Country Code');

        if (appleIdIndex === -1 || unitsIndex === -1 || productTypeIndex === -1) return [];

        const downloads = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > Math.max(unitsIndex, productTypeIndex)) {
                const type = cols[productTypeIndex]?.trim();
                // Exclude updates (starts with 7) and in-app purchases (starts with IA)
                if (type && !type.startsWith('7') && !type.startsWith('IA')) {
                    const country = countryCodeIndex !== -1 && cols[countryCodeIndex]
                        ? cols[countryCodeIndex].trim().toUpperCase()
                        : 'JP';
                    downloads.push({
                        appleId: cols[appleIdIndex]?.trim(),
                        units: parseInt(cols[unitsIndex], 10),
                        country: country || 'JP'
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

async function getLifetimeDownloadsData(token, vendorNumber) {
    const downloadsMap = new Map();
    const countryDownloadsMap = new Map(); // appleId -> Map(country -> units)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const startYear = 2020; 

    console.log(`Fetching App Store Connect reports from ${startYear} to ${currentYear} (All Global Territories)...`);

    const addRecords = (records) => {
        for (const record of records) {
            if (!isNaN(record.units) && record.appleId) {
                const current = downloadsMap.get(record.appleId) || 0;
                downloadsMap.set(record.appleId, current + record.units);

                if (record.country) {
                    let cMap = countryDownloadsMap.get(record.appleId);
                    if (!cMap) {
                        cMap = new Map();
                        countryDownloadsMap.set(record.appleId, cMap);
                    }
                    cMap.set(record.country, (cMap.get(record.country) || 0) + record.units);
                }
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
                console.log(`YEARLY report for ${year} not ready yet. Falling back to MONTHLY reports...`);
                for (let m = 1; m <= 12; m++) {
                    const mStr = `${year}-${String(m).padStart(2, '0')}`;
                    const mRecords = await fetchReportDownloads(token, vendorNumber, 'MONTHLY', mStr);
                    addRecords(mRecords);
                }
            }
        } else {
            for (let month = 1; month < currentMonth; month++) {
                const reportDate = `${year}-${String(month).padStart(2, '0')}`;
                console.log(`Fetching MONTHLY report for ${reportDate}...`);
                const records = await fetchReportDownloads(token, vendorNumber, 'MONTHLY', reportDate);
                if (records.length > 0) {
                    addRecords(records);
                } else if (month === currentMonth - 1 && currentDay <= 7) {
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
    return { downloadsMap, countryDownloadsMap };
}

/**
 * Fetch global rating counts and weighted average ratings across major storefronts
 */
async function fetchGlobalRatingsMap(appIds) {
    const ratingsAgg = new Map(); // id -> { totalCount: 0, weightedSum: 0, byCountry: {} }
    if (appIds.length === 0) return ratingsAgg;

    const idsParam = appIds.join(',');
    console.log(`Aggregating ratings across ${GLOBAL_STOREFRONTS.length} global App Store storefronts...`);

    const promises = GLOBAL_STOREFRONTS.map(async (country) => {
        const url = `https://itunes.apple.com/${country}/lookup?id=${idsParam}`;
        try {
            const data = await fetchInternal(url);
            return { country: country.toUpperCase(), results: data.results || [] };
        } catch {
            return { country: country.toUpperCase(), results: [] };
        }
    });

    const storefrontResults = await Promise.all(promises);

    for (const { country, results } of storefrontResults) {
        for (const item of results) {
            if (!item.trackId) continue;
            const id = String(item.trackId);
            const count = Number(item.userRatingCount || 0);
            const avg = Number(item.averageUserRating || 0);
            if (count > 0 && avg > 0) {
                const cur = ratingsAgg.get(id) || { totalCount: 0, weightedSum: 0, byCountry: {} };
                cur.totalCount += count;
                cur.weightedSum += avg * count;
                cur.byCountry[country] = { count, rating: avg };
                ratingsAgg.set(id, cur);
            }
        }
    }

    return ratingsAgg;
}

async function updateApps() {
    console.log('Reading apps.json...');
    const appsData = JSON.parse(await fs.readFile(APPS_JSON_PATH, 'utf-8'));

    const appMap = new Map();
    for (const app of appsData) {
        if (!app.appStoreLink) continue;
        const match = app.appStoreLink.match(/\/id(\d+)/);
        if (match && match[1]) {
            appMap.set(match[1], app);
        }
    }

    // --- App Store Connect API Download Counts & Country Breakdown ---
    const token = await getAppStoreConnectToken();
    const vendorNumber = process.env.APP_STORE_VENDOR_NUMBER;
    let downloadsMap = new Map();
    let countryDownloadsMap = new Map();

    if (token && vendorNumber) {
        const dlData = await getLifetimeDownloadsData(token, vendorNumber);
        downloadsMap = dlData.downloadsMap;
        countryDownloadsMap = dlData.countryDownloadsMap;
    } else if (token && !vendorNumber) {
        console.warn('APP_STORE_VENDOR_NUMBER is not set in .env. Skipping download count update.');
    }

    // --- Discover all released apps by Developer Artist ID (JP & US storefronts) + existing IDs ---
    console.log(`Fetching all released apps for artist ID ${DEVELOPER_ARTIST_ID} from iTunes Lookup API (JP & US)...`);
    try {
        const [jpArtistData, usArtistData] = await Promise.all([
            fetchInternal(`https://itunes.apple.com/jp/lookup?id=${DEVELOPER_ARTIST_ID}&entity=software&limit=200`).catch(() => ({ results: [] })),
            fetchInternal(`https://itunes.apple.com/us/lookup?id=${DEVELOPER_ARTIST_ID}&entity=software&limit=200`).catch(() => ({ results: [] }))
        ]);

        const storeResultsMap = new Map();
        // Put US results first, then overwrite with JP results so Japanese localized metadata is primary when available
        for (const item of (usArtistData.results || [])) {
            if (item.wrapperType === 'software' && item.trackId) {
                storeResultsMap.set(String(item.trackId), item);
            }
        }
        for (const item of (jpArtistData.results || [])) {
            if (item.wrapperType === 'software' && item.trackId) {
                storeResultsMap.set(String(item.trackId), item);
            }
        }

        const missingIds = [...appMap.keys()].filter(id => !storeResultsMap.has(id));
        if (missingIds.length > 0) {
            const [jpExtra, usExtra] = await Promise.all([
                fetchInternal(`https://itunes.apple.com/jp/lookup?id=${missingIds.join(',')}`).catch(() => ({ results: [] })),
                fetchInternal(`https://itunes.apple.com/us/lookup?id=${missingIds.join(',')}`).catch(() => ({ results: [] }))
            ]);
            for (const item of (usExtra.results || [])) {
                if (item.trackId) storeResultsMap.set(String(item.trackId), item);
            }
            for (const item of (jpExtra.results || [])) {
                if (item.trackId) storeResultsMap.set(String(item.trackId), item);
            }
        }

        const allStoreResults = [...storeResultsMap.values()];
        const allAppIds = [...new Set([...storeResultsMap.keys(), ...appMap.keys()])];

        // Aggregate ratings across global storefronts
        const globalRatingsMap = await fetchGlobalRatingsMap(allAppIds);

        console.log(`Found ${allStoreResults.length} total apps on the App Store. Updating metadata & global reviews...`);

        for (const result of allStoreResults) {
            const id = String(result.trackId);
            let app = appMap.get(id);

            if (!app) {
                console.log(`✨ Discovered new released app: ${result.trackName} (id: ${id}) - Adding to apps.json!`);
                app = {
                    name: result.trackName,
                    appStoreLink: result.trackViewUrl ? result.trackViewUrl.split('?')[0] : `https://apps.apple.com/jp/app/id${id}`,
                    description: result.description || '',
                    features: [],
                    images: [],
                    iconPlaceholder: result.artworkUrl512 || result.artworkUrl100 || '',
                    rating: result.averageUserRating || 0,
                    ratingCount: result.userRatingCount || 0,
                    downloads: 0
                };
                appsData.push(app);
                appMap.set(id, app);
            }

            // Update fields from App Store
            app.name = result.trackName || app.name;
            app.description = result.description || app.description;
            app.iconPlaceholder = result.artworkUrl512 || result.artworkUrl100 || app.iconPlaceholder;
            app.genre = result.primaryGenreName || app.genre;
            app.releaseDate = result.releaseDate || app.releaseDate;
            app.version = result.version || app.version;
            app.currentVersionReleaseDate = result.currentVersionReleaseDate || app.currentVersionReleaseDate;

            if (result.screenshotUrls && result.screenshotUrls.length > 0) {
                app.images = result.screenshotUrls;
            }

            // Fetch Global Reviews (App Store Connect API + RSS fallback)
            const reviews = await fetchAllGlobalReviews(token, id, app.reviews || []);
            if (reviews.length > 0) {
                app.reviews = reviews;
            }

            // Update Global Ratings (combine global storefront ratings; if storefront count is 0 but we have ASC reviews, compute from reviews)
            const globalRating = globalRatingsMap.get(id);
            if (globalRating && globalRating.totalCount > 0) {
                app.rating = Number((globalRating.weightedSum / globalRating.totalCount).toFixed(5));
                app.ratingCount = Math.max(globalRating.totalCount, reviews.length);
            } else if (reviews.length > 0) {
                const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                app.rating = Number((sum / reviews.length).toFixed(5));
                app.ratingCount = Math.max(result.userRatingCount || 0, reviews.length);
            } else {
                app.rating = result.averageUserRating ?? app.rating ?? 0;
                app.ratingCount = result.userRatingCount ?? app.ratingCount ?? 0;
            }

            // Update Downloads & Country Breakdown
            if (downloadsMap.has(id)) {
                app.downloads = downloadsMap.get(id);
            }
            if (countryDownloadsMap.has(id)) {
                const cMap = countryDownloadsMap.get(id);
                const sortedCountries = [...cMap.entries()]
                    .filter(([, units]) => units > 0)
                    .sort((a, b) => b[1] - a[1]);
                app.countries = Object.fromEntries(sortedCountries);
            }

            console.log(`Updated: ${app.name} (DL: ${app.downloads || 0}, Rating: ${app.rating?.toFixed?.(2) || 0} [${app.ratingCount || 0}], Reviews: ${reviews.length}, Countries: ${app.countries ? Object.keys(app.countries).length : 0})`);
        }

        // Also update downloads/countries/reviews for any apps in appsData that weren't in lookup response
        for (const [id, app] of appMap.entries()) {
            if (!storeResultsMap.has(id)) {
                if (downloadsMap.has(id)) app.downloads = downloadsMap.get(id);
                if (countryDownloadsMap.has(id)) {
                    const cMap = countryDownloadsMap.get(id);
                    const sortedCountries = [...cMap.entries()]
                        .filter(([, units]) => units > 0)
                        .sort((a, b) => b[1] - a[1]);
                    app.countries = Object.fromEntries(sortedCountries);
                }
                const reviews = await fetchAllGlobalReviews(token, id, app.reviews || []);
                if (reviews.length > 0) app.reviews = reviews;
            }
        }

        // Sort appsData by downloads descending (then ratingCount descending)
        appsData.sort((a, b) => {
            const dlDiff = (b.downloads || 0) - (a.downloads || 0);
            if (dlDiff !== 0) return dlDiff;
            return (b.ratingCount || 0) - (a.ratingCount || 0);
        });

        await fs.writeFile(APPS_JSON_PATH, JSON.stringify(appsData, null, 4), 'utf-8');
        console.log('Successfully updated and sorted apps.json with global data!');

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

updateApps();
