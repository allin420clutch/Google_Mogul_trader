import { GoogleGenAI } from "@google/genai";
import { Asset, NewsAlertItem } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function generateWithRetry(prompt: string, modelName: 'gemini-2.5-pro' | 'gemini-2.5-flash', config: any): Promise<string> {
    let retries = 3;
    while(retries > 0) {
        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: config,
            });
            return result.text;
        } catch (e) {
            console.error(`Gemini API call failed for model ${modelName}. Retries left: ${retries - 1}`, e);
            retries--;
            if(retries === 0) throw e;
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    throw new Error("Gemini API call failed after multiple retries.");
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
        Example: "Solana led the market with a staggering 15% gain, signaling renewed interest in layer-1 platforms amidst broader market consolidation."
    `;

    return generateWithRetry(prompt, 'gemini-2.5-pro', {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      thinkingConfig: { thinkingBudget: 32768 }
    });
};

export const getKeyNewsAlerts = async (): Promise<NewsAlertItem> => {
    const prompt = `
        Act as a financial news aggregator for a professional trading desk.
        Provide 3 critical and up-to-date trading insights or breaking news headlines for the cryptocurrency market today.
        The insights should be concise, impactful, and relevant to a trader.

        Format your response as a simple list with each item on a new line, starting with a dash.
        Example:
        - Regulatory crackdown fears in Asia suppress market sentiment.
        - Whale wallets show significant accumulation of ETH, hinting at a potential price surge.
        - A major DeFi protocol announced a critical security vulnerability, causing its token to plummet.
    `;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              tools: [{googleSearch: {}}],
            },
        });

        const alerts = result.text.split('\n').map(line => line.trim().replace(/^- /, '')).filter(line => line.length > 0);
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string; } => !!web && !!web.uri)
             // Deduplicate sources based on URI
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
        Ensure the JSON is well-formed.
    `;

    const response = await generateWithRetry(prompt, 'gemini-2.5-pro', {
        temperature: 0.5,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 }
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