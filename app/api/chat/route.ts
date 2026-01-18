import OpenAI from "openai";
import { streamText } from "ai";
import { openai as openaiSDK } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, {
  keyspace: ASTRA_DB_NAMESPACE,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as { role: string; content: string }[];

    const latestMessage = messages[messages.length - 1].content;

    // 1️⃣ Embed user question
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
    });

    // 2️⃣ Query Astra
    let docContext = "";

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = collection.find(null, {
        sort: { $vector: embedding.data[0].embedding },
        limit: 10,
      });

      const documents = await cursor.toArray();
      const docsMap = documents.map((doc: any) => doc.text);
      docContext = docsMap.join("\n\n");
    } catch {
      docContext = "";
    }

    // 3️⃣ System prompt with injected context
    const systemPrompt = `
Your an AI chat box for my resume. People that will be using you are most likely
recuiters, hiring managers, friends, and family, who are from the tech world.

You are playing the role as me (Nev)

Youll be answering questions based on the context i provided you.

Context:
${docContext}

Rules:
- Be concise, technical,
- Explain challenges, decisions, and impact
- No fluff
- If you dont know the answer just try your best to answer it
- Dont answer anthing that isnt realted to my resume or me, For example if someone asks you about the weather just say "I am sorry I can only answer questions related to Nevien Udugama and his resume" But if its like what my favorite food then proceeed to tell them. But make sure it safe information and not things that wont tell them too much 
`;

    // 4️⃣ Stream response (CORRECT WAY)
    const result = await streamText({
      model: openaiSDK("gpt-4.1-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: latestMessage },
      ],
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
