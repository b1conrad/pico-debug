#!/usr/bin/env node
const [,, ...args] = process.argv
const { prompt } = require('enquirer')
const { AutoComplete } = require('enquirer')
const { Input } = require('enquirer')
const fetch = require('node-fetch')
const chalk = require('ansi-colors')
const figlet = require('figlet')

console.log(
  chalk.cyan(
    figlet.textSync('pico-debug', { horizontalLayout: 'full' })
  )
)

Input.prototype.up = Input.prototype.altUp
Input.prototype.down = Input.prototype.altDown

const rid_w = 'io.picolabs.wrangler'
const rid_vp = 'io.picolabs.visual_params'

async function new_eci(url,eci){
  let res = await fetch(url+'/sky/cloud/'+eci+'/'+rid_vp+'/dname')
  let pico_name = await res.text()
  console.log(`pico name is ${pico_name}`)
}

async function init_engine(url){
  let res = await fetch(url+'/api/engine-version')
  let version = (await res.json()).version
  console.log(`pico-engine version is ${version}`)
  res = await fetch(url+'/api/root-eci')
  let eci = (await res.json()).eci
  console.log(`current ECI is ${eci}`)
  console.log(`current EID is none`)
  console.log(`current RID is ${rid_w}`)
  res = await fetch(url+'/sky/cloud/'+eci+'/'+rid_w+'/channel?value='+eci)
  let channel = await res.json()
  console.log(`channel type is ${channel.type}`)
  console.log(`channel name is ${channel.name}`)
  await new_eci(url,eci)
  return eci
}

async function installed_rulesets(url,eci){
  let res = await fetch(url+'/sky/cloud/'+eci+'/'+rid_w+'/installedRulesets')
  return await res.json()
}

async function main () {
  let engine_uri, eci, rids
  let rid =rid_w
  //console.log(`Hello world of ${args}`)
  if (/^https?:\/\//.test(args)) {
    engine_uri = args[0]
    console.log(`pico-engine is running at ${engine_uri}`)
    eci = await init_engine(engine_uri)
    rids = await installed_rulesets(engine_uri,eci)
    //console.log(rids)
  } else {
    console.log('Usage: pico-debug pico-engine-url')
    process.exit(1)
  }
  let history = new Map()
  while (true) {
    let question = 'What is your query?'
    let result = await prompt({
      type: 'input',
      name: question,
      message: question,
      history: { store: history, autosave: true },
    })
    let the_query = result[question]
    while (the_query.charAt(0) === '/') the_query = the_query.substr(1)
    if (/(exit|quit)/.test(the_query)) {
      break
    }
    let eci_stmt = /^eci.(.+)/.exec(the_query)
    if (eci_stmt) {
      eci = eci_stmt[1]
      rids = await installed_rulesets(engine_uri,eci)
      await new_eci(engine_uri,eci)
      continue
    }
    if (the_query === 'rid') {
      rid = await new AutoComplete({
        name: 'rid', message: 'rid', choices: rids}
      ).run()
      continue
    }
    if (the_query === 'rids') {
      console.log(rids)
      continue
    }
    the_query = the_query.replace(/\bECI\b/g, eci)
    the_query = the_query.replace(/\bEID\b/g, 'none')
    the_query = the_query.replace(/\bRID\b/g, rid)
    console.log(`Your query is /${the_query}`)
    let response = await fetch(engine_uri+'/'+the_query)
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
