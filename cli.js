#!/usr/bin/env node
const [,, ...args] = process.argv
const prompt = require('prompt')
const fetch = require('node-fetch')

prompt.start()

function prompt2 (schema) {
  return new Promise(function (resolve, reject) {
    prompt.get(schema, function (err, result) {
      return err ? reject(err) : resolve(result)
    })
  })
}
async function main () {
  console.log(`Hello world of ${args}`)
  while (true) {
    let question = 'What is your query?'
    let result = await prompt2(question)
    if (result[question] === 'exit') {
      break
    }
    console.log(`Your query is ${result[question]}`)
    let response = await fetch('http://localhost:8080'+result[question])
    //console.log(JSON.stringify(response,null,2))
    if (response.status == 200) {
      console.log(response.headers.get('content-type'))
      if (/^application\/json;/.test(response.headers.get('content-type'))) {
        let json = await response.json()
        console.log(json)
      } else {
        let body = await response.text()
        console.log(body)
      }
    } else {
      var msg = 'unknown error'
      body = await response.text()
      if (/"error":"([^"]*)"/.test(body)) {
        msg = /"error":"([^"]*)"/.exec(body)[1]
      } else if (/<pre>([^<]*)<\/pre>/.test(body)) {
        msg = /<pre>([^<]*)<\/pre>/.exec(body)[1]
      }
      console.log(response.status,msg)
    }
  }
  console.log('bye!')
}

main().catch(console.error)
