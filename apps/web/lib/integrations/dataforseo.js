"use strict";
/**
 * DataForSEO Labs API Integration
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeywordMetrics = getKeywordMetrics;
exports.getCompetitorKeywords = getCompetitorKeywords;
exports.getRelatedKeywords = getRelatedKeywords;
exports.getCompetitorsDomain = getCompetitorsDomain;
exports.getSerpDomains = getSerpDomains;
exports.getDomainBacklinksSummary = getDomainBacklinksSummary;
exports.getDomainPagesBacklinks = getDomainPagesBacklinks;
exports.getDomainBacklinksDetail = getDomainBacklinksDetail;
function getAuthHeader() {
    var token = process.env.DATAFORSEO_AUTH_TOKEN;
    if (!token)
        return {};
    return {
        'Authorization': "Basic ".concat(token),
        'Content-Type': 'application/json'
    };
}
// v3/dataforseo_labs/google/search_volume/live
function getKeywordMetrics(keywords_1) {
    return __awaiter(this, arguments, void 0, function (keywords, locationCode, languageCode) {
        var res, data, results, error_1;
        var _a, _b, _c, _d;
        if (locationCode === void 0) { locationCode = 2642; }
        if (languageCode === void 0) { languageCode = 'ro'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/historical_search_volume/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{
                                    location_code: locationCode,
                                    language_code: languageCode,
                                    keywords: keywords.slice(0, 1000) // max 1000 per request
                                }])
                        })];
                case 1:
                    res = _e.sent();
                    if (!res.ok) {
                        throw new Error("DataForSEO API error: ".concat(res.status, " ").concat(res.statusText));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _e.sent();
                    results = ((_d = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) || [];
                    return [2 /*return*/, results.map(function (item) {
                            var _a, _b, _c, _d, _e;
                            return ({
                                keyword: item.keyword,
                                search_volume: ((_a = item.keyword_info) === null || _a === void 0 ? void 0 : _a.search_volume) || 0,
                                cpc: ((_b = item.keyword_info) === null || _b === void 0 ? void 0 : _b.cpc) || 0,
                                competition: ((_c = item.keyword_info) === null || _c === void 0 ? void 0 : _c.competition) || 0,
                                keyword_difficulty: ((_d = item.keyword_properties) === null || _d === void 0 ? void 0 : _d.keyword_difficulty) || 0,
                                search_intent: ((_e = item.keyword_properties) === null || _e === void 0 ? void 0 : _e.search_intent) || []
                            });
                        })];
                case 3:
                    error_1 = _e.sent();
                    console.error('[DataForSEO] getKeywordMetrics error:', error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// v3/dataforseo_labs/google/ranked_keywords/live
function getCompetitorKeywords(domain_1) {
    return __awaiter(this, arguments, void 0, function (domain, locationCode, languageCode) {
        var res, data, results, error_2;
        var _a, _b, _c, _d;
        if (locationCode === void 0) { locationCode = 2642; }
        if (languageCode === void 0) { languageCode = 'ro'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{
                                    target: domain,
                                    location_code: locationCode,
                                    language_code: languageCode,
                                    limit: 50
                                }])
                        })];
                case 1:
                    res = _e.sent();
                    if (!res.ok) {
                        throw new Error("DataForSEO API error: ".concat(res.status, " ").concat(res.statusText));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _e.sent();
                    results = ((_d = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) || [];
                    return [2 /*return*/, results.map(function (item) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                            return ({
                                keyword: (_a = item.keyword_data) === null || _a === void 0 ? void 0 : _a.keyword,
                                search_volume: ((_c = (_b = item.keyword_data) === null || _b === void 0 ? void 0 : _b.keyword_info) === null || _c === void 0 ? void 0 : _c.search_volume) || 0,
                                cpc: ((_e = (_d = item.keyword_data) === null || _d === void 0 ? void 0 : _d.keyword_info) === null || _e === void 0 ? void 0 : _e.cpc) || 0,
                                competition: ((_g = (_f = item.keyword_data) === null || _f === void 0 ? void 0 : _f.keyword_info) === null || _g === void 0 ? void 0 : _g.competition) || 0,
                                keyword_difficulty: ((_j = (_h = item.keyword_data) === null || _h === void 0 ? void 0 : _h.keyword_info) === null || _j === void 0 ? void 0 : _j.keyword_difficulty) || 0,
                                search_intent: ((_l = (_k = item.keyword_data) === null || _k === void 0 ? void 0 : _k.keyword_properties) === null || _l === void 0 ? void 0 : _l.search_intent) || []
                            });
                        })];
                case 3:
                    error_2 = _e.sent();
                    console.error('[DataForSEO] getCompetitorKeywords error:', error_2);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// v3/dataforseo_labs/google/related_keywords/live
function getRelatedKeywords(keyword_1) {
    return __awaiter(this, arguments, void 0, function (keyword, locationCode, languageCode) {
        var res, data, results, error_3;
        var _a, _b, _c, _d;
        if (locationCode === void 0) { locationCode = 2642; }
        if (languageCode === void 0) { languageCode = 'ro'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{
                                    keyword: keyword,
                                    location_code: locationCode,
                                    language_code: languageCode,
                                    limit: 50
                                }])
                        })];
                case 1:
                    res = _e.sent();
                    if (!res.ok) {
                        throw new Error("DataForSEO API error: ".concat(res.status, " ").concat(res.statusText));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _e.sent();
                    results = ((_d = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) || [];
                    return [2 /*return*/, results.map(function (item) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
                            return ({
                                keyword: ((_a = item.keyword_data) === null || _a === void 0 ? void 0 : _a.keyword) || item.keyword,
                                search_volume: ((_c = (_b = item.keyword_data) === null || _b === void 0 ? void 0 : _b.keyword_info) === null || _c === void 0 ? void 0 : _c.search_volume) || ((_d = item.keyword_info) === null || _d === void 0 ? void 0 : _d.search_volume) || 0,
                                cpc: ((_f = (_e = item.keyword_data) === null || _e === void 0 ? void 0 : _e.keyword_info) === null || _f === void 0 ? void 0 : _f.cpc) || ((_g = item.keyword_info) === null || _g === void 0 ? void 0 : _g.cpc) || 0,
                                competition: ((_j = (_h = item.keyword_data) === null || _h === void 0 ? void 0 : _h.keyword_info) === null || _j === void 0 ? void 0 : _j.competition) || ((_k = item.keyword_info) === null || _k === void 0 ? void 0 : _k.competition) || 0,
                                keyword_difficulty: ((_m = (_l = item.keyword_data) === null || _l === void 0 ? void 0 : _l.keyword_info) === null || _m === void 0 ? void 0 : _m.keyword_difficulty) || ((_o = item.keyword_info) === null || _o === void 0 ? void 0 : _o.keyword_difficulty) || 0,
                                search_intent: ((_q = (_p = item.keyword_data) === null || _p === void 0 ? void 0 : _p.keyword_properties) === null || _q === void 0 ? void 0 : _q.search_intent) || ((_r = item.keyword_properties) === null || _r === void 0 ? void 0 : _r.search_intent) || []
                            });
                        })];
                case 3:
                    error_3 = _e.sent();
                    console.error('[DataForSEO] getRelatedKeywords error:', error_3);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// v3/dataforseo_labs/google/competitors_domain/live
function getCompetitorsDomain(domain_1) {
    return __awaiter(this, arguments, void 0, function (domain, locationCode, languageCode) {
        var res, data, results, error_4;
        var _a, _b, _c, _d;
        if (locationCode === void 0) { locationCode = 2642; }
        if (languageCode === void 0) { languageCode = 'ro'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{
                                    target: domain,
                                    location_code: locationCode,
                                    language_code: languageCode,
                                    limit: 10
                                }])
                        })];
                case 1:
                    res = _e.sent();
                    if (!res.ok) {
                        throw new Error("DataForSEO API error: ".concat(res.status, " ").concat(res.statusText));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _e.sent();
                    results = ((_d = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) || [];
                    return [2 /*return*/, results.map(function (item) { return item.domain; }).filter(Boolean)];
                case 3:
                    error_4 = _e.sent();
                    console.error('[DataForSEO] getCompetitorsDomain error:', error_4);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// v3/serp/google/organic/live/advanced
function getSerpDomains(keyword_1) {
    return __awaiter(this, arguments, void 0, function (keyword, locationCode, languageCode) {
        var res, data, items, baseResults, seenDomains, _i, items_1, item, cleanDomain, top10, cheerio_1, resultsWithWordCount, error_5;
        var _this = this;
        var _a, _b, _c, _d;
        if (locationCode === void 0) { locationCode = 2642; }
        if (languageCode === void 0) { languageCode = 'ro'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{
                                    keyword: keyword,
                                    location_code: locationCode,
                                    language_code: languageCode,
                                    depth: 20
                                }])
                        })];
                case 1:
                    res = _e.sent();
                    if (!res.ok) {
                        throw new Error("DataForSEO API error: ".concat(res.status, " ").concat(res.statusText));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _e.sent();
                    items = ((_d = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) || [];
                    baseResults = [];
                    seenDomains = new Set();
                    for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                        item = items_1[_i];
                        if (item.type === 'organic' && item.domain && item.url) {
                            cleanDomain = item.domain.replace(/^www\./, '');
                            if (!seenDomains.has(cleanDomain)) {
                                seenDomains.add(cleanDomain);
                                baseResults.push({
                                    domain: cleanDomain,
                                    url: item.url,
                                    title: item.title || '',
                                    description: item.description || '',
                                    rank: item.rank_group || item.rank_absolute || 0
                                });
                            }
                        }
                    }
                    top10 = baseResults.slice(0, 10);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('cheerio'); })];
                case 3:
                    cheerio_1 = _e.sent();
                    return [4 /*yield*/, Promise.all(top10.map(function (resItem) { return __awaiter(_this, void 0, void 0, function () {
                            var wordCount, controller_1, timeoutId, htmlRes, html, $, text, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        wordCount = 0;
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 5, , 6]);
                                        controller_1 = new AbortController();
                                        timeoutId = setTimeout(function () { return controller_1.abort(); }, 3000) // 3s timeout
                                        ;
                                        return [4 /*yield*/, fetch(resItem.url.startsWith('http') ? resItem.url : "https://".concat(resItem.url), {
                                                signal: controller_1.signal,
                                                headers: {
                                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                                }
                                            })];
                                    case 2:
                                        htmlRes = _a.sent();
                                        clearTimeout(timeoutId);
                                        if (!htmlRes.ok) return [3 /*break*/, 4];
                                        return [4 /*yield*/, htmlRes.text()];
                                    case 3:
                                        html = _a.sent();
                                        $ = cheerio_1.load(html);
                                        $('script, style, noscript, iframe, img, svg').remove();
                                        text = $('body').text() || '';
                                        wordCount = text.split(/\s+/).filter(function (word) { return word.trim().length > 0; }).length;
                                        _a.label = 4;
                                    case 4: return [3 /*break*/, 6];
                                    case 5:
                                        err_1 = _a.sent();
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/, __assign(__assign({}, resItem), { wordCount: wordCount })];
                                }
                            });
                        }); }))];
                case 4:
                    resultsWithWordCount = _e.sent();
                    return [2 /*return*/, resultsWithWordCount];
                case 5:
                    error_5 = _e.sent();
                    console.error('[DataForSEO] getSerpDomains error:', error_5);
                    return [2 /*return*/, []];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getDomainBacklinksSummary(target) {
    return __awaiter(this, void 0, void 0, function () {
        var res, data, item, error_6;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{ target: target, limit: 1 }])
                        })];
                case 1:
                    res = _d.sent();
                    if (!res.ok)
                        throw new Error("DataForSEO API error: ".concat(res.status));
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _d.sent();
                    item = (_c = (_b = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c[0];
                    if (!item)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            target: item.target,
                            backlinks: item.backlinks || 0,
                            referring_domains: item.referring_domains || 0,
                            referring_pages: item.referring_pages || 0,
                            rank: item.rank || 0
                        }];
                case 3:
                    error_6 = _d.sent();
                    console.error('[DataForSEO] getDomainBacklinksSummary error:', error_6);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getDomainPagesBacklinks(target_1) {
    return __awaiter(this, arguments, void 0, function (target, limit) {
        var res, data, task, items, pagesMap_1, error_7;
        var _a, _b, _c;
        if (limit === void 0) { limit = 100; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{ target: target, limit: limit, order_by: ['rank,desc'] }])
                        })];
                case 1:
                    res = _d.sent();
                    if (!res.ok) {
                        if (res.status === 402) {
                            throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).");
                        }
                        throw new Error("DataForSEO API error: ".concat(res.status));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _d.sent();
                    task = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0];
                    if (task && task.status_code >= 40000) {
                        if (task.status_code === 40200) {
                            throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).");
                        }
                        throw new Error("DataForSEO Task Error: ".concat(task.status_message));
                    }
                    items = ((_c = (_b = task === null || task === void 0 ? void 0 : task.result) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.items) || [];
                    pagesMap_1 = new Map();
                    items.forEach(function (item) {
                        if (!item.url_to)
                            return;
                        var existing = pagesMap_1.get(item.url_to);
                        if (existing) {
                            existing.backlinks++;
                            existing.referring_domains++;
                        }
                        else {
                            pagesMap_1.set(item.url_to, {
                                url: item.url_to,
                                backlinks: 1,
                                referring_domains: 1,
                                rank: item.rank || 0
                            });
                        }
                    });
                    return [2 /*return*/, Array.from(pagesMap_1.values())];
                case 3:
                    error_7 = _d.sent();
                    console.error('[DataForSEO] getDomainPagesBacklinks error:', error_7);
                    throw error_7;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getDomainBacklinksDetail(target_1) {
    return __awaiter(this, arguments, void 0, function (target, limit) {
        var res, data, task, items, error_8;
        var _a, _b, _c;
        if (limit === void 0) { limit = 100; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
                            method: 'POST',
                            headers: getAuthHeader(),
                            body: JSON.stringify([{ target: target, limit: limit, order_by: ['rank,desc'] }])
                        })];
                case 1:
                    res = _d.sent();
                    if (!res.ok) {
                        if (res.status === 402) {
                            throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).");
                        }
                        throw new Error("DataForSEO API error: ".concat(res.status));
                    }
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _d.sent();
                    task = (_a = data.tasks) === null || _a === void 0 ? void 0 : _a[0];
                    if (task && task.status_code >= 40000) {
                        if (task.status_code === 40200) {
                            throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).");
                        }
                        throw new Error("DataForSEO Task Error: ".concat(task.status_message));
                    }
                    items = ((_c = (_b = task === null || task === void 0 ? void 0 : task.result) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.items) || [];
                    return [2 /*return*/, items.map(function (item) { return ({
                            url_from: item.url_from,
                            url_to: item.url_to,
                            domain_from: item.domain_from,
                            anchor: item.anchor || '',
                            rank: item.rank || 0,
                            domain_from_rank: item.domain_from_rank || 0,
                            page_to_status_code: item.page_to_status_code || 200
                        }); })];
                case 3:
                    error_8 = _d.sent();
                    console.error('[DataForSEO] getDomainBacklinksDetail error:', error_8);
                    throw error_8; // Re-throw to be handled by the route
                case 4: return [2 /*return*/];
            }
        });
    });
}
