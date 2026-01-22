// Responsible for loading up all our data into our Astra database
// & scrape the internet for some information

import { DataAPIClient } from "@datastax/astra-db-ts"
import OpenAI from "openai"

import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"; //takes chunks of text and breaks it up

import "dotenv/config"

                        
type SimilarityMetric = "dot_product" | "cosine" | "euclidean" // types of similarity metrics for vector DB 
// cosine: determines how similar two vectors are and will be the default when creating a collection in Astro DB
// dot_product: 50% faster than cosine but requires vectors to be normalized
// euclidean: when you want to find how close two vectors are, its is the most intutive and comonnly used metrics
// if two vectors have a small euclidean distance, they are similar in hte vector space vice versa


//env file stuff
const { ASTRA_DB_NAMESPACE,                
        ASTRA_DB_COLLECTION,
        ASTRA_DB_API_ENDPOINT,
        ASTRA_DB_APPLICATION_TOKEN,
        OPENAI_API_KEY,
        RESUME,
        ABOUTME

} = process.env

//every property and method openai comes will be attached to this
const openai = new OpenAI({apiKey: OPENAI_API_KEY}) 

//put your data in here like links to scrape and me
const myData = [
        'https://docs.google.com/document/d/1fRuq9WkGBKpoQMIQgc-U9hsr4q3qQw46/export?format=txt',
        'https://docs.google.com/document/d/1gx1uLQITXM4Pe4beRmi2icZOiazRAbmtzGIaAGJzgD8/export?format=txt'
]

//initialize the Astra DB client
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE} )

//number of character in each chunks and overlapping chunks between chunks
const splitter = new RecursiveCharacterTextSplitter({  
        chunkSize: 512,
        chunkOverlap: 100
})


// Create a database collection that can store vectors (embeddings) and compare them using a similarity metric  
const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {                                                                     
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
                vector: {
                        dimension: 1536,
                        metric: similarityMetric
                }
        })
        console.log(res)
}

// function that allows us to get all the URls we collected above chunk them up and create vector embedding out of them and put them in our vector DB
const loadSampleData = async () => {
        const collection = await db.collection(ASTRA_DB_COLLECTION)
        for await ( const url of myData) {
                const content = await scrapePage(url) //scrape the page
                const chunks = await splitter.splitText(content) //split the page into chunks
                for await ( const chunk of chunks) {
                        const embedding = await openai.embeddings.create({ //create embedding for each chunk
                                model: "text-embedding-3-small",
                                input: chunk,
                                encoding_format: "float"
                        })
                        const vector = embedding.data[0].embedding //get the vector from the embedding response
                        const res = await collection.insertOne({ //insert the chunk and its vector into the collection
                                $vector: vector,
                                text: chunk
                        })
                        console.log(res)
                }
        }
}


// function that scrapes a page and returns its content
const scrapePage = async (url: string) => {
  if (url.includes("docs.google.com/document") && url.includes("export?format=txt")) {
    const res = await fetch(url)
    return await res.text()
  }

  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML)
      await browser.close()
      return result;
    }
  })

  return (await loader.scrape())?.replace(/<[^>]*>/gm, '') || ""
}




//execute the functions
createCollection().then(() => {loadSampleData()})
