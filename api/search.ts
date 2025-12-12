import type { VercelRequest, VercelResponse } from '@vercel/node';

// YouTube Music API Client
class YTMusic {
    private baseURL = 'https://music.youtube.com/youtubei/v1';
    private apiKey = 'AIzaSyC9XL3ZjWjXClIX1FmUxJq--EohcD4_oSs';
    private context = {
        client: {
            hl: "en",
            gl: "IN",
            remoteHost: "2409:40e3:5046:edc0:9109:7731:5a8c:9727",
            deviceMake: "Apple",
            deviceModel: "",
            visitorData: "CgtBeG1UR2Q1VVNSNCjRjuLHBjIKCgJJThIEGgAgSA%3D%3D",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36,gzip(gfe)",
            clientName: "WEB_REMIX",
            clientVersion: "1.20251015.03.00",
            osName: "Macintosh",
            osVersion: "10_15_7",
            originalUrl: "https://music.youtube.com/",
            platform: "DESKTOP",
            clientFormFactor: "UNKNOWN_FORM_FACTOR",
            userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
            timeZone: "Asia/Calcutta",
            browserName: "Chrome",
            browserVersion: "141.0.0.0",
            acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
        },
        user: {
            lockedSafetyMode: false
        },
        request: {
            useSsl: true,
            internalExperimentFlags: [],
            consistencyTokenJars: []
        }
    };

    async search(query: string, filter: string | null = null, continuationToken: string | null = null, ignoreSpelling: boolean = false) {
        try {
            const params = this._encodeSearchParams(query, filter, continuationToken, ignoreSpelling);
            const response = await this._makeRequest('search', params);
            return this._parseSearchResults(response);
        } catch (error: any) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    private async _makeRequest(endpoint: string, params: any) {
        const url = `${this.baseURL}/${endpoint}?key=${this.apiKey}`;

        let requestBody: any;

        if (params.continuation) {
            requestBody = {
                context: this.context,
                continuation: params.continuation,
                params: `&ctoken=${encodeURIComponent(params.continuation)}&continuation=${encodeURIComponent(params.continuation)}`
            };
        } else {
            requestBody = {
                context: this.context,
                ...params
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    private _encodeSearchParams(query: string, filter: string | null = null, continuationToken: string | null = null, ignoreSpelling: boolean = false) {
        if (continuationToken) {
            return {
                continuation: continuationToken
            };
        }

        const searchParams: any = {
            query: query,
            params: this._getFilterParams(filter)
        };

        if (ignoreSpelling) {
            searchParams.params += '&ignore_spelling=true';
        }

        return searchParams;
    }

    private _getFilterParams(filter: string | null) {
        const filterMap: Record<string, string> = {
            'songs': 'Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk%3D',
            'videos': 'Eg-KAQwIABABGAAgACgAMABqChAEEAUQAxAKEAk%3D',
            'albums': 'Eg-KAQwIABAAGAEgACgAMABqChAEEAUQAxAKEAk%3D',
            'artists': 'EgWKAQIgAWoKEAMQBBAJEAoQBQ%3D%3D',
            'playlists': 'Eg-KAQwIABAAGAAgACgBMABqChAEEAUQAxAKEAk%3D',
            'profiles': 'Eg-KAQwIABABGAAgACgAMABqChAEEAUQAxAKEAk%3D',
            'podcasts': 'Eg-KAQwIABABGAAgACgAMABqChAEEAUQAxAKEAk%3D',
            'episodes': 'Eg-KAQwIABABGAAgACgAMABqChAEEAUQAxAKEAk%3D',
            'community_playlists': 'Eg-KAQwIABAAGAAgACgBMABqChAEEAUQAxAKEAk%3D'
        };

        return filterMap[filter || ''] || 'Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk%3D';
    }

    private _parseSearchResults(data: any) {
        const results: any[] = [];
        let continuationToken: string | null = null;

        if (data?.continuationContents) {
            const cc = data.continuationContents;
            for (const key of Object.keys(cc)) {
                const block = cc[key];
                const contents = block?.contents || [];
                for (const entry of contents) {
                    if (entry.musicShelfRenderer) {
                        const shelfItems = entry.musicShelfRenderer.contents || [];
                        for (const si of shelfItems) {
                            const m = si.musicResponsiveListItemRenderer;
                            if (m) {
                                const parsed = this._parseMusicItem(m);
                                if (parsed) results.push(parsed);
                            }
                        }
                        const cont = entry.musicShelfRenderer?.continuations?.[0];
                        continuationToken = cont?.nextContinuationData?.continuation
                            || cont?.reloadContinuationData?.continuation
                            || continuationToken;
                    } else if (entry.musicResponsiveListItemRenderer) {
                        const parsed = this._parseMusicItem(entry.musicResponsiveListItemRenderer);
                        if (parsed) results.push(parsed);
                    } else if (entry.continuationItemRenderer) {
                        continuationToken = entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || continuationToken;
                    }
                }
            }
        }

        const actions = data?.onResponseReceivedActions || data?.onResponseReceivedCommands || [];
        for (const action of actions) {
            const append = action?.appendContinuationItemsAction;
            const reload = action?.reloadContinuationItemsCommand;
            const items = append?.continuationItems || reload?.continuationItems || [];
            for (const entry of items) {
                if (entry.musicShelfContinuation) {
                    const shelfItems = entry.musicShelfContinuation.contents || [];
                    for (const si of shelfItems) {
                        const m = si.musicResponsiveListItemRenderer;
                        if (m) {
                            const parsed = this._parseMusicItem(m);
                            if (parsed) results.push(parsed);
                        }
                    }
                    const cont = entry.musicShelfContinuation?.continuations?.[0];
                    continuationToken = cont?.nextContinuationData?.continuation
                        || cont?.reloadContinuationData?.continuation
                        || continuationToken;
                } else if (entry.musicShelfRenderer) {
                    const shelfItems = entry.musicShelfRenderer.contents || [];
                    for (const si of shelfItems) {
                        const m = si.musicResponsiveListItemRenderer;
                        if (m) {
                            const parsed = this._parseMusicItem(m);
                            if (parsed) results.push(parsed);
                        }
                    }
                    const cont = entry.musicShelfRenderer?.continuations?.[0];
                    continuationToken = cont?.nextContinuationData?.continuation
                        || cont?.reloadContinuationData?.continuation
                        || continuationToken;
                } else if (entry.musicResponsiveListItemRenderer) {
                    const parsed = this._parseMusicItem(entry.musicResponsiveListItemRenderer);
                    if (parsed) results.push(parsed);
                } else if (entry.continuationItemRenderer) {
                    continuationToken = entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || continuationToken;
                }
            }
        }

        if (results.length === 0) {
            const initial = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
            for (const section of initial) {
                if (section.musicShelfRenderer) {
                    const items = section.musicShelfRenderer.contents || [];
                    for (const it of items) {
                        const m = it.musicResponsiveListItemRenderer;
                        if (m) {
                            const parsed = this._parseMusicItem(m);
                            if (parsed) results.push(parsed);
                        }
                    }
                    const cont = section.musicShelfRenderer?.continuations?.[0];
                    continuationToken = cont?.nextContinuationData?.continuation
                        || cont?.reloadContinuationData?.continuation
                        || continuationToken;
                }
                if (section.continuationItemRenderer) {
                    continuationToken = section.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || continuationToken;
                }
            }
        }

        return { results, continuationToken };
    }

    private _parseMusicItem(item: any) {
        if (!item) return null;

        const title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const subtitle = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const thumbnail = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;

        const watchEndpoint = item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
        const videoId = watchEndpoint?.videoId;
        let watchPlaylistId = watchEndpoint?.playlistId;

        if (!watchPlaylistId && item.menu?.menuRenderer?.items) {
            const mixItem = item.menu.menuRenderer.items.find((i: any) =>
                i.menuNavigationItemRenderer?.icon?.iconType === 'MIX'
            );
            if (mixItem) {
                watchPlaylistId = mixItem.menuNavigationItemRenderer.navigationEndpoint?.watchEndpoint?.playlistId;
            }
        }

        const browseId = item.navigationEndpoint?.browseEndpoint?.browseId;
        const playlistId = item.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_PLAYLIST'
            ? item.navigationEndpoint?.browseEndpoint?.browseId
            : null;

        let duration = item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
        if (!duration) {
            const subtitleRuns = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            for (const run of subtitleRuns) {
                const text = (run?.text || '').trim();
                if (!text) continue;
                const match = text.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
                const match2 = !match && text.match(/\b(\d{1,2}):(\d{2})\b/);
                if (match) {
                    const h = parseInt(match[1] || '0', 10);
                    const m = parseInt(match[2] || '0', 10);
                    const s = parseInt(match[3] || '0', 10);
                    const total = h * 3600 + m * 60 + s;
                    duration = h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
                    (item as any).__derivedDurationSeconds = total;
                    break;
                } else if (match2) {
                    const m = parseInt(match2[1] || '0', 10);
                    const s = parseInt(match2[2] || '0', 10);
                    const total = m * 60 + s;
                    duration = `${m}:${s.toString().padStart(2, '0')}`;
                    (item as any).__derivedDurationSeconds = total;
                    break;
                }
            }
        }

        const artists: any[] = [];
        let album: any = null;
        let views: string | null = null;
        let year: string | null = null;

        subtitle.forEach((run: any) => {
            if (run.navigationEndpoint?.browseEndpoint) {
                const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

                if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                    artists.push({
                        name: run.text,
                        id: run.navigationEndpoint.browseEndpoint.browseId
                    });
                } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                    album = {
                        name: run.text,
                        id: run.navigationEndpoint.browseEndpoint.browseId
                    };
                }
            } else if (run.text) {
                const text = run.text.trim();
                if (text.includes('views')) {
                    views = text;
                } else if (/^\d{4}$/.test(text)) {
                    year = text;
                }
            }
        });

        const isExplicit = item.badges?.some((badge: any) =>
            badge.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
        ) || false;

        let resultType = 'song';
        let category = 'Songs';

        if (playlistId) {
            resultType = 'playlist';
            category = 'Playlists';
        } else if (browseId?.startsWith('UC')) {
            resultType = 'artist';
            category = 'Artists';
        } else if (browseId?.startsWith('MPREb_')) {
            resultType = 'album';
            category = 'Albums';
        }

        const result: any = {
            category: category,
            resultType: resultType,
            title: title,
            thumbnails: this._parseThumbnails(item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []),
            isExplicit: isExplicit
        };

        if (watchPlaylistId) {
            result.playlistId = watchPlaylistId;
        }

        if (videoId) {
            result.videoId = videoId;
            result.duration = duration;
            const derived = (item as any).__derivedDurationSeconds;
            result.duration_seconds = Number.isInteger(derived) ? derived : this._parseDurationToSeconds(duration);
            result.videoType = 'MUSIC_VIDEO_TYPE_ATV';
        }

        if (artists.length > 0) {
            result.artists = artists;
        }

        if (album) {
            result.album = album;
        }

        if (browseId) {
            result.browseId = browseId;
        }

        if (views) {
            result.views = views;
        }

        if (year) {
            result.year = year;
        }

        return result;
    }

    private _parseDurationToSeconds(duration: string | null): number | null {
        if (!duration) return null;

        const parts = duration.split(':').map(p => parseInt(p));
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            return parts[0];
        }
        return null;
    }

    private _parseThumbnails(thumbnails: any[]) {
        return thumbnails.map(thumb => ({
            url: thumb.url,
            width: thumb.width,
            height: thumb.height
        }));
    }
}

const ALLOWED_FILTERS = new Set([
    'songs',
    'videos',
    'albums',
    'artists',
    'playlists',
    'profiles',
    'podcasts',
    'episodes',
    'community_playlists'
]);

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { q: query, filter, continuationToken, ignore_spelling } = request.query;
        const ignoreSpelling = ignore_spelling === 'true';

        if (!query && !continuationToken) {
            return response.status(400).json({
                error: "Missing required query parameter 'q' or 'continuationToken'"
            });
        }

        if (filter && !ALLOWED_FILTERS.has(filter as string)) {
            return response.status(400).json({
                error: `Invalid filter. Allowed: ${Array.from(ALLOWED_FILTERS).sort().join(', ')}`
            });
        }

        const ytmusic = new YTMusic();

        const searchResults = await ytmusic.search(
            (query as string) || '',
            (filter as string) || null,
            (continuationToken as string) || null,
            ignoreSpelling
        );

        return response.status(200).json({
            query: query || null,
            filter: filter || null,
            results: searchResults.results,
            continuationToken: searchResults.continuationToken
        });
    } catch (error: any) {
        console.error('Search error:', error);
        return response.status(500).json({
            error: `Search failed: ${error.message}`
        });
    }
}
