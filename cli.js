#!/usr/bin/env node
const [,, ...args] = process.argv
const prompt = require('prompt')
const request = require('request')

prompt.start()
console.log(`Hello world of ${args}`)
let question = "What is your query?"
prompt.get(question, function(err,result) {
  if (err) { console.log(err) }
  console.log(`Your query is ${result[question]}`)
  request.get('http://localhost:8080'+result[question],
  function(error,response){
    if(error) {console.log('Error:',error); return null}
    //console.log(JSON.stringify(response,null,2))
    if (response.statusCode == 200) {
      //console.log(response.headers['content-type'])
      if (/^application\/json;/.test(response.headers['content-type'])) {
        console.log(JSON.parse(response.body))
      } else {
        console.log(response.body)
      }
    } else {
      var msg = 'unknown error'
      if (/"error":"([^"]*)"/.test(response.body)) {
        msg = /"error":"([^"]*)"/.exec(response.body)[1]
      } else if (/<pre>([^<]*)<\/pre>/.test(response.body)) {
        msg = /<pre>([^<]*)<\/pre>/.exec(response.body)[1]
      }
      console.log(response.statusCode,msg)
    }
  })
})

