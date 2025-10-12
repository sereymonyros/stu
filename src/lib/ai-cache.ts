
'use client';

import type { AnalyzeApplicantOutput } from '@/ai/flows/analyze-applicant-schema';

// Helper function to create a consistent cache key
function getCacheKey(applicantId: string, resumeUrl: string): string {
    // Include a hash of the resume URL to ensure the cache invalidates if the URL changes.
    // A simple slice is sufficient to get a unique-enough identifier without a full hash function.
    const urlHash = resumeUrl.slice(-20);
    return `ai-analysis-${applicantId}-${urlHash}`;
}

/**
 * Retrieves a cached AI analysis result from localStorage.
 * @param applicantId The unique identifier for the applicant.
 * @param resumeUrl The URL of the resume that was analyzed.
 * @returns The cached analysis data, or null if it doesn't exist or an error occurs.
 */
export function getCachedAnalysis(applicantId: string, resumeUrl: string): AnalyzeApplicantOutput | null {
    if (typeof window === 'undefined' || !resumeUrl) {
        return null;
    }

    try {
        const cacheKey = getCacheKey(applicantId, resumeUrl);
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
 * @param resumeUrl The URL of the resume that was analyzed.
 * @param analysis The AI analysis data to cache.
 */
export function setCachedAnalysis(applicantId: string, resumeUrl: string, analysis: AnalyzeApplicantOutput): void {
     if (typeof window === 'undefined' || !resumeUrl) {
        return;
    }

    try {
        const cacheKey = getCacheKey(applicantId, resumeUrl);
        const dataToCache = JSON.stringify(analysis);
        localStorage.setItem(cacheKey, dataToCache);
    } catch (error) {
        // This can happen if localStorage is full (QUOTA_EXCEEDED_ERR)
        console.error("Failed to save to localStorage:", error);
    }
}
