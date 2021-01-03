ruleset pico-debug-session {
  meta {
    use module io.picolabs.wrangler alias wrangler
    shares __testing, bindings
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" }
      , { "name": "bindings", "args": [ "key" ] }
      ] , "events":
      [ { "domain": "bindings", "type": "new", "attrs": [ "key", "value" ] }
      , { "domain": "session", "type": "expr", "attrs": [ "expr" ] }
      , { "domain": "session", "type": "obj_ops", "attrs": [ "key", "ops" ] }
      ]
    }
    bindings = function(key){
      ent:bindings.get(key)
    }
    get_result_and_send = defaction(eci,rid){
      res = http:get(<<#{meta:host}/sky/cloud/#{eci}/#{rid}/result>>);
      every {
        send_directive("_txt",{"content":res{"content"}})
        event:send({"eci":eci,
          "domain":"wrangler","type":"uninstall_ruleset_request",
          "attrs":{"rid":rid}
        })
      }
    }
    tags = ["pico-debug-session"]
    eventPolicy = {"allow":[{"domain":"session","name":"*"}],"deny":[]}
    queryPolicy = {"allow":[{"rid":meta:rid,"name":"*"}],"deny":[]}
  }
  rule new_child_initialization {
    select when wrangler pico_created
    pre {
      pico_debug_channel = event:attr("pico_debug_channel")
    }
    fired {
      ent:pico_debug_channel_eci := pico_debug_channel{"id"}.krl("eci")
    }
  }
  rule intialization {
    select when wrangler ruleset_installed
      where event:attr("rids") >< meta:rid
    if ent:bindings.isnull() then 
      wrangler:createChannel(tags,eventPolicy,queryPolicy) setting(channel)
    fired {
      ent:bindings := {}
      ent:channel_eci := channel{"id"}
    }
  }
  rule set_binding {
    select when bindings new key re#(.+)# setting(key)
    fired {
      ent:bindings{key} := event:attr("value").decode()
    }
  }
  rule evaluate_expr {
    select when session expr expr re#(.+)# setting(expr)
    pre {
      eci = ent:pico_debug_channel_eci
      e = math:base64encode(" "+expr).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{eci}/pico-debug/rs.txt?ops=#{e}>>
      debug = url.klog("url")
    }
    every {
      ctx:eventQuery(eci=eci,
        domain="wrangler", name="install_ruleset_request",
        attrs={"url":url},
        rid="io.picolabs.wrangler",queryName="installedRIDs",
        args={"tags":"console"}
      ) setting(rids)
      ctx:eventQuery(eci=eci,
        domain="wrangler", name="new_channel_request",
        attrs={
          "tags":["result"],
          "eventPolicy":{"allow":[],"deny":[{"domain":"*","name":"*"}]},
          "queryPolicy":{"allow":[{"rid":rids.reverse().head(),"name":"result"}],"deny":[]}
        },rid="io.picolabs.wrangler",queryName="channels",
        args={"tags":"result"}
      ) setting(new_channel)
      get_result_and_send(new_channel.head(){"id"},rids.reverse().head())
    }
  }
  rule evaluate_obj_ops {
    select when session obj_ops key re#(.+)# ops re#(.+)# setting(key,ops)
    pre {
      eci = wrangler:parent_eci()
      picoId = engine:getPicoIDByECI(eci)
      e = math:base64encode(ops).replace(re#[+]#g,"-")
      url = <<#{meta:host}/sky/cloud/#{eci}/pico-debug/rs.txt?ops=#{e}>>
    }
    every {
      engine:registerRuleset(url=url) setting(rid)
      engine:installRuleset(picoId,rid=rid)
      event:send({"eci": eci, "domain": "debug", "type": "new_obj",
        "attrs": {"obj": bindings(key)}
      })
      get_result_and_send(eci,rid)
      engine:uninstallRuleset(picoId,rid)
      engine:unregisterRuleset(rid)
    }
  }
}
