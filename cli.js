#!/usr/bin/env node
const [,, ...args] = process.argv
const { AutoComplete, Input, Password } = require('enquirer')
const node_fetch = require('node-fetch')
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
const url_pico_debug = 'https://raw.githubusercontent.com/b1conrad/pico-debug/master/pico-debug.krl'
let owner_eci = null
var needed_pico_debug = false

async function fetch(url,options){
  return await node_fetch(url,options)
    .catch(function(e){
      console.log(chalk.red(e.message));
      process.exit(1)
    })
}

async function install_url(engine_uri,rid_url){
  let res = await fetch(engine_uri+'/api/ruleset/register?url='+rid_url)
  res = await fetch(engine_uri+'/sky/event/'+owner_eci+'/none/wrangler/install_rulesets_requested?url='+rid_url)
}

async function new_eci(url,eci){
  let res = await fetch(url+'/sky/cloud/'+eci+'/'+rid_vp+'/dname')
  let pico_name = await res.text()
  console.log(`pico name is ${pico_name}`)
}

async function installed_rulesets(url,eci){
  let res = await fetch(url+'/sky/cloud/'+eci+'/'+rid_w+'/installedRulesets')
  return await res.json()
}

async function init_engine(url){
  let res = await fetch(url+'/api/engine-version')
  if (res.status != 200) {
    console.log(chalk.red(`Cannot obtain engine version (${res.status})`))
    process.exit(1)
  }
  let version = (await res.json()).version
  console.log(`pico-engine version is ${version}`)
  res = await fetch(url+'/api/root-eci')
  let root_eci = (await res.json()).eci
  let root_rulesets = await installed_rulesets(url,root_eci)
  let need_login = root_rulesets.indexOf('io.picolabs.account_management') >= 0
  if (need_login) {
    let temp_eci = null
    let prompt = new Input({message:'Who are you?',initial:'Owner id or DID'})
    let owner_id = await prompt.run()
    let res = await fetch(url+'/sky/event/'+root_eci+'/none/owner/eci_requested?owner_id='+owner_id)
    let dir_map = await res.json()
    if (dir_map.directives && dir_map.directives.length){
      let d = dir_map.directives[0]
      if (d.name && d.name==='Returning eci from owner name') {
        temp_eci = d.options.eci
      } else if (d.name && d.name==='did') {
        owner_eci = d.options.eci
      }
    }
    if (! owner_eci) {
      prompt = new Password({message:'Can you prove it?'})
      let password = await prompt.run()
      dir_map = null
      if (temp_eci) {
        res = await fetch(url+'/sky/event/'+temp_eci+'/none/owner/authenticate?password='+password)
        dir_map = await res.json()
      }
      if (dir_map && dir_map.directives && dir_map.directives.length){
        let d = dir_map.directives[0]
        owner_eci = d.options.eci
      }
    }
  } else {
    owner_eci = root_eci
  }
  if (! owner_eci) {
    console.log('Cannot find an owner pico for you!')
    process.exit(1)
  }
  let owner_rulesets = await installed_rulesets(url,owner_eci)
  needed_pico_debug = owner_rulesets.indexOf('pico-debug') < 0
  if (needed_pico_debug) {
    await install_url(url,url_pico_debug)
  }
  console.log(`current ECI is ${owner_eci}`)
  console.log(`current EID is none`)
  console.log(`current RID is ${rid_w}`)
  res = await fetch(url+'/sky/cloud/'+owner_eci+'/'+rid_w+'/channel?value='+owner_eci)
  let channel = await res.json()
  console.log(`channel type is ${channel.type}`)
  console.log(`channel name is ${channel.name}`)
  await new_eci(url,owner_eci)
  return owner_eci
}

async function main () {
  let engine_uri, eci, rids
  let rid =rid_w
  if (/^https?:\/\//.test(args)) {
    engine_uri = args[0]
    console.log(`pico-engine is running at ${engine_uri}`)
    eci = await init_engine(engine_uri)
    rids = await installed_rulesets(engine_uri,eci)
  } else {
    console.log('Usage: pico-debug pico-engine-url')
    process.exit(1)
  }
  let history = new Map()
  let bindings = new Map()

  let res = await fetch(engine_uri+'/sky/event/'+owner_eci+'/none/debug/session_needed')
  let session_eci = await res.json()
  console.log(`session eci is ${session_eci}`)

  while (true) {
    const prompt = new Input({
      message: 'query',
      history: {
        store: history,
        autosave: true
      }
    })
    let the_key = null
    let the_query = await prompt.run()
    if (!the_query || the_query.length <= 0) {
      continue
    }
    while (the_query.charAt(0) === '/') the_query = the_query.substr(1)
    if (/^(exit|quit)$/.test(the_query)) {
      if (needed_pico_debug) {
        res = await fetch(engine_uri+'/sky/event/'+owner_eci+'/none/wrangler/uninstall_rulesets_requested?rid=pico-debug')
      }
      break
    }
    let eci_stmt = /^eci.([a-zA-Z0-9]+)/.exec(the_query)
    if (eci_stmt) {
      if (the_query.charAt(3)==='@') {
        eci = /\w+/.exec(bindings.get(eci_stmt[1]))[0]
        if (!eci) {
          console.log(`nothing at ${eci_stmt[1]}`)
        }
      } else {
        eci = eci_stmt[1]
      }
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
    let assign_stmt = /^(\w+) *= *(.+)/.exec(the_query)
    if (assign_stmt) {
      the_key = assign_stmt[1]
      the_query = assign_stmt[2]
    }
    let exec_stmt = /^(\w+)([.[{].*)/.exec(the_query)
    if (exec_stmt) {
      let key = exec_stmt[1]
      let the_var_val = bindings.get(key)
      if (the_var_val) {
        if (exec_stmt[2] == '.') {
          console.log(the_var_val)
          continue
        } else {
          let ops = encodeURIComponent(exec_stmt[2])
          the_query = 'sky/event/'+session_eci+'/none/session/obj_ops?ops='+ops+'&key='+key
          await fetch(engine_uri+'/sky/event/'+session_eci+'/none/bindings/new?key='+key,
          {
            method:'POST',
            headers: { "Content-Type": "application/json", },
            body:JSON.stringify({"value":the_var_val}),
          })
        }
      } else {
        console.log(`nothing at ${key}`)
        continue
      }
    }
    let query_stmt = /^query ([^ ]*)/.exec(the_query)
    if (query_stmt) {
      the_query = 'sky/cloud/ECI/RID/'+query_stmt[1]
    }
    let event_stmt = /^event ([^ ]*)/.exec(the_query)
    if (event_stmt) {
      the_query = 'sky/event/ECI/EID/'+event_stmt[1]
    }
    let krl_stmt = /^krl (.*)/.exec(the_query)
    if (krl_stmt) {
      let the_krl = encodeURIComponent(krl_stmt[1])
      the_query = 'sky/event/'+session_eci+'/none/session/expr?expr='+the_krl
    }
    the_query = the_query.replace(/\bECI\b/g, eci)
    the_query = the_query.replace(/\bEID\b/g, 'none')
    the_query = the_query.replace(/\bRID\b/g, rid)
    console.log(`Your query is /${the_query.replace(/(.{63})..+/,'$1…')}`)
    let response = await fetch(engine_uri+'/'+the_query)
    if (response.status == 200) {
      let content_type = response.headers.get('content-type')
      if (/^application\/json;/.test(content_type)) {
        let json = await response.json()
        if (the_key) {
          bindings.set(the_key,JSON.stringify(json))
        } else {
          console.log(JSON.stringify(json,null,2))
        }
      } else if (/^text\/plain/.test(content_type)) {
        let body = await response.text()
        if (the_key) {
          bindings.set(the_key,body)
        } else {
          console.log(body)
        }
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
  await fetch(engine_uri+'/sky/event/'+owner_eci+'/none/debug/session_expired?eci='+session_eci)
  console.log('bye!')
}

main().catch(console.error)
