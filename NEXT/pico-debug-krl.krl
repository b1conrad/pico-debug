ruleset pico-debug-krl {
  meta {
    use module io.picolabs.wrangler alias wrangler
    shares rs
  }
  global {
    rs = function(ops){
      rsn = random:uuid();
      e = math:base64decode(ops);
      code = e.match(re#^ #) => e | "ent:obj"+e;
      <<
ruleset #{rsn} {
  meta {
    use module io.picolabs.wrangler alias wrangler
    use module io.picolabs.subscription alias subs
    shares result
  }
  global {
    result=function(){
      #{code}
    }
  }
  rule set_obj {
    select when debug new_obj
      where event:attr("rid") == meta:rid
    fired {
      ent:obj := event:attr("obj")
    }
  }
}
>>
    }
    tags = ["pico-debug-krl"]
    eventPolicy = {"allow":[{"domain":"krl","name":"*"}],"deny":[]}
    queryPolicy = {"allow":[{"rid":meta:rid,"name":"*"}],"deny":[]}
  }
  rule initialize {
    select when wrangler ruleset_installed
      where event:attr("rids") >< meta:rid
    pre {
      krl_eci = ent:krl_eci
    }
    if krl_eci.isnull() then
      every {
        wrangler:createChannel(tags,eventPolicy,queryPolicy) setting(channel)
        event:send({"eci":wrangler:parent_eci(),
          "domain":"session", "type":"new_krl_eci",
          "attrs":{"eci":channel.head(){"id"}}
        })
      }
    fired {
      ent:krl_eci := channel.head(){"id"}
    }
  }
}
