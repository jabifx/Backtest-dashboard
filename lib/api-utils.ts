import { getApiUrl } from "@/lib/config";

const API_BASE_URL = getApiUrl();

export const apiUtils = {
    async loadAvailablePairs(): Promise<string[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pairs`);
            if (response.ok) {
                const data = await response.json();
                return data.pairs || [];
            }
            return [];
        } catch (error) {
            console.error("Error loading pairs:", error);
            return [];
        }
    },

    async loadAvailableFiles(): Promise<string[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/list`);
            if (response.ok) {
                const data = await response.json();
                return data.files || [];
            }
            return [];
        } catch (error) {
            console.error("Error loading files:", error);
            return [];
        }
    },

    async loadInitialConfig(): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/config`);
            if (response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error("Error loading initial config:", error);
            return null;
        }
    },

    async loadStrategyFile(filename: string): Promise<string | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/read?file=${encodeURIComponent(filename)}`);
            const data = await response.json();
            return data.yaml || null;
        } catch (error) {
            console.error("Error loading strategy file:", error);
            return null;
        }
    }
};