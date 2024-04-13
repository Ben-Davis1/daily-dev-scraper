import { Client } from "@notionhq/client";
import pkg from 'bluebird';
import cors from 'cors';
const {Promise} = pkg;

const notion = new Client({ auth: "secret_Un2kwxNi3p5i1m4qBYi8cF52M7GY0X3IP8AhvIAN22n" });

import express from "express"
const app = express()
app.use(express.json())
app.use(cors());
const port = 3000

const createPage = async(article, completed) => {
  await notion.pages.create({
    parent: {
      database_id: "882be6487eec49b89f1dbfa6b603b172",
    },
    properties: {
      "Summary": {
        type: 'title',
        title: [
          {
            type: 'text',
            text: {
              content: article.title,
            },
          },
        ],
      },
      "Notes": {
        type: "rich_text",
        rich_text: [{ 
          text: { content: article.summary }
        }]
      },
      "Status": {
        type: "select",
        select: {
          name: completed ? "Completed" : "To read"
        }
      },
      "Type": {
        type: "select",
        select: {
          name: "Article"
        }
      },
      "Subjects": {
        type: "multi_select",
        multi_select: article.tags?.map(t => ({ name: t })) || []
      },
      "Complexity": {
        type: "rich_text",
        rich_text: [{ 
          text: { content: article.complexity.toString() }
        }]
      },
      "Source": {
        type: "select",
        select: {
          name: "Daily.dev"
        }
      },
      "Link": {
        type: "url",
        url: article.url 
      },
    },
  });

  new Promise(r => setTimeout(r, 3000))
};

const scrapeDailyDev = (text, url) => {
  const getTitle = () => {
    const regex = /title="Go to post" target="_blank" rel="noopener">(.+?)<\/a>/

    return text.match(regex)[1]
  };

  const getSummary = () => {
    const regex = /TLDR<\/span>(.+?)<!-- -->/

    return text.match(regex)[1]
  };

  const getTags = () => {
    const regex = /"tags":\[(.*?)\],/

    const tags = text.match(regex)[1]
    
    if(!tags)
      return null

    return tags.replaceAll(`"`, "").split(",")
  }

  const getComplexity = () => {
    const regex = /"readTime":(.+?),/

    const readTime = text.match(regex)[1]

    if(readTime > 22)
      return 10

    if(readTime > 19)
      return 9

    if(readTime > 15)
      return 8

    if(readTime > 14)
      return 7

    if(readTime > 12)
      return 6

    if(readTime > 9)
      return 5

    if(readTime > 7)
      return 4

    if(readTime > 5)
      return 3

    if(readTime > 3)
      return 2

    if(readTime <= 3)
      return 1
  };

  return {
    title: getTitle(),
    url: url,
    summary: getSummary(),
    tags: getTags() || [],
    complexity: getComplexity()
  }
};

const getPagesData = async(urls, tries) => {
  if(tries > 5) {
    return false
  }
  try {
    const pages = await Promise.all(urls.map(p => fetch(p).then(res => res.text())))

    return pages.map((p, i) => scrapeDailyDev(p, urls[i]))
  } catch(e) {
    return getPagesData(urls, tries + 1)
  }
};

app.post('/scrape', async(req, res) => {
  try {
  const pagesData = await getPagesData(req.body, 0)

  await Promise.map(pagesData, page => createPage(page), { concurrency: 1 })

  res.sendStatus(200)
  }
  catch(e) {
    res.sendStatus(500)
  }
})

app.post('/scrape-completed', async(req, res) => {
  try {
  const pagesData = await getPagesData(req.body, 0)
  
  await Promise.map(pagesData, page => createPage(page, true), { concurrency: 1 })

  res.sendStatus(200)
  }
  catch(e) {
    res.sendStatus(500)
}
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)

})
