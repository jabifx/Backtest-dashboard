let apiUrl: string = "http://localhost:8000";

export const getApiUrl = (): string => apiUrl;
export const setApiUrl = (url: string): void => {
    apiUrl = url;
};