
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "Server misconfiguration: No API Key" }, { status: 500 });
    }

    try {
        const { prompt } = await req.json();

        console.log("Magic Request received:", prompt);
        console.log("API Key present:", !!apiKey); // Do not log the actual key

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Prompt Engineering
        const systemInstruction = `
            You are an AI assistant for a Home Services App.
            Analyze the user's request: "${prompt}".
            
            Match it to one of these valid categories:
            - Plumbing
            - Electrical
            - Cleaning
            - HVAC
            - Landscaping
            - Painting
            - Carpentry
            - Moving
            - Pest Control

            Determine the urgency: "Low", "Normal", "High", or "Emergency".
            
            Return strictly a JSON object with this format (no markdown):
            {
                "category": "String (one of the valid categories)",
                "urgency": "String",
                "description": "String (Refine the user's input to be professional)"
            }
        `;

        const result = await model.generateContent(systemInstruction);
        const response = result.response;
        let text = response.text();

        // Clean markdown code blocks if any
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const data = JSON.parse(text);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Gemini API Error Details:", error);
        console.error("Error message:", error.message);
        return NextResponse.json({ success: false, error: "Failed to analyze request" }, { status: 500 });
    }
}
