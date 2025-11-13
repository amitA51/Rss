import * as dataService from './dataService';
import type { GoogleCalendarEvent } from '../types';

declare const gapi: any;
declare const google: any;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

let tokenClient: any;
let onAuthChangeCallback: ((isSignedIn: boolean) => void) | null = null;
let gapiInitialized = false;
let gisInitialized = false;

export const initGoogleClient = async (onAuthChange: (isSignedIn: boolean) => void) => {
    onAuthChangeCallback = onAuthChange;

    if (!gapiInitialized) {
        await new Promise<void>((resolve, reject) => {
            // gapi.load now includes error handling and a timeout
            gapi.load('client', {
                callback: resolve,
                onerror: reject,
                timeout: 5000, // 5 seconds
                ontimeout: () => reject(new Error('gapi.load timed out'))
            });
        });
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        });
        gapiInitialized = true;
    }

    if (!gisInitialized) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                    console.error('GIS Error:', tokenResponse.error);
                    onAuthChangeCallback?.(false);
                    return;
                }
                await dataService.saveToken('google_auth', tokenResponse);
                onAuthChangeCallback?.(true);
            },
        });
        gisInitialized = true;
    }

    const token = await dataService.getToken('google_auth');
    if (token && token.access_token) {
        gapi.client.setToken(token);
        onAuthChangeCallback?.(true);
    } else {
        onAuthChangeCallback?.(false);
    }
};

export const signIn = () => {
    if (!tokenClient) {
        console.error("Google GIS client not initialized.");
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const signOut = async () => {
    const token = await dataService.getToken('google_auth');
    if (token && token.access_token) {
        google.accounts.oauth2.revoke(token.access_token, () => {});
    }
    gapi.client.setToken(null);
    await dataService.removeToken('google_auth');
    onAuthChangeCallback?.(false);
};

export const getEventsForDateRange = async (startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> => {
    if (!gapi.client.calendar) {
        throw new Error("GAPI client or calendar API not loaded.");
    }

    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    const response = await gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': timeMin,
        'timeMax': timeMax,
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 5,
        'orderBy': 'startTime'
    });

    return response.result.items as GoogleCalendarEvent[];
};
