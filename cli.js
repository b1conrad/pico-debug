#!/usr/bin/env node
const [,, ...args] = process.argv
const prompt = require('prompt')
const fetch = require('node-fetch')

prompt.start()

async function init_engine(url){
  let res = await fetch(url + '/api/engine-version')
  let version = (await res.json()).version
  console.log(`pico-engine version is ${version}`)
  res = await fetch(url + '/api/root-eci')
  let eci = (await res.json()).eci
  console.log(`current ECI is ${eci}`)
  res = await fetch(url + '/sky/cloud/' + eci + '/io.picolabs.wrangler/channel?value=' + eci)
  let channel = await res.json()
  console.log(`channel type is ${channel.type}`)
  console.log(`channel name is ${channel.name}`)
  res = await fetch(url + '/sky/cloud/' + eci + '/io.picolabs.visual_params/dname')
  let pico_name = await res.text()
  console.log(`pico name is ${pico_name}`)
  return eci
}

function prompt2 (schema) {
  return new Promise(function (resolve, reject) {
    prompt.get(schema, function (err, result) {
      return err ? reject(err) : resolve(result)
    })
  })
}
async function main () {
  let engine_uri, eci
  //console.log(`Hello world of ${args}`)
  if (/^https?:\/\//.test(args)) {
    engine_uri = args[0]
    console.log(`pico-engine is running at ${engine_uri}`)
    eci = await init_engine(engine_uri)
  } else {
    console.log('Usage: pico-debug pico-engine-url')
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
    let response = await fetch(engine_uri + '/' + the_query)
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
