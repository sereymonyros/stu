
'use client';

import type { AnalyzeApplicantOutput } from '@/ai/flows/analyze-applicant-schema';

// Helper function to create a consistent cache key
function getCacheKey(applicantId: string): string {
    return `ai-analysis-${applicantId}`;
}

/**
 * Retrieves a cached AI analysis result from localStorage.
 * @param applicantId The unique identifier for the applicant.
 * @returns The cached analysis data, or null if it doesn't exist or an error occurs.
 */
export function getCachedAnalysis(applicantId: string): AnalyzeApplicantOutput | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const cacheKey = getCacheKey(applicantId);
        const cachedItem = localStorage.getItem(cacheKey);

        if (cachedItem) {
            const data = JSON.parse(cachedItem);
            // Optional: You could add a timestamp and check for expiry here
            return data as AnalyzeApplicantOutput;
        }

        return null;

    } catch (error) {
        console.error("Failed to retrieve from localStorage:", error);
        return null;
    }
}

/**
 * Saves an AI analysis result to localStorage.
 * @param applicantId The unique identifier for the applicant.
 * @param analysis The AI analysis data to cache.
 */
export function setCachedAnalysis(applicantId: string, analysis: AnalyzeApplicantOutput): void {
     if (typeof window === 'undefined') {
        return;
    }

    try {
        const cacheKey = getCacheKey(applicantId);
        const dataToCache = JSON.stringify(analysis);
        localStorage.setItem(cacheKey, dataToCache);
    } catch (error) {
        // This can happen if localStorage is full (QUOTA_EXCEEDED_ERR)
        console.error("Failed to save to localStorage:", error);
    }
}
