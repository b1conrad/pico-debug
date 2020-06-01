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
    if(error) {console.log('Error:',error)}
    if (!error && response.statusCode == 200) {
      console.log(response.headers['content-type'])
      console.log(JSON.stringify(response.body))
      console.log(JSON.parse(response.body))
    }
  })
})

