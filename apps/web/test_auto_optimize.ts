import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const apiKey = process.env.GEMINI_API_KEY || ''
console.log("API KEY starts with:", apiKey.substring(0, 5))
const genAI = new GoogleGenerativeAI(apiKey)

async function test() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: "You are an assistant",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    })

    console.log("Generating...")
    const result = await model.generateContent("Hello, write a short 50-word story about a cat.")
    const text = result.response.text()
    console.log("Generated:", text.substring(0, 50))
  } catch (error: any) {
    console.error("Error occurred:", error.message)
    if (error.response) console.error("Response:", await error.response.text())
  }
}

test().catch(console.error)
