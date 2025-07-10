import { Groq } from "groq-sdk";

export type GroqRole = "user" | "assistant" | "system";

export interface GroqMessage {
  role: GroqRole;
  content: string;
}

export interface GroqStreamPayload {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream: boolean;
}

export async function GroqStream(payload: GroqStreamPayload) {
  // Validate API key
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: payload.messages,
      model: payload.model,
      temperature: payload.temperature,
      max_completion_tokens: payload.max_tokens,
      top_p: payload.top_p,
      stream: payload.stream,
      stop: null,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Type assertion to handle the stream properly
          const streamResponse = chatCompletion as any;

          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content || "";

            if (content) {
              const queue = encoder.encode(content);
              controller.enqueue(queue);
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      },

      cancel() {
        console.log("Stream cancelled");
      },
    });

    return stream;
  } catch (error) {
    console.error("GROQ Stream error:", error);
    throw error;
  }
}
