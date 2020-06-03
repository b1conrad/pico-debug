#!/usr/bin/env node
const [,, ...args] = process.argv
const prompt = require('prompt')
const fetch = require('node-fetch')

prompt.start()

async function init_engine(url){
  return url
}

function prompt2 (schema) {
  return new Promise(function (resolve, reject) {
    prompt.get(schema, function (err, result) {
      return err ? reject(err) : resolve(result)
    })
  })
}
async function main () {
  //console.log(`Hello world of ${args}`)
  if (/^https?:\/\//.test(args)) {
    engine = await init_engine(args[0])
    console.log(`pico-engine is running at ${engine}`)
  } else {
    console.log('Usage: pico-debug pico-engine')
    process.exit(1)
  }
  while (true) {
    let question = 'What is your query?'
    let result = await prompt2(question)
    let the_query = result[question]
    while (the_query.charAt(0) === '/') the_query = the_query.substr(1)
    if (the_query === 'exit') {
      break
    }
    console.log(`Your query is /${the_query}`)
    let response = await fetch(args + '/' + the_query)
    //console.log(JSON.stringify(response,null,2))
    if (response.status == 200) {
      let content_type = response.headers.get('content-type')
      //console.log(content_type)
      if (/^application\/json;/.test(content_type)) {
        let json = await response.json()
        console.log(json)
      } else if (/^text\/plain/.test(content_type)) {
        let body = await response.text()
        console.log(body)
      } else {
        console.log(content_type)
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
