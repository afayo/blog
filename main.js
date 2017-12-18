const fs = require('fs');
const {execSync} = require('child_process');
const Lokka = require('lokka').Lokka;
const Transport = require('lokka-transport-http').Transport;
const ghpages = require('gh-pages');

const token = process.env.GITHUB_TOKEN;

const client = new Lokka({
    transport: new Transport('https://api.github.com/graphql', {
        headers: {
            Authorization: `bearer ${token}`
        }
    })
});

client.query(`
{
  repository(owner: "gwuhaolin", name: "blog") {
    issues(first: 100, orderBy: {field: CREATED_AT, direction: ASC}, states: [OPEN]) {
      edges {
        node {
          title
          body
          createdAt
          url
          labels(first:100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
      totalCount
    }
  }
}
`).then(result => {
    result.repository.issues.edges.forEach((em) => {
        const {title, body, createdAt, url, labels} = em.node;
        const tags = labels.edges.map(em => em.node.name);
        const mdContent = `---
title: ${title}
date: ${createdAt}
url: ${url}
tags:
${tags.map(tag => `    - ${tag}`).join('\n')}
---

${body}`;
        fs.writeFileSync(`hexo/source/_posts/${title}.md`, mdContent);
    });
    console.info('更新 md 完毕');
    execSync(`hexo clean -cmd hexo`);
    execSync(`hexo generate -cmd hexo`);
    fs.writeFileSync('hexo/public/CNAME', 'wuhaolin.cn');
    ghpages.publish('hexo/public', (err) => {
        if (err) {
            console.error(err);
        } else {
            console.info('上传完毕');
        }
    });
}).catch(err => {
    console.error(err);
});

