import { GoogleGenAI } from "@google/genai";
import { Asset, NewsAlertItem, SentimentAnalysis } from '@/types';

const API_KEY = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("GEMINI_API_KEY environment variable not set");
}

async function generateWithRetry(prompt: string, modelName: 'gemini-3-flash-preview', config: any): Promise<string> {
    if (!ai) return "AI analysis requires GEMINI_API_KEY.";
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: config,
            });
            return result.text;
        } catch (e: any) {
            console.error(`Gemini API call failed for model ${modelName}. Retries left: ${retries - 1}`, e);
            retries--;
            if (retries === 0) {
                // Return a fallback string instead of throwing to prevent app crash
                if (config.responseMimeType === "application/json") {
                    return JSON.stringify({ error: "Rate limit exceeded or API error." });
                }
                return "AI analysis currently unavailable due to rate limits. Please try again later.";
            }
            await new Promise(res => setTimeout(res, 2000)); // Increased backoff
        }
    }
    return "AI analysis currently unavailable.";
}


export const getExecutiveSummary = async (gainers: Asset[], losers: Asset[]): Promise<string> => {
    const gainersList = gainers.map(g => `${g.name} (+${g.dailyChange.toFixed(2)}%)`).join(', ');
    const losersList = losers.map(l => `${l.name} (${l.dailyChange.toFixed(2)}%)`).join(', ');

    const prompt = `
        Act as a seasoned hedge fund analyst.
        Based on the following top market movers, provide a one-sentence executive summary identifying the most volatile mover of the day, followed by a brief, impactful market observation.
        
        Today's Top 5 Gainers: ${gainersList}
        Today's Top 5 Losers: ${losersList}

        Format your response as plain text, not markdown.
    `;

    return generateWithRetry(prompt, 'gemini-3-flash-preview', {
        temperature: 0.7
    });
};

export const getKeyNewsAlerts = async (): Promise<NewsAlertItem> => {
    const prompt = `
        Act as a financial news aggregator for a professional trading desk.
        Provide 3 critical and up-to-date trading insights or breaking news headlines for the cryptocurrency market today.
        The insights should be concise, impactful, and relevant to a trader.

        Format your response as a simple list with each item on a new line, starting with a dash.
    `;
    try {
        if (!ai) return { alerts: ["AI analysis requires GEMINI_API_KEY."], sources: [] };
        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const alerts = result.text.split('\n').map(line => line.trim().replace(/^- /, '')).filter(line => line.length > 0);
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string; } => !!web && !!web.uri)
            .filter((source, index, self) => index === self.findIndex(s => s.uri === source.uri));

        return { alerts, sources };

    } catch (e) {
        console.error("Failed to get key news alerts with search grounding:", e);
        return {
            alerts: ["AI failed to generate valid news alerts. Please check the logs."],
            sources: []
        };
    }
};

export const getAssetInsights = async (assets: Asset[]): Promise<Record<string, string>> => {
    const assetList = assets.map(a => `${a.name} (${a.symbol})`).join(', ');

    const prompt = `
        For the following list of cryptocurrencies, provide a one-sentence news summary or trading insight for each for today.
        The insight should be concise and highly relevant for a trader.
        
        Cryptocurrencies: ${assetList}

        Format the output as a single JSON object where the key is the asset's ticker symbol (e.g., "BTC") and the value is the insight string.
    `;

    const response = await generateWithRetry(prompt, 'gemini-3-flash-preview', {
        temperature: 0.5,
        responseMimeType: "application/json"
    });
    try {
        const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedResponse);
    } catch (e) {
        console.error("Failed to parse JSON for asset insights:", e);
        const fallback: Record<string, string> = {};
        assets.forEach(a => {
            fallback[a.symbol] = "AI insight generation failed.";
        });
        return fallback;
    }
};

export const getSentimentAnalysis = async (assetName: string, insights: string[]): Promise<SentimentAnalysis> => {
    const prompt = `
        Analyze the overall market sentiment for ${assetName} based on these recent historical news insights:
        ${insights.join('\n')}

        Return a JSON object with:
        1. "sentiment": one of "Bullish", "Bearish", or "Neutral"
        2. "score": a number from 0 (extremely bearish) to 100 (extremely bullish)
        3. "summary": a one-sentence professional justification for this sentiment.
    `;

    const response = await generateWithRetry(prompt, 'gemini-3-flash-preview', {
        temperature: 0.3,
        responseMimeType: "application/json"
    });

    try {
        const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedResponse);
    } catch (e) {
        console.error("Failed to parse sentiment analysis:", e);
        return {
            sentiment: 'Neutral',
            score: 50,
            summary: 'Insufficient data for a definitive sentiment analysis.'
        };
    }
};

export const analyzeChartImage = async (base64Data: string, mimeType: string = "image/jpeg"): Promise<string> => {
    const prompt = "Analyze this cryptocurrency chart. Identify the current trend (Bullish/Bearish) and look for any technical patterns like Head and Shoulders or Support/Resistance levels.";

    try {
        if (!ai) return "AI analysis requires GEMINI_API_KEY.";
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    }
                ]
            }
        });
        return response.text || "No analysis generated.";
    } catch (e) {
        console.error("Failed to analyze chart image:", e);
        return "AI analysis currently unavailable due to an error.";
    }
};